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

export const exportEmployees = (params) =>
  apiClient
    .get("/hrms/employees/export", { params, responseType: "blob" })
    .then((r) => r.data);

export const getEmployeeProfileImageUrl = (id) =>
  apiClient.get(`/hrms/employees/${id}/profile-image/url`).then((r) => r.data);

export const uploadEmployeeProfileImage = (id, file) => {
  const form = new FormData();
  form.append("image", file);
  return apiClient.post(`/hrms/employees/${id}/profile-image`, form).then((r) => r.data);
};

export const removeEmployeeProfileImage = (id) =>
  apiClient.delete(`/hrms/employees/${id}/profile-image`).then((r) => r.data);

export const getAttendanceMonthlySummary = (params) =>
  apiClient.get("/hrms/attendance/summary", { params }).then((r) => r.data);

// ---- Plan 08: Payroll ----

export const listPayrollReports = (params) =>
  apiClient.get("/hrms/payroll", { params }).then((r) => r.data);

export const getPayrollReport = (id) =>
  apiClient.get(`/hrms/payroll/${id}`).then((r) => r.data);

export const runPayroll = (payload) =>
  apiClient.post("/hrms/payroll/runs", payload).then((r) => r.data);

export const listPayrollRuns = (params) =>
  apiClient.get("/hrms/payroll/runs", { params }).then((r) => r.data);

export const listPayrollFlags = (params) =>
  apiClient.get("/hrms/payroll/flags", { params }).then((r) => r.data);

export const generatePayrollFlags = (payload) =>
  apiClient.post("/hrms/payroll/flags/generate", payload).then((r) => r.data);

export const downloadSalarySlip = (id) =>
  apiClient.get(`/hrms/payroll/${id}/slip`, { responseType: "blob" }).then((r) => r.data);

export const ackSalarySlip = (id) =>
  apiClient.post(`/hrms/payroll/${id}/ack`).then((r) => r.data);

export const raiseSalaryQuery = (id, payload) =>
  apiClient.post(`/hrms/payroll/${id}/query`, payload).then((r) => r.data);

export const solveSalaryQuery = (id, payload) =>
  apiClient.post(`/hrms/payroll/${id}/solve`, payload).then((r) => r.data);

export const exportPayoutReport = (params) =>
  apiClient
    .get("/hrms/reports/payout", { params, responseType: "blob" })
    .then((r) => r.data);

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

export const listAttendance = (params) =>
  apiClient.get("/hrms/attendance", { params }).then((r) => r.data);

export const getAttendanceStatus = () =>
  apiClient.get("/hrms/attendance/status").then((r) => r.data);

export const punchAttendance = (payload) =>
  apiClient.post("/hrms/attendance/punch", payload).then((r) => r.data);

export const listAttendanceRequests = (params) =>
  apiClient.get("/hrms/attendance-requests", { params }).then((r) => r.data);

export const createAttendanceRequest = (payload) =>
  apiClient.post("/hrms/attendance-requests", payload).then((r) => r.data);

export const decideAttendanceRequest = (id, payload) =>
  apiClient.post(`/hrms/attendance-requests/${id}/decide`, payload).then((r) => r.data);

export const exportAttendanceReport = (params) =>
  apiClient
    .get("/hrms/reports/attendance", { params, responseType: "blob" })
    .then((r) => r.data);

export const autoCheckoutAttendance = (payload = {}) =>
  apiClient.post("/hrms/attendance/auto-checkout", payload).then((r) => r.data);

export const listLeaves = (params) =>
  apiClient.get("/hrms/leaves", { params }).then((r) => r.data);

export const getLeave = (id) =>
  apiClient.get(`/hrms/leaves/${id}`).then((r) => r.data);

export const applyLeave = (payload) =>
  apiClient.post("/hrms/leaves", payload).then((r) => r.data);

export const cancelLeave = (id) =>
  apiClient.post(`/hrms/leaves/${id}/cancel`).then((r) => r.data);

export const decideLeave = (id, payload) =>
  apiClient.post(`/hrms/leaves/${id}/decide`, payload).then((r) => r.data);

export const getLeaveBalance = (params) =>
  apiClient.get("/hrms/leaves/balance", { params }).then((r) => r.data);

export const listLeaveReport = (params) =>
  apiClient.get("/hrms/reports/leave", { params }).then((r) => r.data);

export const exportLeaveReport = (params) =>
  apiClient
    .get("/hrms/reports/leave", {
      params: { ...params, export: "xlsx" },
      responseType: "blob",
    })
    .then((r) => r.data);

export const listLeaveBalanceReport = (params) =>
  apiClient.get("/hrms/reports/leave-balance", { params }).then((r) => r.data);

export const exportLeaveBalanceReport = (params) =>
  apiClient
    .get("/hrms/reports/leave-balance", {
      params: { ...params, export: "xlsx" },
      responseType: "blob",
    })
    .then((r) => r.data);

export const getEmployeeAnnexure = (employeeId, params) =>
  apiClient
    .get(`/hrms/employees/${employeeId}/annexure`, { params })
    .then((r) => r.data);

export const upsertEmployeeAnnexure = (employeeId, payload) =>
  apiClient.put(`/hrms/employees/${employeeId}/annexure`, payload).then((r) => r.data);

export const listEmployeeSalaryIncrements = (employeeId) =>
  apiClient
    .get(`/hrms/employees/${employeeId}/annexure/increments`)
    .then((r) => r.data);

export const createEmployeeSalaryIncrement = (employeeId, payload) =>
  apiClient
    .post(`/hrms/employees/${employeeId}/annexure/increments`, payload)
    .then((r) => r.data);

export const listEmployeeDocuments = (employeeId, params) =>
  apiClient.get(`/hrms/employees/${employeeId}/documents`, { params }).then((r) => r.data);

export const uploadEmployeeDocument = (employeeId, formData) =>
  apiClient.post(`/hrms/employees/${employeeId}/documents`, formData).then((r) => r.data);

export const getEmployeeDocumentUrl = (employeeId, docId) =>
  apiClient.get(`/hrms/employees/${employeeId}/documents/${docId}/url`).then((r) => r.data);

export const deleteEmployeeDocument = (employeeId, docId) =>
  apiClient.delete(`/hrms/employees/${employeeId}/documents/${docId}`).then((r) => r.data);

export const cloneHolidayYear = (payload) =>
  apiClient.post("/hrms/holidays/clone-year", payload).then((r) => r.data);

export const bulkCreateHolidays = (payload) =>
  apiClient.post("/hrms/holidays/bulk", payload).then((r) => r.data);

export const listLeaveTypeHistory = (id) =>
  apiClient.get(`/hrms/leave-types/${id}/history`).then((r) => r.data);

// ---- Plan 07: Penalty + Compensatory ----

export const listPenalties = (params) =>
  apiClient.get("/hrms/penalties", { params }).then((r) => r.data);

export const getPenalty = (id) =>
  apiClient.get(`/hrms/penalties/${id}`).then((r) => r.data);

export const createPenalty = (payload) =>
  apiClient.post("/hrms/penalties", payload).then((r) => r.data);

export const updatePenalty = (id, payload) =>
  apiClient.put(`/hrms/penalties/${id}`, payload).then((r) => r.data);

export const deletePenalty = (id) =>
  apiClient.delete(`/hrms/penalties/${id}`).then((r) => r.data);

export const listPenaltyIssues = (params) =>
  apiClient.get("/hrms/penalty-issues", { params }).then((r) => r.data);

export const getPenaltyIssue = (id) =>
  apiClient.get(`/hrms/penalty-issues/${id}`).then((r) => r.data);

export const createPenaltyIssue = (payload) =>
  apiClient.post("/hrms/penalty-issues", payload).then((r) => r.data);

export const updatePenaltyIssue = (id, payload) =>
  apiClient.put(`/hrms/penalty-issues/${id}`, payload).then((r) => r.data);

export const setPenaltyIssueStatus = (id, status) =>
  apiClient.patch(`/hrms/penalty-issues/${id}/status`, { status }).then((r) => r.data);

export const exportPenaltyIssuesPath = (params) => {
  const qs = new URLSearchParams(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return `/hrms/penalty-issues/export${qs ? `?${qs}` : ""}`;
};

export const exportPenaltyIssues = (params) =>
  apiClient
    .get(exportPenaltyIssuesPath(params), { responseType: "blob" })
    .then((r) => r.data);

export const listCompensatory = (params) =>
  apiClient.get("/hrms/compensatory", { params }).then((r) => r.data);

export const getCompensatory = (id) =>
  apiClient.get(`/hrms/compensatory/${id}`).then((r) => r.data);

export const createCompensatory = (payload) =>
  apiClient.post("/hrms/compensatory", payload).then((r) => r.data);

export const decideCompensatory = (id, payload) =>
  apiClient.post(`/hrms/compensatory/${id}/decide`, payload).then((r) => r.data);

export const getCompensatoryReport = (params) =>
  apiClient.get("/hrms/reports/compensatory", { params }).then((r) => r.data);

export const exportCompensatoryReportPath = (params) => {
  const qs = new URLSearchParams(
    Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return `/hrms/reports/compensatory/export${qs ? `?${qs}` : ""}`;
};

export const exportCompensatoryReport = (params) =>
  apiClient
    .get(exportCompensatoryReportPath(params), { responseType: "blob" })
    .then((r) => r.data);

export const downloadExport = (path, filename) =>
  apiClient
    .get(path, { responseType: "blob" })
    .then((r) => {
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    });


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
  exportEmployees,
  getEmployeeProfileImageUrl,
  uploadEmployeeProfileImage,
  removeEmployeeProfileImage,
  getAttendanceMonthlySummary,
  listPayrollReports,
  getPayrollReport,
  runPayroll,
  listPayrollRuns,
  listPayrollFlags,
  generatePayrollFlags,
  downloadSalarySlip,
  ackSalarySlip,
  raiseSalaryQuery,
  solveSalaryQuery,
  exportPayoutReport,
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
  listAttendance,
  getAttendanceStatus,
  punchAttendance,
  listAttendanceRequests,
  createAttendanceRequest,
  decideAttendanceRequest,
  exportAttendanceReport,
  autoCheckoutAttendance,
  listLeaves,
  getLeave,
  applyLeave,
  cancelLeave,
  decideLeave,
  getLeaveBalance,
  listLeaveReport,
  exportLeaveReport,
  listLeaveBalanceReport,
  exportLeaveBalanceReport,
  getEmployeeAnnexure,
  upsertEmployeeAnnexure,
  listEmployeeSalaryIncrements,
  createEmployeeSalaryIncrement,
  listEmployeeDocuments,
  uploadEmployeeDocument,
  getEmployeeDocumentUrl,
  deleteEmployeeDocument,
  cloneHolidayYear,
  bulkCreateHolidays,
  listLeaveTypeHistory,
  listPenalties,
  getPenalty,
  createPenalty,
  updatePenalty,
  deletePenalty,
  listPenaltyIssues,
  getPenaltyIssue,
  createPenaltyIssue,
  updatePenaltyIssue,
  setPenaltyIssueStatus,
  exportPenaltyIssuesPath,
  exportPenaltyIssues,
  listCompensatory,
  getCompensatory,
  createCompensatory,
  decideCompensatory,
  getCompensatoryReport,
  exportCompensatoryReportPath,
  exportCompensatoryReport,
  downloadExport,
};

export default hrmsService;
