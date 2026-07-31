import apiClient from "./apiClient";

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

export const updatePOInward = (id, payload) =>
  apiClient.put(`/po-inwards/${id}`, payload).then((r) => r.data);

export const approvePOInward = (id) =>
  apiClient.post(`/po-inwards/${id}/approve`).then((r) => r.data);

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
  validateSerials,
};

