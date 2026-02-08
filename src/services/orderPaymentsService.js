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
};

export default orderPaymentsService;
