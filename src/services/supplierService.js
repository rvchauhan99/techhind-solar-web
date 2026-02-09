import apiClient from "./apiClient";

export const getSuppliers = (params = {}) =>
  apiClient.get("/supplier", { params }).then((r) => r.data);

export const getNextSupplierCode = () =>
  apiClient.get("/supplier/next-supplier-code").then((r) => r.data?.result?.supplier_code ?? "");

export const exportSuppliers = (params = {}) =>
  apiClient.get("/supplier/export", { params, responseType: "blob" }).then((r) => r.data);

export const createSupplier = (payload) =>
  apiClient.post("/supplier", payload).then((r) => r.data);

export const getSupplierById = (id) =>
  apiClient.get(`/supplier/${id}`).then((r) => r.data);

export const updateSupplier = (id, payload) =>
  apiClient.put(`/supplier/${id}`, payload).then((r) => r.data);

export const deleteSupplier = (id) =>
  apiClient.delete(`/supplier/${id}`).then((r) => r.data);

export default { getSuppliers, getNextSupplierCode, exportSuppliers, createSupplier, getSupplierById, updateSupplier, deleteSupplier };

