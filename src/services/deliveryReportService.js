import apiClient from "./apiClient";

export const getDeliveryReport = (params = {}) =>
  apiClient.get("/reports/deliveries", { params }).then((r) => r.data);

export default {
  getDeliveryReport,
};

