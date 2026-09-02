import apiClient from "./apiClient";

export const getProductionBookings = (params = {}) =>
  apiClient.get("/production-bookings", { params }).then((r) => r.data);

export const exportProductionBookings = (params = {}) =>
  apiClient
    .get("/production-bookings/export", { params, responseType: "blob" })
    .then((r) => r.data);

export const getProductionBookingById = (id) =>
  apiClient.get(`/production-bookings/${id}`).then((r) => r.data);

/** Suggested component lines, operation costs and cost preview for an output quantity. */
export const getBackflushPreview = (params = {}) =>
  apiClient.get("/production-bookings/backflush", { params }).then((r) => r.data);

export const validateProductionSerials = (payload) =>
  apiClient.post("/production-bookings/validate-serials", payload).then((r) => r.data);

export const createProductionBooking = (payload) =>
  apiClient.post("/production-bookings", payload).then((r) => r.data);

export const updateProductionBooking = (id, payload) =>
  apiClient.put(`/production-bookings/${id}`, payload).then((r) => r.data);

export const postProductionBooking = (id) =>
  apiClient.post(`/production-bookings/${id}/post`).then((r) => r.data);

export const cancelProductionBooking = (id, reason = null) =>
  apiClient.post(`/production-bookings/${id}/cancel`, { reason }).then((r) => r.data);

export const deleteProductionBooking = (id) =>
  apiClient.delete(`/production-bookings/${id}`).then((r) => r.data);

export default {
  getProductionBookings,
  exportProductionBookings,
  getProductionBookingById,
  getBackflushPreview,
  validateProductionSerials,
  createProductionBooking,
  updateProductionBooking,
  postProductionBooking,
  cancelProductionBooking,
  deleteProductionBooking,
};
