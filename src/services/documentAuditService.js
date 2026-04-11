import apiClient from "./apiClient";

const documentAuditService = {
  getDocuments: (params) =>
    apiClient.get("/document-audit", { params }).then((r) => r.data),

  approveDocument: (id, remarks) =>
    apiClient.post(`/document-audit/${id}/approve`, { remarks }).then((r) => r.data),

  rejectDocument: (id, reason_id, remarks) =>
    apiClient
      .post(`/document-audit/${id}/reject`, { reason_id, remarks })
      .then((r) => r.data),
};

export default documentAuditService;
