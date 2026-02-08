import apiClient from "./apiClient";

export const getConfirmedOrders = (params = {}) =>
    apiClient.get("/confirm-orders", { params }).then((r) => r.data);

export default { getConfirmedOrders };
