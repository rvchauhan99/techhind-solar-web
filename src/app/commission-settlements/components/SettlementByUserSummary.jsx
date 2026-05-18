"use client";

import { fmtMoney, fmtSignedMoney } from "../utils/settlementMoney";

export default function SettlementByUserSummary({
  byUser = [],
  className = "",
  showDeduction = false,
  lines = [],
}) {
  if (!byUser.length) return null;

  const hasDeduction = showDeduction || byUser.some((u) => Number(u.outstanding_deduction) > 0);
  const adjByUser = new Map();
  for (const ln of lines || []) {
    if (!ln.beneficiary_user_id || !ln.adjustment_type) continue;
    const bid = ln.beneficiary_user_id;
    const prev = adjByUser.get(bid) || { bonus: 0, deduction: 0 };
    const amt = Number(ln.adjustment_amount) || 0;
    if (ln.adjustment_type === "bonus") prev.bonus += amt;
    if (ln.adjustment_type === "deduction") prev.deduction += amt;
    adjByUser.set(bid, prev);
  }
  const showAdj = adjByUser.size > 0;

  return (
    <div className={`overflow-x-auto rounded border border-slate-200 ${className}`}>
      <table className="w-full text-[11px]">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-2 py-1 font-medium">Beneficiary</th>
            {hasDeduction ? (
              <th className="px-2 py-1 font-medium text-right">Gross</th>
            ) : null}
            {hasDeduction ? (
              <th className="px-2 py-1 font-medium text-right">Deduction</th>
            ) : null}
            {showAdj ? <th className="px-2 py-1 font-medium text-right">Adj ±</th> : null}
            <th className="px-2 py-1 font-medium text-right">Net</th>
            <th className="px-2 py-1 font-medium text-right">Round off</th>
            <th className="px-2 py-1 font-medium text-right">Payable</th>
          </tr>
        </thead>
        <tbody>
          {byUser.map((u, i) => (
            <tr key={u.beneficiary_user_id ?? i} className="border-t border-slate-100">
              <td className="px-2 py-1">{u.beneficiary_name || "—"}</td>
              {hasDeduction ? (
                <td className="px-2 py-1 text-right text-muted-foreground">
                  ₹ {fmtMoney(u.gross_line_total ?? u.line_total ?? u.total)}
                </td>
              ) : null}
              {hasDeduction ? (
                <td className="px-2 py-1 text-right text-amber-700">
                  {Number(u.outstanding_deduction) > 0
                    ? `− ₹ ${fmtMoney(u.outstanding_deduction)}`
                    : "—"}
                </td>
              ) : null}
              {showAdj ? (
                <td className="px-2 py-1 text-right text-[10px]">
                  {(() => {
                    const a = adjByUser.get(u.beneficiary_user_id);
                    if (!a) return "—";
                    const parts = [];
                    if (a.bonus > 0) parts.push(`+₹${fmtMoney(a.bonus)}`);
                    if (a.deduction > 0) parts.push(`−₹${fmtMoney(a.deduction)}`);
                    return parts.join(" ");
                  })()}
                </td>
              ) : null}
              <td className="px-2 py-1 text-right">₹ {fmtMoney(u.line_total ?? u.total)}</td>
              <td className="px-2 py-1 text-right">₹ {fmtSignedMoney(u.round_off_amount ?? 0)}</td>
              <td className="px-2 py-1 text-right font-medium">
                ₹ {fmtMoney(u.settled_amount ?? u.line_total ?? u.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
