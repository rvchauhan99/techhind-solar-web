import apiClient from "./apiClient";

export const getB2bLeads = (params = {}) =>
  apiClient.get("/b2b-leads", { params }).then((r) => r.data);

export const getB2bLeadById = (id) =>
  apiClient.get(`/b2b-leads/${id}`).then((r) => r.data);

export const createB2bLead = (payload) =>
  apiClient.post("/b2b-leads", payload).then((r) => r.data);

export const updateB2bLead = (id, payload) =>
  apiClient.put(`/b2b-leads/${id}`, payload).then((r) => r.data);

export const deleteB2bLead = (id) =>
  apiClient.delete(`/b2b-leads/${id}`).then((r) => r.data);

export const assignB2bLeads = (payload) =>
  apiClient.post("/b2b-leads/assign", payload).then((r) => r.data);

export const addB2bLeadFollowUp = (id, payload) =>
  apiClient.post(`/b2b-leads/${id}/follow-ups`, payload).then((r) => r.data);

export const scheduleB2bLeadFollowUp = (id, payload) =>
  apiClient.post(`/b2b-leads/${id}/schedule-follow-up`, payload).then((r) => r.data);

export const listB2bLeadFollowUps = (id, params = {}) =>
  apiClient.get(`/b2b-leads/${id}/follow-ups`, { params }).then((r) => r.data);

export const getB2bLeadTimeline = (id, params = {}) =>
  apiClient.get(`/b2b-leads/${id}/timeline`, { params }).then((r) => r.data);

export const convertB2bLead = (id) =>
  apiClient.post(`/b2b-leads/${id}/convert`).then((r) => r.data);

export const listB2bLeadDocuments = (id) =>
  apiClient.get(`/b2b-leads/${id}/documents`).then((r) => r.data);

export const getB2bLeadDocumentUrl = (id, docId) =>
  apiClient
    .get(`/b2b-leads/${id}/documents/${docId}/url`)
    .then((r) => r.data?.result?.url ?? r.data?.url ?? null);

export const uploadB2bLeadDocument = (id, formData) =>
  apiClient
    .post(`/b2b-leads/${id}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);

export const deleteB2bLeadDocument = (id, docId) =>
  apiClient.delete(`/b2b-leads/${id}/documents/${docId}`).then((r) => r.data);

export const getB2bLeadsSummary = (params = {}) =>
  apiClient.get("/b2b-leads/reports/summary", { params }).then((r) => r.data);

export const getB2bLeadsAnalysis = (params = {}) =>
  apiClient.get("/b2b-leads/reports/analysis", { params }).then((r) => r.data);

export const exportB2bLeadsAnalysis = (params = {}) =>
  apiClient
    .get("/b2b-leads/reports/analysis/export", { params, responseType: "blob" })
    .then((r) => r.data);

export const exportB2bLeads = (params = {}) =>
  apiClient
    .get("/b2b-leads/export", { params, responseType: "blob" })
    .then((r) => r.data);

export default {
  getB2bLeads,
  getB2bLeadById,
  createB2bLead,
  updateB2bLead,
  deleteB2bLead,
  assignB2bLeads,
  addB2bLeadFollowUp,
  scheduleB2bLeadFollowUp,
  listB2bLeadFollowUps,
  getB2bLeadTimeline,
  convertB2bLead,
  listB2bLeadDocuments,
  getB2bLeadDocumentUrl,
  uploadB2bLeadDocument,
  deleteB2bLeadDocument,
  getB2bLeadsSummary,
  getB2bLeadsAnalysis,
  exportB2bLeadsAnalysis,
  exportB2bLeads,
};
