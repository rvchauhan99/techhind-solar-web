import apiClient from "./apiClient";

export const getCancelledOrders = (params = {}) =>
  apiClient.get("/cancelled-orders", { params }).then((r) => r.data);

export const getCancelledOrdersInsights = (params = {}) =>
  apiClient.get("/cancelled-orders/insights", { params }).then((r) => r.data);

export default { getCancelledOrders, getCancelledOrdersInsights };

