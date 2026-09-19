import apiClient from "./apiClient"

const unwrap = (r) => r.data?.result ?? r.data?.data ?? r.data

/** Serialize user_ids array or string for query params. */
const normalizeReportParams = (params = {}) => {
  const next = { ...params }
  if (Array.isArray(next.user_ids)) {
    next.user_ids = next.user_ids.filter((id) => id != null && id !== "").join(",")
  }
  if (next.user_ids === "") delete next.user_ids
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

export const getUserTrail = (userId, params = {}) =>
  apiClient
    .get(`/location-tracking/users/${userId}/trail`, { params })
    .then(unwrap)

const locationTrackingService = {
  getTenantDefaults,
  getSettings,
  updateSettings,
  getLiveLocations,
  getDailyReport,
  exportDailyReport,
  getUserTrail,
}

export default locationTrackingService
