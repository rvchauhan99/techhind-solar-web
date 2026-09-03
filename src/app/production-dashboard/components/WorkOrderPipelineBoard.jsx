"use client";

import { useEffect, useState } from "react";
import productionDashboardService from "@/services/productionDashboardService";
import Loader from "@/components/common/Loader";
import { PIPELINE_STAGES, money, formatQty, pickDashboardParams } from "./productionDashboardUi";

export default function WorkOrderPipelineBoard({ filters, onStageClick }) {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    productionDashboardService
      .getProductionDashboardPipeline(pickDashboardParams(filters))
      .then((res) => {
        if (!mounted) return;
        const byStatus = res?.result?.by_status || res?.by_status || [];
        setStages(
          PIPELINE_STAGES.map((meta) => {
            const match = byStatus.find((s) => s.status === meta.id) || {};
            return {
              ...meta,
              order_count: Number(match.order_count || 0),
              planned_quantity: Number(match.planned_quantity || 0),
              produced_quantity: Number(match.produced_quantity || 0),
              pending_quantity: Number(match.pending_quantity || 0),
              booking_value: Number(match.booking_value || 0),
            };
          })
        );
      })
      .catch(() => {
        if (mounted) setStages(PIPELINE_STAGES.map((s) => ({ ...s, order_count: 0, planned_quantity: 0, produced_quantity: 0, pending_quantity: 0, booking_value: 0 })));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [filters]);

  if (loading && !stages.length) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <Loader />
      </div>
    );
  }

  const display = stages.length
    ? stages
    : PIPELINE_STAGES.map((s) => ({
        ...s,
        order_count: 0,
        planned_quantity: 0,
        produced_quantity: 0,
        pending_quantity: 0,
        booking_value: 0,
      }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-tight text-slate-600">Work Order Pipeline</h3>
        {loading ? <span className="text-[10px] text-slate-400">Updating…</span> : null}
      </div>
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
        {display.map((stage) => (
          <button
            key={stage.id}
            type="button"
            onClick={() => onStageClick?.(stage.id)}
            className="w-[220px] shrink-0 snap-start rounded-lg border border-slate-200 bg-slate-50/60 p-2 text-left transition-colors hover:border-green-300 hover:bg-green-50/50"
          >
            <div className="mb-1 flex items-center gap-1.5">
              <span className={`inline-block size-2 rounded-full ${stage.color}`} />
              <span className="text-[11px] font-bold text-slate-800">{stage.label}</span>
              <span className="ml-auto rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                {stage.order_count}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-600">
              <span>Planned</span>
              <span className="text-right font-semibold text-slate-800">{formatQty(stage.planned_quantity)}</span>
              <span>Produced</span>
              <span className="text-right font-semibold text-emerald-700">{formatQty(stage.produced_quantity)}</span>
              <span>Pending</span>
              <span className="text-right font-semibold text-amber-700">{formatQty(stage.pending_quantity)}</span>
              <span>Value</span>
              <span className="text-right font-semibold text-slate-800">{money(stage.booking_value)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
