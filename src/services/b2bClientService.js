import apiClient from "./apiClient";

export const getB2bClients = (params = {}) =>
  apiClient.get("/b2b-clients", { params }).then((r) => r.data);

export const getNextClientCode = () =>
  apiClient.get("/b2b-clients/next-client-code").then((r) => r.data?.result?.client_code ?? "");

export const getB2bClientById = (id) =>
  apiClient.get(`/b2b-clients/${id}`).then((r) => r.data);

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
  createB2bClient,
  updateB2bClient,
  deleteB2bClient,
  getB2bShipTos,
  createB2bShipTo,
  updateB2bShipTo,
  deleteB2bShipTo,
};
