import apiClient from "./apiClient";

const b2bPaymentOutstandingService = {
  list: (params) => apiClient.get("/b2b-payment-outstanding", { params }).then((r) => r.data),
  kpis: (params) => apiClient.get("/b2b-payment-outstanding/kpis", { params }).then((r) => r.data),
  export: (params) =>
    apiClient.get("/b2b-payment-outstanding/export", { params, responseType: "blob" }).then((r) => r.data),
};

export default b2bPaymentOutstandingService;
