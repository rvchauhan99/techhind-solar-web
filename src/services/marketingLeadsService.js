import apiClient from "./apiClient";

export const getMarketingLeads = (params = {}) =>
  apiClient.get("/marketing-leads", { params }).then((r) => r.data);

export const getMarketingLeadById = (id) =>
  apiClient.get(`/marketing-leads/${id}`).then((r) => r.data);

export const createMarketingLead = (payload) =>
  apiClient.post("/marketing-leads", payload).then((r) => r.data);

export const updateMarketingLead = (id, payload) =>
  apiClient.put(`/marketing-leads/${id}`, payload).then((r) => r.data);

export const deleteMarketingLead = (id) =>
  apiClient.delete(`/marketing-leads/${id}`).then((r) => r.data);

export const addFollowUp = (id, payload) =>
  apiClient.post(`/marketing-leads/${id}/follow-ups`, payload).then((r) => r.data);

export const listFollowUps = (id, params = {}) =>
  apiClient.get(`/marketing-leads/${id}/follow-ups`, { params }).then((r) => r.data);

export const convertToInquiry = (id, payload = {}) =>
  apiClient.post(`/marketing-leads/${id}/convert-to-inquiry`, payload).then((r) => r.data);

export const uploadMarketingLeads = (file, extra = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(extra || {}).forEach(([key, value]) => {
    if (value != null && value !== "") {
      formData.append(key, value);
    }
  });
  return apiClient
    .post("/marketing-leads/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const previewMarketingLeadsUpload = (file, extra = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(extra || {}).forEach(([key, value]) => {
    if (value != null && value !== "") {
      formData.append(key, value);
    }
  });
  return apiClient
    .post("/marketing-leads/bulk/preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const downloadMarketingLeadsTemplate = () =>
  apiClient
    .get("/marketing-leads/bulk/template", {
      responseType: "blob",
    })
    .then((r) => r.data);

export const getMarketingLeadsSummary = (params = {}) =>
  apiClient.get("/marketing-leads/reports/summary", { params }).then((r) => r.data);

export const getMarketingLeadsCallReport = (params = {}) =>
  apiClient.get("/marketing-leads/reports/calls", { params }).then((r) => r.data);

export const assignMarketingLeads = (payload) =>
  apiClient.post("/marketing-leads/assign", payload).then((r) => r.data);

export default {
  getMarketingLeads,
  getMarketingLeadById,
  createMarketingLead,
  updateMarketingLead,
  deleteMarketingLead,
  addFollowUp,
  listFollowUps,
  convertToInquiry,
  uploadMarketingLeads,
  previewMarketingLeadsUpload,
  downloadMarketingLeadsTemplate,
  getMarketingLeadsSummary,
  getMarketingLeadsCallReport,
  assignMarketingLeads,
};

