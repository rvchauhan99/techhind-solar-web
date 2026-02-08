import apiClient from "./apiClient";

export const getProducts = (params = {}) =>
  apiClient.get("/product", { params }).then((r) => r.data);

export const exportProducts = (params = {}) =>
  apiClient.get("/product/export", { params, responseType: "blob" }).then((r) => r.data);

export const createProduct = (payload) =>
  apiClient.post("/product", payload).then((r) => r.data);

export const getProductById = (id) =>
  apiClient.get(`/product/${id}`).then((r) => r.data);

export const updateProduct = (id, payload) =>
  apiClient.put(`/product/${id}`, payload).then((r) => r.data);

export const deleteProduct = (id) =>
  apiClient.delete(`/product/${id}`).then((r) => r.data);

export default { getProducts, exportProducts, createProduct, getProductById, updateProduct, deleteProduct };

