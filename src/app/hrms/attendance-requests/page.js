"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import Select, { MenuItem } from "@/components/common/Select";
import { useAuth } from "@/hooks/useAuth";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsAttendanceRequestsPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const perm = modulePermissions?.[currentModuleId] || {};
  const [status, setStatus] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const fetcher = useMemo(
    () => async ({ page, limit }) => {
      const res = await hrmsService.listAttendanceRequests({
        page,
        limit,
        status: status || undefined,
      });
      const payload = res?.result ?? res?.data ?? res;
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    [status, tableKey]
  );

  const onDecide = async (row, level, decision) => {
    setBusy(true);
    try {
      await hrmsService.decideAttendanceRequest(row.id, { level, decision });
      toast.success(`Request ${decision}d (L${level})`);
      setTableKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
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
        render: (row) => row.user?.name || row.employee?.emp_code || `User #${row.user_id}`,
      },
      { field: "request_type", label: "Type", sortable: false },
      {
        field: "request_at",
        label: "Requested at",
        sortable: false,
        render: (row) => (row.request_at ? new Date(row.request_at).toLocaleString() : "—"),
      },
      {
        field: "reason",
        label: "Reason",
        sortable: false,
        render: (row) => <span className="text-xs line-clamp-2">{row.reason}</span>,
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => <span className="text-xs capitalize">{row.status?.replace(/_/g, " ")}</span>,
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.status === "pending_l1" && (
              <>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onDecide(row, 1, "approve")}>
                  L1 Approve
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDecide(row, 1, "reject")}>
                  L1 Reject
                </Button>
              </>
            )}
            {row.status === "pending_l2" && perm.can_update && (
              <>
                <Button size="sm" disabled={busy} onClick={() => onDecide(row, 2, "approve")}>
                  L2 Approve
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDecide(row, 2, "reject")}>
                  L2 Reject
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [busy, perm.can_update]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Attendance Requests"
        addButtonLabel="New request"
        onAddClick={() => {
          window.location.href = "/hrms/attendance-requests/add";
        }}
      >
        <div className="mb-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem]">
            <Select
              label="Status"
              size="small"
              value={status || "all"}
              onChange={(e) => {
                const v = e.target.value === "all" ? "" : e.target.value;
                setStatus(v);
                setTableKey((k) => k + 1);
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending_l1">Pending L1</MenuItem>
              <MenuItem value="pending_l2">Pending L2</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href="/hrms/attendance">Attendance</Link>
          </Button>
        </div>
        <PaginatedTable key={tableKey} columns={columns} fetcher={fetcher} height="70vh" />
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
