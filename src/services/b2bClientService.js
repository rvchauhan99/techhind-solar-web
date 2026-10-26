import apiClient from "./apiClient";

export const getB2bClients = (params = {}) =>
  apiClient.get("/b2b-clients", { params }).then((r) => r.data);

export const getNextClientCode = () =>
  apiClient.get("/b2b-clients/next-client-code").then((r) => r.data?.result?.client_code ?? "");

export const getB2bClientById = (id) =>
  apiClient.get(`/b2b-clients/${id}`).then((r) => r.data);

/**
 * Async AutocompleteField loader — server `q` search (any-age clients).
 * API matches client_code + client_name (and contact/email/gstin) with
 * case-insensitive LIKE (`%q%`), not exact match.
 */
export const loadB2bClientOptions = async (
  q,
  { is_active = true, limit = 50 } = {}
) => {
  const term = typeof q === "string" ? q.trim() : q;
  const params = { q: term || undefined, limit };
  if (is_active !== undefined && is_active !== null) {
    params.is_active = is_active;
  }
  const res = await getB2bClients(params);
  return res?.result?.data ?? res?.data ?? res?.result?.rows ?? [];
};

/** Resolve a selected client by id for edit / deep-link label display. */
export const resolveB2bClientById = async (id) => {
  if (id == null || id === "") return null;
  const res = await getB2bClientById(id);
  return res?.result ?? res ?? null;
};

export const createB2bClient = (payload) =>
  apiClient.post("/b2b-clients", payload).then((r) => r.data);

export const updateB2bClient = (id, payload) =>
  apiClient.put(`/b2b-clients/${id}`, payload).then((r) => r.data);

export const deleteB2bClient = (id) =>
  apiClient.delete(`/b2b-clients/${id}`).then((r) => r.data);

export const getB2bShipTos = (params = {}) =>
  apiClient.get("/b2b-clients/ship-tos", { params }).then((r) => r.data);

export const createB2bShipTo = (payload) =>
  apiClient.post("/b2b-clients/ship-tos", payload).then((r) => r.data);

export const updateB2bShipTo = (id, payload) =>
  apiClient.put(`/b2b-clients/ship-tos/${id}`, payload).then((r) => r.data);

export const deleteB2bShipTo = (id) =>
  apiClient.delete(`/b2b-clients/ship-tos/${id}`).then((r) => r.data);

export default {
  getB2bClients,
  getNextClientCode,
  getB2bClientById,
  loadB2bClientOptions,
  resolveB2bClientById,
  createB2bClient,
  updateB2bClient,
  deleteB2bClient,
  getB2bShipTos,
  createB2bShipTo,
  updateB2bShipTo,
  deleteB2bShipTo,
};
