import apiClient from "./apiClient";

export const getProjectPrices = (params = {}) =>
  apiClient.get("/project-price", { params }).then((r) => r.data);

export const exportProjectPrices = (params = {}) =>
  apiClient.get("/project-price/export", { params, responseType: "blob" }).then((r) => r.data);

export const getAllBom = () => apiClient.get("/project-price/bomDetails").then((r) => r.data);

export const createProjectPrice = (payload) =>
  apiClient.post("/project-price", payload).then((r) => r.data);

export const getProjectPriceById = (id) =>
  apiClient.get(`/project-price/${id}`).then((r) => r.data);

export const updateProjectPrice = (id, payload) =>
  apiClient.put(`/project-price/${id}`, payload).then((r) => r.data);

export const deleteProjectPrice = (id) =>
  apiClient.delete(`/project-price/${id}`).then((r) => r.data);

export default {
  getProjectPrices,
  exportProjectPrices,
  createProjectPrice,
  getProjectPriceById,
  updateProjectPrice,
  deleteProjectPrice,
  getAllBom
};
