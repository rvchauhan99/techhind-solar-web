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

export const getAttendanceTodaySummary = () =>
  apiClient.get("/hrms/attendance/today-summary").then((r) => r.data);

export const getAttendanceCalendar = (params) =>
  apiClient.get("/hrms/attendance/calendar", { params }).then((r) => r.data);

export const getAttendanceSettings = () =>
  apiClient.get("/hrms/attendance-settings").then((r) => r.data);

export const getAttendanceSettingsMeta = () =>
  apiClient.get("/hrms/attendance-settings/meta").then((r) => r.data);

export const updateAttendanceSettings = (payload) =>
  apiClient.put("/hrms/attendance-settings", payload).then((r) => r.data);

export const resetAttendanceSettings = () =>
  apiClient.post("/hrms/attendance-settings/reset").then((r) => r.data);

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

export const listAttendanceReport = (params) =>
  apiClient.get("/hrms/reports/attendance", { params }).then((r) => r.data);

export const exportAttendanceReport = (params) =>
  apiClient
    .get("/hrms/reports/attendance/export", { params, responseType: "blob" })
    .then((r) => r.data);

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

export const getLeaveBalanceAckMe = (params) =>
  apiClient.get("/hrms/leave-balance-acknowledgements/me", { params }).then((r) => r.data);

export const listLeaveBalanceAcks = (params) =>
  apiClient.get("/hrms/leave-balance-acknowledgements", { params }).then((r) => r.data);

export const createLeaveBalanceAck = (payload) =>
  apiClient.post("/hrms/leave-balance-acknowledgements", payload).then((r) => r.data);

export const getLetterTemplateMeta = () =>
  apiClient.get("/hrms/letter-templates/meta").then((r) => r.data);

export const listLetterTemplates = (params) =>
  apiClient.get("/hrms/letter-templates", { params }).then((r) => r.data);

export const getLetterTemplate = (id) =>
  apiClient.get(`/hrms/letter-templates/${id}`).then((r) => r.data);

export const createLetterTemplate = (payload) =>
  apiClient.post("/hrms/letter-templates", payload).then((r) => r.data);

export const updateLetterTemplate = (id, payload) =>
  apiClient.put(`/hrms/letter-templates/${id}`, payload).then((r) => r.data);

export const deleteLetterTemplate = (id) =>
  apiClient.delete(`/hrms/letter-templates/${id}`).then((r) => r.data);

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

export const listEmployeeLetters = (employeeId) =>
  apiClient.get(`/hrms/employees/${employeeId}/letters`).then((r) => r.data);

export const generateEmployeeLetter = (employeeId, payload) =>
  apiClient.post(`/hrms/employees/${employeeId}/letters/generate`, payload).then((r) => r.data);

export const getEmployeeLetterPdfUrl = (employeeId, letterId) =>
  apiClient.get(`/hrms/employees/${employeeId}/letters/${letterId}/pdf`).then((r) => r.data);

export const sendEmployeeLetter = (employeeId, letterId) =>
  apiClient.post(`/hrms/employees/${employeeId}/letters/${letterId}/send`).then((r) => r.data);

export const uploadEmployeeLetterSigned = (employeeId, letterId, formData) =>
  apiClient
    .post(`/hrms/employees/${employeeId}/letters/${letterId}/signed-document`, formData)
    .then((r) => r.data);

export const getEmployeeLetterContents = (employeeId, letterType) =>
  apiClient
    .get(`/hrms/employees/${employeeId}/letter-contents/${letterType}`)
    .then((r) => r.data);

export const upsertEmployeeLetterContents = (employeeId, letterType, payload) =>
  apiClient
    .put(`/hrms/employees/${employeeId}/letter-contents/${letterType}`, payload)
    .then((r) => r.data);

export const getPolicyMeta = () =>
  apiClient.get("/hrms/policies/meta").then((r) => r.data);

export const listPolicies = (params) =>
  apiClient.get("/hrms/policies", { params }).then((r) => r.data);

export const getPolicy = (id) =>
  apiClient.get(`/hrms/policies/${id}`).then((r) => r.data);

export const createPolicy = (formData) =>
  apiClient.post("/hrms/policies", formData).then((r) => r.data);

export const updatePolicy = (id, formData) =>
  apiClient.put(`/hrms/policies/${id}`, formData).then((r) => r.data);

export const deletePolicy = (id) =>
  apiClient.delete(`/hrms/policies/${id}`).then((r) => r.data);

export const getPolicyUrl = (id) =>
  apiClient.get(`/hrms/policies/${id}/url`).then((r) => r.data);

export const getAnnouncementMeta = () =>
  apiClient.get("/hrms/announcements/meta").then((r) => r.data);

export const listAnnouncements = (params) =>
  apiClient.get("/hrms/announcements", { params }).then((r) => r.data);

export const getAnnouncement = (id) =>
  apiClient.get(`/hrms/announcements/${id}`).then((r) => r.data);

export const createAnnouncement = (payload) =>
  apiClient.post("/hrms/announcements", payload).then((r) => r.data);

export const updateAnnouncement = (id, payload) =>
  apiClient.put(`/hrms/announcements/${id}`, payload).then((r) => r.data);

export const deleteAnnouncement = (id) =>
  apiClient.delete(`/hrms/announcements/${id}`).then((r) => r.data);

export const getMyAnnouncements = () =>
  apiClient.get("/hrms/announcements/me").then((r) => r.data);

export const getPositionMeta = () =>
  apiClient.get("/hrms/positions/meta").then((r) => r.data);

export const listPositions = (params) =>
  apiClient.get("/hrms/positions", { params }).then((r) => r.data);

export const getPosition = (id) =>
  apiClient.get(`/hrms/positions/${id}`).then((r) => r.data);

export const createPosition = (payload) =>
  apiClient.post("/hrms/positions", payload).then((r) => r.data);

export const updatePosition = (id, payload) =>
  apiClient.put(`/hrms/positions/${id}`, payload).then((r) => r.data);

export const deletePosition = (id) =>
  apiClient.delete(`/hrms/positions/${id}`).then((r) => r.data);

export const getCandidateMeta = () =>
  apiClient.get("/hrms/candidates/meta").then((r) => r.data);

export const listCandidates = (params) =>
  apiClient.get("/hrms/candidates", { params }).then((r) => r.data);

export const getCandidatePipelineSummary = () =>
  apiClient.get("/hrms/candidates/pipeline-summary").then((r) => r.data);

export const getCandidateFormLink = (params) =>
  apiClient.get("/hrms/candidates/form-link", { params }).then((r) => r.data);

export const downloadCandidateImportTemplate = () =>
  apiClient
    .get("/hrms/candidates/import/template", { responseType: "blob" })
    .then((r) => r.data);

export const importCandidatesFile = (file) => {
  const form = new FormData();
  form.append("file", file);
  return apiClient
    .post("/hrms/candidates/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const patchCandidateEval = (id, payload) =>
  apiClient.patch(`/hrms/candidates/${id}/eval`, payload).then((r) => r.data);

export const patchCandidateOfferLetter = (id, payload) =>
  apiClient.patch(`/hrms/candidates/${id}/offer-letter`, payload).then((r) => r.data);

export const getCandidate = (id) =>
  apiClient.get(`/hrms/candidates/${id}`).then((r) => r.data);

export const listCandidateActivities = (id, params) =>
  apiClient.get(`/hrms/candidates/${id}/activities`, { params }).then((r) => r.data);

export const createCandidate = (payload) =>
  apiClient.post("/hrms/candidates", payload).then((r) => r.data);

export const updateCandidate = (id, payload) =>
  apiClient.put(`/hrms/candidates/${id}`, payload).then((r) => r.data);

export const patchCandidateStage = (id, payload) =>
  apiClient.patch(`/hrms/candidates/${id}/stage`, payload).then((r) => r.data);

export const deleteCandidate = (id) =>
  apiClient.delete(`/hrms/candidates/${id}`).then((r) => r.data);

export const onboardCandidate = (id, payload) =>
  apiClient.post(`/hrms/candidates/${id}/onboard`, payload).then((r) => r.data);

export const uploadCandidateResume = (id, file) => {
  const form = new FormData();
  form.append("resume", file);
  return apiClient
    .post(`/hrms/candidates/${id}/resume`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const acceptCandidateOffer = (id, payload = {}) =>
  apiClient.post(`/hrms/candidates/${id}/accept-offer`, payload).then((r) => r.data);

export const generateCandidateOfferLetter = (id, payload = {}) =>
  apiClient.post(`/hrms/candidates/${id}/offer-letter/generate`, payload).then((r) => r.data);

export const getCandidateOnboardingChecklist = (id) =>
  apiClient.get(`/hrms/candidates/${id}/onboarding-checklist`).then((r) => r.data);

export const patchCandidateOnboardingChecklist = (id, payload) =>
  apiClient.patch(`/hrms/candidates/${id}/onboarding-checklist`, payload).then((r) => r.data);

export const getInterviewMeta = () =>
  apiClient.get("/hrms/interviews/meta").then((r) => r.data);

export const listInterviews = (params) =>
  apiClient.get("/hrms/interviews", { params }).then((r) => r.data);

export const exportInterviews = (params) =>
  apiClient
    .get("/hrms/interviews/export", { params, responseType: "blob" })
    .then((r) => r.data);

export const getInterview = (id) =>
  apiClient.get(`/hrms/interviews/${id}`).then((r) => r.data);

export const createInterview = (payload) =>
  apiClient.post("/hrms/interviews", payload).then((r) => r.data);

export const updateInterview = (id, payload) =>
  apiClient.put(`/hrms/interviews/${id}`, payload).then((r) => r.data);

export const cancelInterview = (id) =>
  apiClient.patch(`/hrms/interviews/${id}/cancel`).then((r) => r.data);

export const evaluateInterview = (id, payload) =>
  apiClient.post(`/hrms/interviews/${id}/evaluate`, payload).then((r) => r.data);

export const deleteInterview = (id) =>
  apiClient.delete(`/hrms/interviews/${id}`).then((r) => r.data);

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

/** Normalize API envelope / list payload to a row array. */
function unwrapList(res) {
  const payload = res?.result ?? res?.data ?? res;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function unwrapRow(res) {
  const payload = res?.result ?? res?.data ?? res;
  if (payload == null) return null;
  if (Array.isArray(payload)) return payload[0] ?? null;
  if (payload?.data && !Array.isArray(payload.data) && typeof payload.data === "object") {
    return payload.data;
  }
  return payload;
}

function toOption(row, labelKeys = ["title", "name", "label", "emp_code"]) {
  if (row == null) return null;
  const id = row.id ?? row.value;
  if (id == null || id === "") return null;
  let label = row.label;
  if (label == null || label === "") {
    for (const k of labelKeys) {
      if (row[k] != null && String(row[k]).trim() !== "") {
        label = String(row[k]).trim();
        break;
      }
    }
  }
  if (label == null || label === "") {
    const first = row.first_name || "";
    const last = row.last_name || "";
    const full = `${first} ${last}`.trim();
    if (full) label = full;
  }
  if ((label == null || label === "") && row.user?.name) label = String(row.user.name);
  if (label == null || label === "") label = `#${id}`;
  return { id, value: id, label, ...row };
}

/**
 * Autocomplete asyncLoadOptions helpers — return Array<{ id, value, label }>.
 * Prefer HRMS module list APIs with `search` (same pattern as Order reference search).
 */
export const searchHrmsPositions = (q, params = {}) =>
  listPositions({
    search: q || undefined,
    status: params.status ?? "active",
    limit: params.limit ?? 20,
    page: 1,
    ...params,
  }).then((res) => unwrapList(res).map((r) => toOption(r, ["title", "name", "label"])));

export const resolveHrmsPosition = (id) =>
  getPosition(id).then((res) => toOption(unwrapRow(res), ["title", "name", "label"]));

export const searchHrmsEmployees = (q, params = {}) =>
  listEmployees({
    search: q || undefined,
    status: params.status ?? "active",
    limit: params.limit ?? 20,
    page: 1,
    ...params,
  }).then((res) =>
    unwrapList(res).map((r) => {
      const name = r.user?.name || r.name || r.emp_code || "";
      const code = r.emp_code ? ` (${r.emp_code})` : "";
      const label = name ? `${name}${code}` : r.emp_code || `#${r.id}`;
      return { id: r.id, value: r.id, label, ...r };
    })
  );

export const resolveHrmsEmployee = (id) =>
  getEmployee(id).then((res) => {
    const r = unwrapRow(res);
    if (!r) return null;
    const name = r.user?.name || r.name || r.emp_code || "";
    const code = r.emp_code ? ` (${r.emp_code})` : "";
    const label = name ? `${name}${code}` : r.emp_code || `#${r.id}`;
    return { id: r.id, value: r.id, label, ...r };
  });

export const searchHrmsCandidates = (q, params = {}) =>
  listCandidates({
    search: q || undefined,
    limit: params.limit ?? 20,
    page: 1,
    ...params,
  }).then((res) =>
    unwrapList(res).map((r) => {
      const name = `${r.first_name || ""} ${r.last_name || ""}`.trim();
      const label = name || r.email || r.mobile || `#${r.id}`;
      return { id: r.id, value: r.id, label, ...r };
    })
  );

export const resolveHrmsCandidate = (id) =>
  getCandidate(id).then((res) => {
    const r = unwrapRow(res);
    if (!r) return null;
    const name = `${r.first_name || ""} ${r.last_name || ""}`.trim();
    const label = name || r.email || r.mobile || `#${r.id}`;
    return { id: r.id, value: r.id, label, ...r };
  });

export const searchHrmsDepartments = (q, params = {}) =>
  listDepartments({
    search: q || undefined,
    status: params.status ?? "active",
    limit: params.limit ?? 20,
    page: 1,
    ...params,
  }).then((res) => unwrapList(res).map((r) => toOption(r, ["title", "name", "label"])));

export const resolveHrmsDepartment = (id) =>
  getDepartment(id).then((res) => toOption(unwrapRow(res), ["title", "name", "label"]));

export const searchHrmsDesignations = (q, params = {}) =>
  listDesignations({
    search: q || undefined,
    status: params.status ?? "active",
    limit: params.limit ?? 20,
    page: 1,
    department_id: params.department_id,
    ...params,
  }).then((res) => unwrapList(res).map((r) => toOption(r, ["title", "name", "label"])));

export const resolveHrmsDesignation = (id) =>
  getDesignation(id).then((res) => toOption(unwrapRow(res), ["title", "name", "label"]));

export const searchHrmsLeaveTypes = (q, params = {}) =>
  listLeaveTypes({
    search: q || undefined,
    status: params.status ?? "active",
    limit: params.limit ?? 20,
    page: 1,
    ...params,
  }).then((res) => unwrapList(res).map((r) => toOption(r, ["title", "name", "label"])));

export const resolveHrmsLeaveType = (id) =>
  getLeaveType(id).then((res) => toOption(unwrapRow(res), ["title", "name", "label"]));

export const searchHrmsPenalties = (q, params = {}) =>
  listPenalties({
    search: q || undefined,
    status: params.status ?? "active",
    limit: params.limit ?? 20,
    page: 1,
    ...params,
  }).then((res) => unwrapList(res).map((r) => toOption(r, ["title", "name", "label"])));

export const resolveHrmsPenalty = (id) =>
  getPenalty(id).then((res) => toOption(unwrapRow(res), ["title", "name", "label"]));

/** Role master (User Master roles) — used on Employee form Role picker. */
export const searchHrmsRoles = (q, params = {}) =>
  apiClient
    .get("/role-master/list", {
      params: { q: q || undefined, status: params.status ?? "active", limit: params.limit ?? 20, page: 1, ...params },
    })
    .then((r) => unwrapList(r.data).map((row) => toOption(row, ["name", "title", "label"])));

export const resolveHrmsRole = (id) =>
  apiClient.get(`/role-master/${id}`).then((r) => toOption(unwrapRow(r.data), ["name", "title", "label"]));

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
  getAttendanceTodaySummary,
  getAttendanceCalendar,
  getAttendanceSettings,
  getAttendanceSettingsMeta,
  updateAttendanceSettings,
  resetAttendanceSettings,
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
  listAttendanceReport,
  exportAttendanceReport,
  listLeaves,
  getLeave,
  applyLeave,
  cancelLeave,
  decideLeave,
  getLeaveBalance,
  getLeaveBalanceAckMe,
  listLeaveBalanceAcks,
  createLeaveBalanceAck,
  getLetterTemplateMeta,
  listLetterTemplates,
  getLetterTemplate,
  createLetterTemplate,
  updateLetterTemplate,
  deleteLetterTemplate,
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
  listEmployeeLetters,
  generateEmployeeLetter,
  getEmployeeLetterPdfUrl,
  sendEmployeeLetter,
  uploadEmployeeLetterSigned,
  getEmployeeLetterContents,
  upsertEmployeeLetterContents,
  getPolicyMeta,
  listPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getPolicyUrl,
  getAnnouncementMeta,
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getMyAnnouncements,
  getPositionMeta,
  listPositions,
  getPosition,
  createPosition,
  updatePosition,
  deletePosition,
  getCandidateMeta,
  listCandidates,
  getCandidatePipelineSummary,
  getCandidateFormLink,
  downloadCandidateImportTemplate,
  importCandidatesFile,
  getCandidate,
  listCandidateActivities,
  createCandidate,
  updateCandidate,
  patchCandidateStage,
  patchCandidateEval,
  patchCandidateOfferLetter,
  deleteCandidate,
  onboardCandidate,
  uploadCandidateResume,
  acceptCandidateOffer,
  generateCandidateOfferLetter,
  getCandidateOnboardingChecklist,
  patchCandidateOnboardingChecklist,
  getInterviewMeta,
  listInterviews,
  exportInterviews,
  getInterview,
  createInterview,
  updateInterview,
  cancelInterview,
  evaluateInterview,
  deleteInterview,
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
  searchHrmsPositions,
  resolveHrmsPosition,
  searchHrmsEmployees,
  resolveHrmsEmployee,
  searchHrmsCandidates,
  resolveHrmsCandidate,
  searchHrmsDepartments,
  resolveHrmsDepartment,
  searchHrmsDesignations,
  resolveHrmsDesignation,
  searchHrmsLeaveTypes,
  resolveHrmsLeaveType,
  searchHrmsPenalties,
  resolveHrmsPenalty,
  searchHrmsRoles,
  resolveHrmsRole,
};

export default hrmsService;
