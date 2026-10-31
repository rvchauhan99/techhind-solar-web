"use client";

import {
  IconPackageImport,
  IconPackageExport,
  IconScale,
  IconArrowsExchange,
  IconAlertTriangle,
  IconCurrencyRupee,
  IconList,
  IconBuildingWarehouse,
} from "@tabler/icons-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupeesInteger } from "@/utils/orderFormatters";
import { LEDGER_DRILL } from "@/utils/stockLedgerLinks";

const INR = (v) => formatRupeesInteger(v);
const INR2 = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

function KpiCard({ icon: Icon, iconColor, label, value, sub, loading, valueClass, href }) {
  const card = (
    <Card
      className={`rounded-xl shadow-sm border-slate-200 bg-white transition-all hover:shadow-md h-full ${
        loading ? "animate-pulse" : ""
      } ${href ? "cursor-pointer hover:border-primary/40" : ""}`}
    >
      <CardContent className="p-2 flex flex-col justify-center h-full gap-0.5">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight leading-none">
            {label}
          </span>
          {Icon && (
            <div
              className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${iconColor}`}
            >
              <Icon size={11} />
            </div>
          )}
        </div>
        <div className={`text-lg font-bold leading-none ${valueClass || "text-slate-900"}`}>
          {loading ? "…" : value}
        </div>
        {sub && <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">{sub}</div>}
      </CardContent>
    </Card>
  );
  if (!href || loading) return card;
  return (
    <Link href={href} title={`Open ${label} in Stock Ledger`} className="block">
      {card}
    </Link>
  );
}

export default function StockMovementKpis({ summary, loading, ledgerHref }) {
  const s = summary || {};
  const drill = (scope, qty) => (Number(qty) ? ledgerHref?.(scope) : null);
  const netPositive = Number(s.commercial_net_value) >= 0;
  const b2c = s.b2c_sales_out_share_pct;
  const b2b = s.b2b_sales_out_share_pct;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-1.5">
      <KpiCard
        icon={IconPackageImport}
        iconColor="bg-emerald-50 text-emerald-700"
        label="Procurement IN"
        value={loading ? "…" : INR2(s.procurement_in_qty)}
        sub={loading ? undefined : `₹${INR(s.procurement_in_value)}`}
        loading={loading}
        href={drill(LEDGER_DRILL.procurementIn, s.procurement_in_qty)}
      />
      <KpiCard
        icon={IconPackageExport}
        iconColor="bg-amber-50 text-amber-700"
        label="Sales OUT"
        value={loading ? "…" : INR2(s.sales_out_qty)}
        sub={
          loading
            ? undefined
            : `₹${INR(s.sales_out_value)}${b2c != null ? ` · B2C ${b2c}% / B2B ${b2b ?? 0}%` : ""}`
        }
        loading={loading}
        href={drill(LEDGER_DRILL.salesOut, s.sales_out_qty)}
      />
      <KpiCard
        icon={IconScale}
        iconColor={netPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}
        label="Commercial Net"
        value={loading ? "…" : INR2(s.commercial_net_qty)}
        sub={loading ? undefined : `₹${INR(s.commercial_net_value)}`}
        valueClass={netPositive ? "text-emerald-700" : "text-red-600"}
        loading={loading}
        href={drill(
          LEDGER_DRILL.commercialNet,
          Math.abs(Number(s.procurement_in_qty) || 0) +
            Math.abs(Number(s.sales_out_qty) || 0) +
            Math.abs(Number(s.sales_in_qty) || 0) +
            Math.abs(Number(s.procurement_out_qty) || 0),
        )}
      />
      <KpiCard
        icon={IconArrowsExchange}
        iconColor="bg-sky-50 text-sky-700"
        label="Transfer Churn"
        value={loading ? "…" : INR2(s.transfer_churn_qty)}
        sub={
          loading
            ? undefined
            : s.transfer_churn_pct != null
              ? `${s.transfer_churn_pct}% of abs move`
              : undefined
        }
        loading={loading}
        href={drill(LEDGER_DRILL.transferOut, s.transfer_churn_qty)}
      />
      <KpiCard
        icon={IconAlertTriangle}
        iconColor="bg-red-50 text-red-600"
        label="Shrinkage"
        value={loading ? "…" : INR2(s.shrinkage_qty)}
        sub={
          loading
            ? undefined
            : `₹${INR(s.shrinkage_value)}${
                s.damage_rate_pct != null ? ` · ${s.damage_rate_pct}% of sales` : ""
              }`
        }
        loading={loading}
        href={drill(LEDGER_DRILL.shrinkage, s.shrinkage_qty)}
      />
      <KpiCard
        icon={IconCurrencyRupee}
        iconColor="bg-violet-50 text-violet-700"
        label="Closing Value"
        value={loading ? "…" : `₹${INR(s.closing_stock_value)}`}
        sub={
          loading ? undefined : `On hand ${INR2(s.closing_on_hand)} · Res ${INR2(s.reserved_now)}`
        }
        loading={loading}
      />
      <KpiCard
        icon={IconList}
        iconColor="bg-slate-100 text-slate-600"
        label="Lines"
        value={loading ? "…" : INR2(s.movement_lines)}
        sub={loading || !s.value_basis_note ? undefined : `${s.wac_estimate_lines} WAC-estimated`}
        loading={loading}
        href={drill(LEDGER_DRILL.all, s.movement_lines)}
      />
      <KpiCard
        icon={IconBuildingWarehouse}
        iconColor="bg-indigo-50 text-indigo-700"
        label="Warehouses"
        value={loading ? "…" : INR2(s.warehouses_active)}
        sub="with movement"
        loading={loading}
      />
    </div>
  );
}
