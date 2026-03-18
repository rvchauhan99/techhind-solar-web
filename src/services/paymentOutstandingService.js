import apiClient from "./apiClient";

const paymentOutstandingService = {
  list: (params) => apiClient.get("/payment-outstanding", { params }).then((r) => r.data),
  kpis: (params) => apiClient.get("/payment-outstanding/kpis", { params }).then((r) => r.data?.data ?? r.data),
  trend: (params) => apiClient.get("/payment-outstanding/trend", { params }).then((r) => r.data?.data ?? r.data),
  analysis: (params) => apiClient.get("/payment-outstanding/analysis", { params }).then((r) => r.data?.data ?? r.data),
  exportCsv: (params) =>
    apiClient
      .get("/payment-outstanding/export", { params, responseType: "blob" })
      .then((r) => {
        const disposition = r.headers?.["content-disposition"] || "";
        const match = disposition.match(/filename=\"?([^\"]+)\"?/i);
        return { blob: r.data, filename: match?.[1] || "payment-outstanding.csv" };
      }),
  listFollowUps: (orderId, params) =>
    apiClient.get(`/payment-outstanding/${orderId}/followups`, { params }).then((r) => r.data?.data ?? r.data),
  createFollowUp: (orderId, payload) =>
    apiClient.post(`/payment-outstanding/${orderId}/followups`, payload).then((r) => r.data?.data ?? r.data),
};

export default paymentOutstandingService;

