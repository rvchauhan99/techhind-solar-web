"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  IconPencil,
  IconPlus,
  IconDownload,
  IconGavel,
  IconCircleCheck,
  IconBan,
} from "@tabler/icons-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import Loader from "@/components/common/Loader";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi, getApiErrorMessage } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { currentMonthKey } from "@/components/common/hrmsFilterDates";
import { DIALOG_FORM_LARGE } from "@/utils/formConstants";
import PenaltyIssueForm from "./PenaltyIssueForm";
import PenaltyIssueFilterPanel from "./components/PenaltyIssueFilterPanel";

const MODULE_KEY = "hrms_penalty_issues";
const DEFAULT_MONTH = currentMonthKey();

const EMPTY_FILTERS = {
  month: DEFAULT_MONTH,
  status: "",
  employee_id: "",
  penalty_id: "",
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function penaltyIssueMatchesQ(row, search) {
  const needle = String(search || "").trim().toLowerCase();
  if (!needle) return true;
  const hay = [row.employee_name, row.emp_code, row.penalty_title, row.remarks, row.department_title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export default function HrmsPenaltyIssuesPage() {
  const perm = useModulePermission(MODULE_KEY);

  const [tableKey, setTableKey] = useState(0);
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [q, setQ] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({ count: null, activeAmount: null });
  const [exporting, setExporting] = useState(false);

  // Add / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const [penaltyTypeCount, setPenaltyTypeCount] = useState(0);

  useEffect(() => {
    hrmsService
      .listPenalties({ limit: 1, status: "active" })
      .then((res) => setPenaltyTypeCount(unwrap(res)?.meta?.total ?? 0))
      .catch(() => setPenaltyTypeCount(0));
  }, []);

  const listParams = useMemo(
    () => ({
      month: filters.month || DEFAULT_MONTH,
      status: filters.status || undefined,
      employee_id: filters.employee_id || undefined,
      penalty_id: filters.penalty_id || undefined,
    }),
    [filters]
  );

  const filterPanelValues = useMemo(() => ({ ...filters, q }), [filters, q]);

  const advancedActiveCount = useMemo(() => {
    let n = 0;
    if (filters.status) n += 1;
    if (filters.employee_id) n += 1;
    if (filters.penalty_id) n += 1;
    if (filters.month && filters.month !== DEFAULT_MONTH) n += 1;
    if (q.trim()) n += 1;
    return n;
  }, [filters, q]);

  const handleApplyFilters = (next) => {
    setFilters({
      month: next.month || DEFAULT_MONTH,
      status: next.status || "",
      employee_id: next.employee_id || "",
      penalty_id: next.penalty_id || "",
    });
    setTableKey((k) => k + 1);
  };

  const handleResetFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setQ("");
    setTableKey((k) => k + 1);
  };

  const handleRemoveFilter = (key) => {
    if (key === "q") {
      setQ("");
      setTableKey((k) => k + 1);
      return;
    }
    if (key === "month") {
      setFilters((prev) => ({ ...prev, month: DEFAULT_MONTH }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: "" }));
    }
    setTableKey((k) => k + 1);
  };

  const loadSummary = useCallback(async () => {
    try {
      const res = await hrmsService.listPenaltyIssues({
        ...listParams,
        limit: 1,
      });
      const s = unwrap(res)?.summary;
      setSummary({ count: s?.count ?? 0, activeAmount: s?.activeAmount ?? 0 });
    } catch {
      setSummary({ count: null, activeAmount: null });
    }
  }, [listParams]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const fetcher = useCallback(
    async ({ page, limit }) => {
      const search = q.trim();
      if (search) {
        const res = await hrmsService.listPenaltyIssues({
          page: 1,
          limit: 100,
          ...listParams,
        });
        const payload = unwrap(res);
        const allRows = (payload?.data || []).filter((row) => penaltyIssueMatchesQ(row, search));
        const total = allRows.length;
        const start = (page - 1) * limit;
        const rows = allRows.slice(start, start + limit);
        return {
          data: rows,
          meta: {
            total,
            page,
            pages: Math.ceil(total / limit) || 1,
            limit: limit || 20,
          },
        };
      }
      const res = await hrmsService.listPenaltyIssues({
        page,
        limit,
        ...listParams,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    [listParams, q]
  );

  const handleOpenAddModal = useCallback(() => {
    setEditRecord(null);
    setServerError(null);
    setModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback(async (row) => {
    setLoadingRecord(true);
    setServerError(null);
    try {
      const res = await hrmsService.getPenaltyIssue(row.id);
      setEditRecord(unwrap(res));
      setModalOpen(true);
    } catch (err) {
      toastErrorFromApi(err, "Could not load penalty issue");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditRecord(null);
    setServerError(null);
  }, []);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerError(null);
    try {
      if (editRecord?.id) {
        await hrmsService.updatePenaltyIssue(editRecord.id, payload);
        toastSuccess("Penalty issue updated");
      } else {
        await hrmsService.createPenaltyIssue(payload);
        toastSuccess("Penalty issued");
      }
      handleCloseModal();
      setTableKey((k) => k + 1);
      loadSummary();
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Save failed"));
      toastErrorFromApi(err, "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const blob = await hrmsService.exportPenaltyIssues({ ...listParams });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `penalty-issues-${filters.month || "all"}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Export downloaded — matches the selected filters");
    } catch (err) {
      toastErrorFromApi(err, "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    setSaving(true);
    try {
      await hrmsService.setPenaltyIssueStatus(cancelTarget.id, "cancelled");
      toastSuccess("Penalty issue cancelled");
      setCancelTarget(null);
      setTableKey((k) => k + 1);
      loadSummary();
    } catch (err) {
      toastErrorFromApi(err, "Could not cancel issue");
    } finally {
      setSaving(false);
    }
  };

  const monthOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en", { month: "short", year: "numeric" });
      return { value, label };
    });
  }, []);

  const columns = useMemo(
    () => [
      {
        field: "employee_name",
        label: "Employee",
        sortable: false,
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.employee_name || "—"}</span>
            {row.emp_code && (
              <span className="text-xs text-muted-foreground">{row.emp_code}</span>
            )}
          </div>
        ),
      },
      {
        field: "penalty_title",
        label: "Penalty",
        sortable: false,
        render: (row) => <span>{row.penalty_title || "—"}</span>,
      },
      {
        field: "penalty_month",
        label: "Month",
        sortable: true,
      },
      {
        field: "amount",
        label: "Amount",
        sortable: true,
        render: (row) => <span className="tabular-nums">{money(row.amount)}</span>,
      },
      {
        field: "remarks",
        label: "Remarks",
        sortable: false,
        render: (row) => (
          <span className="text-xs text-muted-foreground line-clamp-2">{row.remarks || "—"}</span>
        ),
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            {perm.can_update && row.status === "active" && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Edit penalty issue for ${row.employee_name || "employee"}`}
                title="Edit"
                onClick={() => handleOpenEditModal(row)}
              >
                <IconPencil className="h-4 w-4" />
              </Button>
            )}
            {perm.can_update && row.status === "active" && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Cancel penalty issue for ${row.employee_name || "employee"}`}
                title="Cancel issue"
                onClick={() => setCancelTarget(row)}
              >
                <IconBan className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [perm.can_update, handleOpenEditModal]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Penalty Issues"
        subtitle="Penalties issued to employees for a month — these reduce the payroll payout"
        actions={
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={doExport} loading={exporting}>
              <IconDownload className="size-4" /> Export
            </Button>
            {perm.can_create && (
              <Button size="sm" onClick={handleOpenAddModal}>
                <IconPlus className="size-4" /> Issue Penalty
              </Button>
            )}
          </div>
        }
      >
        <div className="mb-1.5 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            compact
            icon={<IconGavel size={16} />}
            label="Issues this month"
            value={summary.count ?? "—"}
            accentColor="#1b365d"
            subLabel={filters.month || "All months"}
          />
          <StatCard
            compact
            icon={<IconCircleCheck size={16} />}
            label="Active amount"
            value={summary.activeAmount == null ? "—" : money(summary.activeAmount)}
            accentColor="#00823b"
            subLabel="Deducted in payroll"
          />
          <StatCard
            compact
            icon={<IconBan size={16} />}
            label="Active penalty types"
            value={penaltyTypeCount}
            accentColor="#f37021"
            subLabel="Available to issue"
          />
        </div>


        <PenaltyIssueFilterPanel
          values={filterPanelValues}
          quickSearch={q}
          monthOptions={monthOptions}
          activeCount={advancedActiveCount}
          onQuickSearch={(v) => {
            setQ(v || "");
            setTableKey((k) => k + 1);
          }}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onRemove={handleRemoveFilter}
          loadEmployees={(query) => hrmsService.searchHrmsEmployees(query)}
          loadPenalties={(query) => hrmsService.searchHrmsPenalties(query)}
          resolveEmployee={(id) => hrmsService.resolveHrmsEmployee(id)}
          resolvePenalty={(id) => hrmsService.resolveHrmsPenalty(id)}
        />

        <div className="flex min-h-[320px] flex-1 flex-col">
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          showSearch={false}
          height="100%"
          initialSortBy="penalty_month"
          initialSortOrder="desc"
          emptyState={
            <EmptyState
              icon={IconGavel}
              title="No penalty issues"
              description={
                filters.month
                  ? "No penalties were issued for this month yet."
                  : "Issue a penalty to record a deduction against an employee payout."
              }
              actionLabel={perm.can_create ? "Issue Penalty" : undefined}
              onAction={perm.can_create ? handleOpenAddModal : undefined}
            />
          }
        />
        </div>

        <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel penalty issue</AlertDialogTitle>
              <AlertDialogDescription>
                Cancel {money(cancelTarget?.amount)} for{" "}
                {cancelTarget?.employee_name || "this employee"} in {cancelTarget?.penalty_month}? A
                cancelled issue is excluded from payroll.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Keep</AlertDialogCancel>
              <AlertDialogAction size="sm" variant="destructive" loading={saving} onClick={doCancel}>
                Cancel issue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={modalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className={DIALOG_FORM_LARGE}>
            <DialogHeader>
              <DialogTitle>{editRecord ? "Edit Penalty Issue" : "Issue Penalty"}</DialogTitle>
            </DialogHeader>
            {loadingRecord ? (
              <div className="flex min-h-[160px] items-center justify-center">
                <Loader />
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <PenaltyIssueForm
                    hideActions
                    variant="plain"
                    defaultValues={editRecord}
                    onSubmit={handleSubmit}
                    loading={submitting}
                    serverError={serverError}
                    onClearServerError={() => setServerError(null)}
                  />
                </div>
                <DialogFooter className="pt-3">
                  <Button variant="outline" size="sm" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    loading={submitting}
                    onClick={() => document.getElementById("hrms-penalty-issue-form")?.requestSubmit()}
                  >
                    {editRecord ? "Update" : "Issue Penalty"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
