import apiClient from "./apiClient";

export const getLedgerEntries = (params = {}) =>
  apiClient.get("/inventory-ledger", { params }).then((r) => r.data);

export const exportLedgerEntries = (params = {}) =>
  apiClient.get("/inventory-ledger/export", { params, responseType: "blob" }).then((r) => r.data);

export const getLedgerEntryById = (id) =>
  apiClient.get(`/inventory-ledger/${id}`).then((r) => r.data);

export default {
  getLedgerEntries,
  exportLedgerEntries,
  getLedgerEntryById,
};

