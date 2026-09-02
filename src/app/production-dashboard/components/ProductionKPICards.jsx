"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  IconClipboardList,
  IconCoin,
  IconPackage,
  IconRecycle,
  IconTool,
  IconAlertTriangle,
} from "@tabler/icons-react";
import productionDashboardService from "@/services/productionDashboardService";
import { AP, money, formatQty, pickDashboardParams } from "./productionDashboardUi";

const CardShell = ({ label, value, sub, icon: Icon, iconBg, loading, onClick, className = "" }) => (
  <Card
    className={`rounded-xl border-slate-200 shadow-sm ${onClick ? "cursor-pointer hover:border-green-300 hover:bg-green-50/40" : ""} ${className}`}
    onClick={onClick}
  >
    <CardContent className="flex h-full flex-col justify-between p-2.5">
      <div className="flex items-start justify-between gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-tight text-slate-500">{label}</span>
        <div className={`rounded-lg p-1 ${iconBg}`}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-1">
        <div className={`text-lg font-bold leading-tight text-slate-900 ${loading ? "opacity-70" : ""}`}>
          {loading ? "…" : value}
        </div>
        {sub ? <div className="text-[10px] text-slate-500">{sub}</div> : null}
      </div>
    </CardContent>
  </Card>
);

export default function ProductionKPICards({ filters, onCardClick }) {
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    productionDashboardService
      .getProductionDashboardKpis(pickDashboardParams(filters))
      .then((res) => {
        if (!mounted) return;
        setKpi(res?.result?.kpi || res?.kpi || null);
      })
      .catch(() => {
        if (mounted) setKpi(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [filters]);

  const k = kpi || {};

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
      <CardShell
        label={`Open ${AP.orders.title}`}
        value={formatQty(k.open_orders)}
        sub={`${formatQty(k.draft_orders)} draft · ${formatQty(k.completed_orders)} done`}
        icon={IconClipboardList}
        iconBg="bg-blue-50 text-blue-600"
        loading={loading}
        onClick={() => onCardClick?.({ open_only: "true", status: "", kpi_scope: "open", scrollTarget: "work-orders" })}
      />
      <CardShell
        label="WIP Qty"
        value={formatQty(k.wip_quantity)}
        sub={`Planned ${formatQty(k.planned_quantity)}`}
        icon={IconTool}
        iconBg="bg-violet-50 text-violet-600"
        loading={loading}
        onClick={() => onCardClick?.({ open_only: "true", scrollTarget: "work-orders" })}
      />
      <CardShell
        label="Good Produced"
        value={formatQty(k.good_quantity)}
        sub={`${formatQty(k.booking_count)} bookings`}
        icon={IconPackage}
        iconBg="bg-emerald-50 text-emerald-600"
        loading={loading}
        onClick={() => onCardClick?.({ scrollTarget: "bookings" })}
      />
      <CardShell
        label="Rejected"
        value={formatQty(k.rejected_quantity)}
        sub={`${k.rejection_percent ?? 0}% of output`}
        icon={IconAlertTriangle}
        iconBg="bg-red-50 text-red-600"
        loading={loading}
        onClick={() => onCardClick?.({ scrollTarget: "bookings" })}
      />
      <CardShell
        label="Production Value"
        value={money(k.production_value)}
        sub={`Avg ${money(k.avg_unit_cost)}/unit`}
        icon={IconCoin}
        iconBg="bg-amber-50 text-amber-600"
        loading={loading}
        onClick={() => onCardClick?.({ scrollTarget: "bookings" })}
      />
      <CardShell
        label="Material Cost"
        value={money(k.material_cost)}
        sub={`Ops ${money(k.operation_cost)}`}
        icon={IconCoin}
        iconBg="bg-cyan-50 text-cyan-600"
        loading={loading}
        onClick={() => onCardClick?.({ scrollTarget: "charts" })}
      />
      <CardShell
        label="Yield %"
        value={`${k.yield_percent ?? 0}%`}
        sub={`Completion ${k.completion_percent ?? 0}%`}
        icon={IconPackage}
        iconBg="bg-green-50 text-green-600"
        loading={loading}
        onClick={() => onCardClick?.({ scrollTarget: "charts" })}
      />
      <CardShell
        label="Component Scrap"
        value={formatQty(k.scrap_quantity, 2)}
        sub={money(k.scrap_value)}
        icon={IconRecycle}
        iconBg="bg-orange-50 text-orange-600"
        loading={loading}
        onClick={() => onCardClick?.({ scrollTarget: "variance" })}
      />
    </div>
  );
}
