import apiClient from "./apiClient";

export const getConfirmedOrders = (params = {}) =>
    apiClient.get("/confirm-orders", { params }).then((r) => r.data);

export const getOrderById = (id) =>
    apiClient.get(`/confirm-orders/${id}`).then((r) => r.data);

/**
 * Get Model Agreement PDF as blob (view or download).
 * @param {string|number} orderId
 * @param {{ action: 'view' | 'download' }} options
 * @returns {Promise<Blob>}
 */
export const getModelAgreementPdf = (orderId, options = {}) => {
    const action = options.action === "download" ? "download" : "view";
    return apiClient
        .get(`/confirm-orders/${orderId}/model-agreement-pdf`, {
            params: action === "download" ? { action: "download" } : undefined,
            responseType: "blob",
        })
        .then((r) => r.data);
};

export default { getConfirmedOrders, getOrderById, getModelAgreementPdf };
