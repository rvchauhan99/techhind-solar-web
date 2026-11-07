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

export const listEmployees = (params) =>
  apiClient.get("/hrms/employees", { params }).then((r) => r.data);

export const getEmployee = (id) =>
  apiClient.get(`/hrms/employees/${id}`).then((r) => r.data);

export const createEmployee = (payload) =>
  apiClient.post("/hrms/employees", payload).then((r) => r.data);

export const updateEmployee = (id, payload) =>
  apiClient.put(`/hrms/employees/${id}`, payload).then((r) => r.data);

export const activateEmployee = (id, payload) =>
  apiClient.post(`/hrms/employees/${id}/activate`, payload).then((r) => r.data);

export const deactivateEmployee = (id, payload) =>
  apiClient.post(`/hrms/employees/${id}/deactivate`, payload).then((r) => r.data);

export const listHolidays = (params) =>
  apiClient.get("/hrms/holidays", { params }).then((r) => r.data);

export const getHoliday = (id) =>
  apiClient.get(`/hrms/holidays/${id}`).then((r) => r.data);

export const createHoliday = (payload) =>
  apiClient.post("/hrms/holidays", payload).then((r) => r.data);

export const updateHoliday = (id, payload) =>
  apiClient.put(`/hrms/holidays/${id}`, payload).then((r) => r.data);

export const deleteHoliday = (id) =>
  apiClient.delete(`/hrms/holidays/${id}`).then((r) => r.data);

export const listLeaveTypes = (params) =>
  apiClient.get("/hrms/leave-types", { params }).then((r) => r.data);

export const getLeaveType = (id) =>
  apiClient.get(`/hrms/leave-types/${id}`).then((r) => r.data);

export const createLeaveType = (payload) =>
  apiClient.post("/hrms/leave-types", payload).then((r) => r.data);

export const updateLeaveType = (id, payload) =>
  apiClient.put(`/hrms/leave-types/${id}`, payload).then((r) => r.data);

export const deleteLeaveType = (id) =>
  apiClient.delete(`/hrms/leave-types/${id}`).then((r) => r.data);

export const listEmployeeLeaveQuotas = (employeeId) =>
  apiClient.get(`/hrms/employees/${employeeId}/leave-quotas`).then((r) => r.data);

export const upsertEmployeeLeaveQuota = (employeeId, payload) =>
  apiClient.put(`/hrms/employees/${employeeId}/leave-quotas`, payload).then((r) => r.data);

export const deleteEmployeeLeaveQuota = (employeeId, quotaId) =>
  apiClient.delete(`/hrms/employees/${employeeId}/leave-quotas/${quotaId}`).then((r) => r.data);

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
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  activateEmployee,
  deactivateEmployee,
  listHolidays,
  getHoliday,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  listLeaveTypes,
  getLeaveType,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  listEmployeeLeaveQuotas,
  upsertEmployeeLeaveQuota,
  deleteEmployeeLeaveQuota,
};

export default hrmsService;
