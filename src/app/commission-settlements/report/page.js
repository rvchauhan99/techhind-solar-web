"use client";

import { useMemo, useState, useEffect } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DateField from "@/components/common/DateField";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  IconFileText,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import commissionSettlementService from "@/services/commissionSettlementService";
import CommissionSettlementDetailDialog from "../components/CommissionSettlementDetailDialog";
import { fmtMoney } from "../utils/settlementMoney";

const PERMISSION_MODULE_KEY = "/commission-settlements/report";

const REPORT_STATUS_OPTIONS = [
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved (unpaid)" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
];

const INITIAL_FILTERS = {
  status: "",
  settlement_number: "",
  submitted_from: "",
  submitted_to: "",
  approved_from: "",
  approved_to: "",
  paid_from: "",
  paid_to: "",
};

const FILTER_LABELS = {
  status: "Status",
  settlement_number: "Settlement #",
  submitted_from: "Submitted from",
  submitted_to: "Submitted to",
  approved_from: "Approved from",
  approved_to: "Approved to",
  paid_from: "Paid from",
  paid_to: "Paid to",
};

function findModuleRecursive(list, matchPredicate) {
  for (const mod of list || []) {
    if (matchPredicate(mod)) return mod;
    if (mod.submodules?.length) {
      const found = findModuleRecursive(mod.submodules, matchPredicate);
      if (found) return found;
    }
  }
  return null;
}

function findModuleByPermissionKey(modules, moduleKey) {
  const matchPredicate = (m) =>
    m &&
    (m.key === moduleKey ||
      m.route === moduleKey ||
      m.key === moduleKey.replace(/[-\s]/g, "_") ||
      m.key === moduleKey.replace(/\//g, "_"));
  return findModuleRecursive(modules, matchPredicate);
}

function countActive(f) {
  return Object.values(f || {}).filter((v) => v != null && v !== "").length;
}

function getChips(filters) {
  return Object.entries(filters)
    .filter(([, v]) => v != null && v !== "")
    .map(([key, value]) => ({
      key,
      label: FILTER_LABELS[key] || key,
      value:
        key === "status"
          ? REPORT_STATUS_OPTIONS.find((o) => o.value === value)?.label || value
          : String(value),
    }));
}

export default function CommissionSettlementReportPage() {
  const { user, modulePermissions, fetchPermissionForModule } = useAuth();
  const permModule = useMemo(
    () => findModuleByPermissionKey(user?.modules || [], PERMISSION_MODULE_KEY),
    [user?.modules]
  );

  useEffect(() => {
    if (permModule?.id) fetchPermissionForModule(permModule.id);
  }, [permModule?.id, fetchPermissionForModule]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [detailId, setDetailId] = useState(null);

  const fc = (key, val) => setFilters((p) => ({ ...p, [key]: val }));
  const activeCount = countActive(appliedFilters);
  const chips = getChips(appliedFilters);

  const handleApply = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  const removeChip = (key) => {
    const next = { ...appliedFilters, [key]: INITIAL_FILTERS[key] };
    setFilters(next);
    setAppliedFilters(next);
    setRefreshKey((k) => k + 1);
  };

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const a = appliedFilters;
      const response = await commissionSettlementService.listCommissionSettlements({
        page: p.page,
        limit: p.limit,
        status: a.status || undefined,
        settlement_number: a.settlement_number.trim() || undefined,
        submitted_from: a.submitted_from || undefined,
        submitted_to: a.submitted_to || undefined,
        approved_from: a.approved_from || undefined,
        approved_to: a.approved_to || undefined,
        paid_from: a.paid_from || undefined,
        paid_to: a.paid_to || undefined,
      });
      const result = response?.result || response;
      return {
        data: result?.data || [],
        meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
      };
    },
    [refreshKey, appliedFilters] // eslint-disable-line
  );

  const columns = useMemo(
    () => [
      { field: "settlement_number", label: "Number", sortable: false, render: (r) => r.settlement_number },
      { field: "status", label: "Status", sortable: false, render: (r) => r.status },
      {
        field: "total_amount",
        label: "Total",
        sortable: false,
        render: (r) => fmtMoney(r.total_amount),
      },
      { field: "submitted_at", label: "Submitted", sortable: false, render: (r) => (r.submitted_at ? String(r.submitted_at).slice(0, 16) : "-") },
      { field: "approved_at", label: "Approved", sortable: false, render: (r) => (r.approved_at ? String(r.approved_at).slice(0, 16) : "-") },
      { field: "paid_at", label: "Paid", sortable: false, render: (r) => (r.paid_at ? String(r.paid_at).slice(0, 16) : "-") },
      {
        field: "actions",
        label: "",
        sortable: false,
        isActionColumn: true,
        render: (row) => (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => setDetailId(row.id)}
          >
            Detail
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-slate-50 font-sans text-slate-900">
        <div className="mx-auto max-w-[1440px] space-y-2.5 px-3 py-3 pb-8">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <IconFileText size={16} className="text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight tracking-tight">Commission settlement report</h1>
                <p className="text-[11px] text-slate-500">All batches · Pending · Approved · Paid</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {activeCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {activeCount} active
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={handleReset} className="h-7 gap-1 px-2 text-xs">
                <IconRefresh size={11} /> Reset
              </Button>
              <Button size="sm" onClick={handleApply} className="h-7 gap-1 px-2 text-xs">
                <IconFilter size={11} /> Apply
              </Button>
            </div>
          </div>

          {/* Collapsible filter card */}
          <Card className="overflow-visible rounded-xl border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-slate-50"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <IconFilter size={12} /> Filters
                {activeCount > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {activeCount}
                  </Badge>
                )}
              </span>
              {filtersOpen ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
            </button>
            {filtersOpen && (
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-3 py-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                <AutocompleteField
                  usePortal
                  name="status"
                  label="Status"
                  options={REPORT_STATUS_OPTIONS}
                  getOptionLabel={(o) => o?.label ?? ""}
                  value={filters.status ? REPORT_STATUS_OPTIONS.find((o) => o.value === filters.status) ?? null : null}
                  onChange={(e, v) => fc("status", v?.value ?? "")}
                  clearable
                  placeholder="All statuses"
                />
                <Input
                  name="settlement_number"
                  label="Settlement #"
                  value={filters.settlement_number || ""}
                  onChange={(e) => fc("settlement_number", e.target.value || "")}
                />
                <DateField
                  name="submitted_from"
                  label="Submitted from"
                  value={filters.submitted_from || ""}
                  onChange={(e) => fc("submitted_from", e.target.value || "")}
                />
                <DateField
                  name="submitted_to"
                  label="Submitted to"
                  value={filters.submitted_to || ""}
                  onChange={(e) => fc("submitted_to", e.target.value || "")}
                />
                <DateField
                  name="approved_from"
                  label="Approved from"
                  value={filters.approved_from || ""}
                  onChange={(e) => fc("approved_from", e.target.value || "")}
                />
                <DateField
                  name="approved_to"
                  label="Approved to"
                  value={filters.approved_to || ""}
                  onChange={(e) => fc("approved_to", e.target.value || "")}
                />
                <DateField
                  name="paid_from"
                  label="Paid from"
                  value={filters.paid_from || ""}
                  onChange={(e) => fc("paid_from", e.target.value || "")}
                />
                <DateField
                  name="paid_to"
                  label="Paid to"
                  value={filters.paid_to || ""}
                  onChange={(e) => fc("paid_to", e.target.value || "")}
                />
              </div>
            )}
          </Card>

          {/* Active filter chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map(({ key, label, value }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => removeChip(key)}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary/80 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                >
                  {label}: <span className="font-semibold">{value}</span>
                  <IconX size={9} />
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          <PaginatedTable
            key={refreshKey}
            moduleKey={PERMISSION_MODULE_KEY}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            showPagination={false}
            height="calc(100vh - 320px)"
            onTotalChange={setTotalCount}
            page={page}
            limit={limit}
            sortBy="id"
            sortOrder="DESC"
            onPageChange={(z) => setPage(z + 1)}
            onRowsPerPageChange={setLimit}
            onQChange={() => {}}
            onSortChange={() => {}}
          />
          <PaginationControls
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(z) => setPage(z + 1)}
            onRowsPerPageChange={setLimit}
          />
        </div>
      </div>

      <CommissionSettlementDetailDialog
        open={!!detailId}
        onOpenChange={(o) => { if (!o) setDetailId(null); }}
        settlementId={detailId}
      />
    </ProtectedRoute>
  );
}
