export const PRODUCTION_BOOKING_FILTER_KEYS = [
  "q",
  "booking_no",
  "order_no",
  "warehouse_id",
  "fg_product_id",
  "status",
  "booking_date_from",
  "booking_date_to",
  "production_order_id",
];

export const PRODUCTION_BOOKING_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "POSTED", label: "Posted" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const PRODUCTION_BOOKING_STATUS_SUMMARY_CHIPS = [
  { key: "POSTED", label: "Posted" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "DRAFT", label: "Draft" },
];

export const getStatusVariant = (status) => {
  if (status === "POSTED") return "default";
  if (status === "CANCELLED") return "destructive";
  return "outline";
};
