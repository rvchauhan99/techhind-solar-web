import apiClient from "./apiClient";

export const getProductionOrders = (params = {}) =>
  apiClient.get("/production-orders", { params }).then((r) => r.data);

export const exportProductionOrders = (params = {}) =>
  apiClient.get("/production-orders/export", { params, responseType: "blob" }).then((r) => r.data);

export const getProductionOrderById = (id) =>
  apiClient.get(`/production-orders/${id}`).then((r) => r.data);

export const getProductionOrderShortage = (id) =>
  apiClient.get(`/production-orders/${id}/shortage`).then((r) => r.data);

export const getProductionOrderDetail = (id) =>
  apiClient.get(`/production-orders/${id}/detail`).then((r) => r.data);

export const exportProductionOrderDetail = (id) =>
  apiClient
    .get(`/production-orders/${id}/export`, { responseType: "blob" })
    .then((r) => r.data);

export const downloadWorkOrderPdf = (id) =>
  apiClient.get(`/production-orders/${id}/pdf`, { responseType: "blob" }).then((r) => {
    const disposition = r.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    return {
      blob: r.data,
      filename: match?.[1] || `work-order-${id}.pdf`,
    };
  });

export const downloadPicklistPdf = (id) =>
  apiClient.get(`/production-orders/${id}/picklist/pdf`, { responseType: "blob" }).then((r) => {
    const disposition = r.headers?.["content-disposition"] || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    return {
      blob: r.data,
      filename: match?.[1] || `work-order-picklist-${id}.pdf`,
    };
  });

export const createProductionOrder = (payload) =>
  apiClient.post("/production-orders", payload).then((r) => r.data);

export const updateProductionOrder = (id, payload) =>
  apiClient.put(`/production-orders/${id}`, payload).then((r) => r.data);

export const approveProductionOrder = (id) =>
  apiClient.post(`/production-orders/${id}/approve`).then((r) => r.data);

export const cancelProductionOrder = (id, reason = null) =>
  apiClient.post(`/production-orders/${id}/cancel`, { reason }).then((r) => r.data);

export const shortCloseProductionOrder = (id, reason = null) =>
  apiClient.post(`/production-orders/${id}/short-close`, { reason }).then((r) => r.data);

export const deleteProductionOrder = (id) =>
  apiClient.delete(`/production-orders/${id}`).then((r) => r.data);

export default {
  getProductionOrders,
  exportProductionOrders,
  getProductionOrderById,
  getProductionOrderShortage,
  getProductionOrderDetail,
  exportProductionOrderDetail,
  downloadWorkOrderPdf,
  downloadPicklistPdf,
  createProductionOrder,
  updateProductionOrder,
  approveProductionOrder,
  cancelProductionOrder,
  shortCloseProductionOrder,
  deleteProductionOrder,
};
