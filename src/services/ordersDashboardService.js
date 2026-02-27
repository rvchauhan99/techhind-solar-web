import apiClient from "./apiClient";

const DEFAULT_BASE = "/order";

export const getOrdersDashboardKpis = (params = {}, basePath = DEFAULT_BASE) =>
  apiClient.get(`${basePath}/dashboard-kpis`, { params }).then((r) => r.data);

export const getOrdersDashboardPipeline = (params = {}, basePath = DEFAULT_BASE) =>
  apiClient.get(`${basePath}/dashboard-pipeline`, { params }).then((r) => r.data);

export const getOrdersDashboardTrend = (params = {}, basePath = DEFAULT_BASE) =>
  apiClient.get(`${basePath}/dashboard-trend`, { params }).then((r) => r.data);

export const getOrdersDashboardOrders = (params = {}, basePath = DEFAULT_BASE) =>
  apiClient.get(`${basePath}/dashboard-orders`, { params }).then((r) => r.data);

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

