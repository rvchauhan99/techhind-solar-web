import apiClient from "./apiClient";

export const getStocks = (params = {}) =>
  apiClient.get("/stocks", { params }).then((r) => r.data);

export const exportStocks = (params = {}) =>
  apiClient.get("/stocks/export", { params, responseType: "blob" }).then((r) => r.data);

export const getStockById = (id) =>
  apiClient.get(`/stocks/${id}`).then((r) => r.data);

export const getStocksByWarehouse = (warehouseId) =>
  apiClient.get(`/stocks/warehouse/${warehouseId}`).then((r) => r.data);

export const getAvailableSerials = (productId, warehouseId) =>
  apiClient.get("/stocks/serials/available", {
    params: { product_id: productId, warehouse_id: warehouseId },
  }).then((r) => r.data);

export const validateSerialAvailable = (serialNumber, productId, warehouseId) =>
  apiClient.get("/stocks/serials/validate", {
    params: { serial_number: serialNumber, product_id: productId, warehouse_id: warehouseId },
  }).then((r) => r.data);

export default {
  getStocks,
  exportStocks,
  getStockById,
  getStocksByWarehouse,
  getAvailableSerials,
  validateSerialAvailable,
};

