"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AutocompleteField from "@/components/common/AutocompleteField";
import { useAuth } from "@/hooks/useAuth";
import commissionSettlementService from "@/services/commissionSettlementService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { IconRefresh } from "@tabler/icons-react";
import SettlementByUserSummary from "../components/SettlementByUserSummary";
import CommissionAdjustDialog from "../components/CommissionAdjustDialog";
import {
  fmtMoney,
  fmtSignedMoney,
  payableAmount,
  hasOutstandingOffset,
  getOffsetOrders,
  formatAdjustmentBadge,
  hasLineAdjustments,
  adjustmentRowBorderClass,
} from "../utils/settlementMoney";

const PERMISSION_MODULE_KEY = "/commission-settlements/unsettled";

const ROLE_FILTER_OPTIONS = [
  { value: "handled_by", label: "Handled by" },
  { value: "channel_partner", label: "Channel partner" },
];

const INITIAL_DRAFT_FILTERS = {
  beneficiary_user_id: null,
  branch_id: null,
  role: "",
  accrued_from: "",
  accrued_to: "",
  order_number: "",
  min_amount: "",
  max_amount: "",
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

export default function CommissionUnsettledPage() {
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

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [selected, setSelected] = useState(() => new Set());
  const [pageRows, setPageRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [draftFilters, setDraftFilters] = useState(INITIAL_DRAFT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [adjustRow, setAdjustRow] = useState(null);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const filterParams = useMemo(() => {
    const a = appliedFilters || {};
    const minA = String(a.min_amount ?? "").trim();
    const maxA = String(a.max_amount ?? "").trim();
    return {
      beneficiary_user_id: parseFilterId(a.beneficiary_user_id),
      branch_id: parseFilterId(a.branch_id),
      role: a.role || undefined,
      accrued_from: a.accrued_from || undefined,
      accrued_to: a.accrued_to || undefined,
      order_number: String(a.order_number || "").trim() || undefined,
      min_amount: minA !== "" && !Number.isNaN(Number(minA)) ? minA : undefined,
      max_amount: maxA !== "" && !Number.isNaN(Number(maxA)) ? maxA : undefined,
    };
  }, [appliedFilters]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await commissionSettlementService.getCommissionDashboardSummary();
      const r = res?.result ?? res;
      setSummary(r);
    } catch {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, tableKey]);

  const fetcher = useCallback(async (params) => {
    const p = params || {};
    const response = await commissionSettlementService.listUnsettledLedger({
      page: p.page,
      limit: p.limit,
      beneficiary_user_id: p.beneficiary_user_id,
      branch_id: p.branch_id,
      role: p.role,
      accrued_from: p.accrued_from,
      accrued_to: p.accrued_to,
      order_number: p.order_number,
      min_amount: p.min_amount,
      max_amount: p.max_amount,
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

  const toggleRow = (row) => {
    if (row?.settlement_blocked) return;
    const id = row?.id ?? row;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPage = (checked) => {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(eligiblePageRows.map((r) => r.id)));
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
        "Cannot settle: order outstanding exceeds commission for selected row(s)"
    );
    return true;
  };

  const openSettle = async () => {
    const ids = [...selected];
    if (!ids.length) {
      toast.error("Select at least one row");
      return;
    }
    if (rejectBlockedSelection()) return;
    setLoadingPreview(true);
    setSettleOpen(true);
    try {
      const res = await commissionSettlementService.previewCommissionSettlement({ ledger_entry_ids: ids });
      const r = res?.result ?? res;
      setPreview(r);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Preview failed");
      setSettleOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const submitSettlement = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (rejectBlockedSelection()) return;
    setSubmitting(true);
    try {
      await commissionSettlementService.createCommissionSettlement({
        ledger_entry_ids: ids,
        remarks: remarks.trim() || undefined,
      });
      toast.success("Submitted for approval");
      setSettleOpen(false);
      setPreview(null);
      setRemarks("");
      setSelected(new Set());
      setTableKey((k) => k + 1);
      loadSummary();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const openAdjust = useCallback((row) => {
    setAdjustRow(row);
    setAdjustOpen(true);
  }, []);

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
      { field: "order_number", label: "Order", sortable: false, render: (row) => row.order_number || "-" },
      { field: "beneficiary_name", label: "User", sortable: false, render: (row) => row.beneficiary_name || "-" },
      { field: "role", label: "Role", sortable: false, render: (row) => row.role || "-" },
      {
        field: "original_amount",
        label: "System",
        sortable: false,
        render: (row) => (
          <span className="text-[11px] text-muted-foreground">
            ₹{fmtMoney(row.original_amount ?? row.amount)}
          </span>
        ),
      },
      {
        field: "adjustment",
        label: "Adjustment",
        sortable: false,
        render: (row) => {
          const badge = formatAdjustmentBadge(row);
          if (!badge) return <span className="text-muted-foreground">—</span>;
          return (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                badge.className === "bonus"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {badge.label} {badge.sign}₹{fmtMoney(badge.amount)}
            </span>
          );
        },
      },
      {
        field: "amount",
        label: "Net",
        sortable: false,
        render: (row) => {
          const canAdjust = currentPerm.can_update && !row.settlement_blocked;
          if (!canAdjust) {
            return <span className="font-semibold text-[11px]">₹{fmtMoney(row.amount)}</span>;
          }
          return (
            <button
              type="button"
              className="font-semibold text-[11px] text-primary underline-offset-2 hover:underline cursor-pointer"
              title="Click to adjust commission"
              onClick={(e) => {
                e.stopPropagation();
                openAdjust(row);
              }}
            >
              ₹{fmtMoney(row.amount)}
            </button>
          );
        },
      },
      {
        field: "combined_commission_on_order",
        label: "Combined",
        sortable: false,
        render: (row) => (
          <span className="text-[10px] text-muted-foreground" title="Combined commission on order">
            ₹{fmtMoney(row.combined_commission_on_order ?? row.amount)}
          </span>
        ),
      },
      {
        field: "order_outstanding",
        label: "Outstanding",
        sortable: false,
        render: (row) => (
          <span
            className={
              row.settlement_blocked
                ? "text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200"
                : row.outstanding_offset
                  ? "text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200"
                  : "text-[10px] text-muted-foreground"
            }
            title={row.settlement_block_reason || row.outstanding_offset_warning || undefined}
          >
            ₹{fmtMoney(row.order_outstanding ?? 0)}
          </span>
        ),
      },
      {
        field: "accrued_at",
        label: "Accrued",
        sortable: false,
        render: (row) => (row.accrued_at ? String(row.accrued_at).slice(0, 10) : "-"),
      },
      { field: "branch_name", label: "Branch", sortable: false, render: (row) => row.branch_name || "-" },
    ],
    [allPageSelected, eligiblePageRows.length, openAdjust, selected, currentPerm.can_update]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer title="Unsettled commission">
        <div className="flex flex-col gap-2 px-1 pb-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            <AutocompleteField
              usePortal
              name="beneficiary_user_id"
              label="Beneficiary"
              asyncLoadOptions={(q) =>
                getReferenceOptionsSearch("user.model", { q, limit: 20, status: "active" })
              }
              referenceModel="user.model"
              getOptionLabel={(o) => o?.name ?? o?.email ?? ""}
              value={draftFilters.beneficiary_user_id ? { id: draftFilters.beneficiary_user_id } : null}
              onChange={(e, v) =>
                setDraftFilters((f) => ({ ...f, beneficiary_user_id: v?.id ?? null }))
              }
              placeholder="Search user…"
            />
            <AutocompleteField
              usePortal
              name="branch_id"
              label="Branch"
              asyncLoadOptions={(q) => getReferenceOptionsSearch("company_branch.model", { q, limit: 20 })}
              referenceModel="company_branch.model"
              getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
              value={draftFilters.branch_id ? { id: draftFilters.branch_id } : null}
              onChange={(e, v) => setDraftFilters((f) => ({ ...f, branch_id: v?.id ?? null }))}
              placeholder="Search branch…"
            />
            <AutocompleteField
              usePortal
              name="role"
              label="Role"
              options={ROLE_FILTER_OPTIONS}
              getOptionLabel={(o) => o?.label ?? ""}
              value={
                draftFilters.role
                  ? ROLE_FILTER_OPTIONS.find((o) => o.value === draftFilters.role) ?? null
                  : null
              }
              onChange={(e, v) => setDraftFilters((f) => ({ ...f, role: v?.value ?? "" }))}
              clearable
              placeholder="All roles"
            />
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Accrued from</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={draftFilters.accrued_from}
                onChange={(e) => setDraftFilters((f) => ({ ...f, accrued_from: e.target.value }))}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Accrued to</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={draftFilters.accrued_to}
                onChange={(e) => setDraftFilters((f) => ({ ...f, accrued_to: e.target.value }))}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Order #</Label>
              <Input
                className="h-8 text-xs"
                value={draftFilters.order_number}
                onChange={(e) => setDraftFilters((f) => ({ ...f, order_number: e.target.value }))}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Min amt</Label>
              <Input
                className="h-8 text-xs"
                inputMode="decimal"
                value={draftFilters.min_amount}
                onChange={(e) => setDraftFilters((f) => ({ ...f, min_amount: e.target.value }))}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Max amt</Label>
              <Input
                className="h-8 text-xs"
                inputMode="decimal"
                value={draftFilters.max_amount}
                onChange={(e) => setDraftFilters((f) => ({ ...f, max_amount: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                className="h-8 w-full text-xs"
                onClick={() => {
                  setAppliedFilters({ ...draftFilters });
                  setSelected(new Set());
                  setPage(1);
                }}
              >
                Apply filters
              </Button>
            </div>
          </div>
          {summary && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded border bg-card px-2 py-1.5 text-xs">
                <div className="text-muted-foreground">Unsettled total</div>
                <div className="font-semibold">{fmtMoney(summary.unsettled_total)}</div>
              </div>
              <div className="rounded border bg-card px-2 py-1.5 text-xs">
                <div className="text-muted-foreground">Unsettled lines</div>
                <div className="font-semibold">{summary.unsettled_count ?? 0}</div>
              </div>
              <div className="rounded border bg-card px-2 py-1.5 text-xs">
                <div className="text-muted-foreground">Pending batches</div>
                <div className="font-semibold">{summary.pending_approval_batches ?? 0}</div>
              </div>
              <div className="rounded border bg-card px-2 py-1.5 text-xs">
                <div className="text-muted-foreground">Approved (MTD)</div>
                <div className="font-semibold">{fmtMoney(summary.approved_mtd_total)}</div>
              </div>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground px-0.5">
            Red: outstanding exceeds combined commission (cannot settle). Amber: outstanding will be deducted from
            commission payout on approval; include all unsettled lines for that order.
          </p>
          <div className="flex items-center gap-2">
            {currentPerm.can_create && (
              <Button
                size="sm"
                className="h-8"
                onClick={openSettle}
                disabled={!selected.size || hasBlockedSelected}
              >
                Settle selected ({selected.size})
              </Button>
            )}
            <Button variant="outline" size="icon" className="size-8" onClick={() => setTableKey((k) => k + 1)} title="Refresh">
              <IconRefresh className="size-4" />
            </Button>
          </div>
          <PaginatedTable
            key={tableKey}
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
              if (row.adjustment_type === "bonus") return `bg-emerald-50/50 hover:bg-emerald-50/80 ${adj}`;
              if (row.adjustment_type === "deduction") return `bg-rose-50/50 hover:bg-rose-50/80 ${adj}`;
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

        <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Settlement summary</DialogTitle>
            </DialogHeader>
            {loadingPreview ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : preview ? (
              <div className="space-y-3 text-sm">
                {preview.has_line_adjustments || hasLineAdjustments(preview.lines) ? (
                  <div className="rounded border border-violet-200 bg-violet-50 px-2 py-1.5 text-xs text-violet-900 space-y-1">
                    <p className="font-semibold">Manual commission adjustments in this batch</p>
                    <p className="text-[10px]">
                      {preview.adjustment_summary?.count ?? 0} line(s): bonus ₹{" "}
                      {fmtMoney(preview.adjustment_summary?.bonus_total ?? 0)} · deduction ₹{" "}
                      {fmtMoney(preview.adjustment_summary?.deduction_total ?? 0)}
                    </p>
                  </div>
                ) : null}
                {hasOutstandingOffset(preview.lines) ? (
                  <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 space-y-1">
                    <p className="font-semibold">Outstanding will be deducted from commission payout</p>
                    <p className="text-[10px]">
                      On approval, an approved payment will be recorded for each affected order. Total deduction: ₹{" "}
                      {fmtMoney(preview.total_outstanding_deduction ?? 0)}
                    </p>
                    <ul className="text-[10px] list-disc pl-4 space-y-0.5">
                      {(preview.order_offsets || getOffsetOrders(preview.lines)).map((o) => (
                        <li key={o.order_id}>
                          {o.order_number || `Order #${o.order_id}`}: outstanding ₹{" "}
                          {fmtMoney(o.order_outstanding)} → deduction ₹{" "}
                          {fmtMoney(o.deduction_amount ?? o.order_outstanding)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
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
                  <div>
                    <span className="text-muted-foreground">Net lines </span>
                    <span className="font-semibold">₹ {fmtMoney(preview.total_line_amount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Round off </span>
                    <span className="font-semibold">₹ {fmtSignedMoney(preview.total_round_off_amount ?? 0)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">By beneficiary</p>
                  <SettlementByUserSummary
                    byUser={preview.by_user || []}
                    lines={preview.lines || []}
                    showDeduction={hasOutstandingOffset(preview.lines)}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                  {(preview.lines || []).map((ln) => (
                    <div
                      key={ln.id}
                      className={`flex justify-between gap-2 rounded px-1 py-0.5 ${
                        ln.adjustment_type === "bonus"
                          ? "bg-emerald-50/80"
                          : ln.adjustment_type === "deduction"
                            ? "bg-rose-50/80"
                            : ln.outstanding_offset
                              ? "bg-amber-50/80"
                              : ""
                      }`}
                    >
                      <span>
                        {ln.order_number} · {ln.role}
                        {ln.adjustment_type ? (
                          <span
                            className={`ml-1 text-[9px] font-semibold ${
                              ln.adjustment_type === "bonus" ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {ln.adjustment_type}
                          </span>
                        ) : null}
                        {ln.outstanding_offset ? " · offset" : ""}
                      </span>
                      <span className="text-right shrink-0">
                        {Number(ln.line_deduction) > 0 ? (
                          <>
                            <span className="text-muted-foreground line-through mr-1">
                              ₹ {fmtMoney(ln.gross_amount ?? ln.amount)}
                            </span>
                            ₹ {fmtMoney(ln.line_net_amount ?? ln.amount)}
                          </>
                        ) : (
                          <>₹ {fmtMoney(ln.amount)}</>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Remarks (optional)</Label>
                  <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setSettleOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={submitSettlement} disabled={submitting || !currentPerm.can_create}>
                    {submitting ? "Submitting…" : "Submit for approval"}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <CommissionAdjustDialog
          open={adjustOpen}
          row={adjustRow}
          onClose={() => {
            setAdjustOpen(false);
            setAdjustRow(null);
          }}
          onSaved={() => {
            setSelected(new Set());
            setTableKey((k) => k + 1);
            loadSummary();
          }}
        />
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
