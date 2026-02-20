import apiClient from "./apiClient";

export const getB2bInvoices = (params = {}) =>
  apiClient.get("/b2b-invoices", { params }).then((r) => r.data);

export const getB2bInvoiceById = (id) =>
  apiClient.get(`/b2b-invoices/${id}`).then((r) => r.data);

export const createB2bInvoiceFromShipment = (shipmentId) =>
  apiClient.post(`/b2b-invoices/from-shipment/${shipmentId}`).then((r) => r.data);

export const downloadB2bInvoicePDF = (id) =>
  apiClient
    .get(`/b2b-invoices/${id}/pdf`, { responseType: "blob" })
    .then((r) => {
      const disposition = r.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      return {
        blob: r.data,
        filename: match?.[1] || `b2b-invoice-${id}.pdf`,
      };
    });

export default {
  getB2bInvoices,
  getB2bInvoiceById,
  createB2bInvoiceFromShipment,
  downloadB2bInvoicePDF,
};
