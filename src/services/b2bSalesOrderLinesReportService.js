import apiClient from "./apiClient";

const downloadBlob = (response, fallbackFilename) => {
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  const disposition = response.headers?.["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  link.href = url;
  link.download = match?.[1] || fallbackFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const b2bSalesOrderLinesReportService = {
  getReport: (params = {}) =>
    apiClient.get("/reports/b2b-sales-order-lines", { params }).then((r) => r.data),

  exportReport: (params = {}, format = "csv") =>
    apiClient
      .get("/reports/b2b-sales-order-lines/export", {
        params: { ...params, format },
        responseType: "blob",
      })
      .then((response) => {
        const fallback = `b2b-sales-order-lines-report-${new Date().toISOString().slice(0, 10)}.${
          format === "excel" ? "xlsx" : "csv"
        }`;
        downloadBlob(response, fallback);
        return { success: true };
      }),
};

export default b2bSalesOrderLinesReportService;
