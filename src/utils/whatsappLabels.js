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

export const AGENT = {
  parent: "Agents",
  master: {
    menu: "Agent Master",
    title: "Agent Master",
    subtitle: "Enable, schedule, and run CRM agents. Channel connect stays on WhatsApp Setup.",
    runNow: "Run Now",
    running: "Running…",
    edit: "Edit",
    testMode: "Test mode",
    testPhone: "Test WhatsApp number",
    testModeHint: "When on, every send goes to this number instead of customer mobiles. Cap is 10 per day.",
  },
}

// Bucket labels
export const BUCKET_LABELS = {
  "7d": "1–7 Days Overdue",
  "15d": "8–15 Days Overdue",
  "30d": "16–60 Days Overdue",
  "60d_plus": "60+ Days Overdue (Escalated)",
  "30d_plus": "30+ Days Overdue",   // legacy — kept for old log entries
}

export const BUCKET_COLORS = {
  "7d": "bg-blue-100 text-blue-700",
  "15d": "bg-yellow-100 text-yellow-700",
  "30d": "bg-orange-100 text-orange-700",
  "60d_plus": "bg-red-100 text-red-800",
  "30d_plus": "bg-red-100 text-red-700",  // legacy
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
  "7d": "Soft reminder — 1–7 days overdue. Utility template payment_reminder_soft.",
  "15d": "Urgent reminder — 8–15 days overdue. Includes days overdue count.",
  "30d": "Escalation — 16–60 days overdue. Same Meta name as 60d+.",
  "60d_plus": "Final escalation — 60+ days overdue. Reuses payment_escalation.",
  "30d_plus": "Legacy 30+ bucket — treated as 60d_plus.",
}
