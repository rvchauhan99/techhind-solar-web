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
import ListCount from "@/components/common/ListCount";
import Loader from "@/components/common/Loader";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi, getApiErrorMessage } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { DIALOG_FORM_LARGE } from "@/utils/formConstants";
import PenaltyIssueForm from "./PenaltyIssueForm";

const MODULE_KEY = "hrms_penalty_issues";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const THIS_MONTH = new Date().toISOString().slice(0, 7);

export default function HrmsPenaltyIssuesPage() {
  const perm = useModulePermission(MODULE_KEY);

  const [tableKey, setTableKey] = useState(0);
  const [filters, setFilters] = useState({ month: THIS_MONTH, status: "", employee_id: "", penalty_id: "" });
  const [listTotal, setListTotal] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [penalties, setPenalties] = useState([]);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [empRes, penRes] = await Promise.all([
          hrmsService.listEmployees({ limit: 100, status: "active" }),
          hrmsService.listPenalties({ limit: 100, status: "active" }),
        ]);
        if (cancelled) return;
        setEmployees(unwrap(empRes)?.data || []);
        setPenalties(unwrap(penRes)?.data || []);
      } catch {
        /* filter options are best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const employeeFilterOptions = useMemo(
    () =>
      employees.map((emp) => ({
        value: String(emp.id),
        label: emp.user?.name ? `${emp.user.name} (${emp.emp_code})` : emp.emp_code,
      })),
    [employees]
  );

  const penaltyFilterOptions = useMemo(
    () => penalties.map((p) => ({ value: String(p.id), label: p.title })),
    [penalties]
  );

  const loadSummary = useCallback(async () => {
    try {
      const res = await hrmsService.listPenaltyIssues({
        month: filters.month || undefined,
        status: filters.status || undefined,
        limit: 1,
      });
      const s = unwrap(res)?.summary;
      setSummary({ count: s?.count ?? 0, activeAmount: s?.activeAmount ?? 0 });
    } catch {
      setSummary({ count: null, activeAmount: null });
    }
  }, [filters.month, filters.status]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const fetcher = useCallback(
    async ({ page, limit, employee_id, penalty_id, status, month }) => {
      const res = await hrmsService.listPenaltyIssues({
        page,
        limit,
        month: month || undefined,
        employee_id: employee_id || undefined,
        penalty_id: penalty_id || undefined,
        status: status || undefined,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    []
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
      const blob = await hrmsService.exportPenaltyIssues({
        month: filters.month || undefined,
        status: filters.status || undefined,
      });
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

  const columns = useMemo(
    () => [
      {
        field: "employee_name",
        label: "Employee",
        sortable: false,
        filterType: "select",
        filterKey: "employee_id",
        filterOptions: employeeFilterOptions,
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
        filterType: "select",
        filterKey: "penalty_id",
        filterOptions: penaltyFilterOptions,
        render: (row) => <span>{row.penalty_title || "—"}</span>,
      },
      { field: "penalty_month", label: "Month", sortable: true },
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
        filterType: "select",
        filterKey: "status",
        filterOptions: [
          { value: "active", label: "Active" },
          { value: "cancelled", label: "Cancelled" },
        ],
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
    [perm.can_update, employeeFilterOptions, penaltyFilterOptions, handleOpenEditModal]
  );

  const monthOptions = useMemo(() => {
    const now = new Date();
    // Previous 12 months, newest first — the months payroll actually uses.
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en", { month: "short", year: "numeric" });
      return { value, label };
    });
  }, []);

  const filterConfig = useMemo(
    () => [
      { key: "month", label: "Month", type: "select", options: monthOptions },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "active", label: "Active" },
          { value: "cancelled", label: "Cancelled" },
        ],
      },
    ],
    [monthOptions]
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
        filterConfig={filterConfig}
        filterValues={filters}
        showFilterLabels
        onFilterChange={(key, value) => {
          setFilters((f) => ({ ...f, [key]: value }));
          setTableKey((k) => k + 1);
        }}
        onClearFilters={() => {
          setFilters({ month: THIS_MONTH, status: "", employee_id: "", penalty_id: "" });
          setTableKey((k) => k + 1);
        }}
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
            value={penalties.length}
            accentColor="#f37021"
            subLabel="Available to issue"
          />
        </div>


        <div className="flex min-h-[320px] flex-1 flex-col">
        <PaginatedTable
          toolbar={
            <>
              <ListCount total={listTotal} context={Object.values(filters).some((v) => v != null && String(v).trim() !== "") ? "matching filters" : undefined} />
            </>
          }
          key={tableKey}
          onTotalChange={setListTotal}
          columnFilterValues={filters}
          onColumnFilterChange={(key, value) => {
            setFilters((f) => ({ ...f, [key]: value }));
            setTableKey((k) => k + 1);
          }}
          filterParams={filters}
          columns={columns}
          fetcher={fetcher}
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
