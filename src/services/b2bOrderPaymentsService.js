import apiClient from "./apiClient";

const b2bOrderPaymentsService = {
  createPayment: (formData) =>
    apiClient.post("/b2b-order-payments", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),

  getPaymentById: (id) => apiClient.get(`/b2b-order-payments/${id}`).then((r) => r.data),

  getPayments: (params) => apiClient.get("/b2b-order-payments", { params }).then((r) => r.data),

  updatePayment: (id, formData) =>
    apiClient.put(`/b2b-order-payments/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),

  deletePayment: (id) => apiClient.delete(`/b2b-order-payments/${id}`).then((r) => r.data),

  getReceiptUrl: (id) =>
    apiClient.get(`/b2b-order-payments/${id}/receipt-url`).then((r) => r.data?.result?.url ?? r.data?.url ?? null),

  approvePayment: (id, approval_remarks) =>
    apiClient.post(`/b2b-order-payments/${id}/approve`, { approval_remarks }).then((r) => r.data),

  rejectPayment: (id, rejection_reason) =>
    apiClient.post(`/b2b-order-payments/${id}/reject`, { rejection_reason }).then((r) => r.data),

  downloadReceiptPDF: (id) =>
    apiClient
      .get(`/b2b-order-payments/${id}/receipt-pdf`, { responseType: "blob" })
      .then((r) => {
        const disposition = r.headers?.["content-disposition"] || "";
        const match = disposition.match(/filename="?([^"]+)"?/i);
        return { blob: r.data, filename: match?.[1] || `b2b-payment-receipt-${id}.pdf` };
      }),
};

export default b2bOrderPaymentsService;
