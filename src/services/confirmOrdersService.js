import apiClient from "./apiClient";

export const getConfirmedOrders = (params = {}) =>
    apiClient.get("/confirm-orders", { params }).then((r) => r.data);

export const getOrderById = (id) =>
    apiClient.get(`/confirm-orders/${id}`).then((r) => r.data);

export default { getConfirmedOrders, getOrderById };
