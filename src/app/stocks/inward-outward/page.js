"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  IconReportAnalytics,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import stockMovementReportService from "@/services/stockMovementReportService";
import { toastError } from "@/utils/toast";
import StockMovementFilters from "./components/StockMovementFilters";
import StockMovementKpis from "./components/StockMovementKpis";
import StockMovementInsights from "./components/StockMovementInsights";
import StockMovementCharts from "./components/StockMovementCharts";
import StockMovementBreakdown from "./components/StockMovementBreakdown";

const INITIAL_FILTERS = {
  start_date: "",
  end_date: "",
  warehouse_id: "",
  product_id: "",
  product_type_id: "",
  product_make_id: "",
  flow_bucket: "",
  sales_channel: "",
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
  product_id: "Product",
  product_type_id: "Type",
  product_make_id: "Make",
  flow_bucket: "Bucket",
  sales_channel: "Channel",
};

function getChips(filters) {
  return Object.entries(filters)
    .filter(([, v]) => v != null && v !== "")
    .map(([key, value]) => ({
      key,
      label: FILTER_LABELS[key] || key,
      value: String(value),
    }));
}

function defaultMonthFilters() {
  const n = new Date();
  return {
    ...INITIAL_FILTERS,
    start_date: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0],
    end_date: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0],
  };
}

export default function StockInwardOutwardPage() {
  const [filters, setFilters] = useState(defaultMonthFilters);
  const [draft, setDraft] = useState(defaultMonthFilters);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const chips = useMemo(() => getChips(filters), [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        warehouse_id: filters.warehouse_id || undefined,
        product_id: filters.product_id || undefined,
        product_type_id: filters.product_type_id || undefined,
        product_make_id: filters.product_make_id || undefined,
        flow_bucket: filters.flow_bucket || undefined,
        sales_channel: filters.sales_channel || undefined,
      };
      const res = await stockMovementReportService.getDashboard(params);
      setPayload(res?.result || res);
    } catch (err) {
      setPayload(null);
      toastError(err?.response?.data?.message || "Failed to load stock movement dashboard");
    } finally {
      setLoading(false);
    }
  }, [filters, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = () => {
    setFilters({ ...draft });
  };

  const clearFilters = () => {
    const next = defaultMonthFilters();
    setDraft(next);
    setFilters(next);
  };

  const resetFilters = () => {
    setDraft(INITIAL_FILTERS);
    setFilters(INITIAL_FILTERS);
  };

  const removeChip = (key) => {
    const next = { ...filters, [key]: "" };
    setFilters(next);
    setDraft(next);
  };

  const applyInsightFilter = (partial) => {
    const next = { ...filters, ...partial };
    setFilters(next);
    setDraft(next);
  };

  const summary = payload?.meta?.summary;
  const insights = payload?.meta?.insights;
  const charts = payload?.charts;
  const breakdowns = payload?.breakdowns;

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-2 p-2 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <IconReportAnalytics size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Stock Inward / Outward
              </h1>
              <p className="text-[10px] text-slate-500 leading-tight">
                Procurement · Sales · Transfers · Shrinkage · Commercial net
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 mr-1">Quick:</span>
            {DATE_PRESETS.map((p) => (
              <Button
                key={p.label}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[10px] px-2"
                onClick={() => {
                  const dates = p.fn();
                  const next = { ...draft, ...dates };
                  setDraft(next);
                  setFilters(next);
                }}
              >
                {p.label}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] px-2"
              onClick={resetFilters}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px] px-2"
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              <IconRefresh size={12} className="mr-1" /> Refresh
            </Button>
          </div>
        </div>

        <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-slate-50"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <IconFilter size={14} />
              Filters
              {chips.length > 0 && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                  {chips.length}
                </Badge>
              )}
            </span>
            {filtersOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </button>
          {filtersOpen && (
            <>
              <StockMovementFilters filters={draft} onFiltersChange={setDraft} />
              <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2">
                <Button type="button" size="sm" className="h-7 text-[10px]" onClick={applyFilters}>
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px]"
                  onClick={clearFilters}
                >
                  Clear
                </Button>
                {chips.map((c) => (
                  <Badge
                    key={c.key}
                    variant="outline"
                    className="text-[9px] h-5 gap-1 pl-1.5 pr-1 cursor-pointer"
                    onClick={() => removeChip(c.key)}
                  >
                    {c.label}: {c.value}
                    <IconX size={10} />
                  </Badge>
                ))}
              </div>
            </>
          )}
        </Card>

        {summary?.value_basis_note && (
          <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
            {summary.value_basis_note}
          </div>
        )}

        <StockMovementKpis summary={summary} loading={loading} />
        <StockMovementInsights insights={insights} onApplyFilter={applyInsightFilter} />
        {!loading && <StockMovementCharts charts={charts} />}
        <StockMovementBreakdown breakdowns={breakdowns} filters={filters} />
      </div>
    </ProtectedRoute>
  );
}
