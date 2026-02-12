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

export const getPendingDeliveryOrders = () =>
    apiClient.get("/order/pending-delivery").then((r) => r.data);

export const getDeliveryExecutionOrders = (params = {}) =>
    apiClient.get("/order/delivery-execution", { params }).then((r) => r.data);

export const getFabricationInstallationOrders = (params = {}) =>
    apiClient.get("/order/fabrication-installation", { params }).then((r) => (r.data && "result" in r.data ? r.data.result : r.data));

export const getFabricationByOrderId = (orderId) =>
    apiClient.get(`/order/${orderId}/fabrication`).then((r) => (r.data && "result" in r.data ? r.data.result : r.data));

export const saveFabrication = (orderId, payload) =>
    apiClient.put(`/order/${orderId}/fabrication`, payload).then((r) => (r.data && "result" in r.data ? r.data.result : r.data));

export const getInstallationByOrderId = (orderId) =>
    apiClient.get(`/order/${orderId}/installation`).then((r) => (r.data && "result" in r.data ? r.data.result : r.data));

export const saveInstallation = (orderId, payload) =>
    apiClient.put(`/order/${orderId}/installation`, payload).then((r) => (r.data && "result" in r.data ? r.data.result : r.data));

export const downloadOrderPDF = (id) =>
    apiClient
        .get(`/order/${id}/pdf`, { responseType: "blob" })
        .then((r) => {
            const disposition = r.headers?.["content-disposition"] || "";
            const match = disposition.match(/filename="?([^"]+)"?/i);
            return {
                blob: r.data,
                filename: match?.[1] || `order-${id}.pdf`,
            };
        });

export default {
    getOrders,
    exportOrders,
    createOrder,
    getOrderById,
    updateOrder,
    deleteOrder,
    getSolarPanels,
    getInverters,
    getPendingDeliveryOrders,
    getDeliveryExecutionOrders,
    getFabricationInstallationOrders,
    getFabricationByOrderId,
    saveFabrication,
    getInstallationByOrderId,
    saveInstallation,
    downloadOrderPDF,
};
