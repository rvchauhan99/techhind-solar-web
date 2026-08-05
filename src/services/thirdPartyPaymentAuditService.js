import apiClient from "./apiClient";
import orderPaymentsService from "./orderPaymentsService";
import b2bOrderPaymentsService from "./b2bOrderPaymentsService";

const BASE = "/third-party-payment-audit";

const unwrap = (r) => (r.data && "result" in r.data ? r.data.result : r.data);

const thirdPartyPaymentAuditService = {
  list: (params = {}) =>
    apiClient.get(BASE, { params }).then((r) => r.data),

  getById: (id, { channel = "b2c" } = {}) =>
    apiClient.get(`${BASE}/${id}`, { params: { channel } }).then((r) => unwrap(r)),

  approve: (id, { channel = "b2c", remarks } = {}) =>
    apiClient
      .post(`${BASE}/${id}/approve`, { channel, remarks })
      .then((r) => unwrap(r)),

  reject: (id, { channel = "b2c", rejection_reason, remarks } = {}) =>
    apiClient
      .post(`${BASE}/${id}/reject`, { channel, rejection_reason, remarks })
      .then((r) => unwrap(r)),

  raiseQuery: (id, { channel = "b2c", remarks } = {}) =>
    apiClient
      .post(`${BASE}/${id}/query`, { channel, remarks })
      .then((r) => unwrap(r)),

  getAuditTrail: (id, { channel = "b2c" } = {}) =>
    apiClient.get(`${BASE}/${id}/audit-trail`, { params: { channel } }).then((r) => unwrap(r)),

  /** Reuse internal payment proof/receipt helpers (read-only). */
  getReceiptUrl: (id, channel = "b2c") =>
    channel === "b2b"
      ? b2bOrderPaymentsService.getReceiptUrl(id)
      : orderPaymentsService.getReceiptUrl(id),

  downloadReceiptPDF: (id, channel = "b2c") =>
    channel === "b2b"
      ? b2bOrderPaymentsService.downloadReceiptPDF(id)
      : orderPaymentsService.downloadReceiptPDF(id),
};

export default thirdPartyPaymentAuditService;
