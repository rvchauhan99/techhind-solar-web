import apiClient from "./apiClient";

export const getB2bShipments = (params = {}) =>
  apiClient.get("/b2b-shipments", { params }).then((r) => r.data);

export const getB2bShipmentById = (id) =>
  apiClient.get(`/b2b-shipments/${id}`).then((r) => r.data);

export const createB2bShipment = (payload) =>
  apiClient.post("/b2b-shipments", payload).then((r) => r.data);

export const deleteB2bShipment = (id) =>
  apiClient.delete(`/b2b-shipments/${id}`).then((r) => r.data);

export const getNextB2bShipmentNumber = () =>
  apiClient.get("/b2b-shipments/next-number").then((r) => r.data);

export const downloadB2bShipmentPDF = (id) =>
  apiClient
    .get(`/b2b-shipments/${id}/pdf`, { responseType: "blob" })
    .then((r) => {
      const disposition = r.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      return {
        blob: r.data,
        filename: match?.[1] || `b2b-shipment-${id}.pdf`,
      };
    });

export const exportB2bShipmentById = (id) =>
  apiClient
    .get(`/b2b-shipments/${id}/export`, { responseType: "blob" })
    .then((r) => {
      const disposition = r.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const dateStamp = new Date().toISOString().split("T")[0];
      return {
        blob: r.data,
        filename: match?.[1] || `b2b-shipment-${id}-${dateStamp}.xlsx`,
      };
    });

export const uploadB2bShipmentPhotos = (id, files = []) => {
  const formData = new FormData();
  (files || []).forEach((file) => formData.append("photos", file));
  return apiClient
    .post(`/b2b-shipments/${id}/photos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const getB2bShipmentPhotoUrl = (id, photoId) =>
  apiClient
    .get(`/b2b-shipments/${id}/photos/${photoId}/url`)
    .then((r) => r.data?.result?.url ?? r.data?.url ?? null);

export const deleteB2bShipmentPhoto = (id, photoId) =>
  apiClient.delete(`/b2b-shipments/${id}/photos/${photoId}`).then((r) => r.data);

export default {
  getB2bShipments,
  getB2bShipmentById,
  createB2bShipment,
  deleteB2bShipment,
  getNextB2bShipmentNumber,
  downloadB2bShipmentPDF,
  exportB2bShipmentById,
  uploadB2bShipmentPhotos,
  getB2bShipmentPhotoUrl,
  deleteB2bShipmentPhoto,
};
