import apiClient from "./apiClient"

const unwrap = (r) => r.data?.result ?? r.data?.data ?? r.data

export const listTrips = (params = {}) =>
  apiClient.get("/field-trips", { params }).then(unwrap)

export const listRunning = () =>
  apiClient.get("/field-trips/running").then(unwrap)

export const getTrip = (id) =>
  apiClient.get(`/field-trips/${id}`).then(unwrap)

export const getTripPings = (id, params = {}) =>
  apiClient.get(`/field-trips/${id}/pings`, { params }).then(unwrap)

export const getOdometerPhotoUrl = (id, which) =>
  apiClient
    .get(`/field-trips/${id}/odometer-photo`, { params: { which } })
    .then(unwrap)

export const approveExpense = (id, body = {}) =>
  apiClient.post(`/field-trips/${id}/expense/approve`, body).then(unwrap)

export const rejectExpense = (id, body = {}) =>
  apiClient.post(`/field-trips/${id}/expense/reject`, body).then(unwrap)

export const exportTrips = (params = {}) =>
  apiClient
    .get("/field-trips/export", { params, responseType: "blob" })
    .then((r) => r.data)

const fieldTripsService = {
  listTrips,
  listRunning,
  getTrip,
  getTripPings,
  getOdometerPhotoUrl,
  approveExpense,
  rejectExpense,
  exportTrips,
}

export default fieldTripsService
