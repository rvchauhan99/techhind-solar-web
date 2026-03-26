import apiClient from "./apiClient";

export const downloadOrderImportSampleCsv = () =>
  apiClient.get("/order/import/sample", { responseType: "blob" }).then((r) => r.data);

export const uploadOrderImportCsv = (file, options = {}) => {
  const formData = new FormData();
  formData.append("file", file);

  // Checkbox values (send booleans explicitly)
  formData.append("dry_run", options.dryRun ? "true" : "false");
  formData.append("skip_existing", options.skipExisting ? "true" : "false");
  formData.append("update_existing", options.updateExisting ? "true" : "false");

  return apiClient
    .post("/order/import/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const getOrderImportJobStatus = (jobId) =>
  apiClient.get(`/order/import/jobs/${jobId}`).then((r) => r.data);

export const getOrderImportJobResults = (jobId) =>
  apiClient.get(`/order/import/jobs/${jobId}/results`).then((r) => r.data);

export const getOrderImportJobsHistory = ({ page = 1, limit = 10, status, sortBy, sortOrder } = {}) => {
  const params = { page, limit };
  if (status) params.status = status;
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;
  return apiClient.get("/order/import/jobs", { params }).then((r) => r.data);
};

export const downloadOrderImportJobExcel = (jobId) =>
  apiClient
    .get(`/order/import/jobs/${jobId}/download`, { responseType: "blob" })
    .then((r) => {
      const disposition = r.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] || `order-import-${jobId}.xlsx`;
      return { blob: r.data, filename };
    });

export default {
  downloadOrderImportSampleCsv,
  uploadOrderImportCsv,
  getOrderImportJobStatus,
  getOrderImportJobResults,
  getOrderImportJobsHistory,
  downloadOrderImportJobExcel,
};

