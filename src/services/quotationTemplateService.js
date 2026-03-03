import apiClient from "./apiClient";

export const listTemplates = () =>
  apiClient.get("/quotation/templates").then((r) => r.data);

export const getTemplateById = (id) =>
  apiClient.get(`/quotation/templates/${id}`).then((r) => r.data);

export const createTemplate = (payload) =>
  apiClient.post("/quotation/templates", payload).then((r) => r.data);

export const updateTemplate = (id, payload) =>
  apiClient.put(`/quotation/templates/${id}`, payload).then((r) => r.data);

export const updateTemplateConfig = (id, payload) =>
  apiClient.put(`/quotation/templates/${id}/config`, payload).then((r) => r.data);

export const uploadTemplateConfigImage = (id, fieldName, file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fieldName", fieldName);
  return apiClient
    .post(`/quotation/templates/${id}/config/upload`, formData)
    .then((r) => r.data);
};

export default {
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  updateTemplateConfig,
  uploadTemplateConfigImage,
};
