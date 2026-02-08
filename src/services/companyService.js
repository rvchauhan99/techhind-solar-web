import apiClient from "./apiClient";

export const getCompanyProfile = () =>
  apiClient.get("/company/profile").then((r) => r.data);

export const updateCompanyProfile = (payload) =>
  apiClient.put("/company/profile", payload).then((r) => r.data);

export const listBankAccounts = () =>
  apiClient.get("/company/bank-accounts").then((r) => r.data);

export const createBankAccount = (payload) =>
  apiClient.post("/company/bank-accounts", payload).then((r) => r.data);

export const updateBankAccount = (id, payload) =>
  apiClient.put(`/company/bank-accounts/${id}`, payload).then((r) => r.data);

export const deleteBankAccount = (id) =>
  apiClient.delete(`/company/bank-accounts/${id}`).then((r) => r.data);

export const listBranches = () =>
  apiClient.get("/company/branches").then((r) => r.data);

export const getDefaultBranch = () =>
  apiClient.get("/company/branches/default").then((r) => r.data);

export const createBranch = (payload) =>
  apiClient.post("/company/branches", payload).then((r) => r.data);

export const updateBranch = (id, payload) =>
  apiClient.put(`/company/branches/${id}`, payload).then((r) => r.data);

export const deleteBranch = (id) =>
  apiClient.delete(`/company/branches/${id}`).then((r) => r.data);

export const listWarehouses = (companyId = null) => {
  const params = companyId ? { company_id: companyId } : {};
  return apiClient.get("/company/warehouses", { params }).then((r) => r.data);
};

export const createWarehouse = (payload) =>
  apiClient.post("/company/warehouses", payload).then((r) => r.data);

export const updateWarehouse = (id, payload) =>
  apiClient.put(`/company/warehouses/${id}`, payload).then((r) => r.data);

export const deleteWarehouse = (id) =>
  apiClient.delete(`/company/warehouses/${id}`).then((r) => r.data);

export const getWarehouseManagers = (warehouseId) =>
  apiClient.get(`/company/warehouses/${warehouseId}/managers`).then((r) => r.data);

export const setWarehouseManagers = (warehouseId, userIds) =>
  apiClient.put(`/company/warehouses/${warehouseId}/managers`, { user_ids: userIds }).then((r) => r.data);

export const uploadCompanyImage = (imageType, file) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("imageType", imageType);
  return apiClient
    .post("/company/images/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const deleteCompanyImage = (imageType) =>
  apiClient
    .post("/company/images/delete", { imageType })
    .then((r) => r.data);

export default {
  getCompanyProfile,
  updateCompanyProfile,
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  listBranches,
  getDefaultBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseManagers,
  setWarehouseManagers,
  uploadCompanyImage,
  deleteCompanyImage,
};

