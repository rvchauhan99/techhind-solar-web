export function fmtMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
}

export function fmtSignedMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00";
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Payable total (nearest-rupee batch total); falls back to stored total_amount. */
export function payableAmount(data) {
  if (data?.payable_amount != null) return Number(data.payable_amount);
  return Number(data?.total_amount) || 0;
}

export function hasOutstandingOffset(lines) {
  return (lines || []).some((l) => l.outstanding_offset);
}

export function getOffsetOrders(lines) {
  const byOrder = new Map();
  for (const ln of lines || []) {
    if (!ln.outstanding_offset || !ln.order_id) continue;
    if (!byOrder.has(ln.order_id)) {
      byOrder.set(ln.order_id, {
        order_id: ln.order_id,
        order_number: ln.order_number,
        order_outstanding: ln.order_outstanding,
        combined_commission_on_order: ln.combined_commission_on_order,
        outstanding_offset_warning: ln.outstanding_offset_warning,
      });
    }
  }
  return [...byOrder.values()];
}
