import apiClient from "./apiClient";

const paymentsReportService = {
  getPaymentsReport: (params = {}) =>
    apiClient.get("/reports/payments", { params }).then((r) => r.data),

  exportPaymentsReport: (params = {}, format = "csv") =>
    apiClient
      .get("/reports/payments/export", {
        params: { ...params, format },
        responseType: "blob",
      })
      .then((r) => r.data),
};

export default paymentsReportService;

