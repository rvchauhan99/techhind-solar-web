// WhatsApp Agent module labels — mirrors assemblyProductionLabels.js pattern

export const WA = {
  parent: "WhatsApp Agent",
  setup: {
    menu: "WhatsApp Setup",
    title: "WhatsApp Business Setup",
    connect: "Connect WhatsApp",
    disconnect: "Disconnect",
    connected: "Connected",
    notConnected: "Not Connected",
  },
  logs: {
    menu: "Agent Logs",
    title: "Payment Follow-up Agent Logs",
    runNow: "Run Now",
    running: "Running…",
  },
}

// Bucket labels
export const BUCKET_LABELS = {
  "7d": "1–7 Days Overdue",
  "15d": "8–15 Days Overdue",
  "30d": "16–30 Days Overdue",
  "30d_plus": "30+ Days Overdue",
}

export const BUCKET_COLORS = {
  "7d": "bg-blue-100 text-blue-700",
  "15d": "bg-yellow-100 text-yellow-700",
  "30d": "bg-orange-100 text-orange-700",
  "30d_plus": "bg-red-100 text-red-700",
}

// WA delivery status labels
export const WA_STATUS_LABELS = {
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
  pending: "Pending",
}

export const WA_STATUS_COLORS = {
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  read: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-gray-100 text-gray-600",
}

// Template descriptions per bucket (shown on setup page)
export const TEMPLATE_DESCRIPTIONS = {
  "7d": "Soft reminder — sent 1–7 days after planned delivery. Friendly tone.",
  "15d": "Urgent reminder — sent 8–15 days overdue. Includes days overdue count.",
  "30d": "Escalation — sent 16–30 days overdue. Requests immediate attention.",
  "30d_plus": "Final escalation — 30+ days overdue. Same template as 30d bucket.",
}
