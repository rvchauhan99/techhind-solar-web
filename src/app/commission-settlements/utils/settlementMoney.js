function roundMoney(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

export function fmtMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00";
}

/** Preview bonus/deduction from system vs final amount (mirrors API deriveFromEffectiveAmount). */
export function deriveAdjustmentPreview(systemAmount, finalAmount) {
  const orig = roundMoney(systemAmount);
  const final = roundMoney(finalAmount);
  const delta = roundMoney(Math.abs(final - orig));
  if (delta === 0) return { type: null, delta: 0, net: orig };
  return {
    type: final > orig ? "bonus" : "deduction",
    delta,
    net: final,
  };
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

/** Nearest-rupee payable for a single ledger line (after outstanding deduction). */
export function linePayableAmount(line) {
  const net = roundMoney(line?.line_net_amount != null ? line.line_net_amount : line?.amount);
  return Math.round(net);
}

export function hasOutstandingOffset(lines) {
  return (lines || []).some((l) => l.outstanding_offset);
}

export function adjustmentDelta(line) {
  if (!line?.adjustment_type || !Number(line.adjustment_amount)) return 0;
  const amt = Number(line.adjustment_amount) || 0;
  return line.adjustment_type === "bonus" ? amt : -amt;
}

export function hasLineAdjustments(lines) {
  return (lines || []).some((l) => l.has_adjustment || l.adjustment_type);
}

export function formatAdjustmentBadge(line) {
  if (!line?.adjustment_type || !Number(line.adjustment_amount)) return null;
  const amt = Number(line.adjustment_amount) || 0;
  const label = line.adjustment_type === "bonus" ? "Bonus" : "Deduction";
  const sign = line.adjustment_type === "bonus" ? "+" : "−";
  return { label, sign, amount: amt, className: line.adjustment_type === "bonus" ? "bonus" : "deduction" };
}

export function adjustmentRowBorderClass(line) {
  if (!line?.adjustment_type) return "";
  if (line.adjustment_type === "bonus") return "border-l-2 border-l-emerald-500";
  if (line.adjustment_type === "deduction") return "border-l-2 border-l-rose-500";
  return "";
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
