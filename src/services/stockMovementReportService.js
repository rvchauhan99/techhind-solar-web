import apiClient from "./apiClient";

export const getDashboard = (params = {}) =>
  apiClient.get("/stocks/inward-outward", { params }).then((r) => r.data);

export const exportReport = (params = {}, format = "csv") => {
  const exportParams = { ...params, format };
  return apiClient
    .get("/stocks/inward-outward/export", {
      params: exportParams,
      responseType: "blob",
    })
    .then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const contentDisposition = response.headers["content-disposition"];
      let filename = `stock-inward-outward-${new Date().toISOString().split("T")[0]}.${
        format === "excel" ? "xlsx" : "csv"
      }`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/i);
        if (match) filename = match[1];
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
  getDashboard,
  exportReport,
};
