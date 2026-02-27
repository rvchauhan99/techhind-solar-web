import apiClient from "./apiClient";

export const getOrdersDashboardKpis = (params = {}) =>
  apiClient.get("/order/dashboard-kpis", { params }).then((r) => r.data);

export const getOrdersDashboardPipeline = (params = {}) =>
  apiClient.get("/order/dashboard-pipeline", { params }).then((r) => r.data);

export const getOrdersDashboardTrend = (params = {}) =>
  apiClient.get("/order/dashboard-trend", { params }).then((r) => r.data);

export const getOrdersDashboardOrders = (params = {}) =>
  apiClient.get("/order/dashboard-orders", { params }).then((r) => r.data);

export const exportOrders = (params = {}) =>
  apiClient
    .get("/order/export", {
      params,
      responseType: "blob",
    })
    .then((r) => r.data);

export default {
  getOrdersDashboardKpis,
  getOrdersDashboardPipeline,
  getOrdersDashboardTrend,
  getOrdersDashboardOrders,
  exportOrders,
};

