import apiClient from "./apiClient";

const orderPaymentsService = {
    // Create payment
    createPayment: (formData) =>
        apiClient.post("/order-payments", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }).then((r) => r.data),

    // Get payment by ID
    getPaymentById: (id) =>
        apiClient.get(`/order-payments/${id}`).then((r) => r.data),

    // List payments
    getPayments: (params) =>
        apiClient.get("/order-payments", { params }).then((r) => r.data),

    // Update payment
    updatePayment: (id, formData) =>
        apiClient.put(`/order-payments/${id}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }).then((r) => r.data),

    // Delete payment
    deletePayment: (id) =>
        apiClient.delete(`/order-payments/${id}`).then((r) => r.data),

    /** Get signed URL for receipt file (bucket). Returns url string. */
    getReceiptUrl: (id) =>
        apiClient.get(`/order-payments/${id}/receipt-url`).then((r) => r.data?.result?.url ?? r.data?.url ?? null),

    // Approve payment
    approvePayment: (id) =>
        apiClient.post(`/order-payments/${id}/approve`).then((r) => r.data),

    // Reject payment
    rejectPayment: (id, rejection_reason) =>
        apiClient.post(`/order-payments/${id}/reject`, { rejection_reason }).then((r) => r.data),

    // Download payment receipt PDF
    downloadReceiptPDF: (id) =>
        apiClient
            .get(`/order-payments/${id}/receipt-pdf`, { responseType: "blob" })
            .then((r) => {
                const disposition = r.headers?.["content-disposition"] || "";
                const match = disposition.match(/filename="?([^"]+)"?/i);
                return {
                    blob: r.data,
                    filename: match?.[1] || `payment-receipt-${id}.pdf`,
                };
            }),
};

export default orderPaymentsService;
