import { AP } from "@/utils/assemblyProductionLabels";

export const PRODUCTION_ORDER_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "SHORT_CLOSED", label: "Short Closed" },
  { value: "CANCELLED", label: "Cancelled" },
]

export const PRODUCTION_ORDER_PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
]

export const PRODUCTION_ORDER_FILTER_KEYS = [
  "q",
  "order_no",
  "warehouse_id",
  "fg_product_id",
  "status",
  "priority",
  "planned_start_date_from",
  "planned_start_date_to",
  "planned_start_date_op",
  "planned_end_date_from",
  "planned_end_date_to",
  "created_at_from",
  "created_at_to",
  "open_only",
]

export const getStatusVariant = (status) => {
  switch (status) {
    case "COMPLETED":
      return "default"
    case "IN_PROGRESS":
    case "APPROVED":
      return "secondary"
    case "CANCELLED":
      return "destructive"
    default:
      return "outline"
  }
}

export const getPriorityVariant = (priority) =>
  priority === "URGENT" || priority === "HIGH" ? "destructive" : "outline"

export const PRODUCTION_ORDER_ACTION_COPY = {
  approve: {
    title: AP.orders.approve,
    description:
      "Approving freezes the BOM snapshot and required quantities on this work order, and opens it for Production/Assembly Bookings.",
    action: "Approve",
    needsReason: false,
  },
  cancel: {
    title: AP.orders.cancel,
    description:
      "Cancellation is only possible while no booking has been posted. Posted work orders must be short closed instead.",
    action: "Cancel Work Order",
    needsReason: true,
  },
  shortClose: {
    title: AP.orders.shortClose,
    description:
      "Short closing keeps posted bookings intact and stops further production against the remaining quantity.",
    action: "Short Close",
    needsReason: true,
  },
}

export const DENSE_TABLE_SX = {
  "& th": { py: 0.5, px: 0.75, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  "& td": { py: 0.5, px: 0.75, fontSize: 12 },
}

export const PRODUCTION_ORDER_STATUS_SUMMARY_CHIPS = [
  { key: "DRAFT", label: "Draft" },
  { key: "APPROVED", label: "Approved" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "SHORT_CLOSED", label: "Short Closed" },
  { key: "CANCELLED", label: "Cancelled" },
]

export const formatQty = (value, digits = 4) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return "0"
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits })
}

export const formatDateTime = (value) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
