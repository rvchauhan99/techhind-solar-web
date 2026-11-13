"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  IconDownload,
  IconClockCheck,
  IconUsers,
  IconFingerprint,
  IconClockExclamation,
  IconLogin,
  IconLogout,
  IconCoffee,
  IconArrowBackUp,
  IconCalendarStats,
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
import useModulePermission from "@/hooks/useModulePermission";
import { useAuth } from "@/hooks/useAuth";
import { unwrap } from "@/lib/apiUnwrap";
import { isRoleAllowed } from "@/lib/platformRoleAccess";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_attendance";
const NOW = new Date();
const TODAY = new Date().toISOString().slice(0, 10);

export default function HrmsAttendancePage() {
  const perm = useModulePermission(MODULE_KEY);
  const { user } = useAuth();
  const isSuperAdmin = isRoleAllowed(
    user?.role?.name || user?.role_name,
    "SuperAdmin,super_admin,super admin"
  );

  const [year, setYear] = useState(String(NOW.getFullYear()));
  const [month, setMonth] = useState(String(NOW.getMonth() + 1));
  const [status, setStatus] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [myStatus, setMyStatus] = useState(null);
  const [punching, setPunching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [counts, setCounts] = useState({ present: null, open: null, pending: null });
  const [countsLoading, setCountsLoading] = useState(true);

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const [present, open, pendingL1, pendingL2] = await Promise.all([
        hrmsService.listAttendance({ from: TODAY, to: TODAY, limit: 1 }),
        hrmsService.listAttendance({ open: 1, limit: 1 }),
        hrmsService.listAttendanceRequests({ status: "pending_l1", limit: 1 }),
        hrmsService.listAttendanceRequests({ status: "pending_l2", limit: 1 }),
      ]);
      setCounts({
        present: unwrap(present)?.meta?.total ?? 0,
        open: unwrap(open)?.meta?.total ?? 0,
        pending: (unwrap(pendingL1)?.meta?.total ?? 0) + (unwrap(pendingL2)?.meta?.total ?? 0),
      });
    } catch {
      setCounts({ present: null, open: null, pending: null });
    } finally {
      setCountsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const yearOptions = useMemo(
    () => [NOW.getFullYear() - 1, NOW.getFullYear(), NOW.getFullYear() + 1].map((y) => ({ value: String(y), label: String(y) })),
    []
  );
  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Date(2000, i, 1).toLocaleString("en", { month: "short" }) })),
    []
  );
  const monthRange = useMemo(() => {
    const last = new Date(Number(year), Number(month), 0).getDate();
    const mm = String(month).padStart(2, "0");
    return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, "0")}` };
  }, [year, month]);

  const loadStatus = async () => {
    try {
      const res = await hrmsService.getAttendanceStatus();
      setMyStatus(unwrap(res));
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
      toastSuccess(`Punch ${action} recorded`);
      await loadStatus();
      setTableKey((k) => k + 1);
      loadCounts();
    } catch (err) {
      toastErrorFromApi(err, "Punch failed");
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
        from: monthRange.from,
        to: monthRange.to,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, monthRange, tableKey]
  );

  const onExport = async () => {
    setExporting(true);
    try {
      const blob = await hrmsService.exportAttendanceReport({ year: Number(year), month: Number(month) });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${year}-${String(month).padStart(2, "0")}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Export downloaded");
    } catch (err) {
      toastErrorFromApi(err, "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const doAutoCheckout = async () => {
    setAutoBusy(true);
    try {
      const res = await hrmsService.autoCheckoutAttendance();
      const r = unwrap(res);
      toastSuccess(`Auto check-out closed ${r?.closed ?? 0} open punch(es)`);
      setAutoOpen(false);
      setTableKey((k) => k + 1);
      loadCounts();
    } catch (err) {
      toastErrorFromApi(err, "Auto check-out failed");
    } finally {
      setAutoBusy(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "emp",
        label: "Employee",
        sortable: false,
        render: (row) => (
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {row.user?.name || row.employee?.emp_code || `User #${row.user_id}`}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {row.employee?.emp_code || row.user?.email || "—"}
            </div>
          </div>
        ),
      },
      { field: "check_in_at", label: "Check in", sortable: true, render: (row) => (row.check_in_at ? new Date(row.check_in_at).toLocaleString() : "—") },
      { field: "check_out_at", label: "Check out", sortable: false, render: (row) => (row.check_out_at ? new Date(row.check_out_at).toLocaleString() : <span className="text-xs font-semibold text-[#f37021]">Still open</span>) },
      { field: "status", label: "Status", sortable: false, render: (row) => <StatusBadge status={row.status} /> },
      {
        field: "flags",
        label: "Flags",
        sortable: false,
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {row.is_half_day ? "Half day " : ""}
            {row.auto_checked_out ? "Auto-out" : ""}
            {!row.is_half_day && !row.auto_checked_out ? "—" : ""}
          </span>
        ),
      },
    ],
    []
  );

  const summaryColumns = useMemo(
    () => [
      {
        field: "employee_name",
        label: "Employee",
        sortable: false,
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.employee_name}</span>
            {row.emp_code && (
              <span className="text-xs text-muted-foreground">{row.emp_code}</span>
            )}
          </div>
        ),
      },
      {
        field: "department_title",
        label: "Department",
        sortable: false,
        render: (row) => <span>{row.department_title || "—"}</span>,
      },
      { field: "present_days", label: "Present", sortable: true },
      { field: "half_days", label: "Half days", sortable: true },
      { field: "late_marks", label: "Late marks", sortable: true },
      { field: "holiday_attendance", label: "Holiday", sortable: true },
      {
        field: "open_punches",
        label: "Open punches",
        sortable: true,
        render: (row) =>
          row.open_punches > 0 ? (
            <span className="font-medium text-destructive">{row.open_punches}</span>
          ) : (
            <span className="text-muted-foreground">0</span>
          ),
      },
      {
        field: "working_hours",
        label: "Working hours",
        sortable: true,
        render: (row) => <span className="tabular-nums">{row.working_hours}</span>,
      },
    ],
    []
  );

  const summaryFetcher = useMemo(
    () =>
      async ({ page, limit }) => {
        const res = await hrmsService.getAttendanceMonthlySummary({
          year: Number(year),
          month: Number(month),
        });
        const payload = unwrap(res);
        const rows = payload?.data || [];
        const take = Math.min(100, Math.max(1, Number(limit) || 20));
        const pageNum = Math.max(1, Number(page) || 1);
        const start = (pageNum - 1) * take;
        return {
          data: rows.slice(start, start + take),
          meta: {
            total: rows.length,
            page: pageNum,
            pages: Math.ceil(rows.length / take) || 1,
            limit: take,
          },
        };
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, month, tableKey]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Attendance"
        subtitle="Punch records for the month — record your punch or review the register"
        actions={
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={onExport} loading={exporting}>
              <IconDownload className="size-4" /> Export
            </Button>
            {isSuperAdmin && perm.can_update && (
              <Button size="sm" variant="outline" onClick={() => setAutoOpen(true)}>
                <IconClockCheck className="size-4" /> Auto check-out
              </Button>
            )}
          </div>
        }
        filterConfig={[
          { key: "year", label: "Year", type: "select", options: yearOptions },
          { key: "month", label: "Month", type: "select", options: monthOptions },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "IN", label: "IN" },
              { value: "OUT", label: "OUT" },
              { value: "BREAK_IN", label: "Break in" },
              { value: "BREAK_OUT", label: "Break out" },
            ],
          },
        ]}
        filterValues={{ year, month, status }}
        showFilterLabels
        onFilterChange={(key, value) => {
          if (key === "year") setYear(value || String(NOW.getFullYear()));
          else if (key === "month") setMonth(value || String(NOW.getMonth() + 1));
          else if (key === "status") setStatus(value);
          setTableKey((k) => k + 1);
        }}
        onClearFilters={() => {
          setYear(String(NOW.getFullYear()));
          setMonth(String(NOW.getMonth() + 1));
          setStatus("");
          setTableKey((k) => k + 1);
        }}
      >
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            icon={<IconUsers size={16} />}
            label="Present today"
            value={counts.present ?? "—"}
            accentColor="#00823b"
            subLabel="Punches recorded today"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconFingerprint size={16} />}
            label="Open punches"
            value={counts.open ?? "—"}
            accentColor="#f37021"
            subLabel="Not checked out yet"
            loading={countsLoading}
          />
          <StatCard
            icon={<IconClockExclamation size={16} />}
            label="Pending corrections"
            value={counts.pending ?? "—"}
            accentColor="#1b365d"
            subLabel="Awaiting L1 / L2 approval"
            loading={countsLoading}
          />
        </div>

        <div className="mb-2 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/10 p-2 text-primary">
                <IconFingerprint className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">My punch</span>
                  <StatusBadge status={myStatus?.status || (myStatus?.open ? "IN" : "OUT")} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {myStatus?.attendance?.check_in_at
                    ? `Checked in at ${new Date(myStatus.attendance.check_in_at).toLocaleString()}`
                    : myStatus?.open
                      ? "You have an open punch for today."
                      : "You are not checked in right now."}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={punching} onClick={() => onPunch("IN")}>
                <IconLogin className="h-4 w-4" /> Check in
              </Button>
              <Button size="sm" variant="outline" disabled={punching} onClick={() => onPunch("OUT")}>
                <IconLogout className="h-4 w-4" /> Check out
              </Button>
              <Button size="sm" variant="outline" disabled={punching} onClick={() => onPunch("BREAK_IN")}>
                <IconCoffee className="h-4 w-4" /> Break in
              </Button>
              <Button size="sm" variant="outline" disabled={punching} onClick={() => onPunch("BREAK_OUT")}>
                <IconArrowBackUp className="h-4 w-4" /> Break out
              </Button>
            </div>
          </div>
        </div>

        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          height="50vh"
          emptyState={
            <EmptyState
              icon={IconFingerprint}
              title="No punches for this month"
              description="Pick another month, clear the status filter, or record your own punch above."
            />
          }
        />

        <div className="mt-6">
          <div className="mb-2 flex items-end justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Monthly totals by employee</h3>
              <p className="text-xs text-muted-foreground">
                Present, half days, late marks, holiday attendance and open punches for the selected month
              </p>
            </div>
          </div>
          <PaginatedTable
            columns={summaryColumns}
            fetcher={summaryFetcher}
            height="40vh"
            emptyState={
              <EmptyState
                icon={IconCalendarStats}
                title="No attendance totals for this month"
                description="Totals appear once punches are recorded for the selected month."
              />
            }
          />
        </div>

        <AlertDialog open={autoOpen} onOpenChange={setAutoOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Auto check-out open punches</AlertDialogTitle>
              <AlertDialogDescription>
                Close all currently open punches (sets check-out to now and marks them auto-checked-out)?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={autoBusy}>Cancel</AlertDialogCancel>
              <AlertDialogAction size="sm" loading={autoBusy} onClick={doAutoCheckout}>Run</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}


