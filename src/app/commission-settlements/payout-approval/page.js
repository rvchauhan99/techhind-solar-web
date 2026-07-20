"use client";

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DateField from "@/components/common/DateField";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  IconHistory,
  IconClock,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import commissionSettlementService from "@/services/commissionSettlementService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import CommissionPayoutReviewDrawer from "../components/CommissionPayoutReviewDrawer";
import {
  buildFilterChips,
  countActiveFilterFields,
  clearFilterField,
  masterAutocompleteValue,
  referenceAutocompleteDisplay,
} from "../utils/filterChips";

const PERMISSION_MODULE_KEY = "/commission-settlements/payout-approval";
const VIEW_PENDING = "pending";
const VIEW_HISTORY = "history";
const HISTORY_DEFAULT_STATUS = "approved,rejected,paid";

const HISTORY_STATUS_OPTIONS = [
  { value: "approved", label: "Approved for payment" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
];

const INITIAL_FILTERS = {
  status: "",
  beneficiary_user_id: null,
  beneficiary_label: "",
  payout_number: "",
  bank_reference: "",
  requested_from: "",
  requested_to: "",
  approved_from: "",
  approved_to: "",
  paid_from: "",
  paid_to: "",
};

const FILTER_LABELS = {
  status: "Status",
  beneficiary_user_id: "Beneficiary",
  payout_number: "Batch No.",
  bank_reference: "Bank / UTR",
  requested_from: "Requested from",
  requested_to: "Requested to",
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

function fmtMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function fmtDateTime(v) {
  return v ? String(v).slice(0, 16) : "—";
}

function statusBadge(status) {
  if (status === "pending_approval") {
    return (
      <Badge variant="outline" className="h-5 border-amber-300 bg-amber-50 px-1 text-[9px] text-amber-800">
        Pending approval
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge variant="outline" className="h-5 border-emerald-300 bg-emerald-50 px-1 text-[9px] text-emerald-800">
        Approved for payment
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="outline" className="h-5 border-red-300 bg-red-50 px-1 text-[9px] text-red-800">
        Rejected
      </Badge>
    );
  }
  if (status === "paid") {
    return (
      <Badge variant="outline" className="h-5 border-slate-300 bg-slate-50 px-1 text-[9px] text-slate-700">
        Paid
      </Badge>
    );
  }
  return <span className="text-[10px]">{status || "—"}</span>;
}

export default function CommissionPayoutApprovalPage() {
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

  const canApproveReject = currentPerm.can_create || currentPerm.can_update;

  const [viewMode, setViewMode] = useState(VIEW_PENDING);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [reviewId, setReviewId] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const isHistory = viewMode === VIEW_HISTORY;
  const fc = (key, val) => setFilters((p) => ({ ...p, [key]: val }));
  const activeCount = countActiveFilterFields(appliedFilters);
  const chips = buildFilterChips(appliedFilters, {
    filterLabels: FILTER_LABELS,
    enumResolvers: {
      status: (v) => HISTORY_STATUS_OPTIONS.find((o) => o.value === v)?.label || v,
    },
  });

  const switchView = (mode) => {
    if (mode === viewMode) return;
    setViewMode(mode);
    setPage(1);
    setReviewId(null);
    if (mode === VIEW_PENDING) {
      setFilters(INITIAL_FILTERS);
      setAppliedFilters(INITIAL_FILTERS);
    }
    setTableKey((k) => k + 1);
  };

  const handleApply = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
    setTableKey((k) => k + 1);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(1);
    setTableKey((k) => k + 1);
  };

  const removeChip = (key) => {
    const next = clearFilterField(appliedFilters, key, INITIAL_FILTERS);
    setFilters(next);
    setAppliedFilters(next);
    setPage(1);
    setTableKey((k) => k + 1);
  };

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const query = {
        page: p.page,
        limit: p.limit,
      };

      if (isHistory) {
        const a = appliedFilters;
        query.status = a.status || HISTORY_DEFAULT_STATUS;
        if (a.beneficiary_user_id) query.beneficiary_user_id = a.beneficiary_user_id;
        if (a.payout_number?.trim()) query.payout_number = a.payout_number.trim();
        if (a.bank_reference?.trim()) query.bank_reference = a.bank_reference.trim();
        if (a.requested_from) query.requested_from = a.requested_from;
        if (a.requested_to) query.requested_to = a.requested_to;
        if (a.approved_from) query.approved_from = a.approved_from;
        if (a.approved_to) query.approved_to = a.approved_to;
        if (a.paid_from) query.paid_from = a.paid_from;
        if (a.paid_to) query.paid_to = a.paid_to;
      } else {
        query.status = "pending_approval";
      }

      const response = await commissionSettlementService.listPayoutRequests(query);
      const result = response?.result || response;
      return {
        data: result?.data || [],
        meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
      };
    },
    [tableKey, isHistory, appliedFilters]
  );

  const openReview = (row) => {
    if (row?.id) setReviewId(row.id);
  };

  const downloadVoucher = async (row) => {
    if (!row?.id) return;
    try {
      const blob = await commissionSettlementService.downloadPayoutVoucher(row.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payout-voucher-${row.payout_number || row.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Voucher download failed");
    }
  };

  const columns = useMemo(() => {
    const cols = [
      {
        field: "payout_number",
        label: "Batch No.",
        sortable: false,
        render: (r) => r.payout_number || "—",
      },
      {
        field: "beneficiary_name",
        label: "Beneficiary",
        sortable: false,
        render: (r) => r.beneficiary_name || "—",
      },
      {
        field: "total_amount",
        label: "Total Amount",
        sortable: false,
        render: (r) => (
          <span className="tabular-nums font-medium">₹{fmtMoney(r.total_amount)}</span>
        ),
      },
      {
        field: "requested_by_name",
        label: "Requested By",
        sortable: false,
        render: (r) => r.requested_by_name || "—",
      },
      {
        field: "requested_at",
        label: "Request Date",
        sortable: false,
        render: (r) => fmtDateTime(r.requested_at),
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (r) => statusBadge(r.status),
      },
    ];

    if (isHistory) {
      cols.splice(
        5,
        0,
        {
          field: "bank_reference",
          label: "Bank Ref",
          sortable: false,
          render: (r) => r.bank_reference || "—",
        },
        {
          field: "decision_at",
          label: "Decision / Paid",
          sortable: false,
          render: (r) => {
            if (r.status === "paid") return fmtDateTime(r.paid_at);
            if (r.status === "rejected") return fmtDateTime(r.rejected_at);
            if (r.status === "approved") return fmtDateTime(r.approved_at);
            return "—";
          },
        }
      );
    }

    cols.push({
      field: "actions",
      label: "",
      sortable: false,
      isActionColumn: true,
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openReview(row)}>
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => downloadVoucher(row)}
          >
            Voucher
          </Button>
        </div>
      ),
    });

    return cols;
  }, [isHistory]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title={isHistory ? "Payout Approval History" : "Pending Payout Approval"}
        subtitle={
          isHistory
            ? "Approved, rejected, and paid payout requests · download vouchers"
            : "Review pending payout requests and approve or reject"
        }
        actions={
          isHistory ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => switchView(VIEW_PENDING)}
            >
              <IconClock size={13} />
              Pending
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => switchView(VIEW_HISTORY)}
            >
              <IconHistory size={13} />
              History
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-2 px-1 pb-2">
          {isHistory && (
            <>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
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
                      options={HISTORY_STATUS_OPTIONS}
                      getOptionLabel={(o) => o?.label ?? ""}
                      value={
                        filters.status
                          ? HISTORY_STATUS_OPTIONS.find((o) => o.value === filters.status) ?? null
                          : null
                      }
                      onChange={(e, v) => fc("status", v?.value ?? "")}
                      clearable
                      placeholder="All (excl. pending)"
                    />
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
                      name="payout_number"
                      label="Batch No."
                      value={filters.payout_number || ""}
                      onChange={(e) => fc("payout_number", e.target.value || "")}
                    />
                    <Input
                      name="bank_reference"
                      label="Bank / UTR"
                      value={filters.bank_reference || ""}
                      onChange={(e) => fc("bank_reference", e.target.value || "")}
                    />
                    <DateField
                      name="requested_from"
                      label="Requested from"
                      value={filters.requested_from || ""}
                      onChange={(e) => fc("requested_from", e.target.value || "")}
                    />
                    <DateField
                      name="requested_to"
                      label="Requested to"
                      value={filters.requested_to || ""}
                      onChange={(e) => fc("requested_to", e.target.value || "")}
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
            </>
          )}

          <PaginatedTable
            key={`${viewMode}-${tableKey}`}
            moduleKey={PERMISSION_MODULE_KEY}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            showPagination={false}
            height={isHistory ? "calc(100vh - 280px)" : "calc(100vh - 200px)"}
            onTotalChange={setTotalCount}
            page={page}
            limit={limit}
            sortBy="id"
            sortOrder="DESC"
            onPageChange={(z) => setPage(z + 1)}
            onRowsPerPageChange={setLimit}
            onQChange={() => {}}
            onSortChange={() => {}}
            onRowClick={openReview}
          />
          <PaginationControls
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(z) => setPage(z + 1)}
            onRowsPerPageChange={setLimit}
          />
        </div>

        <CommissionPayoutReviewDrawer
          open={!!reviewId}
          payoutId={reviewId}
          onClose={() => setReviewId(null)}
          onActionComplete={() => setTableKey((k) => k + 1)}
          canApproveReject={canApproveReject && !isHistory}
        />
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
