import apiClient from "./apiClient";

const unwrap = (r) => (r.data && "result" in r.data ? r.data.result : r.data);

export const getB2bShipmentReturns = (params = {}) =>
  apiClient.get("/b2b-shipment-returns", { params }).then((r) => r.data);

export const getB2bShipmentReturnById = (id) =>
  apiClient.get(`/b2b-shipment-returns/${id}`).then((r) => r.data);

export const getShipmentEligibilityForReturn = (shipmentId, excludeReturnId = null) =>
  apiClient
    .get(`/b2b-shipment-returns/shipment/${shipmentId}/eligibility`, {
      params: excludeReturnId ? { exclude_return_id: excludeReturnId } : undefined,
    })
    .then((r) => unwrap(r));

export const validateB2bReturnSerials = (payload) =>
  apiClient.post("/b2b-shipment-returns/validate-serials", payload).then((r) => unwrap(r));

export const createB2bShipmentReturn = (payload) =>
  apiClient.post("/b2b-shipment-returns", payload).then((r) => r.data);

export const updateB2bShipmentReturn = (id, payload) =>
  apiClient.put(`/b2b-shipment-returns/${id}`, payload).then((r) => r.data);

export const deleteB2bShipmentReturn = (id) =>
  apiClient.delete(`/b2b-shipment-returns/${id}`).then((r) => r.data);

export const approveB2bShipmentReturn = (id) =>
  apiClient.post(`/b2b-shipment-returns/${id}/approve`).then((r) => r.data);

export default {
  getB2bShipmentReturns,
  getB2bShipmentReturnById,
  getShipmentEligibilityForReturn,
  validateB2bReturnSerials,
  createB2bShipmentReturn,
  updateB2bShipmentReturn,
  deleteB2bShipmentReturn,
  approveB2bShipmentReturn,
};
