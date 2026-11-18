"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconPencil, IconTrash, IconHistory, IconCalendarStats, IconCircleCheck, IconFilterOff } from "@tabler/icons-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
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
import useListTableState from "@/hooks/useListTableState";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi, getApiErrorMessage } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants";
import LeaveTypeForm from "./LeaveTypeForm";

const MODULE_KEY = "hrms_leave_types";
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function HrmsLeaveTypesPage() {
  const perm = useModulePermission(MODULE_KEY);

  const [tableKey, setTableKey] = useState(0);
  const list = useListTableState({ filters: { status: "", title: "" } });
  const [listTotal, setListTotal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [counts, setCounts] = useState({ total: null, active: null });
  const [countsLoading, setCountsLoading] = useState(true);

  // Add / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const [all, active] = await Promise.all([
        hrmsService.listLeaveTypes({ limit: 1 }),
        hrmsService.listLeaveTypes({ limit: 1, status: "active" }),
      ]);
      setCounts({
        total: unwrap(all)?.meta?.total ?? 0,
        active: unwrap(active)?.meta?.total ?? 0,
      });
    } catch {
      setCounts({ total: null, active: null });
    } finally {
      setCountsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const fetcher = useCallback(async (params) => {
    const res = await hrmsService.listLeaveTypes({
      page: params.page,
      limit: params.limit,
      search: params.title || params.q || undefined,
      search_op: params.title_op || undefined,
      status: params.status || undefined,
    });
    const payload = unwrap(res);
    const rows = payload?.data || [];
    const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: params.limit || 20 };
    return { data: rows, meta };
  }, []);

  const handleOpenAddModal = useCallback(() => {
    setEditRecord(null);
    setServerError(null);
    setModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback(async (row) => {
    setLoadingRecord(true);
    setServerError(null);
    try {
      const res = await hrmsService.getLeaveType(row.id);
      setEditRecord(unwrap(res));
      setModalOpen(true);
    } catch (err) {
      toastErrorFromApi(err, "Could not load leave type");
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
        await hrmsService.updateLeaveType(editRecord.id, payload);
        toastSuccess("Leave type updated");
      } else {
        await hrmsService.createLeaveType(payload);
        toastSuccess("Leave type created");
      }
      handleCloseModal();
      setTableKey((k) => k + 1);
      loadCounts();
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Save failed"));
      toastErrorFromApi(err, "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hrmsService.deleteLeaveType(deleteTarget.id);
      toastSuccess("Leave type deleted");
      setDeleteTarget(null);
      setTableKey((k) => k + 1);
      loadCounts();
    } catch (err) {
      toastErrorFromApi(err, "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const openHistory = async (row) => {
    setHistoryTarget(row);
    setHistoryRows([]);
    setHistoryLoading(true);
    try {
      const res = await hrmsService.listLeaveTypeHistory(row.id);
      setHistoryRows(unwrap(res)?.data || []);
    } catch (err) {
      toastErrorFromApi(err, "History load failed");
    } finally {
      setHistoryLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "title",
        label: "Leave type",
        sortable: true,
        filterType: "text",
        filterKey: "title",
        defaultFilterOperator: "contains",
        render: (row) => <span className="font-medium text-foreground">{row.title}</span>,
      },
      {
        field: "quarterly_leave",
        label: "Quarterly entitlement",
        sortable: false,
        render: (row) => (
          <span className="font-semibold text-foreground">
            {row.quarterly_leave}
            <span className="ml-1 text-xs font-normal text-muted-foreground">days / quarter</span>
          </span>
        ),
      },
      {
        field: "counts_toward_balance",
        label: "Counts to balance",
        sortable: false,
        render: (row) =>
          row.counts_toward_balance === false ? (
            <Badge variant="secondary">Not counted</Badge>
          ) : (
            <Badge variant="success">Counted</Badge>
          ),
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        filterType: "select",
        filterKey: "status",
        filterOptions: STATUS_OPTIONS,
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openHistory(row)}
              aria-label={`History for ${row.title}`}
              title="History"
            >
              <IconHistory className="h-4 w-4" />
            </Button>
            {perm.can_update && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Edit ${row.title}`}
                title="Edit"
                onClick={() => handleOpenEditModal(row)}
              >
                <IconPencil className="h-4 w-4" />
              </Button>
            )}
            {perm.can_delete && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Delete ${row.title}`}
                title="Delete"
                onClick={() => setDeleteTarget(row)}
              >
                <IconTrash className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [perm.can_update, perm.can_delete, handleOpenEditModal]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Leave Types"
        subtitle="Leave types and quarterly entitlement"
        addButtonLabel={perm.can_create ? "Add Leave Type" : undefined}
        onAddClick={perm.can_create ? handleOpenAddModal : undefined}
      >
        <div className="mb-1.5 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <StatCard
            compact
            icon={<IconCalendarStats size={16} />}
            label="Leave types"
            value={counts.total ?? "—"}
            accentColor="#1b365d"
            subLabel="All configured types"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconCircleCheck size={16} />}
            label="Active"
            value={counts.active ?? "—"}
            accentColor="#00823b"
            subLabel="Available when applying leave"
            loading={countsLoading}
          />
        </div>

        <div className="flex min-h-[320px] flex-1 flex-col">
        <PaginatedTable
          toolbar={
            <>
              <ListCount total={listTotal} context={list.activeFilterCount ? "matching filters" : undefined} />
              {list.activeFilterCount > 0 ? (
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => list.clearFilters()}>
                  <IconFilterOff className="size-3.5" /> Clear filters
                </Button>
              ) : null}
            </>
          }
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          showSearch
          height="100%"
          onTotalChange={setListTotal}
          columnFilterValues={list.filters}
          onColumnFilterChange={list.setFilter}
          filterParams={list.filters}
          page={list.page}
          limit={list.limit}
          q={list.q}
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          onPageChange={(zeroBased) => list.setPage(zeroBased + 1)}
          onRowsPerPageChange={list.setLimit}
          onQChange={list.setQ}
          onSortChange={list.setSort}
          emptyState={
            <EmptyState
              icon={IconCalendarStats}
              title={list.activeFilterCount ? "No leave types match this filter" : "No leave types yet"}
              description={
                list.activeFilterCount
                  ? "Try clearing the filters to see all leave types."
                  : "Add leave types (Casual, Sick, Earned…) with a quarterly entitlement."
              }
              actionLabel={perm.can_create ? "Add Leave Type" : undefined}
              onAction={perm.can_create ? handleOpenAddModal : undefined}
            />
          }
        />
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete leave type</AlertDialogTitle>
              <AlertDialogDescription>
                Delete &quot;{deleteTarget?.title}&quot;? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction size="sm" variant="destructive" loading={deleting} onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={modalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className={DIALOG_FORM_MEDIUM}>
            <DialogHeader>
              <DialogTitle>{editRecord ? "Edit Leave Type" : "Add Leave Type"}</DialogTitle>
            </DialogHeader>
            {loadingRecord ? (
              <div className="flex min-h-[160px] items-center justify-center">
                <Loader />
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <LeaveTypeForm
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
                    onClick={() => document.getElementById("hrms-leave-type-form")?.requestSubmit()}
                  >
                    {editRecord ? "Update" : "Save"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!historyTarget} onOpenChange={(open) => !open && setHistoryTarget(null)}>
          <DialogContent>
            <DialogTitle>History — {historyTarget?.title}</DialogTitle>
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2">When</th>
                    <th className="py-2">Quarterly</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">By</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading && (
                    <tr>
                      <td colSpan={4} className="py-3">
                        <div className="space-y-1.5">
                          <div className="h-3 w-full animate-pulse rounded bg-muted" />
                          <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
                        </div>
                      </td>
                    </tr>
                  )}
                  {!historyLoading && historyRows.length === 0 && (
                    <tr><td colSpan={4} className="py-3 text-muted-foreground">No history yet — entitlement changes will appear here.</td></tr>
                  )}
                  {historyRows.map((h) => (
                    <tr key={h.id} className="border-b border-border/60">
                      <td className="py-2">{h.created_at ? new Date(h.created_at).toLocaleString() : "—"}</td>
                      <td className="py-2">{h.quarterly_leave}</td>
                      <td className="py-2"><StatusBadge status={h.status} /></td>
                      <td className="py-2">{h.changed_by ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
