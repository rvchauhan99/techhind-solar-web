import apiClient from "./apiClient";

const b2bPaymentsReportService = {
  getReport: (params) => apiClient.get("/reports/b2b-payments", { params }).then((r) => r.data),

  exportReport: (params = {}, format = "csv") =>
    apiClient
      .get("/reports/b2b-payments/export", {
        params: { ...params, format },
        responseType: "blob",
      })
      .then((r) => r.data),
};

export default b2bPaymentsReportService;
