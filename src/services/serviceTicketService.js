import apiClient from "./apiClient";

export const getServiceTickets = (params = {}) =>
  apiClient.get("/service-tickets", { params }).then((r) => r.data);

export const getServiceEngineers = () =>
  apiClient.get("/service-tickets/engineers").then((r) => r.data);

export const projectSearch = (params = {}) =>
  apiClient.get("/service-tickets/project-search", { params }).then((r) => r.data);

export const getOrderServiceContext = (orderId) =>
  apiClient.get(`/service-tickets/order/${orderId}/context`).then((r) => r.data);

export const getServiceTicketById = (id) =>
  apiClient.get(`/service-tickets/${id}`).then((r) => r.data);

export const createServiceTicket = (payload) =>
  apiClient.post("/service-tickets", payload).then((r) => r.data);

export const assignServiceEngineer = (id, payload) =>
  apiClient.post(`/service-tickets/${id}/assign`, payload).then((r) => r.data);

export const recordSiteVisit = (id, payload) =>
  apiClient.post(`/service-tickets/${id}/site-visit`, payload).then((r) => r.data);

export const recordServiceCompletion = (id, payload) =>
  apiClient.post(`/service-tickets/${id}/complete`, payload).then((r) => r.data);

export const closeServiceTicket = (id, payload) =>
  apiClient.post(`/service-tickets/${id}/close`, payload).then((r) => r.data);

export const getEligibleProducts = (ticketId) =>
  apiClient.get(`/service-tickets/${ticketId}/eligible-products`).then((r) => r.data);

export const createMaterialRequest = (ticketId, payload) =>
  apiClient.post(`/service-tickets/${ticketId}/material-requests`, payload).then((r) => r.data);

export const submitMaterialRequest = (requestId) =>
  apiClient.post(`/service-tickets/material-requests/${requestId}/submit`).then((r) => r.data);

export const recordServicePayment = (ticketId, formData) =>
  apiClient.post(`/service-tickets/${ticketId}/payments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);

export const getServiceDashboardMetrics = () =>
  apiClient.get("/service-tickets/dashboard/metrics").then((r) => r.data);

export const getServiceTicketReferenceOptions = () =>
  apiClient.get("/service-tickets/reference-options").then((r) => r.data);

export const getWarrantyClaims = (params = {}) =>
  apiClient.get("/service-warranty-claims", { params }).then((r) => r.data);

export const confirmWarrantyReturn = (claimId, payload) =>
  apiClient.post(`/service-warranty-claims/${claimId}/confirm-return`, payload).then((r) => r.data);

const parsePdfBlobResponse = (r, fallbackName) => {
  const disposition = r.headers?.["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return {
    blob: r.data,
    filename: match?.[1] || fallbackName,
  };
};

export const downloadServiceInvoicePDF = (invoiceId) =>
  apiClient
    .get(`/service-tickets/invoices/${invoiceId}/pdf`, { responseType: "blob" })
    .then((r) => parsePdfBlobResponse(r, `service-invoice-${invoiceId}.pdf`));

export const downloadServicePaymentReceiptPDF = (paymentId) =>
  apiClient
    .get(`/service-tickets/payments/${paymentId}/receipt-pdf`, { responseType: "blob" })
    .then((r) => parsePdfBlobResponse(r, `service-payment-receipt-${paymentId}.pdf`));

export default {
  getServiceTickets,
  getServiceEngineers,
  projectSearch,
  getOrderServiceContext,
  getServiceTicketById,
  createServiceTicket,
  assignServiceEngineer,
  recordSiteVisit,
  recordServiceCompletion,
  closeServiceTicket,
  getEligibleProducts,
  createMaterialRequest,
  submitMaterialRequest,
  recordServicePayment,
  getServiceDashboardMetrics,
  getServiceTicketReferenceOptions,
  getWarrantyClaims,
  confirmWarrantyReturn,
  downloadServiceInvoicePDF,
  downloadServicePaymentReceiptPDF,
};
