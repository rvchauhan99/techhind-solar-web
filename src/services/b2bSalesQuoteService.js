import apiClient from "./apiClient";

export const getB2bSalesQuotes = (params = {}) =>
  apiClient.get("/b2b-sales-quotes", { params }).then((r) => r.data);

export const getB2bSalesQuoteById = (id) =>
  apiClient.get(`/b2b-sales-quotes/${id}`).then((r) => r.data);

export const createB2bSalesQuote = (payload) =>
  apiClient.post("/b2b-sales-quotes", payload).then((r) => r.data);

export const updateB2bSalesQuote = (id, payload) =>
  apiClient.put(`/b2b-sales-quotes/${id}`, payload).then((r) => r.data);

export const deleteB2bSalesQuote = (id) =>
  apiClient.delete(`/b2b-sales-quotes/${id}`).then((r) => r.data);

export const approveB2bSalesQuote = (id) =>
  apiClient.put(`/b2b-sales-quotes/${id}/approve`).then((r) => r.data);

export const unapproveB2bSalesQuote = (id) =>
  apiClient.put(`/b2b-sales-quotes/${id}/unapprove`).then((r) => r.data);

export const cancelB2bSalesQuote = (id) =>
  apiClient.put(`/b2b-sales-quotes/${id}/cancel`).then((r) => r.data);

export const getNextB2bSalesQuoteNumber = () =>
  apiClient.get("/b2b-sales-quotes/next-number").then((r) => r.data);

export const downloadB2bSalesQuotePDF = (id) =>
  apiClient
    .get(`/b2b-sales-quotes/${id}/pdf`, { responseType: "blob" })
    .then((r) => {
      const disposition = r.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      return {
        blob: r.data,
        filename: match?.[1] || `b2b-sales-quote-${id}.pdf`,
      };
    });

export default {
  getB2bSalesQuotes,
  getB2bSalesQuoteById,
  createB2bSalesQuote,
  updateB2bSalesQuote,
  deleteB2bSalesQuote,
  approveB2bSalesQuote,
  unapproveB2bSalesQuote,
  cancelB2bSalesQuote,
  getNextB2bSalesQuoteNumber,
  downloadB2bSalesQuotePDF,
};
