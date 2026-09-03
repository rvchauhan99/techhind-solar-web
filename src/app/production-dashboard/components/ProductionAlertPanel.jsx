"use client";

import { useMemo } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { AP } from "./productionDashboardUi";

const REJECTION_THRESHOLD = 15;
const VARIANCE_THRESHOLD = 1000;
const WIP_BACKLOG_THRESHOLD = 5;

export default function ProductionAlertPanel({ kpi, analytics, onAlertClick }) {
  const alerts = useMemo(() => {
    const list = [];
    const k = kpi || {};
    const topVariance = (analytics?.component_variance || [])[0];

    if (Number(k.rejection_percent || 0) >= REJECTION_THRESHOLD) {
      list.push({
        id: "rejection",
        tone: "danger",
        message: `Rejection rate is ${k.rejection_percent}% (threshold ${REJECTION_THRESHOLD}%). Review posted bookings with rejected output.`,
        action: { scrollTarget: "bookings" },
      });
    }
    if (Number(k.overdue_orders || 0) > 0) {
      list.push({
        id: "overdue",
        tone: "warning",
        message: `${k.overdue_orders} open ${AP.orders.title.toLowerCase()} are past planned end date.`,
        action: { open_only: "true", scrollTarget: "work-orders" },
      });
    }
    if (topVariance && Math.abs(Number(topVariance.variance_value || 0)) >= VARIANCE_THRESHOLD) {
      list.push({
        id: "variance",
        tone: "warning",
        message: `High component variance on ${topVariance.product_name}: ${Number(topVariance.variance_value).toFixed(2)}.`,
        action: { scrollTarget: "variance" },
      });
    }
    if (Number(k.open_orders || 0) >= WIP_BACKLOG_THRESHOLD && Number(k.wip_quantity || 0) > 0) {
      list.push({
        id: "wip",
        tone: "info",
        message: `${k.open_orders} open ${AP.orders.title.toLowerCase()} with ${k.wip_quantity} WIP quantity pending.`,
        action: { open_only: "true", scrollTarget: "work-orders" },
      });
    }
    return list;
  }, [kpi, analytics]);

  if (!alerts.length) return null;

  const toneClass = {
    danger: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-blue-200 bg-blue-50 text-blue-900",
  };

  return (
    <div className="space-y-1.5">
      {alerts.map((alert) => (
        <button
          key={alert.id}
          type="button"
          onClick={() => onAlertClick?.(alert.action)}
          className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11px] ${toneClass[alert.tone]}`}
        >
          <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{alert.message}</span>
        </button>
      ))}
    </div>
  );
}
