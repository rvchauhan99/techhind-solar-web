"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { IconCurrencyRupee, IconFilter, IconChevronDown, IconChevronUp, IconRefresh, IconCalendar } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import Input from "@/components/common/Input";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import PaymentsReportView from "./components/PaymentsReportView";

const INITIAL_FILTERS = {
  start_date: "", end_date: "", branch_id: "", handled_by: "",
  payment_mode_id: "", status: null, order_number: "", customer_name: "", receipt_number: "",
};

const STATUS_OPTIONS = [
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const DATE_PRESETS = [
  { label: "Today", fn: () => { const d = new Date().toISOString().split("T")[0]; return { start_date: d, end_date: d }; } },
  { label: "This Week", fn: () => { const n = new Date(), dy = n.getDay(), m = new Date(n); m.setDate(n.getDate() - (dy === 0 ? 6 : dy - 1)); const e = new Date(m); e.setDate(m.getDate() + 6); return { start_date: m.toISOString().split("T")[0], end_date: e.toISOString().split("T")[0] }; } },
  { label: "This Month", fn: () => { const n = new Date(); return { start_date: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0], end_date: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0] }; } },
  { label: "Last 3M", fn: () => { const n = new Date(), p = new Date(n); p.setMonth(n.getMonth() - 3); return { start_date: p.toISOString().split("T")[0], end_date: n.toISOString().split("T")[0] }; } },
  { label: "This Year", fn: () => { const n = new Date(); return { start_date: new Date(n.getFullYear(), 0, 1).toISOString().split("T")[0], end_date: new Date(n.getFullYear(), 11, 31).toISOString().split("T")[0] }; } },
];

function countActive(f) {
  if (!f) return 0;
  return Object.values(f).filter((v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)).length;
}

export default function PaymentsReportPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  const activeCount = countActive(appliedFilters);
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

          {/* Header */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500/10 p-1.5 rounded-lg">
                <IconCurrencyRupee size={16} stroke={2} className="text-emerald-600" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">Payments Report</h1>
                <p className="text-[11px] text-slate-500">Collections · Status · Mode · Trend</p>
              </div>
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
                <IconRefresh size={11} /> Reset
              </Button>
              <Button size="sm" onClick={handleApply} className="h-7 text-xs gap-1 px-2">
                <IconFilter size={11} /> Apply
              </Button>
            </div>
          </div>

          {/* Collapsible Filters */}
          <Card className="rounded-xl shadow-sm border-slate-200 bg-white">
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors rounded-xl"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <IconFilter size={12} /> Advanced Filters
                {activeCount > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1">{activeCount}</Badge>}
              </span>
              {filtersOpen
                ? <IconChevronUp size={13} className="text-slate-400" />
                : <IconChevronDown size={13} className="text-slate-400" />}
            </button>
            {filtersOpen && (
              <div className="border-t border-slate-100 px-3 py-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                <DateField label="Date From" name="start_date" value={filters.start_date || ""} onChange={(e) => fc("start_date", e.target.value || null)} />
                <DateField label="Date To" name="end_date" value={filters.end_date || ""} onChange={(e) => fc("end_date", e.target.value || null)} />
                <AutocompleteField
                  name="branch_id" label="Branch"
                  asyncLoadOptions={(q) => getReferenceOptionsSearch("company_branch.model", { q, limit: 20 })}
                  referenceModel="company_branch.model"
                  getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                  value={filters.branch_id ? { id: filters.branch_id } : null}
                  onChange={(e, v) => fc("branch_id", v?.id ?? null)} placeholder="Search branch…"
                />
                <AutocompleteField
                  name="handled_by" label="Handled By"
                  asyncLoadOptions={(q) => getReferenceOptionsSearch("user.model", { q, limit: 20 })}
                  referenceModel="user.model"
                  getOptionLabel={(o) => o?.name ?? o?.email ?? ""}
                  value={filters.handled_by ? { id: filters.handled_by } : null}
                  onChange={(e, v) => fc("handled_by", v?.id ?? null)} placeholder="Search user…"
                />
                <AutocompleteField
                  name="payment_mode_id" label="Payment Mode"
                  asyncLoadOptions={(q) => getReferenceOptionsSearch("payment_mode.model", { q, limit: 20 })}
                  referenceModel="payment_mode.model"
                  getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                  value={filters.payment_mode_id ? { id: filters.payment_mode_id } : null}
                  onChange={(e, v) => fc("payment_mode_id", v?.id ?? null)} placeholder="Search mode…"
                />
                <AutocompleteField
                  name="status" label="Status" multiple options={STATUS_OPTIONS}
                  getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
                  value={(Array.isArray(filters.status) ? filters.status : []).map((v) => STATUS_OPTIONS.find((s) => s.value === v)).filter(Boolean)}
                  onChange={(e, v) => fc("status", v?.length ? v.map((o) => o.value) : null)}
                  placeholder="All Statuses"
                />
                <Input name="order_number" label="Order Number" value={filters.order_number || ""} onChange={(e) => fc("order_number", e.target.value || null)} placeholder="e.g. ORD-001" />
                <Input name="customer_name" label="Customer Name" value={filters.customer_name || ""} onChange={(e) => fc("customer_name", e.target.value || null)} placeholder="Search customer…" />
                <Input name="receipt_number" label="Receipt Number" value={filters.receipt_number || ""} onChange={(e) => fc("receipt_number", e.target.value || null)} placeholder="e.g. RCP-001" />
              </div>
            )}
          </Card>

          {/* Main View */}
          <PaymentsReportView key={refreshKey} filters={appliedFilters} />

        </div>
      </div>
    </ProtectedRoute>
  );
}
