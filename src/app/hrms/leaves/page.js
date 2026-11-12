"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  IconCheck,
  IconX,
  IconBan,
  IconCalendarOff,
  IconClockExclamation,
  IconCircleCheck,
} from "@tabler/icons-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import Input from "@/components/common/Input";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_leaves";
const STATUS_OPTIONS = [
  { value: "pending_l1", label: "Pending L1" },
  { value: "pending_l2", label: "Pending L2" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "reverted", label: "Reverted" },
];
const KIND_OPTIONS = [
  { value: "false", label: "Planned" },
  { value: "true", label: "Emergency" },
];

export default function HrmsLeavesPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);
  const [filters, setFilters] = useState({ status: "", emergency: "" });
  const [tableKey, setTableKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionTarget, setActionTarget] = useState(null);
  const [note, setNote] = useState("");
  const [counts, setCounts] = useState({ l1: null, l2: null, approved: null });
  const [countsLoading, setCountsLoading] = useState(true);

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const [l1, l2, approved] = await Promise.all([
        hrmsService.listLeaves({ status: "pending_l1", limit: 1 }),
        hrmsService.listLeaves({ status: "pending_l2", limit: 1 }),
        hrmsService.listLeaves({ status: "approved", limit: 1 }),
      ]);
      setCounts({
        l1: unwrap(l1)?.meta?.total ?? 0,
        l2: unwrap(l2)?.meta?.total ?? 0,
        approved: unwrap(approved)?.meta?.total ?? 0,
      });
    } catch {
      setCounts({ l1: null, l2: null, approved: null });
    } finally {
      setCountsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const fetcher = useMemo(
    () => async ({ page, limit, q }) => {
      const res = await hrmsService.listLeaves({
        page,
        limit,
        search: q || undefined,
        status: filters.status || undefined,
        is_emergency: filters.emergency === "" ? undefined : filters.emergency === "true",
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, tableKey]
  );

  const openAction = (row, level, decision, extra = {}) => {
    setActionTarget({ row, level, decision, extra });
    setNote("");
  };

  const confirmAction = async () => {
    if (!actionTarget) return;
    const { row, level, decision, extra } = actionTarget;
    setBusy(true);
    try {
      if (decision === "cancel") {
        await hrmsService.cancelLeave(row.id);
        toastSuccess("Leave cancelled");
      } else {
        await hrmsService.decideLeave(row.id, { level, decision, note: note || undefined, ...extra });
        toastSuccess(`Leave ${decision}d (L${level})`);
      }
      setActionTarget(null);
      setTableKey((k) => k + 1);
      loadCounts();
    } catch (err) {
      toastErrorFromApi(err, "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "user",
        label: "Employee",
        sortable: false,
        render: (row) => (
          <span className="font-medium text-foreground">
            {row.user?.name || row.employee?.emp_code || `User #${row.user_id}`}
          </span>
        ),
      },
      {
        field: "leaveType",
        label: "Type",
        sortable: false,
        render: (row) => row.leaveType?.title || row.leave_type_id,
      },
      {
        field: "dates",
        label: "Dates",
        sortable: false,
        render: (row) =>
          row.start_date === row.end_date ? row.start_date : `${row.start_date} → ${row.end_date}`,
      },
      { field: "duration", label: "Duration", sortable: false },
      { field: "days", label: "Days", sortable: false },
      {
        field: "flags",
        label: "Kind",
        sortable: false,
        render: (row) =>
          row.is_emergency || row.is_lwp ? (
            <div className="flex flex-wrap gap-1">
              {row.is_emergency ? <StatusBadge status="pending" label="Emergency" /> : null}
              {row.is_lwp ? <StatusBadge status="secondary" label="LWP" /> : null}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Planned</span>
          ),
      },
      { field: "status", label: "Status", sortable: false, render: (row) => <StatusBadge status={row.status} /> },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            {row.status === "pending_l1" && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Approve (L1)"
                  title="Approve (L1)"
                  onClick={() => openAction(row, 1, "approve")}
                >
                  <IconCheck className="h-4 w-4 text-[#00823b]" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Reject (L1)"
                  title="Reject (L1)"
                  onClick={() => openAction(row, 1, "reject")}
                >
                  <IconX className="h-4 w-4 text-destructive" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Cancel leave"
                  title="Cancel leave"
                  onClick={() => openAction(row, 1, "cancel")}
                >
                  <IconBan className="h-4 w-4" />
                </Button>
              </>
            )}
            {row.status === "pending_l2" && perm.can_update && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Approve (L2)"
                  title="Approve (L2)"
                  onClick={() => openAction(row, 2, "approve")}
                >
                  <IconCheck className="h-4 w-4 text-[#00823b]" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Approve as leave without pay"
                  title="Approve as LWP"
                  onClick={() => openAction(row, 2, "approve", { is_lwp: true })}
                >
                  <IconCalendarOff className="h-4 w-4 text-[#f37021]" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Reject (L2)"
                  title="Reject (L2)"
                  onClick={() => openAction(row, 2, "reject")}
                >
                  <IconX className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
            {row.status !== "pending_l1" && row.status !== "pending_l2" && (
              <span className="text-xs text-muted-foreground">No action</span>
            )}
          </div>
        ),
      },
    ],
    [busy, perm.can_update]
  );

  const target = actionTarget;
  const actionLabel =
    target?.decision === "cancel" ? "Cancel leave" : target?.decision === "approve" ? "Approve" : "Reject";

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Leaves"
        subtitle="Leave applications — manager approves first (L1), then HR (L2)"
        addButtonLabel="Apply leave"
        onAddClick={() => router.push("/hrms/leaves/add")}
        filterConfig={[
          { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
          { key: "emergency", label: "Planned / Emergency", type: "select", options: KIND_OPTIONS },
        ]}
        filterValues={filters}
        showFilterLabels
        onFilterChange={(key, value) => {
          setFilters((f) => ({ ...f, [key]: value }));
          setTableKey((k) => k + 1);
        }}
        onClearFilters={() => {
          setFilters({ status: "", emergency: "" });
          setTableKey((k) => k + 1);
        }}
      >
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            icon={<IconClockExclamation size={16} />}
            label="Pending manager (L1)"
            value={counts.l1 ?? "—"}
            accentColor="#f37021"
            subLabel="Awaiting reporting manager"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconClockExclamation size={16} />}
            label="Pending HR (L2)"
            value={counts.l2 ?? "—"}
            accentColor="#1b365d"
            subLabel="Awaiting HR decision"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconCircleCheck size={16} />}
            label="Approved"
            value={counts.approved ?? "—"}
            accentColor="#00823b"
            subLabel="Balance already deducted"
            loading={countsLoading}
          />
        </div>

        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          showSearch
          height="56vh"
          emptyState={
            <EmptyState
              icon={IconCalendarOff}
              title={filters.status || filters.emergency ? "No leaves match these filters" : "No leave applications"}
              description={
                filters.status || filters.emergency
                  ? "Try clearing the filters to see all leave applications."
                  : "Apply for leave to start the manager → HR approval flow."
              }
              actionLabel="Apply leave"
              onAction={() => router.push("/hrms/leaves/add")}
            />
          }
        />

        <AlertDialog open={!!target} onOpenChange={(open) => !open && setActionTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionLabel}
                {target?.decision !== "cancel" ? ` (L${target?.level})` : ""}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {target?.row?.user?.name || target?.row?.employee?.emp_code || "This employee"} —{" "}
                {target?.row?.leaveType?.title || "leave"} {target?.row?.start_date}
                {target?.row?.end_date && target?.row?.end_date !== target?.row?.start_date
                  ? ` → ${target.row.end_date}`
                  : ""}
                {target?.extra?.is_lwp ? " (approved as leave without pay)" : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {target?.decision !== "cancel" && (
              <div className="py-2">
                <Input label="Note (optional)" name="note" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Back</AlertDialogCancel>
              <AlertDialogAction
                size="sm"
                variant={target?.decision === "approve" ? "default" : "destructive"}
                loading={busy}
                onClick={confirmAction}
              >
                {actionLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
