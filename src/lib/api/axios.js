// src/lib/api/axios.js - Global Axios instance for backend API calls
import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  getStoredProfile,
} from "@/lib/authStorage";
import { getAllowedRoutes, isPathAllowedByRoutes } from "@/lib/permissionUtils";

let refreshPromise = null;

// Strict baseURL: never allow empty - fail fast in all environments
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!baseURL || typeof baseURL !== "string" || baseURL.trim() === "") {
  throw new Error(
    "[axios] NEXT_PUBLIC_API_BASE_URL is required. Add it to .env (e.g. NEXT_PUBLIC_API_BASE_URL=http://localhost:9090/api) and restart the dev server."
  );
}

function getApiBaseUrl() {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url || typeof url !== "string" || url.trim() === "") {
    throw new Error("[axios] NEXT_PUBLIC_API_BASE_URL is not configured.");
  }
  return url;
}

/** Origin + path prefix for static/assets (no /api). Use for document/image URLs. */
export function getAssetBaseUrl() {
  const base = getApiBaseUrl().replace(/\/api\/?$/, "").trim();
  return base || "http://localhost:9090";
}

/** Full URL for a document/asset path. If path is already absolute, return as-is. */
export function resolveDocumentUrl(path) {
  if (!path) return "";
  if (typeof path === "string" && path.startsWith("http")) return path;
  const base = getAssetBaseUrl();
  return base + (path.startsWith("/") ? path : `/${path}`);
}

const axiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

/** API path prefixes that skip frontend permission check (auth, health). */
const API_PATH_WHITELIST_PREFIXES = ["/auth", "/health-check"];

function isApiPathWhitelisted(path) {
  if (!path) return true;
  return API_PATH_WHITELIST_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

// Request interceptor: auth token + x-timezone
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (config.headers) {
        config.headers["x-timezone"] =
          Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      }
    } else if (config.headers) {
      config.headers["x-timezone"] = "";
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Request interceptor: frontend-first module permission check (cached profile)
// Set to false to skip so only backend enforces; revert to true when done testing.
const SKIP_FRONTEND_MODULE_CHECK = true;
axiosInstance.interceptors.request.use(
  (config) => {
    if (SKIP_FRONTEND_MODULE_CHECK || typeof window === "undefined") return config;

    const rawPath = (config.url || "").split("?")[0];
    const path = rawPath ? (rawPath.startsWith("/") ? rawPath : `/${rawPath}`) : "";
    if (!path || isApiPathWhitelisted(path)) return config;

    const profile = getStoredProfile();
    if (!profile?.modules) return config;

    const allowedRoutes = getAllowedRoutes(profile.modules);
    if (isPathAllowedByRoutes(path, allowedRoutes)) return config;

    window.location.href = "/access-denied";
    return Promise.reject(new Error("Module access denied"));
  },
  (error) => Promise.reject(error)
);

// Helper: check if response indicates token expiration
function isTokenExpiredResponse(response) {
  const data = response?.data;
  if (!data) return false;
  const message = (data.message || "").toLowerCase();
  return (
    data.status === false &&
    message.includes("token") &&
    (message.includes("expired") || message.includes("invalid"))
  );
}

// Refresh token using same baseURL
async function refreshAccessToken() {
  if (typeof window === "undefined") {
    throw new Error("refreshAccessToken requires browser environment");
  }
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    throw new Error("No refresh token available");
  }
  const apiBaseUrl = getApiBaseUrl();
  const res = await axios.post(`${apiBaseUrl}/auth/refresh-token`, {
    refreshToken,
  });
  const newAccessToken = res.data?.result?.newAccessToken;
  if (!newAccessToken) {
    throw new Error("Failed to refresh token: No access token in response");
  }
  if (typeof window !== "undefined") {
    setTokens(newAccessToken, null);
  }
  return newAccessToken;
}

const skipEndpoints = ["/auth/login", "/auth/refresh-token", "/auth/logout"];

// Response interceptor: token expiry, 401/440, retry, redirect
axiosInstance.interceptors.response.use(
  async (response) => {
    const originalRequest = response.config;
    if (isTokenExpiredResponse(response) && !originalRequest._retry) {
      const isAuthEndpoint = skipEndpoints.some((ep) =>
        originalRequest.url?.includes(ep)
      );
      if (!isAuthEndpoint) {
        originalRequest._retry = true;
        try {
          if (!refreshPromise) {
            refreshPromise = refreshAccessToken();
          }
          const newAccessToken = await refreshPromise;
          refreshPromise = null;
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          console.error("[axios] Token refresh failed:", refreshError);
          refreshPromise = null;
          clearTokens();
          if (typeof window !== "undefined") {
            window.location.href = "/auth/login";
          }
          return Promise.reject(refreshError);
        }
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthEndpoint = skipEndpoints.some((ep) =>
      originalRequest?.url?.includes(ep)
    );
    const isTokenExpired =
      status === 401 ||
      status === 440 ||
      isTokenExpiredResponse(error.response);
    const shouldRetryWithRefresh =
      isTokenExpired && !originalRequest?._retry && !isAuthEndpoint;

    if (shouldRetryWithRefresh) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken();
        }
        const newAccessToken = await refreshPromise;
        refreshPromise = null;
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
        return Promise.reject(refreshError);
      }
    }

    // 403: any permission denied -> redirect to Access Denied page (Back + Home)
    if (status === 403 && typeof window !== "undefined") {
      const pagePath =
        typeof window.location !== "undefined"
          ? window.location.pathname + window.location.search
          : "";
      const q = pagePath ? `?from=${encodeURIComponent(pagePath)}` : "";
      window.location.href = "/access-denied" + q;
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
