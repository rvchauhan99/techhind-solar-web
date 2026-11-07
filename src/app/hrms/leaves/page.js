"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import Select, { MenuItem } from "@/components/common/Select";
import { useAuth } from "@/hooks/useAuth";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsLeavesPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const perm = modulePermissions?.[currentModuleId] || {};
  const [status, setStatus] = useState("");
  const [emergency, setEmergency] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const fetcher = useMemo(
    () => async ({ page, limit }) => {
      const res = await hrmsService.listLeaves({
        page,
        limit,
        status: status || undefined,
        is_emergency: emergency === "" ? undefined : emergency === "true",
      });
      const payload = res?.result ?? res?.data ?? res;
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    [status, emergency, tableKey]
  );

  const onDecide = async (row, level, decision, extra = {}) => {
    setBusy(true);
    try {
      await hrmsService.decideLeave(row.id, { level, decision, ...extra });
      toast.success(`Leave ${decision}d (L${level})`);
      setTableKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async (row) => {
    setBusy(true);
    try {
      await hrmsService.cancelLeave(row.id);
      toast.success("Leave cancelled");
      setTableKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Cancel failed");
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
          row.start_date === row.end_date
            ? row.start_date
            : `${row.start_date} → ${row.end_date}`,
      },
      { field: "duration", label: "Duration", sortable: false },
      { field: "days", label: "Days", sortable: false },
      {
        field: "flags",
        label: "Flags",
        sortable: false,
        render: (row) => (
          <span className="text-xs">
            {row.is_emergency ? "Emergency " : ""}
            {row.is_lwp ? "LWP" : ""}
            {!row.is_emergency && !row.is_lwp ? "—" : ""}
          </span>
        ),
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => (
          <span className="text-xs capitalize">{row.status?.replace(/_/g, " ")}</span>
        ),
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.status === "pending_l1" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onDecide(row, 1, "approve")}
                >
                  L1 Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onDecide(row, 1, "reject")}
                >
                  L1 Reject
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => onCancel(row)}>
                  Cancel
                </Button>
              </>
            )}
            {row.status === "pending_l2" && perm.can_update && (
              <>
                <Button size="sm" disabled={busy} onClick={() => onDecide(row, 2, "approve")}>
                  L2 Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onDecide(row, 2, "approve", { is_lwp: true })}
                >
                  L2 as LWP
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onDecide(row, 2, "reject")}
                >
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
        title="Leaves"
        addButtonLabel="Apply leave"
        onAddClick={() => {
          window.location.href = "/hrms/leaves/add";
        }}
      >
        <div className="mb-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem]">
            <Select
              label="Status"
              name="status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setTableKey((k) => k + 1);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending_l1">Pending L1</MenuItem>
              <MenuItem value="pending_l2">Pending L2</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="reverted">Reverted</MenuItem>
            </Select>
          </div>
          <div className="min-w-[10rem]">
            <Select
              label="Planned / Emergency"
              name="emergency"
              value={emergency}
              onChange={(e) => {
                setEmergency(e.target.value);
                setTableKey((k) => k + 1);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="false">Planned</MenuItem>
              <MenuItem value="true">Emergency</MenuItem>
            </Select>
          </div>
        </div>
        <PaginatedTable key={tableKey} columns={columns} fetchData={fetcher} pageSize={20} />
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
