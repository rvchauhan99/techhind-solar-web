"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  IconCurrencyRupee,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconX,
  IconEye,
} from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import commissionSettlementService from "@/services/commissionSettlementService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import SettlementByUserSummary from "../components/SettlementByUserSummary";
import CommissionSettlementDetailDialog from "../components/CommissionSettlementDetailDialog";
import {
  fmtMoney,
  fmtSignedMoney,
  payableAmount,
  linePayableAmount,
  adjustmentRowBorderClass,
  hasOutstandingOffset,
  getOffsetOrders,
} from "../utils/settlementMoney";
import { formatOrderNumberFromRow } from "../utils/formatOrderNumberLabel";
import {
  countActiveFilterFields,
  clearFilterField,
  masterAutocompleteValue,
  referenceAutocompleteDisplay,
} from "../utils/filterChips";
import {
  QUICK_ROLE_FILTERS,
  normalizeFilterRoles,
  roleFilterQueryParam,
  buildRoleFilterChips,
  filtersForActiveCount,
} from "../utils/roleFilters";

const PERMISSION_MODULE_KEY = "/commission-settlements/payout";

const INITIAL_FILTERS = {
  beneficiary_user_id: null,
  beneficiary_label: "",
  settlement_number: "",
  order_number: "",
  role: "",
  roles: [],
};

const FILTER_LABELS = {
  beneficiary_user_id: "Beneficiary",
  settlement_number: "Settlement #",
  order_number: "Order #",
  roles: "Roles",
};

function parseFilterId(v) {
  const n = v != null && v !== "" ? Number(v) : NaN;
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

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

function getChips(filters) {
  return buildRoleFilterChips(filters, { filterLabels: FILTER_LABELS });
}

export default function CommissionPayoutPage() {
  const { user, modulePermissions, fetchPermissionForModule } = useAuth();
  const permModule = useMemo(
    () => findModuleByPermissionKey(user?.modules || [], PERMISSION_MODULE_KEY),
    [user?.modules]
  );

  useEffect(() => {
    if (permModule?.id) fetchPermissionForModule(permModule.id);
  }, [permModule?.id, fetchPermissionForModule]);

  const currentPerm = modulePermissions?.[permModule?.id] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };
  const canPayout = currentPerm.can_create || currentPerm.can_update;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState(() => new Set());
  const [pageRows, setPageRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [detailSettlementId, setDetailSettlementId] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const fc = (key, val) => setFilters((p) => ({ ...p, [key]: val }));
  const activeCount = useMemo(
    () => countActiveFilterFields(filtersForActiveCount(appliedFilters)),
    [appliedFilters]
  );
  const chips = getChips(appliedFilters);

  const applyRoleFilters = (roles) => {
    const list = [...new Set((roles || []).filter(Boolean))];
    const next = { ...appliedFilters, roles: list, role: "" };
    setFilters(next);
    setAppliedFilters(next);
    setSelected(new Set());
    setLockedBeneficiaryId(null);
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  const handleApply = () => {
    const roles = normalizeFilterRoles(filters);
    const next = { ...filters, roles, role: "" };
    setFilters(next);
    setAppliedFilters(next);
    setSelected(new Set());
    setLockedBeneficiaryId(null);
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  const toggleQuickRole = (roleValue) => {
    const current = normalizeFilterRoles(appliedFilters);
    const idx = current.indexOf(roleValue);
    const next = idx >= 0 ? current.filter((r) => r !== roleValue) : [...current, roleValue];
    applyRoleFilters(next);
  };

  const clearQuickRoles = () => applyRoleFilters([]);

  const activeRoles = useMemo(() => new Set(normalizeFilterRoles(appliedFilters)), [appliedFilters]);

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setSelected(new Set());
    setLockedBeneficiaryId(null);
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  const removeChip = (key) => {
    let next = clearFilterField(appliedFilters, key, INITIAL_FILTERS);
    if (key === "roles") {
      next = { ...next, roles: [], role: "" };
    }
    setFilters(next);
    setAppliedFilters(next);
    setRefreshKey((k) => k + 1);
  };

  const filterParams = useMemo(() => {
    const a = appliedFilters;
    return {
      beneficiary_user_id: parseFilterId(a.beneficiary_user_id),
      settlement_number: String(a.settlement_number || "").trim() || undefined,
      order_number: String(a.order_number || "").trim() || undefined,
      role: roleFilterQueryParam(a),
    };
  }, [appliedFilters]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await commissionSettlementService.getApprovedLedgerSummary(filterParams);
      setSummary(res?.result ?? res);
    } catch {
      setSummary(null);
    }
  }, [filterParams]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, refreshKey]);

  const selectedPayable = useMemo(() => {
    let total = 0;
    for (const row of pageRows) {
      if (selected.has(row.id) && !row.settlement_blocked) {
        total += linePayableAmount(row);
      }
    }
    return total;
  }, [pageRows, selected]);

  const pageHasDeductions = useMemo(
    () =>
      pageRows.some(
        (r) => Number(r.line_deduction) > 0 || r.outstanding_offset
      ),
    [pageRows]
  );

  const fetcher = useCallback(async (params) => {
    const p = params || {};
    const response = await commissionSettlementService.listApprovedLedger({
      page: p.page,
      limit: p.limit,
      beneficiary_user_id: p.beneficiary_user_id,
      settlement_number: p.settlement_number,
      order_number: p.order_number,
      role: p.role,
    });
    const result = response?.result || response;
    const rows = result?.data || [];
    setPageRows(rows);
    return {
      data: rows,
      meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
    };
  }, []);

  const eligiblePageRows = useMemo(
    () => pageRows.filter((r) => !r.settlement_blocked),
    [pageRows]
  );

  const [lockedBeneficiaryId, setLockedBeneficiaryId] = useState(null);

  const toggleRow = (row) => {
    if (row?.settlement_blocked) return;
    const id = row?.id ?? row;
    const bid = row?.beneficiary_user_id;
    setSelected((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        if (next.size === 0) setLockedBeneficiaryId(null);
        return next;
      }
      if (prev.size > 0 && lockedBeneficiaryId != null && bid !== lockedBeneficiaryId) {
        toast.error("Payout is one person at a time — clear selection or pick lines for the same beneficiary");
        return prev;
      }
      if (prev.size === 0 && bid) setLockedBeneficiaryId(bid);
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const toggleSelectAllPage = (checked) => {
    if (!checked) {
      setSelected(new Set());
      setLockedBeneficiaryId(null);
      return;
    }
    const filterBid = parseFilterId(appliedFilters.beneficiary_user_id);
    let targetBid = filterBid ?? lockedBeneficiaryId;
    if (!targetBid && eligiblePageRows.length) {
      targetBid = eligiblePageRows[0].beneficiary_user_id;
    }
    const rowsToSelect = targetBid
      ? eligiblePageRows.filter((r) => r.beneficiary_user_id === targetBid)
      : eligiblePageRows;
    if (
      !filterBid &&
      eligiblePageRows.length > rowsToSelect.length
    ) {
      toast.info("Selected lines for one beneficiary only (one bank transfer per person)");
    }
    setSelected(new Set(rowsToSelect.map((r) => r.id)));
    if (targetBid) setLockedBeneficiaryId(targetBid);
  };

  const selectAllForBeneficiary = async () => {
    const bid = parseFilterId(appliedFilters.beneficiary_user_id);
    if (!bid) {
      toast.error("Set beneficiary filter first");
      return;
    }
    setSelectingAll(true);
    try {
      const allIds = [];
      let pg = 1;
      const pageSize = 200;
      let pages = 1;
      while (pg <= pages && allIds.length < 500) {
        const response = await commissionSettlementService.listApprovedLedger({
          ...filterParams,
          beneficiary_user_id: bid,
          page: pg,
          limit: pageSize,
        });
        const result = response?.result || response;
        const rows = (result?.data || []).filter((r) => !r.settlement_blocked);
        allIds.push(...rows.map((r) => r.id));
        pages = result?.meta?.pages ?? 1;
        pg += 1;
      }
      if (!allIds.length) {
        toast.error("No payable lines for this beneficiary");
        return;
      }
      if (allIds.length >= 500) {
        toast.warning("Selected first 500 lines — narrow filters if needed");
      }
      setSelected(new Set(allIds.slice(0, 500)));
      setLockedBeneficiaryId(bid);
      toast.success(`Selected ${Math.min(allIds.length, 500)} line(s)`);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Could not load lines");
    } finally {
      setSelectingAll(false);
    }
  };

  const allPageSelected =
    eligiblePageRows.length > 0 && eligiblePageRows.every((r) => selected.has(r.id));

  const hasBlockedSelected = useMemo(
    () => pageRows.some((r) => selected.has(r.id) && r.settlement_blocked),
    [pageRows, selected]
  );

  const rejectBlockedSelection = () => {
    const blocked = pageRows.filter((r) => selected.has(r.id) && r.settlement_blocked);
    if (!blocked.length) return false;
    toast.error(
      blocked[0].settlement_block_reason ||
        "Cannot payout: order outstanding exceeds commission for selected row(s)"
    );
    return true;
  };

  const openPayout = async () => {
    const ids = [...selected];
    if (!ids.length) { toast.error("Select at least one row"); return; }
    if (rejectBlockedSelection()) return;
    setLoadingPreview(true);
    setPayoutOpen(true);
    try {
      const res = await commissionSettlementService.previewPayout({ ledger_entry_ids: ids });
      setPreview(res?.result ?? res);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Preview failed");
      setPayoutOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const submitPayout = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (rejectBlockedSelection()) return;
    setSubmitting(true);
    try {
      const utr = bankReference.trim();
      if (utr.length < 4) {
        toast.error("Enter UTR / bank reference (at least 4 characters)");
        return;
      }
      await commissionSettlementService.createPayout({
        ledger_entry_ids: ids,
        bank_reference: utr,
        remarks: remarks.trim() || undefined,
      });
      toast.success("Payout recorded — lines settled");
      setPayoutOpen(false);
      setPreview(null);
      setRemarks("");
      setBankReference("");
      setSelected(new Set());
      setLockedBeneficiaryId(null);
      setRefreshKey((k) => k + 1);
      loadSummary();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Payout failed");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "_select",
        label: "",
        sortable: false,
        width: 40,
        headerRender: () => (
          <Checkbox
            checked={allPageSelected}
            disabled={eligiblePageRows.length === 0}
            onCheckedChange={(v) => toggleSelectAllPage(!!v)}
            aria-label="Select page"
          />
        ),
        render: (row) => (
          <Checkbox
            checked={selected.has(row.id)}
            disabled={row.settlement_blocked}
            onCheckedChange={() => toggleRow(row)}
            aria-label="Select row"
            title={row.settlement_block_reason || undefined}
          />
        ),
      },
      { field: "id", label: "ID", sortable: false, width: 64, render: (row) => row.id },
      { field: "settlement_number", label: "Settlement", sortable: false, render: (row) => row.settlement_number || "—" },
      { field: "order_number", label: "Order", sortable: false, render: (row) => formatOrderNumberFromRow(row) },
      { field: "beneficiary_name", label: "User", sortable: false, render: (row) => row.beneficiary_name || "—" },
      { field: "role", label: "Role", sortable: false, render: (row) => row.role || "—" },
      {
        field: "gross",
        label: "Gross",
        sortable: false,
        render: (row) => (
          <span className="text-[10px] tabular-nums">
            ₹{fmtMoney(row.gross_amount ?? row.amount)}
          </span>
        ),
      },
      {
        field: "deduction",
        label: "Deduction",
        sortable: false,
        render: (row) => (
          <span className="text-[10px] tabular-nums text-amber-700">
            {Number(row.line_deduction) > 0 ? `−₹${fmtMoney(row.line_deduction)}` : "—"}
          </span>
        ),
      },
      {
        field: "net",
        label: "Net",
        sortable: false,
        render: (row) => (
          <span className="text-[10px] tabular-nums">
            ₹{fmtMoney(row.line_net_amount ?? row.amount)}
          </span>
        ),
      },
      {
        field: "payable",
        label: "Payable",
        sortable: false,
        render: (row) => (
          <span className="font-semibold text-[11px] tabular-nums">
            ₹{fmtMoney(linePayableAmount(row))}
          </span>
        ),
      },
      {
        field: "line_status",
        label: "Status",
        sortable: false,
        width: 88,
        render: (row) =>
          row.settlement_partially_paid ? (
            <Badge
              variant="outline"
              className="h-5 border-amber-300 bg-amber-50 px-1 text-[9px] font-medium text-amber-800"
            >
              Partial {row.settlement_lines_settled}/{row.settlement_lines_total}
            </Badge>
          ) : (
            <span className="text-[10px] text-violet-700">Approved</span>
          ),
      },
      {
        field: "accrued_at",
        label: "Accrued",
        sortable: false,
        render: (row) => (row.accrued_at ? String(row.accrued_at).slice(0, 10) : "—"),
      },
      {
        field: "actions",
        label: "Action",
        sortable: false,
        isActionColumn: true,
        render: (row) =>
          row.settlement_id ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              title="View details"
              aria-label="View details"
              onClick={() => setDetailSettlementId(row.settlement_id)}
            >
              <IconEye className="size-4" />
            </Button>
          ) : (
            "—"
          ),
      },
    ],
    [allPageSelected, eligiblePageRows.length, selected]
  );

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-slate-50 font-sans text-slate-900">
        <div className="mx-auto max-w-[1440px] space-y-2.5 px-3 py-3 pb-8">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <IconCurrencyRupee size={16} className="text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight tracking-tight">Commission payout</h1>
                <p className="text-[11px] text-slate-500">Approved (unpaid) lines · Record payment</p>
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
                  name="beneficiary_user_id"
                  label="Beneficiary"
                  asyncLoadOptions={(q) =>
                    getReferenceOptionsSearch("user.model", { q, limit: 20, status: "active" })
                  }
                  referenceModel="user.model"
                  getOptionLabel={(o) => o?.name ?? o?.email ?? ""}
                  value={masterAutocompleteValue(
                    filters.beneficiary_user_id,
                    filters.beneficiary_label
                  )}
                  onChange={(e, v) => {
                    fc("beneficiary_user_id", v?.id ?? null);
                    fc("beneficiary_label", referenceAutocompleteDisplay(v));
                  }}
                  placeholder="Search user…"
                />
                <Input
                  name="settlement_number"
                  label="Settlement #"
                  value={filters.settlement_number || ""}
                  onChange={(e) => fc("settlement_number", e.target.value || "")}
                />
                <Input
                  name="order_number"
                  label="Order #"
                  value={filters.order_number || ""}
                  onChange={(e) => fc("order_number", e.target.value || "")}
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

          {/* Summary KPI row */}
          {summary && (
            <div
              className={`grid grid-cols-2 gap-2 ${
                selected.size > 0
                  ? pageHasDeductions
                    ? "sm:grid-cols-5"
                    : "sm:grid-cols-4"
                  : pageHasDeductions
                    ? "sm:grid-cols-4"
                    : "sm:grid-cols-3"
              }`}
            >
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Approved payable</div>
                <div className="mt-0.5 text-base font-bold text-slate-800">{fmtMoney(summary.approved_unpaid_total ?? 0)}</div>
              </div>
              {pageHasDeductions && (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-3 py-2 shadow-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/80">Gross (page)</div>
                  <div className="mt-0.5 text-base font-bold text-amber-900">
                    {fmtMoney(
                      pageRows.reduce(
                        (s, r) => s + Number(r.gross_amount ?? r.amount ?? 0),
                        0
                      )
                    )}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Approved lines</div>
                <div className="mt-0.5 text-base font-bold text-slate-800">{summary.approved_unpaid_count ?? 0}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Paid (MTD)</div>
                <div className="mt-0.5 text-base font-bold text-slate-800">{fmtMoney(summary.paid_mtd_total ?? summary.approved_mtd_total ?? 0)}</div>
              </div>
              {selected.size > 0 && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 shadow-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">Selected payable</div>
                  <div className="mt-0.5 text-base font-bold text-primary">{fmtMoney(selectedPayable)}</div>
                </div>
              )}
            </div>
          )}

          {summary?.filters_applied && (
            <p className="text-[10px] text-muted-foreground px-0.5">Totals for applied filters</p>
          )}

          <p className="text-[10px] text-muted-foreground px-0.5">
            One bank transfer = one payout = one person. Enter the bank UTR/reference when confirming.
            Outstanding was adjusted at batch approval; you may pay lines partially — other lines stay approved until paid.
          </p>

          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant={activeRoles.size === 0 ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={clearQuickRoles}
              >
                All
              </Button>
              {QUICK_ROLE_FILTERS.map((opt) => {
                const isActive = activeRoles.has(opt.value);
                const btnLabel = opt.shortLabel || opt.label;
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    className="h-7 px-2 text-xs"
                    title={opt.shortLabel ? opt.label : undefined}
                    onClick={() => toggleQuickRole(opt.value)}
                  >
                    {btnLabel}
                  </Button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canPayout && parseFilterId(appliedFilters.beneficiary_user_id) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={selectAllForBeneficiary}
                  disabled={selectingAll}
                >
                  {selectingAll ? "Loading…" : "Select all for beneficiary"}
                </Button>
              )}
              {canPayout && (
                <Button
                  size="sm"
                  className="h-8"
                  onClick={openPayout}
                  disabled={!selected.size || hasBlockedSelected}
                >
                  Payout selected ({selected.size})
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setRefreshKey((k) => k + 1)}
                title="Refresh"
              >
                <IconRefresh className="size-4" />
              </Button>
            </div>
          </div>

          {/* Table */}
          <PaginatedTable
            key={refreshKey}
            moduleKey={PERMISSION_MODULE_KEY}
            columns={columns}
            fetcher={fetcher}
            filterParams={filterParams}
            showSearch={false}
            showPagination={false}
            height="calc(100vh - 280px)"
            onTotalChange={setTotalCount}
            page={page}
            limit={limit}
            sortBy="id"
            sortOrder="DESC"
            onPageChange={(z) => setPage(z + 1)}
            onRowsPerPageChange={setLimit}
            onQChange={() => {}}
            onSortChange={() => {}}
            getRowClassName={(row) => {
              const adj = adjustmentRowBorderClass(row);
              if (row.settlement_blocked) return "bg-red-50 hover:bg-red-100/80 !hover:bg-red-100/80";
              if (row.outstanding_offset) return "bg-amber-50 hover:bg-amber-100/70 !hover:bg-amber-100/70";
              return adj;
            }}
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

      {/* Payout dialog */}
      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Payout summary
              {preview?.beneficiary_name ? (
                <span className="block text-sm font-normal text-muted-foreground mt-0.5">
                  {preview.beneficiary_name}
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          {loadingPreview ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : preview ? (
            <div className="space-y-3 text-sm">
              {(preview.total_outstanding_deduction > 0 ||
                hasOutstandingOffset(preview.lines) ||
                (preview.order_offsets || []).length > 0) && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                  <p className="font-semibold">Outstanding offset (at approval)</p>
                  <p className="text-[10px]">
                    Cash payout is net payable after deduction of ₹{" "}
                    {fmtMoney(preview.total_outstanding_deduction ?? 0)}. Offset is recorded as a separate ledger debit on confirm.
                  </p>
                  <ul className="text-[10px] list-disc pl-4 space-y-0.5 mt-1">
                    {(preview.order_offsets || getOffsetOrders(preview.lines)).map((o) => (
                      <li key={o.order_id}>
                        {formatOrderNumberFromRow(o, { emptyFallback: `Order #${o.order_id}` })}: deduction ₹{" "}
                        {fmtMoney(o.deduction_amount ?? o.order_outstanding)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Payable </span>
                  <span className="font-semibold">₹ {fmtMoney(payableAmount(preview))}</span>
                </div>
                {preview.gross_line_total != null ? (
                  <div>
                    <span className="text-muted-foreground">Gross </span>
                    <span className="font-semibold">₹ {fmtMoney(preview.gross_line_total)}</span>
                  </div>
                ) : null}
                {Number(preview.total_outstanding_deduction) > 0 ? (
                  <div>
                    <span className="text-muted-foreground">Outstanding cut </span>
                    <span className="font-semibold text-amber-800">
                      −₹ {fmtMoney(preview.total_outstanding_deduction)}
                    </span>
                  </div>
                ) : null}
                <div>
                  <span className="text-muted-foreground">Round off </span>
                  <span className="font-semibold">₹ {fmtSignedMoney(preview.total_round_off_amount ?? 0)}</span>
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">By beneficiary</p>
              <SettlementByUserSummary
                byUser={preview.by_user || []}
                lines={preview.lines || []}
                showDeduction={
                  hasOutstandingOffset(preview.lines) ||
                  Number(preview.total_outstanding_deduction) > 0
                }
              />
              <div className="space-y-1">
                <Label className="text-xs">
                  UTR / Bank reference <span className="text-destructive">*</span>
                </Label>
                <ShadcnInput
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="NEFT / IMPS / UTR number"
                  maxLength={64}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Remarks (optional)</Label>
                <ShadcnInput value={remarks} onChange={(e) => setRemarks(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setPayoutOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={submitPayout}
                  disabled={submitting || !canPayout || bankReference.trim().length < 4}
                >
                  {submitting ? "Processing…" : "Confirm payout"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <CommissionSettlementDetailDialog
        open={!!detailSettlementId}
        onOpenChange={(o) => { if (!o) setDetailSettlementId(null); }}
        settlementId={detailSettlementId}
      />
    </ProtectedRoute>
  );
}
