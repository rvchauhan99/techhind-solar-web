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

export default {
  getB2bShipments,
  getB2bShipmentById,
  createB2bShipment,
  deleteB2bShipment,
  getNextB2bShipmentNumber,
  downloadB2bShipmentPDF,
};
