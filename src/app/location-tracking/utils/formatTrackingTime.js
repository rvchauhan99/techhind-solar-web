/** Duty and route times in the tenant zone (default Asia/Kolkata), not the browser zone. */
export function fmtTenantTime(value, timeZone = "Asia/Kolkata") {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleTimeString("en-IN", {
    timeZone: timeZone || "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function fmtTenantDateTime(value, timeZone = "Asia/Kolkata") {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-IN", {
    timeZone: timeZone || "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}
