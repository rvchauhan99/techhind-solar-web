import apiClient from "./apiClient";

export const getOrderDocuments = (params = {}) =>
    apiClient.get("/order-documents", { params }).then((r) => r.data);

export const createOrderDocument = (formData) =>
    apiClient.post("/order-documents", formData, {
        headers: { "Content-Type": undefined },
    }).then((r) => r.data);

export const getOrderDocumentById = (id) =>
    apiClient.get(`/order-documents/${id}`).then((r) => r.data);

export const updateOrderDocument = (id, formData) =>
    apiClient.put(`/order-documents/${id}`, formData, {
        headers: { "Content-Type": undefined },
    }).then((r) => r.data);

export const deleteOrderDocument = (id) =>
    apiClient.delete(`/order-documents/${id}`).then((r) => r.data);

/** Get signed URL for viewing/downloading document (bucket). Returns url string. */
export const getDocumentUrl = (id) =>
    apiClient.get(`/order-documents/${id}/url`).then((r) => r.data?.result?.url ?? r.data?.url ?? null);

const extractFilename = (contentDisposition) => {
    if (!contentDisposition) return null;
    const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
    const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);
    if (quotedMatch?.[1]) return quotedMatch[1];
    const plainMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
    return plainMatch?.[1]?.trim() || null;
};

export const downloadOrderDocument = (id) =>
    apiClient
        .get(`/order-documents/${id}/download`, { responseType: "blob" })
        .then((r) => ({
            blob: r.data,
            filename: extractFilename(r.headers?.["content-disposition"]),
        }));

export default {
    getOrderDocuments,
    createOrderDocument,
    getOrderDocumentById,
    updateOrderDocument,
    deleteOrderDocument,
    getDocumentUrl,
    downloadOrderDocument,
};
