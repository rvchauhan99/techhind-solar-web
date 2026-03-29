"use client";

import { useState, useEffect, useMemo } from "react";
import mastersService from "@/services/mastersService";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  IconPackage,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconCalendar,
  IconX,
  IconCheck,
  IconClock,
  IconTruck,
  IconLock,
  IconBox,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import Input from "@/components/common/Input";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import ReportFilters from "./components/ReportFilters";
import SerializedInventoryReport from "./components/SerializedInventoryReport";

const INITIAL_FILTERS = {
  start_date: "",
  end_date: "",
  product_id: "",
  warehouse_id: "",
  product_type_id: "",
  product_make_id: "",
  status: null,
  serial_number: "",
  issued_against: "",
  reference_number: "",
};

const SERIAL_STATUSES = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "ISSUED", label: "Issued" },
  { value: "BLOCKED", label: "Blocked" },
];

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
    label: "Last 3M",
    fn: () => {
      const n = new Date();
      const p = new Date(n);
      p.setMonth(n.getMonth() - 3);
      return {
        start_date: p.toISOString().split("T")[0],
        end_date: n.toISOString().split("T")[0],
      };
    },
  },
  {
    label: "This Year",
    fn: () => {
      const n = new Date();
      return {
        start_date: new Date(n.getFullYear(), 0, 1).toISOString().split("T")[0],
        end_date: new Date(n.getFullYear(), 11, 31).toISOString().split("T")[0],
      };
    },
  },
];

const STATUS_TABS = [
  { value: null, label: "All", icon: null, cls: "text-slate-600 border-slate-200 hover:border-slate-400" },
  { value: "AVAILABLE", label: "Available", icon: IconCheck, cls: "text-emerald-600 border-emerald-200 hover:border-emerald-400", activeCls: "bg-emerald-50 border-emerald-400 text-emerald-700" },
  { value: "RESERVED", label: "Reserved", icon: IconClock, cls: "text-amber-600 border-amber-200 hover:border-amber-400", activeCls: "bg-amber-50 border-amber-400 text-amber-700" },
  { value: "ISSUED", label: "Issued", icon: IconTruck, cls: "text-blue-600 border-blue-200 hover:border-blue-400", activeCls: "bg-blue-50 border-blue-400 text-blue-700" },
  { value: "BLOCKED", label: "Blocked", icon: IconLock, cls: "text-red-500 border-red-200 hover:border-red-400", activeCls: "bg-red-50 border-red-400 text-red-600" },
];

const FILTER_LABELS = {
  start_date: "Inward From",
  end_date: "Inward To",
  product_id: "Product",
  warehouse_id: "Warehouse",
  product_type_id: "Product Type",
  product_make_id: "Product Make",
  status: "Status",
  serial_number: "Serial #",
  issued_against: "Issued Against",
  reference_number: "Reference #",
};

function getChips(filters, productMakeById = null) {
  return Object.entries(filters)
    .filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0))
    .map(([key, value]) => ({
      key,
      label: FILTER_LABELS[key] || key,
      value:
        key === "status"
          ? (Array.isArray(value) ? value : [value])
              .map((s) => SERIAL_STATUSES.find((o) => o.value === s)?.label || s)
              .join(", ")
          : key === "product_make_id" && productMakeById?.get
            ? productMakeById.get(String(value)) || String(value)
            : String(value),
    }));
}

function countActive(f) {
  if (!f) return 0;
  return Object.values(f).filter(
    (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)
  ).length;
}

export default function SerializedInventoryReportPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [activeStatusTab, setActiveStatusTab] = useState(null);
  const [productMakeOptions, setProductMakeOptions] = useState([]);

  useEffect(() => {
    mastersService
      .getReferenceOptions("product_make.model")
      .then((res) => {
        const data = res?.result || res?.data || res || [];
        const opts = Array.isArray(data) ? data.map((m) => ({ id: m.id, name: m.name || String(m.id) })) : [];
        setProductMakeOptions(opts);
      })
      .catch(() => setProductMakeOptions([]));
  }, []);

  const productMakeById = useMemo(() => {
    const map = new Map();
    productMakeOptions.forEach((m) => map.set(String(m.id), m.name));
    return map;
  }, [productMakeOptions]);

  const activeCount = countActive(appliedFilters);
  const chips = getChips(appliedFilters, productMakeById);
  const fc = (key, val) => setFilters((p) => ({ ...p, [key]: val }));

  const handleApply = () => {
    setAppliedFilters(filters);
    setActivePreset(null);
    setRefreshKey((k) => k + 1);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setActivePreset(null);
    setActiveStatusTab(null);
    setRefreshKey((k) => k + 1);
  };

  const handleStatusTab = (statusValue) => {
    setActiveStatusTab(statusValue);
    const next = {
      ...filters,
      status: statusValue ? [statusValue] : null,
    };
    setFilters(next);
    setAppliedFilters(next);
    setRefreshKey((k) => k + 1);
  };

  const removeChip = (key) => {
    const next = { ...appliedFilters, [key]: INITIAL_FILTERS[key] };
    setFilters(next);
    setAppliedFilters(next);
    if (key === "status") setActiveStatusTab(null);
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
          {/* Header */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="bg-emerald-500/10 p-1 rounded-lg">
                <IconPackage size={14} stroke={2} className="text-emerald-600" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-tight">
                  Serialized Inventory Report
                </h1>
                <p className="text-[10px] text-slate-500">
                  Serials · Status · Warehouse · Inward
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
                <IconRefresh size={10} /> Reset
              </Button>
              <Button size="sm" onClick={handleApply} className="h-6 text-[10px] gap-1 px-1.5">
                <IconFilter size={10} /> Apply
              </Button>
            </div>
          </div>

          {/* Status Quick Tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeStatusTab === tab.value;
              return (
                <button
                  key={String(tab.value)}
                  onClick={() => handleStatusTab(tab.value)}
                  className={[
                    "flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all",
                    isActive
                      ? tab.activeCls || "bg-primary text-primary-foreground border-primary"
                      : `bg-white ${tab.cls}`,
                  ].join(" ")}
                >
                  {Icon && <Icon size={11} />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Collapsible Advanced Filters */}
          <Card className="rounded-xl shadow-sm border-slate-200 bg-white overflow-visible">
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className="w-full flex items-center justify-between px-2 py-1 hover:bg-slate-50 transition-colors rounded-xl"
            >
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                <IconFilter size={11} /> Advanced Filters
                {activeCount > 0 && (
                  <Badge variant="secondary" className="text-[9px] h-3.5 px-1">
                    {activeCount}
                  </Badge>
                )}
              </span>
              {filtersOpen ? (
                <IconChevronUp size={11} className="text-slate-400" />
              ) : (
                <IconChevronDown size={11} className="text-slate-400" />
              )}
            </button>
            {filtersOpen && (
              <ReportFilters
                filters={filters}
                onFiltersChange={setFilters}
                onApply={handleApply}
                onReset={handleReset}
              />
            )}
          </Card>

          {/* Active Filter Chips */}
          {chips.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Filters:
              </span>
              {chips.map(({ key, label, value }) => (
                <button
                  key={key}
                  onClick={() => removeChip(key)}
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/8 border border-primary/20 text-primary/80 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                >
                  {label}: <span className="font-semibold">{value}</span>
                  <IconX size={9} />
                </button>
              ))}
              <button
                onClick={handleReset}
                className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Main View */}
          <SerializedInventoryReport
            key={refreshKey}
            filters={appliedFilters}
            onRefresh={() => setRefreshKey((prev) => prev + 1)}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
