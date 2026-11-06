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

export const listBranches = (params = {}) =>
  apiClient.get("/company/branches", { params }).then((r) => r.data);

/** Branches assigned to the current user (union membership). */
export const listMyBranches = () =>
  apiClient.get("/company/branches", { params: { mine: 1 } }).then((r) => r.data);

/**
 * Branch picker options: full company list for SuperAdmin;
 * otherwise union of assigned branches (same envelope as list visibility).
 */
export const listBranchesForPicker = ({ isSuperAdmin } = {}) => {
  if (isSuperAdmin) return listBranches();
  return listMyBranches();
};

export const getDefaultBranch = () =>
  apiClient.get("/company/branches/default").then((r) => r.data);

export const createBranch = (payload) =>
  apiClient.post("/company/branches", payload).then((r) => r.data);

export const updateBranch = (id, payload) =>
  apiClient.put(`/company/branches/${id}`, payload).then((r) => r.data);

export const deleteBranch = (id) =>
  apiClient.delete(`/company/branches/${id}`).then((r) => r.data);

export const getBranchManagers = (branchId) =>
  apiClient.get(`/company/branches/${branchId}/managers`).then((r) => r.data);

export const setBranchManagers = (branchId, userIds) =>
  apiClient.put(`/company/branches/${branchId}/managers`, { user_ids: userIds }).then((r) => r.data);

export const listWarehouses = (companyId = null, options = {}) => {
  const params = companyId ? { company_id: companyId } : {};
  if (options.mine) params.mine = 1;
  return apiClient.get("/company/warehouses", { params }).then((r) => r.data);
};

/** Warehouses under the current user's assigned branches. */
export const listMyWarehouses = (companyId = null) =>
  listWarehouses(companyId, { mine: true });

/**
 * Warehouse picker options: full list for SuperAdmin;
 * otherwise warehouses under assigned branches.
 */
export const listWarehousesForPicker = (
  companyId = null,
  { isSuperAdmin } = {}
) => {
  if (isSuperAdmin) return listWarehouses(companyId);
  return listMyWarehouses(companyId);
};

export const getManagedWarehouses = () =>
  apiClient.get("/company/warehouses/managed").then((r) => r.data);

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

/** Get signed URL for company image (bucket). Returns url string. */
export const getImageUrl = (imageType) =>
  apiClient
    .get(`/company/images/${imageType}/url`)
    .then((r) => r.data?.result?.url ?? r.data?.url ?? null);

export default {
  getCompanyProfile,
  updateCompanyProfile,
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  listBranches,
  listMyBranches,
  listBranchesForPicker,
  getDefaultBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchManagers,
  setBranchManagers,
  listWarehouses,
  listMyWarehouses,
  listWarehousesForPicker,
  getManagedWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseManagers,
  setWarehouseManagers,
  uploadCompanyImage,
  deleteCompanyImage,
  getImageUrl,
};

