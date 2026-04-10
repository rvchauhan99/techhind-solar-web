"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  IconChecklist,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DateField from "@/components/common/DateField";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import DocumentAuditTable from "./components/DocumentAuditTable";

const INITIAL_FILTERS = {
  start_date: "",
  end_date: "",
  status: null,
  order_number: "",
  customer_name: "",
  doc_type: "",
  search: "",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const FILTER_LABELS = {
  start_date: "Date From",
  end_date: "Date To",
  status: "Status",
  order_number: "Order #",
  customer_name: "Customer",
  doc_type: "Doc Type",
  search: "Search",
};

function countActive(f) {
  if (!f) return 0;
  return Object.values(f).filter((v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0))
    .length;
}

function getChips(filters) {
  return Object.entries(filters)
    .filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0))
    .map(([key, value]) => ({
      key,
      label: FILTER_LABELS[key] || key,
      value:
        key === "status"
          ? (Array.isArray(value) ? value : [value])
              .map((s) => STATUS_OPTIONS.find((o) => o.value === s)?.label || s)
              .join(", ")
          : String(value),
    }));
}

export default function DocumentAuditPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeCount = countActive(appliedFilters);
  const chips = getChips(appliedFilters);

  const setField = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const apply = (override) => {
    const f = override ?? filters;
    setAppliedFilters(f);
    setRefreshKey((k) => k + 1);
  };
  const reset = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setRefreshKey((k) => k + 1);
  };
  const removeChip = (key) => {
    const next = { ...appliedFilters, [key]: INITIAL_FILTERS[key] };
    setFilters(next);
    setAppliedFilters(next);
    setRefreshKey((k) => k + 1);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-slate-50 text-slate-900 font-sans">
        <div className="mx-auto max-w-[1440px] px-3 py-2 pb-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="bg-blue-500/10 p-1 rounded-lg">
                <IconChecklist size={14} stroke={2} className="text-blue-600" />
              </div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900">Document Audit</h1>
              <span className="text-[11px] text-slate-400 hidden sm:inline">· Review & Approve Documents</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {activeCount} active
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={reset} className="h-7 text-xs gap-1 px-2">
                <IconRefresh size={11} /> Reset
              </Button>
              <Button size="sm" onClick={() => apply()} className="h-7 text-xs gap-1 px-2">
                <IconFilter size={11} /> Apply
              </Button>
            </div>
          </div>

          <div className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-visible">
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-50 transition-colors rounded-xl"
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
              <div className="border-t border-slate-100 px-2.5 py-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                <DateField
                  label="Date From"
                  name="start_date"
                  value={filters.start_date || ""}
                  onChange={(e) => setField("start_date", e.target.value || null)}
                />
                <DateField
                  label="Date To"
                  name="end_date"
                  value={filters.end_date || ""}
                  onChange={(e) => setField("end_date", e.target.value || null)}
                />
                <AutocompleteField
                  usePortal
                  name="status"
                  label="Status"
                  multiple
                  options={STATUS_OPTIONS}
                  getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
                  value={(Array.isArray(filters.status) ? filters.status : [])
                    .map((v) => STATUS_OPTIONS.find((s) => s.value === v))
                    .filter(Boolean)}
                  onChange={(e, v) => setField("status", v?.length ? v.map((o) => o.value) : null)}
                  placeholder="All Statuses"
                />
                <Input
                  name="order_number"
                  label="Order Number"
                  value={filters.order_number || ""}
                  onChange={(e) => setField("order_number", e.target.value || null)}
                />
                <Input
                  name="customer_name"
                  label="Customer Name"
                  value={filters.customer_name || ""}
                  onChange={(e) => setField("customer_name", e.target.value || null)}
                />
                <AutocompleteField
                  usePortal
                  name="doc_type"
                  label="Document Type"
                  asyncLoadOptions={(q) =>
                    getReferenceOptionsSearch("order_document_type.model", { q, limit: 20 })
                  }
                  referenceModel="order_document_type.model"
                  getOptionLabel={(o) => o?.type ?? o?.label ?? ""}
                  value={filters.doc_type ? { type: filters.doc_type } : null}
                  onChange={(e, v) => setField("doc_type", v?.type ?? v?.label ?? null)}
                  placeholder="Search doc type..."
                />
                <Input
                  name="search"
                  label="Keyword Search"
                  value={filters.search || ""}
                  onChange={(e) => setField("search", e.target.value || null)}
                />
              </div>
            )}
          </div>

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
                onClick={reset}
                className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <DocumentAuditTable key={refreshKey} filterParams={appliedFilters} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
