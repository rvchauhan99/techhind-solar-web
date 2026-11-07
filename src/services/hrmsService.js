import apiClient from "./apiClient";

export const listDepartments = (params) =>
  apiClient.get("/hrms/departments", { params }).then((r) => r.data);

export const getDepartment = (id) =>
  apiClient.get(`/hrms/departments/${id}`).then((r) => r.data);

export const createDepartment = (payload) =>
  apiClient.post("/hrms/departments", payload).then((r) => r.data);

export const updateDepartment = (id, payload) =>
  apiClient.put(`/hrms/departments/${id}`, payload).then((r) => r.data);

export const deleteDepartment = (id) =>
  apiClient.delete(`/hrms/departments/${id}`).then((r) => r.data);

export const listDesignations = (params) =>
  apiClient.get("/hrms/designations", { params }).then((r) => r.data);

export const getDesignation = (id) =>
  apiClient.get(`/hrms/designations/${id}`).then((r) => r.data);

export const createDesignation = (payload) =>
  apiClient.post("/hrms/designations", payload).then((r) => r.data);

export const updateDesignation = (id, payload) =>
  apiClient.put(`/hrms/designations/${id}`, payload).then((r) => r.data);

export const deleteDesignation = (id) =>
  apiClient.delete(`/hrms/designations/${id}`).then((r) => r.data);

const hrmsService = {
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listDesignations,
  getDesignation,
  createDesignation,
  updateDesignation,
  deleteDesignation,
};

export default hrmsService;
