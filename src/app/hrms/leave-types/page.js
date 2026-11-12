"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconPencil, IconTrash, IconHistory, IconCalendarStats, IconCircleCheck } from "@tabler/icons-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_leave_types";

export default function HrmsLeaveTypesPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);

  const [tableKey, setTableKey] = useState(0);
  const [status, setStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [counts, setCounts] = useState({ total: null, active: null });
  const [countsLoading, setCountsLoading] = useState(true);

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

  const fetcher = useMemo(
    () => async ({ page, limit, q }) => {
      const res = await hrmsService.listLeaveTypes({
        page, limit,
        search: q || undefined,
        status: status || undefined,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, tableKey]
  );

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
      { field: "status", label: "Status", sortable: false, render: (row) => <StatusBadge status={row.status} /> },
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
                onClick={() => router.push(`/hrms/leave-types/${row.id}/edit`)}
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
    [perm.can_update, perm.can_delete, router]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Leave Types"
        subtitle="Leave types and quarterly entitlement"
        addButtonLabel={perm.can_create ? "Add Leave Type" : undefined}
        onAddClick={perm.can_create ? () => router.push("/hrms/leave-types/add") : undefined}
        filterConfig={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          },
        ]}
        filterValues={{ status }}
        showFilterLabels
        onFilterChange={(key, value) => {
          if (key === "status") {
            setStatus(value);
            setTableKey((k) => k + 1);
          }
        }}
        onClearFilters={() => {
          setStatus("");
          setTableKey((k) => k + 1);
        }}
      >
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <StatCard
            icon={<IconCalendarStats size={16} />}
            label="Leave types"
            value={counts.total ?? "—"}
            accentColor="#1b365d"
            subLabel="All configured types"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconCircleCheck size={16} />}
            label="Active"
            value={counts.active ?? "—"}
            accentColor="#00823b"
            subLabel="Available when applying leave"
            loading={countsLoading}
          />
        </div>

        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          showSearch
          height="60vh"
          emptyState={
            <EmptyState
              icon={IconCalendarStats}
              title={status ? "No leave types match this filter" : "No leave types yet"}
              description={
                status
                  ? "Try clearing the status filter to see all leave types."
                  : "Add leave types (Casual, Sick, Earned…) with a quarterly entitlement."
              }
              actionLabel={perm.can_create ? "Add Leave Type" : undefined}
              onAction={perm.can_create ? () => router.push("/hrms/leave-types/add") : undefined}
            />
          }
        />

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

