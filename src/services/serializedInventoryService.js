import apiClient from "./apiClient";

export const getSerializedInventoryReport = (params = {}) =>
  apiClient.get("/reports/serialized-inventory", { params }).then((r) => r.data);

export const getSerialLedgerEntries = (serialId) =>
  apiClient.get(`/reports/serialized-inventory/${serialId}/ledger`).then((r) => r.data);

export const exportReport = (params = {}, format = "csv") => {
  const exportParams = { ...params, format };
  return apiClient
    .get("/reports/serialized-inventory/export", {
      params: exportParams,
      responseType: "blob", // Important for file downloads
    })
    .then((response) => {
      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers["content-disposition"];
      let filename = `serialized-inventory-report-${new Date().toISOString().split("T")[0]}.${format === "excel" ? "xlsx" : "csv"}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, filename };
    });
};

export default {
  getSerializedInventoryReport,
  getSerialLedgerEntries,
  exportReport,
};
