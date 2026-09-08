import apiClient from "./apiClient"

export const listAgents = (params) =>
  apiClient.get("/agent-master", { params }).then((r) => r.data)

export const getAgent = (id) =>
  apiClient.get(`/agent-master/${id}`).then((r) => r.data?.data)

export const updateAgent = (id, payload) =>
  apiClient.put(`/agent-master/${id}`, payload).then((r) => r.data)

export const toggleAgent = (id, is_enabled) =>
  apiClient.patch(`/agent-master/${id}/toggle`, { is_enabled }).then((r) => r.data)

export const runAgentNow = (id) =>
  apiClient.post(`/agent-master/${id}/run-now`).then((r) => r.data)

const agentMasterService = {
  listAgents,
  getAgent,
  updateAgent,
  toggleAgent,
  runAgentNow,
}

export default agentMasterService
