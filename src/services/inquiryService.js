import apiClient from "./apiClient";

export const getInquiries = (params = {}) =>
  apiClient.get("/inquiry", { params }).then((r) => r.data);

export const exportInquiries = (params = {}) =>
  apiClient.get("/inquiry/export", { params, responseType: "blob" }).then((r) => r.data);

export const createInquiry = (payload) =>
  apiClient.post("/inquiry", payload).then((r) => r.data);

export const getInquiryById = (id) =>
  apiClient.get(`/inquiry/${id}`).then((r) => r.data);

export const updateInquiry = (id, payload) =>
  apiClient.put(`/inquiry/${id}`, payload).then((r) => r.data);

export const downloadInquiryImportSample = () =>
  apiClient.get("/inquiry/import/sample", { responseType: "blob" }).then((r) => r.data);

export const uploadInquiryCsv = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient
    .post("/inquiry/import/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export default {
  getInquiries,
  exportInquiries,
  createInquiry,
  getInquiryById,
  updateInquiry,
  downloadInquiryImportSample,
  uploadInquiryCsv,
};


