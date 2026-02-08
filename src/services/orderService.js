import apiClient from "./apiClient";

export const getOrders = (params = {}) =>
    apiClient.get("/order", { params }).then((r) => r.data);

export const exportOrders = (params = {}) =>
    apiClient.get("/order/export", { params, responseType: "blob" }).then((r) => r.data);

export const createOrder = (payload) =>
    apiClient.post("/order", payload).then((r) => r.data);

export const getOrderById = (id) =>
    apiClient.get(`/order/${id}`).then((r) => r.data);

export const updateOrder = (id, payload) =>
    apiClient.put(`/order/${id}`, payload).then((r) => r.data);

export const deleteOrder = (id) =>
    apiClient.delete(`/order/${id}`).then((r) => r.data);

export const getSolarPanels = () =>
    apiClient.get("/order/solar-panels").then((r) => r.data);

export const getInverters = () =>
    apiClient.get("/order/inverters").then((r) => r.data);

export default { getOrders, exportOrders, createOrder, getOrderById, updateOrder, deleteOrder, getSolarPanels, getInverters };
