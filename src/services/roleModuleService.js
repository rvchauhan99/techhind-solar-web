import apiClient from "./apiClient";

export const listRoleModules = (params) =>
  apiClient.get("/role-module/list", { params }).then((r) => r.data);

export const exportRoleModules = (params = {}) =>
  apiClient.get("/role-module/export", { params, responseType: "blob" }).then((r) => r.data);
export const getRoleModulesByRoleId = (roleId) =>
  apiClient.get(`/role-module/role/${roleId}`).then((r) => r.data);
export const getRoleModule = (id) =>
  apiClient.get(`/role-module/${id}`).then((r) => r.data);
export const createRoleModule = (payload) =>
  apiClient.post("/role-module/create", payload).then((r) => r.data);
export const updateRoleModule = (id, payload) =>
  apiClient.put(`/role-module/${id}`, payload).then((r) => r.data);
export const deleteRoleModule = (id) =>
  apiClient.delete(`/role-module/${id}`).then((r) => r.data);

export const getPermissionForModule = async (moduleId) => {
  // Debug logging to ensure the permission API is actually invoked from the client
  const base = apiClient.defaults?.baseURL || "(no-baseURL)";
  const fullPath = `${base.replace(
    /\/$/,
    ""
  )}/role-module/permission/${moduleId}`;
  console.log(
    "[roleModuleService] requesting permission for moduleId:",
    moduleId,
    "->",
    fullPath
  );
  try {
    const res = await apiClient.get(`/role-module/permission/${moduleId}`);
    console.log(
      "[roleModuleService] received permission response for moduleId:",
      moduleId,
      res && res.status,
      res && res.data
    );
    return res.data;
  } catch (err) {
    console.log(
      "[roleModuleService] error fetching permission for moduleId:",
      moduleId,
      err
    );
    throw err;
  }
};

export default {
  listRoleModules,
  exportRoleModules,
  getRoleModulesByRoleId,
  getRoleModule,
  createRoleModule,
  updateRoleModule,
  deleteRoleModule,
  getPermissionForModule,
};
