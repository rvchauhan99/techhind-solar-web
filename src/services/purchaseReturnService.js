import apiClient from "./apiClient";

export const getPurchaseReturns = (params = {}) =>
  apiClient.get("/purchase-returns", { params }).then((r) => r.data);

export const exportPurchaseReturns = (params = {}) =>
  apiClient
    .get("/purchase-returns/export", { params, responseType: "blob" })
    .then((r) => r.data);

export const createPurchaseReturn = (payload) =>
  apiClient.post("/purchase-returns", payload).then((r) => r.data);

export const getPurchaseReturnById = (id) =>
  apiClient.get(`/purchase-returns/${id}`).then((r) => r.data);

export const updatePurchaseReturn = (id, payload) =>
  apiClient.put(`/purchase-returns/${id}`, payload).then((r) => r.data);

export const approvePurchaseReturn = (id) =>
  apiClient.post(`/purchase-returns/${id}/approve`).then((r) => r.data);

export const validateReturnSerials = ({
  product_id,
  serial_numbers,
  warehouse_id,
  purchase_return_id,
}) =>
  apiClient
    .post("/purchase-returns/validate-serials", {
      product_id,
      serial_numbers,
      warehouse_id,
      purchase_return_id,
    })
    .then((r) => (r.data && "result" in r.data ? r.data.result : r.data));

export const getPOInwardDetailsForReturn = (poInwardId) =>
  apiClient.get(`/po-inwards/${poInwardId}`).then((r) => r.data);

export const getPOEligibilityForReturn = (purchaseOrderId, warehouseId) =>
  apiClient
    .get(`/purchase-returns/po/${purchaseOrderId}/eligibility`, {
      params: { warehouse_id: warehouseId },
    })
    .then((r) => (r.data && r.data.result) || r.data);

export const getInwardEligibilityForReturn = (poInwardId) =>
  apiClient
    .get(`/purchase-returns/inward/${poInwardId}/eligibility`)
    .then((r) => (r.data && r.data.result) || r.data);

export default {
  getPurchaseReturns,
  exportPurchaseReturns,
  createPurchaseReturn,
  getPurchaseReturnById,
  updatePurchaseReturn,
  approvePurchaseReturn,
  validateReturnSerials,
  getPOInwardDetailsForReturn,
  getPOEligibilityForReturn,
  getInwardEligibilityForReturn,
};

