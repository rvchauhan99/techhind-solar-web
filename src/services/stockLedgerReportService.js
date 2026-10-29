import apiClient from "./apiClient";

export const getStockLedgerReport = (params = {}) =>
  apiClient.get("/reports/stock-ledger", { params }).then((r) => r.data);

export const exportStockLedgerReport = (params = {}, format = "excel") => {
  const exportParams = { ...params, format };
  return apiClient
    .get("/reports/stock-ledger/export", {
      params: exportParams,
      responseType: "blob",
    })
    .then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      const contentDisposition = response.headers["content-disposition"];
      let filename = `stock-ledger-${new Date().toISOString().split("T")[0]}.${
        format === "excel" || format === "xlsx" ? "xlsx" : "csv"
      }`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
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
    })
    .catch(async (err) => {
      const data = err?.response?.data;
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text());
          if (parsed?.message) err.response.data = parsed;
        } catch {
          // non-JSON error body; keep original error
        }
      }
      throw err;
    });
};

export default {
  getStockLedgerReport,
  exportStockLedgerReport,
};
