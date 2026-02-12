import apiClient from "./apiClient";

export const getChallans = (params = {}) =>
    apiClient.get("/challan", { params }).then((r) => r.data);

export const getChallanById = (id) =>
    apiClient.get(`/challan/${id}`).then((r) => r.data);

export const createChallan = (payload) =>
    apiClient.post("/challan", payload).then((r) => r.data);

export const updateChallan = (id, payload) =>
    apiClient.put(`/challan/${id}`, payload).then((r) => r.data);

export const deleteChallan = (id) =>
    apiClient.delete(`/challan/${id}`).then((r) => r.data);

export const getNextChallanNumber = () =>
    apiClient.get("/challan/next-challan-number").then((r) => r.data);

export const getQuotationProducts = (orderId) =>
    apiClient.get("/challan/quotation-products", { params: { order_id: orderId } }).then((r) => r.data);

export const getDeliveryStatus = (orderId) =>
    apiClient.get("/challan/delivery-status", { params: { order_id: orderId } }).then((r) => r.data);

export const downloadChallanPDF = (id) =>
    apiClient
        .get(`/challan/${id}/pdf`, { responseType: "blob" })
        .then((r) => {
            const disposition = r.headers?.["content-disposition"] || "";
            const match = disposition.match(/filename="?([^"]+)"?/i);
            return {
                blob: r.data,
                filename: match?.[1] || `delivery-challan-${id}.pdf`,
            };
        });

export default {
    getChallans,
    getChallanById,
    createChallan,
    updateChallan,
    deleteChallan,
    getNextChallanNumber,
    getQuotationProducts,
    getDeliveryStatus,
    downloadChallanPDF,
};
