import apiClient from "./apiClient";

export const getStocks = (params = {}) =>
  apiClient.get("/stocks", { params }).then((r) => r.data);

export const getStockSummary = (params = {}) =>
  apiClient.get("/stocks/summary", { params }).then((r) => r.data);

export const exportStocks = (params = {}) =>
  apiClient.get("/stocks/export", { params, responseType: "blob" }).then((r) => r.data);

export const getReservationDetails = (params = {}) =>
  apiClient.get("/stocks/reservation-details", { params }).then((r) => r.data);

export const exportReservationDetails = (params = {}) =>
  apiClient.get("/stocks/reservation-details/export", { params, responseType: "blob" }).then((r) => r.data);

export const getStockById = (id) =>
  apiClient.get(`/stocks/${id}`).then((r) => r.data);

export const getStocksByWarehouse = (warehouseId, options = {}) =>
  apiClient.get(`/stocks/warehouse/${warehouseId}`, { signal: options.signal }).then((r) => r.data);

export const getStockByProductAndWarehouse = async (productId, warehouseId, options = {}) => {
  const res = await getStocks({
    product_id: productId,
    warehouse_id: warehouseId,
    limit: 1,
    page: 1,
    ...options,
  });
  const result = res?.result ?? res;
  const rows = result?.data ?? [];
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

export const getAvailableSerials = (productId, warehouseId, options = {}) =>
  apiClient.get("/stocks/serials/available", {
    params: { product_id: productId, warehouse_id: warehouseId },
    signal: options.signal,
  }).then((r) => r.data);

export const validateSerialAvailable = (serialNumber, productId, warehouseId) =>
  apiClient.get("/stocks/serials/validate", {
    params: { serial_number: serialNumber, product_id: productId, warehouse_id: warehouseId },
  }).then((r) => r.data);

export const validateSerialNotExists = (serialNumber, productId, warehouseId) =>
  apiClient.get("/stocks/serials/validate-not-exists", {
    params: { serial_number: serialNumber, product_id: productId, warehouse_id: warehouseId },
  }).then((r) => r.data);

export default {
  getStocks,
  getStockSummary,
  exportStocks,
  getReservationDetails,
  exportReservationDetails,
  getStockById,
  getStocksByWarehouse,
  getStockByProductAndWarehouse,
  getAvailableSerials,
  validateSerialAvailable,
  validateSerialNotExists,
};

