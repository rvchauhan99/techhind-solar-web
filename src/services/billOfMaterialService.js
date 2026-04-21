import apiClient from "./apiClient";

export const getBillOfMaterials = (params = {}) =>
  apiClient.get("/bill-of-material", { params }).then((r) => r.data);

export const searchBillOfMaterials = async ({ q = "", limit = 20, visibility = "active" } = {}) => {
  const response = await getBillOfMaterials({ q, limit, page: 1, sortBy: "id", sortOrder: "DESC", visibility });
  const result = response?.result || response;
  return Array.isArray(result?.data) ? result.data : [];
};

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

export default {
  getBillOfMaterials,
  searchBillOfMaterials,
  exportBillOfMaterials,
  createBillOfMaterial,
  getBillOfMaterialById,
  updateBillOfMaterial,
  deleteBillOfMaterial,
};

