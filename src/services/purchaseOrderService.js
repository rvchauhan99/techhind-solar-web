import apiClient from "./apiClient";

export const getPurchaseOrders = (params = {}) =>
  apiClient.get("/purchase-orders", { params }).then((r) => r.data);

export const exportPurchaseOrders = (params = {}) =>
  apiClient.get("/purchase-orders/export", { params, responseType: "blob" }).then((r) => r.data);

export const createPurchaseOrder = (payload, files = []) => {
  const formData = new FormData();
  
  // Add all payload fields to FormData
  Object.keys(payload).forEach((key) => {
    if (key === "items") {
      formData.append(key, JSON.stringify(payload[key]));
    } else if (payload[key] !== null && payload[key] !== undefined) {
      formData.append(key, payload[key]);
    }
  });
  
  // Add files
  if (files && files.length > 0) {
    files.forEach((file) => {
      formData.append("attachments", file);
    });
  }
  
  return apiClient.post("/purchase-orders", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }).then((r) => r.data);
};

export const getPurchaseOrderById = (id) =>
  apiClient.get(`/purchase-orders/${id}`).then((r) => r.data);

export const getPurchaseOrderPdf = (id) =>
  apiClient
    .get(`/purchase-orders/${id}/pdf`, { responseType: "blob" })
    .then((r) => {
      const disposition = r.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      return {
        blob: r.data,
        filename: match?.[1] || `PO-${id}.pdf`,
      };
    });

export const updatePurchaseOrder = (id, payload, files = []) => {
  const formData = new FormData();
  
  // Add all payload fields to FormData
  Object.keys(payload).forEach((key) => {
    if (key === "items") {
      formData.append(key, JSON.stringify(payload[key]));
    } else if (payload[key] !== null && payload[key] !== undefined) {
      formData.append(key, payload[key]);
    }
  });
  
  // Add files
  if (files && files.length > 0) {
    files.forEach((file) => {
      formData.append("attachments", file);
    });
  }
  
  return apiClient.put(`/purchase-orders/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }).then((r) => r.data);
};

export const deleteAttachment = (id, attachmentIndex) =>
  apiClient.delete(`/purchase-orders/${id}/attachments/${attachmentIndex}`).then((r) => r.data);

export const getAttachmentUrl = (id, attachmentIndex) =>
  apiClient.get(`/purchase-orders/${id}/attachments/${attachmentIndex}/url`).then((r) => r.data);

export const deletePurchaseOrder = (id) =>
  apiClient.delete(`/purchase-orders/${id}`).then((r) => r.data);

export const approvePurchaseOrder = (id) =>
  apiClient.post(`/purchase-orders/${id}/approve`).then((r) => r.data);

export default {
  getPurchaseOrders,
  exportPurchaseOrders,
  createPurchaseOrder,
  getPurchaseOrderById,
  getPurchaseOrderPdf,
  updatePurchaseOrder,
  deletePurchaseOrder,
  approvePurchaseOrder,
  deleteAttachment,
  getAttachmentUrl,
};

