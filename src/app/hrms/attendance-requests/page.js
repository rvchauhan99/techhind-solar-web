"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconClockExclamation, IconCircleCheck, IconUserCheck } from "@tabler/icons-react";
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

const MODULE_KEY = "hrms_attendance_requests";

export default function HrmsAttendanceRequestsPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);

  const [tableKey, setTableKey] = useState(0);
  const [filters, setFilters] = useState({ status: "", request_type: "" });
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [note, setNote] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [counts, setCounts] = useState({ l1: null, l2: null, approved: null });
  const [countsLoading, setCountsLoading] = useState(true);

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const [l1, l2, approved] = await Promise.all([
        hrmsService.listAttendanceRequests({ status: "pending_l1", limit: 1 }),
        hrmsService.listAttendanceRequests({ status: "pending_l2", limit: 1 }),
        hrmsService.listAttendanceRequests({ status: "approved", limit: 1 }),
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
      const res = await hrmsService.listAttendanceRequests({
        page,
        limit,
        status: filters.status || undefined,
        request_type: filters.request_type || undefined,
        search: q || undefined,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, tableKey]
  );

  const openDecision = (row, level, decision) => {
    setDecisionTarget({ row, level, decision });
    setNote("");
  };

  const confirmDecision = async () => {
    if (!decisionTarget) return;
    const { row, level, decision } = decisionTarget;
    setDeciding(true);
    try {
      await hrmsService.decideAttendanceRequest(row.id, { level, decision, note: note || undefined });
      toastSuccess(`Request ${decision}d (L${level})`);
      setDecisionTarget(null);
      setTableKey((k) => k + 1);
      loadCounts();
    } catch (err) {
      toastErrorFromApi(err, "Action failed");
    } finally {
      setDeciding(false);
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
      { field: "request_type", label: "Type", sortable: false, render: (row) => String(row.request_type || "").replace(/_/g, " ") },
      { field: "request_at", label: "Requested at", sortable: false, render: (row) => (row.request_at ? new Date(row.request_at).toLocaleString() : "—") },
      { field: "reason", label: "Reason", sortable: false, render: (row) => <span className="text-xs line-clamp-2">{row.reason}</span> },
      { field: "l1", label: "Manager (L1)", sortable: false, render: (row) => (row.level1_status ? <StatusBadge status={row.level1_status} /> : <span className="text-xs text-muted-foreground">—</span>) },
      { field: "l2", label: "HR (L2)", sortable: false, render: (row) => (row.level2_status ? <StatusBadge status={row.level2_status} /> : <span className="text-xs text-muted-foreground">—</span>) },
      { field: "status", label: "Status", sortable: false, render: (row) => <StatusBadge status={row.status} /> },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex flex-wrap items-center justify-end gap-1">
            {row.status === "pending_l1" && (
              <>
                <Button size="sm" variant="outline" onClick={() => openDecision(row, 1, "approve")}>
                  Approve (L1)
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openDecision(row, 1, "reject")}>
                  Reject
                </Button>
              </>
            )}
            {row.status === "pending_l2" && perm.can_update && (
              <>
                <Button size="sm" onClick={() => openDecision(row, 2, "approve")}>
                  Approve (L2)
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openDecision(row, 2, "reject")}>
                  Reject
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [perm.can_update]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Attendance Requests"
        subtitle="Correction requests — the reporting manager approves first (L1), then HR (L2)"
        addButtonLabel="New request"
        onAddClick={() => router.push("/hrms/attendance-requests/add")}
        filterConfig={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "pending_l1", label: "Pending L1" },
              { value: "pending_l2", label: "Pending L2" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ],
          },
          {
            key: "request_type",
            label: "Type",
            type: "select",
            options: [
              { value: "check_in", label: "Check in" },
              { value: "check_out", label: "Check out" },
              { value: "break_in", label: "Break in" },
              { value: "break_out", label: "Break out" },
            ],
          },
        ]}
        filterValues={filters}
        showFilterLabels
        onFilterChange={(key, value) => {
          setFilters((f) => ({ ...f, [key]: value }));
          setTableKey((k) => k + 1);
        }}
        onClearFilters={() => {
          setFilters({ status: "", request_type: "" });
          setTableKey((k) => k + 1);
        }}
      >
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            icon={<IconUserCheck size={16} />}
            label="Pending your approval (L1)"
            value={counts.l1 ?? "—"}
            accentColor="#f37021"
            subLabel="Manager decision needed"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconClockExclamation size={16} />}
            label="Pending HR (L2)"
            value={counts.l2 ?? "—"}
            accentColor="#1b365d"
            subLabel="HR decision needed"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconCircleCheck size={16} />}
            label="Approved"
            value={counts.approved ?? "—"}
            accentColor="#00823b"
            subLabel="Corrections applied"
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
              icon={IconClockExclamation}
              title={filters.status || filters.request_type ? "No requests match these filters" : "No correction requests"}
              description={
                filters.status || filters.request_type
                  ? "Try clearing the filters to see all requests."
                  : "When someone raises a missed punch or correction, it will appear here for approval."
              }
              actionLabel="New request"
              onAction={() => router.push("/hrms/attendance-requests/add")}
            />
          }
        />

        <AlertDialog open={!!decisionTarget} onOpenChange={(open) => !open && setDecisionTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {decisionTarget?.decision === "approve" ? "Approve" : "Reject"} request (L{decisionTarget?.level})
              </AlertDialogTitle>
              <AlertDialogDescription>
                {decisionTarget?.row?.user?.name || decisionTarget?.row?.employee?.emp_code} —{" "}
                {String(decisionTarget?.row?.request_type || "").replace(/_/g, " ")}. You can add an optional note.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Input label="Note (optional)" name="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deciding}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                size="sm"
                variant={decisionTarget?.decision === "reject" ? "destructive" : "default"}
                loading={deciding}
                onClick={confirmDecision}
              >
                {decisionTarget?.decision === "approve" ? "Approve" : "Reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}

