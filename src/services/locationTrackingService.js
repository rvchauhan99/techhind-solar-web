import apiClient from "./apiClient"

const unwrap = (r) => r.data?.result ?? r.data?.data ?? r.data

/** Serialize user_ids array or string for query params. */
const normalizeReportParams = (params = {}) => {
  const next = { ...params }
  if (Array.isArray(next.user_ids)) {
    next.user_ids = next.user_ids.filter((id) => id != null && id !== "").join(",")
  }
  if (next.user_ids === "") delete next.user_ids
  if (Array.isArray(next.ids)) {
    next.ids = next.ids.filter((id) => id != null && id !== "").join(",")
  }
  if (next.ids === "") delete next.ids
  Object.keys(next).forEach((key) => {
    if (next[key] === "" || next[key] == null) delete next[key]
  })
  return next
}

export const getTenantDefaults = () =>
  apiClient.get("/location-tracking/tenant-defaults").then(unwrap)

export const getSettings = () =>
  apiClient.get("/location-tracking/settings").then(unwrap)

export const updateSettings = (payload) =>
  apiClient.put("/location-tracking/settings", payload).then(unwrap)

export const getLiveLocations = () =>
  apiClient.get("/location-tracking/live").then(unwrap)

export const getDailyReport = (params = {}) =>
  apiClient
    .get("/location-tracking/reports/daily", { params: normalizeReportParams(params) })
    .then(unwrap)

export const exportDailyReport = (params = {}) =>
  apiClient
    .get("/location-tracking/reports/export", {
      params: normalizeReportParams(params),
      responseType: "blob",
    })
    .then((r) => r.data)

export const getTimesheetDashboard = (params = {}) =>
  apiClient
    .get("/location-tracking/reports/timesheet/dashboard", {
      params: normalizeReportParams(params),
    })
    .then(unwrap)

export const getTimesheetReport = (params = {}) =>
  apiClient
    .get("/location-tracking/reports/timesheet", {
      params: normalizeReportParams(params),
    })
    .then(unwrap)

export const exportTimesheetReport = (params = {}) =>
  apiClient
    .get("/location-tracking/reports/timesheet/export", {
      params: normalizeReportParams(params),
      responseType: "blob",
    })
    .then((r) => r.data)

export const forceStopDuty = (payload) =>
  apiClient.post("/location-tracking/duty/force-stop", payload).then(unwrap)

export const getUserTrail = (userId, params = {}) =>
  apiClient
    .get(`/location-tracking/users/${userId}/trail`, { params })
    .then(unwrap)

export const getPingLogs = (params = {}) =>
  apiClient
    .get("/location-tracking/logs/pings", { params: normalizeReportParams(params) })
    .then(unwrap)

export const exportPingLogs = (params = {}) =>
  apiClient
    .get("/location-tracking/logs/pings/export", {
      params: normalizeReportParams(params),
      responseType: "blob",
    })
    .then((r) => r.data)

export const getPingMapPoints = (params = {}) =>
  apiClient
    .get("/location-tracking/logs/pings/map-points", {
      params: normalizeReportParams(params),
    })
    .then(unwrap)

export const getDutyEventLogs = (params = {}) =>
  apiClient
    .get("/location-tracking/logs/duty-events", { params: normalizeReportParams(params) })
    .then(unwrap)

export const exportDutyEventLogs = (params = {}) =>
  apiClient
    .get("/location-tracking/logs/duty-events/export", {
      params: normalizeReportParams(params),
      responseType: "blob",
    })
    .then((r) => r.data)

const locationTrackingService = {
  getTenantDefaults,
  getSettings,
  updateSettings,
  getLiveLocations,
  getDailyReport,
  exportDailyReport,
  getTimesheetDashboard,
  getTimesheetReport,
  exportTimesheetReport,
  forceStopDuty,
  getUserTrail,
  getPingLogs,
  exportPingLogs,
  getPingMapPoints,
  getDutyEventLogs,
  exportDutyEventLogs,
}

export default locationTrackingService
