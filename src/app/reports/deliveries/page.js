"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  IconTruck,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconCalendar,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import DeliveryReportFilters from "./components/DeliveryReportFilters";
import DeliveryReportView from "./components/DeliveryReportView";

const INITIAL_FILTERS = {
  start_date: "",
  end_date: "",
  warehouse_id: "",
  order_number: "",
  customer_name: "",
  delivery_status: "",
  order_status: "",
  challan_no: "",
  handled_by: "",
};

const DATE_PRESETS = [
  {
    label: "Today",
    fn: () => {
      const d = new Date().toISOString().split("T")[0];
      return { start_date: d, end_date: d };
    },
  },
  {
    label: "This Week",
    fn: () => {
      const n = new Date();
      const dy = n.getDay();
      const m = new Date(n);
      m.setDate(n.getDate() - (dy === 0 ? 6 : dy - 1));
      const e = new Date(m);
      e.setDate(m.getDate() + 6);
      return {
        start_date: m.toISOString().split("T")[0],
        end_date: e.toISOString().split("T")[0],
      };
    },
  },
  {
    label: "This Month",
    fn: () => {
      const n = new Date();
      return {
        start_date: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0],
        end_date: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0],
      };
    },
  },
  {
    label: "Last 30d",
    fn: () => {
      const n = new Date();
      const p = new Date(n);
      p.setDate(n.getDate() - 30);
      return {
        start_date: p.toISOString().split("T")[0],
        end_date: n.toISOString().split("T")[0],
      };
    },
  },
];

const FILTER_LABELS = {
  start_date: "From",
  end_date: "To",
  warehouse_id: "Warehouse",
  order_number: "Order #",
  customer_name: "Customer",
  delivery_status: "Delivery",
  order_status: "Order status",
  challan_no: "Challan #",
  handled_by: "Handled by",
};

function getChips(filters) {
  return Object.entries(filters)
    .filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0))
    .map(([key, value]) => ({
      key,
      label: FILTER_LABELS[key] || key,
      value: String(value),
    }));
}

function countActive(f) {
  if (!f) return 0;
  return Object.values(f).filter(
    (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)
  ).length;
}

export default function DeliveryReportPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  const activeCount = countActive(appliedFilters);
  const chips = getChips(appliedFilters);

  const handleApply = () => {
    setAppliedFilters(filters);
    setActivePreset(null);
    setRefreshKey((k) => k + 1);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setActivePreset(null);
    setRefreshKey((k) => k + 1);
  };

  const removeChip = (key) => {
    const next = { ...appliedFilters, [key]: INITIAL_FILTERS[key] };
    setFilters(next);
    setAppliedFilters(next);
    if (key === "start_date" || key === "end_date") setActivePreset(null);
    setRefreshKey((k) => k + 1);
  };

  const handlePreset = (preset) => {
    const dates = preset.fn();
    const next = { ...INITIAL_FILTERS, ...dates };
    setFilters(next);
    setAppliedFilters(next);
    setActivePreset(preset.label);
    setRefreshKey((k) => k + 1);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-slate-50 text-slate-900 font-sans">
        <div className="mx-auto max-w-[1440px] px-2 py-2 pb-6 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="bg-blue-500/10 p-1 rounded-lg">
                <IconTruck size={14} stroke={2} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-tight">
                  Delivery Report
                </h1>
                <p className="text-[10px] text-slate-500">
                  Challans · Actual COGS · Allocated revenue · PNL
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="flex items-center gap-1 text-[9px] text-slate-400">
                <IconCalendar size={10} /> Quick:
              </span>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={[
                    "text-[10px] px-1.5 py-0 rounded-full border font-medium transition-all",
                    activePreset === p.label
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white border-slate-200 text-slate-500 hover:border-primary hover:text-primary",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
              {activeCount > 0 && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1">
                  {activeCount} active
                </Badge>
              )}
              <div className="h-3 w-px bg-slate-200 mx-0.5" />
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="h-6 text-[10px] gap-1 px-1.5"
              >
                <IconRefresh size={12} /> Reset
              </Button>
              <Button
                size="sm"
                variant={filtersOpen ? "default" : "outline"}
                onClick={() => setFiltersOpen((o) => !o)}
                className="h-6 text-[10px] gap-1 px-1.5"
              >
                <IconFilter size={12} />
                Filters
                {filtersOpen ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
              </Button>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => removeChip(chip.key)}
                  className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600"
                >
                  <span className="font-medium">{chip.label}:</span> {chip.value}
                  <IconX size={10} />
                </button>
              ))}
            </div>
          )}

          {filtersOpen && (
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <DeliveryReportFilters filters={filters} onFiltersChange={setFilters} />
              <div className="flex justify-end gap-1 px-2 py-1.5 border-t border-slate-100 bg-slate-50/80">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px]"
                  onClick={() => {
                    setFilters(INITIAL_FILTERS);
                  }}
                >
                  Clear
                </Button>
                <Button size="sm" className="h-6 text-[10px]" onClick={handleApply}>
                  Apply
                </Button>
              </div>
            </Card>
          )}

          <DeliveryReportView filters={appliedFilters} refreshKey={refreshKey} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
