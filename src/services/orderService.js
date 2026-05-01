import apiClient from "./apiClient";

export const getOrders = (params = {}) =>
    apiClient.get("/order", { params }).then((r) => r.data);

export const exportOrders = (params = {}) =>
    apiClient.get("/order/export", { params, responseType: "blob" }).then((r) => r.data);

export const createOrder = (payload) =>
    apiClient.post("/order", payload).then((r) => r.data);

export const getOrderById = (id, options = {}) =>
    apiClient.get(`/order/${id}`, { signal: options.signal }).then((r) => r.data);

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
    apiClient.put(`/order/${orderId}/fabrication`, payload, { timeout: 120000 }).then((r) => (r.data && "result" in r.data ? r.data.result : r.data));

export const getInstallationByOrderId = (orderId) =>
    apiClient.get(`/order/${orderId}/installation`).then((r) => (r.data && "result" in r.data ? r.data.result : r.data));

export const saveInstallation = (orderId, payload) =>
    apiClient.put(`/order/${orderId}/installation`, payload, { timeout: 120000 }).then((r) => (r.data && "result" in r.data ? r.data.result : r.data));

export const managerApproveInstallation = (orderId, payload = {}) =>
    apiClient
        .put(`/order/${orderId}/installation/manager-approve`, payload)
        .then((r) => (r.data && "result" in r.data ? r.data.result : r.data));

export const managerRejectInstallation = (orderId, payload = {}) =>
    apiClient
        .put(`/order/${orderId}/installation/manager-reject`, payload)
        .then((r) => (r.data && "result" in r.data ? r.data.result : r.data));

export const getDeliveredSerials = (orderId) =>
    apiClient.get(`/order/${orderId}/delivered-serials`).then((r) => (r.data && "result" in r.data ? r.data.result : r.data));

export const validateInstallationSerial = (orderId, serialNumber, productId) =>
    apiClient
        .get(`/order/${orderId}/installation/validate-serial`, {
            params: { serial_number: serialNumber, product_id: productId },
        })
        .then((r) => (r.data && "result" in r.data ? r.data.result : r.data));

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

export const forceCompleteDelivery = (id, payload = {}) =>
    apiClient.post(`/order/${id}/force-complete-delivery`, payload).then((r) => r.data);

export const cancelOrder = (id, payload = {}) =>
    apiClient.post(`/order/${id}/cancel`, payload).then((r) => r.data);

export const getLatestPurchasePrices = (productIds = [], options = {}) =>
    apiClient
        .get("/order/latest-purchase-prices", {
            params: {
                product_ids: productIds.join(","),
                warehouse_id: options?.warehouse_id ?? undefined,
            },
        })
        .then((r) => r.data);

export const getOrderCostAmendments = (id) =>
    apiClient.get(`/order/${id}/cost-amendments`).then((r) => r.data);

export const amendOrder = (id, payload) =>
    apiClient.post(`/order/${id}/amend`, payload).then((r) => r.data);

export const amendOrderStage = (id, payload) =>
    apiClient.post(`/order/${id}/amend-stage`, payload).then((r) => r.data);

export const getOrderAmendments = (id) =>
    apiClient.get(`/order/${id}/amendments`).then((r) => r.data);

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
    managerApproveInstallation,
    managerRejectInstallation,
    getDeliveredSerials,
    validateInstallationSerial,
    downloadOrderPDF,
    forceCompleteDelivery,
    cancelOrder,
    getLatestPurchasePrices,
    getOrderCostAmendments,
    amendOrder,
    amendOrderStage,
    getOrderAmendments,
};
