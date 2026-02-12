import apiClient from "./apiClient";

export const getOrderDocuments = (params = {}) =>
    apiClient.get("/order-documents", { params }).then((r) => r.data);

export const createOrderDocument = (formData) =>
    apiClient.post("/order-documents", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    }).then((r) => r.data);

export const getOrderDocumentById = (id) =>
    apiClient.get(`/order-documents/${id}`).then((r) => r.data);

export const updateOrderDocument = (id, formData) =>
    apiClient.put(`/order-documents/${id}`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    }).then((r) => r.data);

export const deleteOrderDocument = (id) =>
    apiClient.delete(`/order-documents/${id}`).then((r) => r.data);

/** Get signed URL for viewing/downloading document (bucket). Returns url string. */
export const getDocumentUrl = (id) =>
    apiClient.get(`/order-documents/${id}/url`).then((r) => r.data?.result?.url ?? r.data?.url ?? null);

export default {
    getOrderDocuments,
    createOrderDocument,
    getOrderDocumentById,
    updateOrderDocument,
    deleteOrderDocument,
    getDocumentUrl,
};
