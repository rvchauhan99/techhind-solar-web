"use client";

import { Card } from "@/components/ui/card";
import { IconInfoCircle } from "@tabler/icons-react";

const nf = (v) =>
  Number(v ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

function signed(v) {
  const n = Number(v ?? 0);
  if (!n) return "0";
  return n > 0 ? `+${nf(n)}` : nf(n);
}

function Kpi({ label, value, sub, hint, tone = "text-slate-900" }) {
  return (
    <Card className="border-slate-200 shadow-none px-2 py-1.5 h-full">
      <div className="flex items-center gap-0.5 text-[9px] uppercase tracking-wide text-slate-500">
        <span className="truncate">{label}</span>
        {hint ? (
          <span title={hint} className="text-slate-300 hover:text-slate-500 cursor-help">
            <IconInfoCircle size={9} />
          </span>
        ) : null}
      </div>
      <div className={`text-sm font-bold tabular-nums ${tone}`}>{value ?? "—"}</div>
      {sub ? <div className="text-[9px] leading-tight text-slate-400 truncate">{sub}</div> : null}
    </Card>
  );
}

/**
 * Two-row KPI strip.
 *
 * Row 1 answers "what is the balance?" (opening -> closing).
 * Row 2 answers "did trade actually happen?" by removing returns and internal churn
 * from the gross In/Out, so a fully returned sale reads as Net Sold 0 instead of
 * looking like real movement.
 */
export default function StockLedgerKpis({ summary, dataQuality, totals }) {
  if (!summary) return null;

  const s = summary;
  const dq = dataQuality;
  const realTradeTone =
    Number(s.real_trade_quantity) > 0
      ? "text-emerald-700"
      : Number(s.real_trade_quantity) < 0
        ? "text-red-700"
        : "text-slate-700";

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
        <Kpi
          label="Opening"
          value={nf(s.opening_quantity)}
          hint="Signed ledger balance before the period start."
        />
        <Kpi
          label="Purchased (net)"
          value={nf(s.net_purchased_quantity)}
          tone="text-emerald-700"
          sub={`${nf(s.purchased_quantity)} in · ${nf(s.purchase_returned_quantity)} purchase return`}
          hint="PO inward + used inventory import, minus purchase returns."
        />
        <Kpi
          label="Sold (gross)"
          value={nf(s.sold_quantity)}
          tone="text-amber-700"
          sub={
            s.documents
              ? `${s.documents.sale} voucher${s.documents.sale === 1 ? "" : "s"}`
              : undefined
          }
          hint="B2B shipments + B2C delivery challans + production issue/scrap. Includes units later returned."
        />
        <Kpi
          label="Returned"
          value={nf(s.returned_quantity)}
          tone={Number(s.returned_quantity) ? "text-sky-700" : "text-slate-500"}
          sub={s.return_rate_pct != null ? `${s.return_rate_pct}% of sold` : "no sales in period"}
          hint="Customer returns, shipment/challan cancellations and production rejects received back."
        />
        <Kpi
          label="Corrections"
          value={signed(s.corrected_net_quantity)}
          tone={Number(s.corrected_net_quantity) ? "text-violet-700" : "text-slate-500"}
          sub={`${nf(s.corrected_in_quantity)} in · ${nf(s.corrected_out_quantity)} out`}
          hint="Stock adjustments and installation force-adjust. Damage/loss sit in 'out', found/audit in 'in'."
        />
        <Kpi
          label="Closing"
          value={nf(s.closing_quantity)}
          sub={
            dq
              ? dq.matches
                ? "matches stock"
                : `stock ${nf(dq.stock_on_hand_quantity)}`
              : undefined
          }
          tone={dq && !dq.matches ? "text-red-700" : "text-slate-900"}
          hint="Opening + gross in - gross out. Should equal stock on hand."
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
        <Kpi
          label="Net Sold"
          value={nf(s.net_sold_quantity)}
          tone={Number(s.net_sold_quantity) ? "text-amber-700" : "text-slate-700"}
          sub="sold − returned"
          hint="Units that actually stayed with customers. Zero means everything came back."
        />
        <Kpi
          label="Real Trade"
          value={signed(s.real_trade_quantity)}
          tone={realTradeTone}
          sub="net purchased − net sold"
          hint="Genuine supplier-to-customer movement. This is the number to trust for 'did we really trade?'."
        />
        <Kpi
          label="Return Rate"
          value={s.return_rate_pct != null ? `${s.return_rate_pct}%` : "—"}
          tone={
            s.return_rate_pct == null
              ? "text-slate-500"
              : s.return_rate_pct >= 50
                ? "text-red-700"
                : "text-slate-900"
          }
          sub="returned ÷ sold"
          hint="Share of shipped units that came back in the same period."
        />
        <Kpi
          label="Internal Churn"
          value={nf(s.production_churn_quantity)}
          tone={Number(s.production_churn_quantity) ? "text-sky-700" : "text-slate-500"}
          sub={s.documents ? `${s.documents.production} production voucher(s)` : undefined}
          hint="Production issue/scrap/receipt/reject/cancel rows. Internal movements, not sales."
        />
        <Kpi
          label="Noise Share"
          value={s.noise_share_pct != null ? `${s.noise_share_pct}%` : "—"}
          tone={
            s.noise_share_pct != null && s.noise_share_pct >= 50
              ? "text-amber-700"
              : "text-slate-700"
          }
          sub="churn + corrections + transfers"
          hint="How much of the reported movement is internal noise rather than trade."
        />
        <Kpi
          label="Data Quality"
          value={
            dq
              ? dq.matches
                ? `✓ ${nf(dq.ledger_closing_quantity)}`
                : `⚠ ${signed(dq.variance)}`
              : "—"
          }
          tone={dq ? (dq.matches ? "text-emerald-700" : "text-red-700") : "text-slate-500"}
          sub={
            dq
              ? `ledger ${nf(dq.ledger_closing_quantity)} · stock ${nf(dq.stock_on_hand_quantity)}`
              : "stock not comparable"
          }
          hint="Compares ledger closing with stocks.quantity_on_hand for the same scope. A variance means the ledger and stock table disagree."
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-1 text-[9px] text-slate-500">
        <span>
          Gross In <span className="font-semibold text-slate-700">{nf(s.gross_in)}</span>
        </span>
        <span>
          Gross Out <span className="font-semibold text-slate-700">{nf(s.gross_out)}</span>
        </span>
        <span>
          GRN documents{" "}
          <span className="font-semibold text-slate-700">{nf(s.documents?.purchase)}</span>
          {s.avg_quantity_per_purchase_document != null
            ? ` (avg ${nf(s.avg_quantity_per_purchase_document)}/doc)`
            : ""}
        </span>
        <span>
          Sales documents <span className="font-semibold text-slate-700">{nf(s.documents?.sale)}</span>
        </span>
        <span>
          Return documents{" "}
          <span className="font-semibold text-slate-700">{nf(s.documents?.returned)}</span>
        </span>
        {totals ? (
          <span>
            Products <span className="font-semibold text-slate-700">{nf(totals.products)}</span>
          </span>
        ) : null}
        {s.identity_balanced ? null : (
          <span className="text-red-600">
            balance identity failed — opening + in − out ≠ closing
          </span>
        )}
      </div>
    </div>
  );
}
