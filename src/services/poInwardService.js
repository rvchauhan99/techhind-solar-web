import apiClient from "./apiClient";

const appendFormPayload = (formData, payload = {}) => {
  Object.keys(payload).forEach((key) => {
    const value = payload[key];
    if (value === null || value === undefined) return;
    if (key === "charges" || key === "items" || key === "remove_attachment_indexes") {
      formData.append(key, typeof value === "string" ? value : JSON.stringify(value));
    } else if (typeof value === "boolean" || typeof value === "number") {
      formData.append(key, String(value));
    } else {
      formData.append(key, value);
    }
  });
};

const withAttachments = (method, url, payload = {}, files = []) => {
  const formData = new FormData();
  appendFormPayload(formData, payload);
  if (files && files.length > 0) {
    files.forEach((file) => {
      formData.append("attachments", file);
    });
  }
  return apiClient[method](url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};

export const getPOInwards = (params = {}) =>
  apiClient.get("/po-inwards", { params }).then((r) => r.data);

export const exportPOInwards = (params = {}) =>
  apiClient.get("/po-inwards/export", { params, responseType: "blob" }).then((r) => r.data);

export const exportPOInwardById = (id) =>
  apiClient
    .get(`/po-inwards/${id}/export`, { responseType: "blob" })
    .then((r) => {
      const disposition = r.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const dateStamp = new Date().toISOString().split("T")[0];
      return {
        blob: r.data,
        filename: match?.[1] || `po-inward-${id}-${dateStamp}.xlsx`,
      };
    });

export const createPOInward = (payload) =>
  apiClient.post("/po-inwards", payload).then((r) => r.data);

export const getPOInwardById = (id) =>
  apiClient.get(`/po-inwards/${id}`).then((r) => r.data);

/** Get PO details for creating an inward (does not require purchase-orders module access) */
export const getPODetailsForInward = (poId) =>
  apiClient.get(`/po-inwards/po-details/${poId}`).then((r) => r.data);

export const updatePOInward = (id, payload, files = []) => {
  if (files && files.length > 0) {
    return withAttachments("put", `/po-inwards/${id}`, payload, files);
  }
  // JSON path for qty/serials edit (no new files)
  return apiClient.put(`/po-inwards/${id}`, payload).then((r) => r.data);
};

/** Domestic: approve DRAFT → RECEIVED (optional multipart attachments). */
export const approvePOInward = (id, payload = {}, files = []) => {
  if ((files && files.length > 0) || Object.keys(payload || {}).length > 0) {
    return withAttachments("post", `/po-inwards/${id}/approve`, payload, files);
  }
  return apiClient.post(`/po-inwards/${id}/approve`).then((r) => r.data);
};

/** Import-only: post with BOE + shipping + charges (landed cost → inventory). */
export const postPOInward = (id, payload = {}, files = []) =>
  withAttachments("post", `/po-inwards/${id}/post`, payload, files);

export const getAttachmentUrl = (id, attachmentIndex) =>
  apiClient.get(`/po-inwards/${id}/attachments/${attachmentIndex}/url`).then((r) => r.data);

export const deleteAttachment = (id, attachmentIndex) =>
  apiClient.delete(`/po-inwards/${id}/attachments/${attachmentIndex}`).then((r) => r.data);

/** Validate serials for a product (duplicate for same product type). Returns { valid, invalid_serials? }. */
export const validateSerials = ({ product_id, serial_numbers, po_inward_id }) =>
  apiClient
    .post("/po-inwards/validate-serials", { product_id, serial_numbers, po_inward_id })
    .then((r) => (r.data && "result" in r.data ? r.data.result : r.data));

export default {
  getPOInwards,
  exportPOInwards,
  exportPOInwardById,
  createPOInward,
  getPOInwardById,
  getPODetailsForInward,
  updatePOInward,
  approvePOInward,
  postPOInward,
  getAttachmentUrl,
  deleteAttachment,
  validateSerials,
};
