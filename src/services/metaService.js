import apiClient from "./apiClient";

// ─── Accounts ────────────────────────────────────────────────────────────────

export const initiateOAuth = () =>
  apiClient.get("/meta/oauth/initiate").then((r) => r.data?.data?.url);

export const listAccounts = () =>
  apiClient.get("/meta/accounts").then((r) => r.data?.data ?? []);

export const disconnectAccount = (id) =>
  apiClient.delete(`/meta/accounts/${id}`).then((r) => r.data);

export const syncPages = (accountId) =>
  apiClient.post(`/meta/accounts/${accountId}/sync-pages`).then((r) => r.data);

export const listPages = (accountId) =>
  apiClient.get(`/meta/accounts/${accountId}/pages`).then((r) => r.data?.data ?? []);

// ─── Pages ────────────────────────────────────────────────────────────────────

export const syncForms = (pageId) =>
  apiClient.post(`/meta/pages/${pageId}/sync-forms`).then((r) => r.data);

export const listForms = (pageId) =>
  apiClient.get(`/meta/pages/${pageId}/forms`).then((r) => r.data?.data ?? []);

export const subscribePage = (pageId) =>
  apiClient.post(`/meta/pages/${pageId}/subscribe`).then((r) => r.data);

export const unsubscribePage = (pageId) =>
  apiClient.delete(`/meta/pages/${pageId}/subscribe`).then((r) => r.data);

// ─── Forms / Leads ────────────────────────────────────────────────────────────

export const syncLeads = (formId) =>
  apiClient.post(`/meta/forms/${formId}/sync-leads`).then((r) => r.data);

const metaService = {
  initiateOAuth,
  listAccounts,
  disconnectAccount,
  syncPages,
  listPages,
  syncForms,
  listForms,
  subscribePage,
  unsubscribePage,
  syncLeads,
};

export default metaService;
