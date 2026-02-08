import apiClient from "./apiClient";

export const getStockTransfers = (params = {}) =>
  apiClient.get("/stock-transfers", { params }).then((r) => r.data);

export const exportStockTransfers = (params = {}) =>
  apiClient.get("/stock-transfers/export", { params, responseType: "blob" }).then((r) => r.data);

export const createStockTransfer = (payload) =>
  apiClient.post("/stock-transfers", payload).then((r) => r.data);

export const updateStockTransfer = (id, payload) =>
  apiClient.put(`/stock-transfers/${id}`, payload).then((r) => r.data);

export const getStockTransferById = (id) =>
  apiClient.get(`/stock-transfers/${id}`).then((r) => r.data);

export const approveStockTransfer = (id) =>
  apiClient.post(`/stock-transfers/${id}/approve`).then((r) => r.data);

export const receiveStockTransfer = (id) =>
  apiClient.post(`/stock-transfers/${id}/receive`).then((r) => r.data);

export default {
  getStockTransfers,
  exportStockTransfers,
  createStockTransfer,
  updateStockTransfer,
  getStockTransferById,
  approveStockTransfer,
  receiveStockTransfer,
};

