"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import Select, { MenuItem } from "@/components/common/Select";
import FormSection from "@/components/common/FormSection";
import { useAuth } from "@/hooks/useAuth";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsAttendancePage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const perm = modulePermissions?.[currentModuleId] || {};
  const [status, setStatus] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [myStatus, setMyStatus] = useState(null);
  const [punching, setPunching] = useState(false);

  const loadStatus = async () => {
    try {
      const res = await hrmsService.getAttendanceStatus();
      setMyStatus(res?.result ?? res?.data ?? res);
    } catch {
      setMyStatus(null);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const onPunch = async (action) => {
    setPunching(true);
    try {
      await hrmsService.punchAttendance({ action, channel: "WEB" });
      toast.success(`Punch ${action} recorded`);
      await loadStatus();
      setTableKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Punch failed");
    } finally {
      setPunching(false);
    }
  };

  const fetcher = useMemo(
    () => async ({ page, limit }) => {
      const res = await hrmsService.listAttendance({
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

  const columns = useMemo(
    () => [
      {
        field: "emp",
        label: "Employee",
        sortable: false,
        render: (row) =>
          row.employee?.emp_code || row.user?.name || `User #${row.user_id}`,
      },
      {
        field: "email",
        label: "Email",
        sortable: false,
        render: (row) => row.user?.email || "—",
      },
      {
        field: "check_in_at",
        label: "Check in",
        sortable: true,
        render: (row) => (row.check_in_at ? new Date(row.check_in_at).toLocaleString() : "—"),
      },
      {
        field: "check_out_at",
        label: "Check out",
        sortable: false,
        render: (row) => (row.check_out_at ? new Date(row.check_out_at).toLocaleString() : "—"),
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => <span className="text-xs font-medium">{row.status}</span>,
      },
      {
        field: "flags",
        label: "Flags",
        sortable: false,
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {row.is_half_day ? "Half " : ""}
            {row.auto_checked_out ? "Auto-out" : ""}
            {!row.is_half_day && !row.auto_checked_out ? "—" : ""}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer title="Attendance">
        <FormSection title="My punch" className="mb-3 rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground mb-2">
            Status:{" "}
            <strong>{myStatus?.status || (myStatus?.open ? "IN" : "OUT") || "—"}</strong>
            {myStatus?.attendance?.check_in_at
              ? ` · since ${new Date(myStatus.attendance.check_in_at).toLocaleString()}`
              : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={punching} onClick={() => onPunch("IN")}>
              Check in
            </Button>
            <Button size="sm" variant="outline" disabled={punching} onClick={() => onPunch("OUT")}>
              Check out
            </Button>
            <Button size="sm" variant="outline" disabled={punching} onClick={() => onPunch("BREAK_IN")}>
              Break in
            </Button>
            <Button size="sm" variant="outline" disabled={punching} onClick={() => onPunch("BREAK_OUT")}>
              Break out
            </Button>
          </div>
        </FormSection>

        {perm.can_read !== false && (
          <>
            <div className="mb-2 flex flex-wrap items-end gap-2">
              <div className="min-w-[8rem]">
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
                  <MenuItem value="IN">IN</MenuItem>
                  <MenuItem value="OUT">OUT</MenuItem>
                  <MenuItem value="BREAK_IN">BREAK_IN</MenuItem>
                  <MenuItem value="BREAK_OUT">BREAK_OUT</MenuItem>
                </Select>
              </div>
            </div>
            <PaginatedTable key={tableKey} columns={columns} fetcher={fetcher} height="60vh" />
          </>
        )}
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
