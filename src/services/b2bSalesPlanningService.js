import apiClient from "./apiClient";

export const getB2bSalesPlans = (params = {}) =>
  apiClient.get("/b2b-sales-planning", { params }).then((r) => r.data);

export const getB2bSalesPlanById = (id) =>
  apiClient.get(`/b2b-sales-planning/${id}`).then((r) => r.data);

export const getB2bSalesPlanRelated = (id) =>
  apiClient.get(`/b2b-sales-planning/${id}/related`).then((r) => r.data);

export const createB2bSalesPlan = (payload) =>
  apiClient.post("/b2b-sales-planning", payload).then((r) => r.data);

export const rescheduleB2bSalesPlan = (id, payload) =>
  apiClient.put(`/b2b-sales-planning/${id}/reschedule`, payload).then((r) => r.data);

export const setB2bSalesPlanPipelineReason = (id, payload) =>
  apiClient.put(`/b2b-sales-planning/${id}/pipeline-reason`, payload).then((r) => r.data);

export const breakB2bSalesPlan = (id, payload = {}) =>
  apiClient.put(`/b2b-sales-planning/${id}/break`, payload).then((r) => r.data);

export const reassignB2bSalesPlan = (id, payload = {}) =>
  apiClient.put(`/b2b-sales-planning/${id}/reassign`, payload).then((r) => r.data);

export const getB2bSalesPlanLogs = (id) =>
  apiClient.get(`/b2b-sales-planning/${id}/logs`).then((r) => r.data);

export const getB2bSalesPlanningDashboard = (params = {}) =>
  apiClient.get("/b2b-sales-planning/dashboard", { params }).then((r) => r.data);

export const getB2bSalesPlanningConfig = () =>
  apiClient.get("/b2b-sales-planning/config").then((r) => r.data);

export const getOpenB2bSalesPlanForClient = (clientId) =>
  apiClient
    .get(`/b2b-sales-planning/open-for-client/${clientId}`)
    .then((r) => r.data);

export default {
  getB2bSalesPlans,
  getB2bSalesPlanById,
  getB2bSalesPlanRelated,
  createB2bSalesPlan,
  rescheduleB2bSalesPlan,
  setB2bSalesPlanPipelineReason,
  breakB2bSalesPlan,
  reassignB2bSalesPlan,
  getB2bSalesPlanLogs,
  getB2bSalesPlanningDashboard,
  getB2bSalesPlanningConfig,
  getOpenB2bSalesPlanForClient,
};
