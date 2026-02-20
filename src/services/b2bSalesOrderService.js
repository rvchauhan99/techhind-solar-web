import apiClient from "./apiClient";

export const getB2bSalesOrders = (params = {}) =>
  apiClient.get("/b2b-sales-orders", { params }).then((r) => r.data);

export const getB2bSalesOrderById = (id) =>
  apiClient.get(`/b2b-sales-orders/${id}`).then((r) => r.data);

export const createB2bSalesOrder = (payload) =>
  apiClient.post("/b2b-sales-orders", payload).then((r) => r.data);

export const createB2bSalesOrderFromQuote = (quoteId, payload = {}) =>
  apiClient.post(`/b2b-sales-orders/from-quote/${quoteId}`, payload).then((r) => r.data);

export const updateB2bSalesOrder = (id, payload) =>
  apiClient.put(`/b2b-sales-orders/${id}`, payload).then((r) => r.data);

export const deleteB2bSalesOrder = (id) =>
  apiClient.delete(`/b2b-sales-orders/${id}`).then((r) => r.data);

export const confirmB2bSalesOrder = (id) =>
  apiClient.put(`/b2b-sales-orders/${id}/confirm`).then((r) => r.data);

export const cancelB2bSalesOrder = (id) =>
  apiClient.put(`/b2b-sales-orders/${id}/cancel`).then((r) => r.data);

export const getNextB2bSalesOrderNumber = () =>
  apiClient.get("/b2b-sales-orders/next-number").then((r) => r.data);

export const getB2bSalesOrderItemsForShipment = (orderId) =>
  apiClient.get(`/b2b-sales-orders/${orderId}/items-for-shipment`).then((r) => r.data);

export const downloadB2bSalesOrderPDF = (id) =>
  apiClient
    .get(`/b2b-sales-orders/${id}/pdf`, { responseType: "blob" })
    .then((r) => {
      const disposition = r.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      return {
        blob: r.data,
        filename: match?.[1] || `b2b-sales-order-${id}.pdf`,
      };
    });

export default {
  getB2bSalesOrders,
  getB2bSalesOrderById,
  createB2bSalesOrder,
  createB2bSalesOrderFromQuote,
  updateB2bSalesOrder,
  deleteB2bSalesOrder,
  confirmB2bSalesOrder,
  cancelB2bSalesOrder,
  getNextB2bSalesOrderNumber,
  getB2bSalesOrderItemsForShipment,
  downloadB2bSalesOrderPDF,
};
