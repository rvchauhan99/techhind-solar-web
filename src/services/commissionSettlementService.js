import apiClient from "./apiClient";

const base = "/commission-settlements";

export const listUnsettledLedger = (params) =>
  apiClient.get(`${base}/ledger/unsettled`, { params }).then((r) => r.data);

export const getCommissionDashboardSummary = () =>
  apiClient.get(`${base}/ledger/dashboard-summary`).then((r) => r.data);

export const adjustCommissionLedgerEntry = (id, payload) =>
  apiClient.patch(`${base}/ledger/${id}/adjustment`, payload).then((r) => r.data);

export const previewCommissionSettlement = (payload) =>
  apiClient.post(`${base}/preview`, payload).then((r) => r.data);

export const createCommissionSettlement = (payload) =>
  apiClient.post(base, payload).then((r) => r.data);

export const listCommissionSettlements = (params) =>
  apiClient.get(base, { params }).then((r) => r.data);

export const getCommissionSettlementById = (id) =>
  apiClient.get(`${base}/${id}`).then((r) => r.data);

export const approveCommissionSettlement = (id, payload) =>
  apiClient.post(`${base}/${id}/approve`, payload || {}).then((r) => r.data);

export const rejectCommissionSettlement = (id, payload) =>
  apiClient.post(`${base}/${id}/reject`, payload || {}).then((r) => r.data);

export const listSettledHistoryLines = (params) =>
  apiClient.get(`${base}/history/lines`, { params }).then((r) => r.data);

export const listSettledHistoryByOrder = (params) =>
  apiClient.get(`${base}/history/by-order`, { params }).then((r) => r.data);

export const getSettledHistoryDashboard = (params) =>
  apiClient.get(`${base}/history/dashboard`, { params }).then((r) => r.data);

export const downloadSettledLedgerCsv = (params) =>
  apiClient
    .get(`${base}/history/export/user-ledger`, { params, responseType: "blob" })
    .then((r) => r.data);

export const getCommissionLedgerReport = (params) =>
  apiClient.get(`${base}/ledger/report`, { params }).then((r) => r.data);

export const downloadCommissionLedgerReportCsv = (params) =>
  apiClient
    .get(`${base}/ledger/report/export`, { params, responseType: "blob" })
    .then((r) => r.data);

export default {
  listUnsettledLedger,
  getCommissionDashboardSummary,
  adjustCommissionLedgerEntry,
  previewCommissionSettlement,
  createCommissionSettlement,
  listCommissionSettlements,
  getCommissionSettlementById,
  approveCommissionSettlement,
  rejectCommissionSettlement,
  listSettledHistoryLines,
  listSettledHistoryByOrder,
  getSettledHistoryDashboard,
  downloadSettledLedgerCsv,
  getCommissionLedgerReport,
  downloadCommissionLedgerReportCsv,
};
