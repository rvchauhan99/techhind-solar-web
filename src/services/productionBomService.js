import apiClient from "./apiClient";

export const getProductionBoms = (params = {}) =>
  apiClient.get("/production-bom", { params }).then((r) => r.data);

export const exportProductionBoms = (params = {}) =>
  apiClient.get("/production-bom/export", { params, responseType: "blob" }).then((r) => r.data);

export const getProductionBomById = (id) =>
  apiClient.get(`/production-bom/${id}`).then((r) => r.data);

export const getActiveBomByProduct = (productId, params = {}) =>
  apiClient.get(`/production-bom/by-product/${productId}/active`, { params }).then((r) => r.data);

export const createProductionBom = (payload) =>
  apiClient.post("/production-bom", payload).then((r) => r.data);

export const updateProductionBom = (id, payload) =>
  apiClient.put(`/production-bom/${id}`, payload).then((r) => r.data);

export const cloneProductionBom = (id, payload = {}) =>
  apiClient.post(`/production-bom/${id}/clone`, payload).then((r) => r.data);

export const activateProductionBom = (id, payload = {}) =>
  apiClient.post(`/production-bom/${id}/activate`, payload).then((r) => r.data);

export const deactivateProductionBom = (id) =>
  apiClient.post(`/production-bom/${id}/deactivate`).then((r) => r.data);

export const deleteProductionBom = (id) =>
  apiClient.delete(`/production-bom/${id}`).then((r) => r.data);

export default {
  getProductionBoms,
  exportProductionBoms,
  getProductionBomById,
  getActiveBomByProduct,
  createProductionBom,
  updateProductionBom,
  cloneProductionBom,
  activateProductionBom,
  deactivateProductionBom,
  deleteProductionBom,
};
