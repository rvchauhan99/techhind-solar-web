"use client";

import ProtectedRoute from "@/components/common/ProtectedRoute";
import { IconFilter, IconCalendar, IconCircleX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OrderListFilterPanel from "@/components/common/OrderListFilterPanel";
import { useState } from "react";
import ListView from "./ListView";

const DATE_PRESETS = [
  { label: "Today", fn: () => { const d = new Date().toISOString().split("T")[0]; return { order_date_from: d, order_date_to: d }; } },
  { label: "This Week", fn: () => { const n = new Date(), dy = n.getDay(), m = new Date(n); m.setDate(n.getDate() - (dy === 0 ? 6 : dy - 1)); const e = new Date(m); e.setDate(m.getDate() + 6); return { order_date_from: m.toISOString().split("T")[0], order_date_to: e.toISOString().split("T")[0] }; } },
  { label: "This Month", fn: () => { const n = new Date(); return { order_date_from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0], order_date_to: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0] }; } },
  { label: "Last 3M", fn: () => { const n = new Date(), p = new Date(n); p.setMonth(n.getMonth() - 3); return { order_date_from: p.toISOString().split("T")[0], order_date_to: n.toISOString().split("T")[0] }; } },
  { label: "Last 6M", fn: () => { const n = new Date(), p = new Date(n); p.setMonth(n.getMonth() - 6); return { order_date_from: p.toISOString().split("T")[0], order_date_to: n.toISOString().split("T")[0] }; } },
];

const INITIAL_FILTERS = {
  order_date_from: "",
  order_date_to: "",
  branch_id: "",
  inquiry_source_id: "",
  handled_by: "",
  order_number: "",
  customer_name: "",
  mobile_number: "",
  consumer_no: "",
  application_no: "",
  reference_from: "",
  q: "",
  cancelled_stage: "",
  cancelled_at_stage_key: "",
  capacity_kw_from: "",
  capacity_kw_to: "",
  solar_panel_id: "",
  inverter_id: "",
};

function countActive(filters) {
  return Object.values(filters).filter((v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)).length;
}

export default function CancelledOrdersPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  const activeCount = countActive(appliedFilters);

  const apply = (overrideFilters) => {
    const f = overrideFilters ?? filters;
    setAppliedFilters(f);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setActivePreset(null);
  };

  const handlePreset = (preset) => {
    const dates = preset.fn();
    const next = { ...filters, ...dates };
    setFilters(next);
    setActivePreset(preset.label);
    apply(next);
  };

  const fc = (key, val) => setFilters((p) => ({ ...p, [key]: val }));

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-slate-50 text-slate-900 font-sans">
        <div className="mx-auto max-w-[1440px] px-3 py-2 pb-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
            <div className="bg-red-500/10 p-1 rounded-lg">
                <IconCircleX size={14} stroke={2} className="text-red-600" />
              </div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900">Cancelled Orders Report</h1>
              <span className="text-[11px] text-slate-400 hidden sm:inline">· Track and analyze cancelled orders by stage</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <IconCalendar size={11} /> Quick:
              </span>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handlePreset(p)}
                  className={[
                    "text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all",
                    activePreset === p.label
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white border-slate-200 text-slate-500 hover:border-primary hover:text-primary",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
              {activeCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{activeCount} active</Badge>
              )}
              <div className="h-4 w-px bg-slate-200 mx-0.5" />
              <Button size="sm" variant="outline" onClick={handleReset} className="h-7 text-xs gap-1 px-2">
                Reset
              </Button>
              <Button size="sm" onClick={() => apply()} className="h-7 text-xs gap-1 px-2">
                <IconFilter size={11} /> Apply
              </Button>
            </div>
          </div>

          <OrderListFilterPanel
            open={filterPanelOpen}
            onToggle={setFilterPanelOpen}
            values={filters}
            onApply={(v) => {
              setFilters(v);
              setAppliedFilters(v);
              setFilterPanelOpen(false);
            }}
            onClear={() => {
              handleReset();
              setFilterPanelOpen(false);
            }}
            defaultOpen={false}
            variant="cancelled"
          />

          <ListView filters={appliedFilters} />
        </div>
      </div>
    </ProtectedRoute>
  );
}

