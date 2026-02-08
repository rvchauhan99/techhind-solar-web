import axios from "axios";

const baseURL =
  typeof process.env.NEXT_PUBLIC_API_BASE_URL !== "undefined" &&
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
    ? process.env.NEXT_PUBLIC_API_BASE_URL.trim()
    : "";

const adminApiKey =
  typeof process.env.NEXT_PUBLIC_ADMIN_API_KEY !== "undefined"
    ? (process.env.NEXT_PUBLIC_ADMIN_API_KEY || "").trim()
    : "";

const adminAxios = axios.create({
  baseURL: baseURL || "/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

adminAxios.interceptors.request.use(
  (config) => {
    if (adminApiKey && config.headers) {
      config.headers["x-admin-api-key"] = adminApiKey;
      config.headers.Authorization = `Bearer ${adminApiKey}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default adminAxios;
export { adminApiKey };
