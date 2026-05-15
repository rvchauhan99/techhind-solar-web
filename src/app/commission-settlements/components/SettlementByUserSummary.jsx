"use client";

import { fmtMoney, fmtSignedMoney } from "../utils/settlementMoney";

export default function SettlementByUserSummary({ byUser = [], className = "", showDeduction = false }) {
  if (!byUser.length) return null;

  const hasDeduction = showDeduction || byUser.some((u) => Number(u.outstanding_deduction) > 0);

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
