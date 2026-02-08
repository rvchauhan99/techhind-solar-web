import apiClient from "./apiClient";

export const getPOInwards = (params = {}) =>
  apiClient.get("/po-inwards", { params }).then((r) => r.data);

export const exportPOInwards = (params = {}) =>
  apiClient.get("/po-inwards/export", { params, responseType: "blob" }).then((r) => r.data);

export const createPOInward = (payload) =>
  apiClient.post("/po-inwards", payload).then((r) => r.data);

export const getPOInwardById = (id) =>
  apiClient.get(`/po-inwards/${id}`).then((r) => r.data);

export const updatePOInward = (id, payload) =>
  apiClient.put(`/po-inwards/${id}`, payload).then((r) => r.data);

export const approvePOInward = (id) =>
  apiClient.post(`/po-inwards/${id}/approve`).then((r) => r.data);

export default {
  getPOInwards,
  exportPOInwards,
  createPOInward,
  getPOInwardById,
  updatePOInward,
  approvePOInward,
};

