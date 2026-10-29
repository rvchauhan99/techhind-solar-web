"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { LEDGER_DRILL } from "@/utils/stockLedgerLinks";

function InsightCard({ title, children, href }) {
  return (
    <Card
      className={`rounded-xl border-slate-200 bg-white shadow-sm ${
        href ? "hover:border-primary/40 hover:shadow-md" : ""
      }`}
    >
      <CardContent className="p-2 space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-tight text-slate-500">
          {href ? (
            <Link href={href} className="hover:text-primary hover:underline">
              {title}
            </Link>
          ) : (
            title
          )}
        </div>
        <div className="text-[11px] text-slate-800 leading-snug">{children}</div>
      </CardContent>
    </Card>
  );
}

function DrillLink({ href, className, children }) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <Link href={href} className={`${className} hover:underline`} title="Open in Stock Ledger">
      {children}
    </Link>
  );
}

export default function StockMovementInsights({ insights, ledgerHref }) {
  const i = insights || {};
  const topWh = i.top_outflow_warehouse;
  const topProducts = i.top_consumed_products || [];
  const gaps = i.supply_demand_gap || [];
  const slow = i.slow_movers || [];
  const href = (drill) => ledgerHref?.(drill) || null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1.5">
      <InsightCard
        title="Top outflow warehouse"
        href={
          topWh?.warehouse_id
            ? href({ ...LEDGER_DRILL.salesOut, warehouse_id: topWh.warehouse_id })
            : null
        }
      >
        {topWh ? (
          <>
            <DrillLink
              href={
                topWh.warehouse_id
                  ? href({ ...LEDGER_DRILL.salesOut, warehouse_id: topWh.warehouse_id })
                  : null
              }
              className="font-semibold text-primary"
            >
              {topWh.warehouse_name}
            </DrillLink>
            <span className="text-slate-500">
              {" "}
              · {Number(topWh.sales_out_qty || 0).toLocaleString("en-IN")} OUT
              {topWh.vs_avg_pct != null
                ? ` (${topWh.vs_avg_pct >= 0 ? "+" : ""}${topWh.vs_avg_pct}% vs avg)`
                : ""}
            </span>
          </>
        ) : (
          <span className="text-slate-400">No sales outflow in period</span>
        )}
      </InsightCard>

      <InsightCard title="Top consumed products">
        {topProducts.length ? (
          <ul className="space-y-0.5">
            {topProducts.map((p) => (
              <li key={p.product_id} className="truncate">
                <DrillLink
                  href={href({ ...LEDGER_DRILL.salesOut, product_id: p.product_id })}
                  className="text-left text-primary font-medium"
                >
                  {p.product_name}
                </DrillLink>
                <span className="text-slate-500"> · {p.sales_out_qty}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-slate-400">None</span>
        )}
      </InsightCard>

      <InsightCard title="Supply vs demand gap">
        {gaps.length ? (
          <ul className="space-y-0.5">
            {gaps.map((g) => (
              <li key={g.warehouse_id} className="truncate">
                <DrillLink
                  href={href({
                    flow_bucket: ["procurement_in", "sales_out"],
                    warehouse_id: g.warehouse_id,
                  })}
                  className="text-left text-amber-700 font-medium"
                >
                  {g.warehouse_name}
                </DrillLink>
                <span className="text-slate-500">
                  {" "}
                  · OUT {g.sales_out_qty} / IN {g.procurement_in_qty}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-slate-400">No transfer-dependent gaps</span>
        )}
      </InsightCard>

      <InsightCard title="Slow movers (on hand, 0 sales)">
        {slow.length ? (
          <ul className="space-y-0.5">
            {slow.slice(0, 5).map((p) => (
              <li key={p.product_id} className="truncate">
                <DrillLink
                  href={href({ product_id: p.product_id })}
                  className="text-left text-slate-700 font-medium"
                >
                  {p.product_name}
                </DrillLink>
                <span className="text-slate-500"> · OH {p.on_hand}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-slate-400">None flagged</span>
        )}
      </InsightCard>

      <InsightCard
        title="Damage rate"
        href={i.damage_rate_pct ? href(LEDGER_DRILL.shrinkage) : null}
      >
        {i.damage_rate_pct != null ? (
          <DrillLink
            href={i.damage_rate_pct ? href(LEDGER_DRILL.shrinkage) : null}
            className="font-semibold text-red-600"
          >
            {i.damage_rate_pct}%
          </DrillLink>
        ) : (
          <span className="text-slate-400">N/A (no sales OUT)</span>
        )}
        <div className="text-[9px] text-slate-400 mt-0.5">Shrinkage qty / Sales OUT qty</div>
      </InsightCard>
    </div>
  );
}
