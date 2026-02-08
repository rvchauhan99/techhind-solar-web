import apiClient from "./apiClient";

export const getClosedOrders = (params = {}) =>
  apiClient.get("/closed-orders", { params }).then((r) => r.data);

export default { getClosedOrders };

