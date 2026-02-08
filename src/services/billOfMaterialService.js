import apiClient from "./apiClient";

export const getBillOfMaterials = (params = {}) =>
  apiClient.get("/bill-of-material", { params }).then((r) => r.data);

export const exportBillOfMaterials = (params = {}) =>
  apiClient.get("/bill-of-material/export", { params, responseType: "blob" }).then((r) => r.data);

export const createBillOfMaterial = (payload) =>
  apiClient.post("/bill-of-material", payload).then((r) => r.data);

export const getBillOfMaterialById = (id) =>
  apiClient.get(`/bill-of-material/${id}`).then((r) => r.data);

export const updateBillOfMaterial = (id, payload) =>
  apiClient.put(`/bill-of-material/${id}`, payload).then((r) => r.data);

export const deleteBillOfMaterial = (id) =>
  apiClient.delete(`/bill-of-material/${id}`).then((r) => r.data);

export default { getBillOfMaterials, exportBillOfMaterials, createBillOfMaterial, getBillOfMaterialById, updateBillOfMaterial, deleteBillOfMaterial };

