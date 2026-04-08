import apiClient from "./apiClient";

export const getQuotations = (params = {}) =>
    apiClient.get("/quotation", { params }).then((r) => r.data);

export const exportQuotations = (params = {}) =>
    apiClient.get("/quotation/export", { params, responseType: "blob" }).then((r) => r.data);

export const createQuotation = (payload) =>
    apiClient.post("/quotation", payload).then((r) => r.data);

export const getQuotationById = (id) =>
    apiClient.get(`/quotation/${id}`).then((r) => r.data);

export const updateQuotation = (id, payload) =>
    apiClient.put(`/quotation/${id}`, payload).then((r) => r.data);

export const deleteQuotation = (id) =>
    apiClient.delete(`/quotation/${id}`).then((r) => r.data);

export const approveQuotation = (id) =>
    apiClient.put(`/quotation/${id}/approve`).then((r) => r.data);

export const unapproveQuotation = (id) =>
    apiClient.put(`/quotation/${id}/unapprove`).then((r) => r.data);

export const managerApproveQuotation = (id, payload = {}) =>
    apiClient.put(`/quotation/${id}/manager-approve`, payload).then((r) => r.data);

export const managerRejectQuotation = (id, payload = {}) =>
    apiClient.put(`/quotation/${id}/manager-reject`, payload).then((r) => r.data);

export const getAllProjectPrices = (schemeId, stateId) =>
    apiClient.post("/quotation/project-price", { schemeId, stateId }).then((r) => r.data);

export const getProjectPriceBomDetails = (payload) =>
    apiClient.post(`/quotation/project-price-bom-details`, payload).then((r) => r.data);

export const getAllProductMakes = () =>
    apiClient.get("/quotation/product-make").then((r) => r.data);

export const getNextQuotationNumber = () =>
    apiClient.get("/quotation/next-quotation-number").then((r) => r.data);

export const getAllProducts = () =>
    apiClient.get("/quotation/products").then((r) => r.data);

export const getQuotationCountByInquiry = (inquiry_id) =>
    apiClient.get("/quotation/quotation-count-by-inquiry", { params: { inquiry_id } }).then((r) => r.data);

export const pdfGenerate = (id) =>
    apiClient.get(`/quotation/${id}/pdf`, { responseType: "blob" }).then((r) => r.data);

export const createPdfJob = (id) =>
    apiClient.post(`/quotation/${id}/pdf/jobs`).then((r) => r.data);

export const getPdfJobStatus = (jobId) =>
    apiClient.get(`/quotation/pdf/jobs/${jobId}`).then((r) => r.data);

export const downloadPdfJob = (jobId) =>
    apiClient.get(`/quotation/pdf/jobs/${jobId}/download`, { responseType: "blob" }).then((r) => r.data);

export default {
    getQuotations,
    exportQuotations,
    createQuotation,
    getQuotationById,
    updateQuotation,
    deleteQuotation,
    approveQuotation,
    unapproveQuotation,
    managerApproveQuotation,
    managerRejectQuotation,
    getAllProjectPrices,
    getProjectPriceBomDetails,
    getAllProductMakes,
    getNextQuotationNumber,
    getAllProducts,
    getQuotationCountByInquiry,
    pdfGenerate,
    createPdfJob,
    getPdfJobStatus,
    downloadPdfJob
};
