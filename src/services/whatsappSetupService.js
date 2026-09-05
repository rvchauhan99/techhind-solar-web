import apiClient from "./apiClient"

// WhatsApp Setup
export const getStatus = () =>
  apiClient.get("/whatsapp-setup").then((r) => r.data?.data)

export const connect = (payload) =>
  apiClient.post("/whatsapp-setup/connect", payload).then((r) => r.data)

export const disconnect = () =>
  apiClient.delete("/whatsapp-setup/disconnect").then((r) => r.data)

export const updateSettings = (payload) =>
  apiClient.put("/whatsapp-setup/settings", payload).then((r) => r.data)

export const getTemplates = () =>
  apiClient.get("/whatsapp-setup/templates").then((r) => r.data?.data ?? [])

// WhatsApp Agent Logs
export const getAgentLogs = (params) =>
  apiClient.get("/whatsapp-agent/logs", { params }).then((r) => r.data)

export const getAgentKpis = () =>
  apiClient.get("/whatsapp-agent/logs/kpis").then((r) => r.data?.data)

export const runNow = () =>
  apiClient.post("/whatsapp-agent/run-now").then((r) => r.data)
