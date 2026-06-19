/**
 * Format order number with optional project capacity and scheme in brackets.
 * Example: 260611(3.3kw-National Portal)
 */
export function formatOrderNumberLabel({
  orderNumber = null,
  orderId = null,
  capacityKw = null,
  projectSchemeName = null,
  emptyFallback = "—",
} = {}) {
  const base =
    orderNumber != null && String(orderNumber).trim()
      ? String(orderNumber).trim()
      : orderId != null
        ? String(orderId)
        : null;
  if (!base) return emptyFallback;

  const cap =
    capacityKw != null && Number.isFinite(Number(capacityKw)) ? `${Number(capacityKw)}kw` : "";
  const scheme = projectSchemeName ? String(projectSchemeName).trim() : "";
  const inner = [cap, scheme].filter(Boolean).join("-");
  return inner ? `${base}(${inner})` : base;
}

/** Format from a commission ledger/history row object. */
export function formatOrderNumberFromRow(row, { emptyFallback = "—" } = {}) {
  return formatOrderNumberLabel({
    orderNumber: row?.order_number,
    orderId: row?.order_id,
    capacityKw: row?.capacity_kw,
    projectSchemeName: row?.project_scheme_name,
    emptyFallback,
  });
}
