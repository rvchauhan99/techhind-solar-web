import apiClient from "@/lib/api/axios";

export async function getSupportStatus() {
  const res = await apiClient.get("/support-tickets/status");
  return res?.data?.result ?? { enabled: false };
}

export async function getSupportLimits() {
  const res = await apiClient.get("/support-tickets/limits");
  return res?.data?.result ?? {
    max_attachment_bytes: 5 * 1024 * 1024,
    max_attachments_per_message: 5,
  };
}

export async function listSupportTickets(params = {}) {
  const res = await apiClient.get("/support-tickets", { params });
  return res?.data?.result ?? [];
}

export async function getSupportTicket(id) {
  const res = await apiClient.get(`/support-tickets/${id}`);
  return res?.data?.result ?? null;
}

export function supportFileDownloadUrl(fileId) {
  const base = apiClient.defaults?.baseURL || "/api";
  return `${base}/support-tickets/files/${encodeURIComponent(fileId)}`;
}

export async function createSupportTicket({ subject, body, priority, files = [] }) {
  const fd = new FormData();
  fd.append("subject", subject);
  fd.append("body", body);
  if (priority) fd.append("priority", priority);
  (files || []).forEach((f) => fd.append("files", f));
  const res = await apiClient.post("/support-tickets", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res?.data?.result ?? null;
}

export async function replySupportTicket(id, { body, files = [] }) {
  const fd = new FormData();
  fd.append("body", body);
  (files || []).forEach((f) => fd.append("files", f));
  const res = await apiClient.post(`/support-tickets/${id}/messages`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res?.data?.result ?? null;
}
