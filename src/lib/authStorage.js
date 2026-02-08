// Centralized token storage keys and helpers for auth (localStorage).

export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";
export const PROFILE_KEY = "userProfile";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken, refreshToken) {
  if (typeof window === "undefined") return;
  if (accessToken != null) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken != null) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getStoredProfile() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function setStoredProfile(profile) {
  if (typeof window === "undefined") return;
  if (profile != null) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
}

export function clearStoredProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_KEY);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  clearStoredProfile();
}
