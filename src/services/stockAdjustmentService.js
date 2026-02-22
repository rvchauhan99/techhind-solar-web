import apiClient from "./apiClient";

export const getStockAdjustments = (params = {}) =>
  apiClient.get("/stock-adjustments", { params }).then((r) => r.data);

export const exportStockAdjustments = (params = {}) =>
  apiClient.get("/stock-adjustments/export", { params, responseType: "blob" }).then((r) => r.data);

export const createStockAdjustment = (payload) =>
  apiClient.post("/stock-adjustments", payload).then((r) => r.data);

export const updateStockAdjustment = (id, payload) =>
  apiClient.put(`/stock-adjustments/${id}`, payload).then((r) => r.data);

export const getStockAdjustmentById = (id) =>
  apiClient.get(`/stock-adjustments/${id}`).then((r) => r.data);

export const approveStockAdjustment = (id) =>
  apiClient.post(`/stock-adjustments/${id}/approve`).then((r) => r.data);

export const postStockAdjustment = (id) =>
  apiClient.post(`/stock-adjustments/${id}/post`).then((r) => r.data);

export default {
  getStockAdjustments,
  exportStockAdjustments,
  createStockAdjustment,
  updateStockAdjustment,
  getStockAdjustmentById,
  approveStockAdjustment,
  postStockAdjustment,
};

