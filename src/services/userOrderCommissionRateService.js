import apiClient from "./apiClient";

export const listUserOrderCommissionRates = (params = {}) =>
  apiClient.get("/user-order-commission-rates", { params }).then((r) => r.data);

export const exportUserOrderCommissionRates = (params = {}) =>
  apiClient.get("/user-order-commission-rates/export", { params, responseType: "blob" }).then((r) => r.data);

export const downloadCommissionRatesImportTemplate = () =>
  apiClient.get("/user-order-commission-rates/import-template", { responseType: "blob" }).then((r) => r.data);

export const importUserOrderCommissionRates = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return apiClient
    .post("/user-order-commission-rates/import", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const createUserOrderCommissionRate = (payload) =>
  apiClient.post("/user-order-commission-rates", payload).then((r) => r.data);

export const getUserOrderCommissionRateById = (id) =>
  apiClient.get(`/user-order-commission-rates/${id}`).then((r) => r.data);

export const updateUserOrderCommissionRate = (id, payload) =>
  apiClient.put(`/user-order-commission-rates/${id}`, payload).then((r) => r.data);

export const deleteUserOrderCommissionRate = (id) =>
  apiClient.delete(`/user-order-commission-rates/${id}`).then((r) => r.data);

export default {
  listUserOrderCommissionRates,
  exportUserOrderCommissionRates,
  downloadCommissionRatesImportTemplate,
  importUserOrderCommissionRates,
  createUserOrderCommissionRate,
  getUserOrderCommissionRateById,
  updateUserOrderCommissionRate,
  deleteUserOrderCommissionRate,
};
