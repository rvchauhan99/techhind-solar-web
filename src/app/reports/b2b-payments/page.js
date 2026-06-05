"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  IconCurrencyRupee,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconCalendar,
  IconClock,
  IconCircleCheck,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import Input from "@/components/common/Input";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import companyService from "@/services/companyService";
import b2bClientService from "@/services/b2bClientService";
import B2bPaymentsReportView from "@/app/reports/payments/components/B2bPaymentsReportView";

const INITIAL_FILTERS = {
  start_date: "",
  end_date: "",
  warehouse_id: "",
  payment_mode_id: "",
  status: null,
  order_no: "",
  client_id: "",
  client_label: "",
  receipt_number: "",
};

const mapList = (res) => {
  const data = res?.result?.data ?? res?.result ?? res?.data ?? res ?? [];
  return Array.isArray(data) ? data : [];
};

const STATUS_OPTIONS = [
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
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
      return { start_date: p.toISOString().split("T")[0], end_date: n.toISOString().split("T")[0] };
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
  {
    value: "pending_approval",
    label: "Pending",
    icon: IconClock,
    cls: "text-amber-600 border-amber-200 hover:border-amber-400",
    activeCls: "bg-amber-50 border-amber-400 text-amber-700",
  },
  {
    value: "approved",
    label: "Approved",
    icon: IconCircleCheck,
    cls: "text-emerald-600 border-emerald-200 hover:border-emerald-400",
    activeCls: "bg-emerald-50 border-emerald-400 text-emerald-700",
  },
  {
    value: "rejected",
    label: "Rejected",
    icon: IconX,
    cls: "text-red-500 border-red-200 hover:border-red-400",
    activeCls: "bg-red-50 border-red-400 text-red-600",
  },
];

const FILTER_LABELS = {
  start_date: "Date From",
  end_date: "Date To",
  warehouse_id: "Warehouse",
  payment_mode_id: "Payment Mode",
  status: "Status",
  order_no: "Order #",
  client_id: "Client",
  receipt_number: "Receipt #",
};

function getChipValue(key, value, filters) {
  if (key === "status") {
    return (Array.isArray(value) ? value : [value])
      .map((s) => STATUS_OPTIONS.find((o) => o.value === s)?.label || s)
      .join(", ");
  }
  if (key === "client_id") {
    return filters?.client_label || `Client #${value}`;
  }
  return String(value);
}

function getChips(filters) {
  return Object.entries(filters)
    .filter(([key]) => key !== "client_label")
    .filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0))
    .map(([key, value]) => ({
      key,
      label: FILTER_LABELS[key] || key,
      value: getChipValue(key, value, filters),
    }));
}

function countActive(f) {
  if (!f) return 0;
  return Object.entries(f).filter(
    ([key, v]) =>
      key !== "client_label" &&
      v != null &&
      v !== "" &&
      !(Array.isArray(v) && v.length === 0)
  ).length;
}

const loadWarehouseOptions = async (q) => {
  const res = await companyService.listWarehouses();
  const list = mapList(res);
  const term = String(q || "").toLowerCase();
  return list
    .filter((w) => !term || String(w.name || w.label || "").toLowerCase().includes(term))
    .slice(0, 50)
    .map((w) => ({ ...w, id: w.id, name: w.name ?? w.label }));
};

const loadClientOptions = async (q) => {
  const res = await b2bClientService.getB2bClients({ q: q || undefined, limit: 50 });
  return mapList(res).map((c) => ({ ...c, id: c.id, name: c.client_name ?? c.name }));
};

export default function B2bPaymentsReportPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [activeStatusTab, setActiveStatusTab] = useState(null);

  const activeCount = countActive(appliedFilters);
  const chips = getChips(appliedFilters);
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
    const next = { ...filters, status: statusValue ? [statusValue] : null };
    setFilters(next);
    setAppliedFilters(next);
    setRefreshKey((k) => k + 1);
  };

  const removeChip = (key) => {
    const next = { ...appliedFilters, [key]: INITIAL_FILTERS[key] };
    if (key === "client_id") next.client_label = "";
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
        <div className="mx-auto max-w-[1440px] px-3 py-3 pb-8 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500/10 p-1.5 rounded-lg">
                <IconCurrencyRupee size={16} className="text-emerald-600" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">
                  B2B Payments Report
                </h1>
                <p className="text-[11px] text-slate-500">B2B collections by order and client</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <IconCalendar size={11} /> Quick:
              </span>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
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
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {activeCount} active
                </Badge>
              )}
              <div className="h-4 w-px bg-slate-200 mx-0.5" />
              <Button size="sm" variant="outline" onClick={handleReset} className="h-7 text-xs gap-1 px-2">
                <IconRefresh size={11} /> Reset
              </Button>
              <Button size="sm" onClick={handleApply} className="h-7 text-xs gap-1 px-2">
                <IconFilter size={11} /> Apply
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeStatusTab === tab.value;
              return (
                <button
                  key={String(tab.value)}
                  type="button"
                  onClick={() => handleStatusTab(tab.value)}
                  className={[
                    "flex items-center gap-1 text-[11px] font-semibold px-3 py-1 rounded-full border transition-all",
                    isActive
                      ? tab.activeCls || "bg-primary text-primary-foreground border-primary"
                      : `bg-white ${tab.cls}`,
                  ].join(" ")}
                >
                  {Icon && <Icon size={12} />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          <Card className="rounded-xl shadow-sm border-slate-200 bg-white overflow-visible">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors rounded-xl"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <IconFilter size={12} /> Advanced Filters
                {activeCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    {activeCount}
                  </Badge>
                )}
              </span>
              {filtersOpen ? (
                <IconChevronUp size={13} className="text-slate-400" />
              ) : (
                <IconChevronDown size={13} className="text-slate-400" />
              )}
            </button>
            {filtersOpen && (
              <div className="border-t border-slate-100 px-3 py-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                <DateField
                  label="Date From"
                  name="start_date"
                  value={filters.start_date || ""}
                  onChange={(e) => fc("start_date", e.target.value || null)}
                />
                <DateField
                  label="Date To"
                  name="end_date"
                  value={filters.end_date || ""}
                  onChange={(e) => fc("end_date", e.target.value || null)}
                />
                <AutocompleteField
                  usePortal
                  name="warehouse_id"
                  label="Warehouse"
                  asyncLoadOptions={loadWarehouseOptions}
                  getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                  value={filters.warehouse_id ? { id: filters.warehouse_id } : null}
                  onChange={(e, v) => fc("warehouse_id", v?.id ?? null)}
                  placeholder="Search warehouse…"
                />
                <AutocompleteField
                  usePortal
                  name="payment_mode_id"
                  label="Payment Mode"
                  asyncLoadOptions={(q) =>
                    getReferenceOptionsSearch("payment_mode.model", { q, limit: 20 })
                  }
                  referenceModel="payment_mode.model"
                  getOptionLabel={(o) => o?.name ?? ""}
                  value={filters.payment_mode_id ? { id: filters.payment_mode_id } : null}
                  onChange={(e, v) => fc("payment_mode_id", v?.id ?? null)}
                />
                <AutocompleteField
                  usePortal
                  name="status"
                  label="Status"
                  multiple
                  options={STATUS_OPTIONS}
                  getOptionLabel={(o) => o?.label ?? ""}
                  value={(Array.isArray(filters.status) ? filters.status : [])
                    .map((v) => STATUS_OPTIONS.find((s) => s.value === v))
                    .filter(Boolean)}
                  onChange={(e, v) => {
                    fc("status", v?.length ? v.map((o) => o.value) : null);
                    setActiveStatusTab(null);
                  }}
                />
                <Input
                  name="order_no"
                  label="Order No"
                  value={filters.order_no || ""}
                  onChange={(e) => fc("order_no", e.target.value || null)}
                />
                <AutocompleteField
                  usePortal
                  name="client_id"
                  label="Client"
                  asyncLoadOptions={loadClientOptions}
                  getOptionLabel={(o) => o?.client_name ?? o?.name ?? ""}
                  value={
                    filters.client_id
                      ? { id: filters.client_id, client_name: filters.client_label }
                      : null
                  }
                  onChange={(e, v) => {
                    setFilters((p) => ({
                      ...p,
                      client_id: v?.id ?? "",
                      client_label: v?.client_name ?? v?.name ?? "",
                    }));
                  }}
                  placeholder="Search client…"
                />
                <Input
                  name="receipt_number"
                  label="Receipt #"
                  value={filters.receipt_number || ""}
                  onChange={(e) => fc("receipt_number", e.target.value || null)}
                />
              </div>
            )}
          </Card>

          {chips.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Filters:
              </span>
              {chips.map(({ key, label, value }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => removeChip(key)}
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/8 border border-primary/20 text-primary/80 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                >
                  {label}: <span className="font-semibold">{value}</span>
                  <IconX size={9} />
                </button>
              ))}
              <button
                type="button"
                onClick={handleReset}
                className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          <B2bPaymentsReportView key={refreshKey} filters={appliedFilters} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
