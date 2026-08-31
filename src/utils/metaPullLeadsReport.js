const CSV_COLUMNS = [
  { key: "fb_lead_id", label: "Facebook Lead ID" },
  { key: "fb_form_id", label: "Form ID" },
  { key: "form_name", label: "Form Name" },
  { key: "lead_destination", label: "Destination" },
  { key: "customer_name", label: "Name" },
  { key: "mobile", label: "Mobile" },
  { key: "email", label: "Email" },
  { key: "action", label: "Action" },
  { key: "reason_code", label: "Reason Code" },
  { key: "reason", label: "Reason" },
  { key: "crm_lead_id", label: "CRM Lead ID" },
  { key: "crm_lead_number", label: "CRM Lead No" },
]

function escapeCsvCell(value) {
  const s = value == null ? "" : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function formatMetaPullSummary(data) {
  if (!data) return ""
  const failedPart = data.failed > 0 ? `, ${data.failed} failed` : ""
  return `Lead sync complete: ${data.created ?? 0} created, ${data.updated ?? 0} updated, ${data.skipped ?? 0} skipped${failedPart}`
}

export function buildMetaPullLeadsCsv(details) {
  const rows = Array.isArray(details) ? details : []
  const header = CSV_COLUMNS.map((c) => escapeCsvCell(c.label)).join(",")
  const body = rows.map((row) =>
    CSV_COLUMNS.map((c) => escapeCsvCell(row?.[c.key])).join(",")
  )
  return [header, ...body].join("\n")
}

function slugifyFormName(name) {
  return String(name || "form")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "form"
}

export function downloadMetaPullLeadsCsv(details, formName) {
  const csv = buildMetaPullLeadsCsv(details)
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")
  const filename = `meta-pull-${slugifyFormName(formName)}-${stamp}.csv`
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
