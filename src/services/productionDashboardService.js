import apiClient from "./apiClient";

export const getProductionDashboard = (params = {}) =>
  apiClient.get("/production-orders/dashboard", { params }).then((r) => r.data);

export const getProductionDashboardKpis = (params = {}) =>
  apiClient.get("/production-orders/dashboard/kpis", { params }).then((r) => r.data);

export const getProductionDashboardPipeline = (params = {}) =>
  apiClient.get("/production-orders/dashboard/pipeline", { params }).then((r) => r.data);

export const getProductionDashboardTrend = (params = {}) =>
  apiClient.get("/production-orders/dashboard/trend", { params }).then((r) => r.data);

export const getProductionDashboardAnalytics = (params = {}) =>
  apiClient.get("/production-orders/dashboard/analytics", { params }).then((r) => r.data);

export const exportProductionDashboard = (params = {}) =>
  apiClient
    .get("/production-orders/dashboard/export", { params, responseType: "blob" })
    .then((r) => r.data);

/** Trace a finished-good serial back to the component serials consumed for it. */
export const getSerialGenealogy = (params = {}) =>
  apiClient.get("/production-orders/serial-genealogy", { params }).then((r) => r.data);

export default {
  getProductionDashboard,
  getProductionDashboardKpis,
  getProductionDashboardPipeline,
  getProductionDashboardTrend,
  getProductionDashboardAnalytics,
  exportProductionDashboard,
  getSerialGenealogy,
};
