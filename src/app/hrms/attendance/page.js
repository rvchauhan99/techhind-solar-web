"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconDownload,
  IconUsers,
  IconFingerprint,
  IconClockExclamation,
  IconLogin,
  IconLogout,
  IconCoffee,
  IconArrowBackUp,
  IconCalendarStats,
} from "@tabler/icons-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import useModulePermission from "@/hooks/useModulePermission";
import useListTableState from "@/hooks/useListTableState";
import { useAuth } from "@/hooks/useAuth";
import { unwrap } from "@/lib/apiUnwrap";
import { isRoleAllowed } from "@/lib/platformRoleAccess";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import AttendanceCalendar from "./components/AttendanceCalendar";
import AttendanceFilterPanel, {
  monthDateBounds,
} from "./components/AttendanceFilterPanel";

const MODULE_KEY = "hrms_attendance";
const NOW = new Date();
const DEFAULT_YEAR = String(NOW.getFullYear());
const DEFAULT_MONTH = String(NOW.getMonth() + 1);
const DEFAULT_MONTH_BOUNDS = monthDateBounds(DEFAULT_YEAR, DEFAULT_MONTH);

const YEAR_OPTIONS = [NOW.getFullYear() - 1, NOW.getFullYear(), NOW.getFullYear() + 1].map(
  (y) => ({ value: String(y), label: String(y) })
);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i, 1).toLocaleString("en", { month: "short" }),
}));

const IST = { timeZone: "Asia/Kolkata" };
const fmtDay = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", ...IST })
    : "—";
const fmtTime = (v) =>
  v ? new Date(v).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", ...IST }) : null;
const fmtBreak = (secs) => {
  const s = Number(secs || 0);
  if (!s) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
};
const netHours = (row) => {
  if (!row?.check_in_at || !row?.check_out_at) return null;
  const gross = (new Date(row.check_out_at) - new Date(row.check_in_at)) / 3600000;
  const net = gross - (Number(row.break_seconds) || 0) / 3600;
  return Math.max(0, net).toFixed(2);
};

const SUMMARY_SORT_FIELDS = new Set([
  "employee_name",
  "department_title",
  "present_days",
  "half_days",
  "late_marks",
  "holiday_attendance",
  "open_punches",
  "working_hours",
]);

const PUNCH_ACTIONS = [
  { key: "IN", label: "Punch In", icon: IconLogin, variant: "default" },
  { key: "OUT", label: "Punch Out", icon: IconLogout, variant: "outline" },
  { key: "BREAK_IN", label: "Break in", icon: IconCoffee, variant: "outline" },
  { key: "BREAK_OUT", label: "Break out", icon: IconArrowBackUp, variant: "outline" },
];

export default function HrmsAttendancePage() {
  const perm = useModulePermission(MODULE_KEY);
  const { user } = useAuth();
  const isSuperAdmin = isRoleAllowed(
    user?.role?.name || user?.role_name,
    "SuperAdmin,super_admin,super admin"
  );

  const list = useListTableState({
    defaultLimit: 10,
    filters: {
      year: DEFAULT_YEAR,
      month: DEFAULT_MONTH,
      from: DEFAULT_MONTH_BOUNDS.from,
      to: DEFAULT_MONTH_BOUNDS.to,
      department_id: "",
      designation_id: "",
      employee_id: "",
      status: "",
      open: "",
      channel: "",
      auto_checked_out: "",
      is_half_day: "",
    },
    sortBy: "check_in_at",
    sortOrder: "desc",
  });

  const [view, setView] = useState("records");
  const [refreshKey, setRefreshKey] = useState(0);
  const [myStatus, setMyStatus] = useState(null);
  const [punching, setPunching] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [counts, setCounts] = useState({ present: null, open: null, pending: null, scope: null });
  const [countsLoading, setCountsLoading] = useState(true);
  const [listScope, setListScope] = useState(null);

  const canExport = (isSuperAdmin || listScope === "all" || listScope === "team") && perm.can_read;

  const year = list.filters.year || DEFAULT_YEAR;
  const month = list.filters.month || DEFAULT_MONTH;
  const dateRange = useMemo(() => {
    const fallback = monthDateBounds(year, month);
    return {
      from: list.filters.from || fallback.from,
      to: list.filters.to || fallback.to,
    };
  }, [list.filters.from, list.filters.to, year, month]);

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const res = await hrmsService.getAttendanceTodaySummary();
      const payload = unwrap(res) || {};
      setCounts({
        present: payload.present ?? 0,
        open: payload.open ?? 0,
        pending: payload.pending ?? 0,
        scope: payload.scope || null,
      });
      if (payload.scope) setListScope(payload.scope);
    } catch {
      setCounts({ present: null, open: null, pending: null, scope: null });
    } finally {
      setCountsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const loadStatus = useCallback(async () => {
    try {
      const res = await hrmsService.getAttendanceStatus();
      setMyStatus(unwrap(res));
    } catch {
      setMyStatus(null);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const onPunch = async (action) => {
    setPunching(action);
    try {
      await hrmsService.punchAttendance({ action, channel: "WEB" });
      toastSuccess(`Punch ${action} recorded`);
      loadStatus();
      setRefreshKey((k) => k + 1);
      loadCounts();
    } catch (err) {
      toastErrorFromApi(err, "Punch failed");
    } finally {
      setPunching(null);
    }
  };

  const recordsFetcher = useCallback(
    async (params) => {
      const res = await hrmsService.listAttendance({
        page: params.page,
        limit: params.limit,
        q: params.q || undefined,
        status: params.status || undefined,
        open: params.open || undefined,
        channel: params.channel || undefined,
        auto_checked_out: params.auto_checked_out || undefined,
        is_half_day: params.is_half_day || undefined,
        employee_id: params.employee_id || undefined,
        department_id: params.department_id || undefined,
        designation_id: params.designation_id || undefined,
        from: dateRange.from,
        to: dateRange.to,
        sortBy: params.sortBy || undefined,
        sortOrder: params.sortOrder || undefined,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || {
        total: rows.length,
        page: 1,
        pages: 1,
        limit: params.limit || 10,
      };
      if (meta.scope) setListScope(meta.scope);
      return { data: rows, meta };
    },
    [dateRange]
  );

  const summaryFetcher = useCallback(
    async (params) => {
      const res = await hrmsService.getAttendanceMonthlySummary({
        year: Number(year),
        month: Number(month),
        q: params.q || undefined,
        employee_id: params.employee_id || undefined,
        department_id: params.department_id || undefined,
        designation_id: params.designation_id || undefined,
      });
      const payload = unwrap(res);
      let rows = payload?.data || [];
      const sortBy = SUMMARY_SORT_FIELDS.has(params.sortBy) ? params.sortBy : null;
      if (sortBy) {
        const dir = params.sortOrder === "desc" ? -1 : 1;
        rows = [...rows].sort((a, b) => {
          const av = a[sortBy];
          const bv = b[sortBy];
          if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
          return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
        });
      }
      const take = Math.min(100, Math.max(1, Number(params.limit) || 20));
      const pageNum = Math.max(1, Number(params.page) || 1);
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
    [year, month]
  );

  const recordColumns = useMemo(
    () => [
      {
        field: "emp",
        label: "Employee",
        sortable: false,
        stickyLeft: true,
        stickyWidth: 220,
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
      {
        field: "date",
        label: "Date",
        sortable: false,
        render: (row) => <span className="whitespace-nowrap">{fmtDay(row.check_in_at)}</span>,
      },
      {
        field: "check_in_at",
        label: "Punch in",
        sortable: true,
        render: (row) => (
          <span
            className="whitespace-nowrap tabular-nums"
            title={row.check_in_at ? new Date(row.check_in_at).toLocaleString() : undefined}
          >
            {fmtTime(row.check_in_at) || "—"}
          </span>
        ),
      },
      {
        field: "check_out_at",
        label: "Punch out",
        sortable: true,
        render: (row) =>
          row.check_out_at ? (
            <span
              className="whitespace-nowrap tabular-nums"
              title={new Date(row.check_out_at).toLocaleString()}
            >
              {fmtTime(row.check_out_at)}
            </span>
          ) : (
            <Badge variant="accent">Still open</Badge>
          ),
      },
      {
        field: "break_seconds",
        label: "Break",
        sortable: false,
        render: (row) => <span className="tabular-nums">{fmtBreak(row.break_seconds)}</span>,
      },
      {
        field: "hours",
        label: "Net hours",
        sortable: false,
        render: (row) => {
          const hours = netHours(row);
          return hours == null ? (
            <span className="text-xs font-semibold text-[#f37021]">In progress</span>
          ) : (
            <span className="tabular-nums">{hours}</span>
          );
        },
      },
      {
        field: "status",
        label: "Status",
        sortable: true,
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        field: "flags",
        label: "Flags",
        sortable: false,
        render: (row) => (
          <span className="flex flex-wrap gap-1">
            {row.is_half_day ? <Badge variant="accent">Half day</Badge> : null}
            {row.auto_checked_out ? <Badge variant="secondary">Auto-out</Badge> : null}
            {!row.is_half_day && !row.auto_checked_out ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : null}
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
        sortable: true,
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.employee_name}</span>
            {row.emp_code ? (
              <span className="text-xs text-muted-foreground">{row.emp_code}</span>
            ) : null}
          </div>
        ),
      },
      {
        field: "department_title",
        label: "Department",
        sortable: true,
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

  const advancedActiveCount = useMemo(() => {
    const defaultBounds = monthDateBounds(DEFAULT_YEAR, DEFAULT_MONTH);
    const keys = [
      "department_id",
      "designation_id",
      "employee_id",
      "status",
      "open",
      "channel",
      "auto_checked_out",
      "is_half_day",
    ];
    let n = keys.filter((k) => String(list.filters[k] ?? "").trim() !== "").length;
    if (list.q) n += 1;
    const from = list.filters.from || "";
    const to = list.filters.to || "";
    if (from && from !== defaultBounds.from) n += 1;
    if (to && to !== defaultBounds.to) n += 1;
    if (
      String(list.filters.year) !== DEFAULT_YEAR ||
      String(list.filters.month) !== DEFAULT_MONTH
    ) {
      n += 1;
    }
    return n;
  }, [list.filters, list.q]);

  const handleApplyFilters = (draft) => {
    const y = draft.year || DEFAULT_YEAR;
    const m = draft.month || DEFAULT_MONTH;
    const bounds = monthDateBounds(y, m);
    list.setFilters({
      year: String(y),
      month: String(m),
      from: draft.from || bounds.from,
      to: draft.to || bounds.to,
      department_id: draft.department_id || "",
      designation_id: draft.designation_id || "",
      employee_id: draft.employee_id || "",
      status: draft.status || "",
      open: draft.open || "",
      channel: draft.channel || "",
      auto_checked_out: draft.auto_checked_out || "",
      is_half_day: draft.is_half_day || "",
    });
  };

  const handleResetFilters = () => {
    list.setQ("");
    list.setFilters({
      year: DEFAULT_YEAR,
      month: DEFAULT_MONTH,
      from: DEFAULT_MONTH_BOUNDS.from,
      to: DEFAULT_MONTH_BOUNDS.to,
      department_id: "",
      designation_id: "",
      employee_id: "",
      status: "",
      open: "",
      channel: "",
      auto_checked_out: "",
      is_half_day: "",
    });
  };

  const handleRemoveFilter = (key) => {
    if (key === "q") {
      list.setQ("");
      return;
    }
    if (key === "from" || key === "to" || key === "year" || key === "month") {
      list.setFilters({
        ...list.filters,
        year: DEFAULT_YEAR,
        month: DEFAULT_MONTH,
        from: DEFAULT_MONTH_BOUNDS.from,
        to: DEFAULT_MONTH_BOUNDS.to,
      });
      return;
    }
    list.setFilter(key, "");
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const blob = await hrmsService.exportAttendanceReport({
        year: Number(year),
        month: Number(month),
        department_id: list.filters.department_id || undefined,
        designation_id: list.filters.designation_id || undefined,
        employee_id: list.filters.employee_id || undefined,
        q: list.q || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${year}-${String(month).padStart(2, "0")}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Export downloaded — matches month, department, employee and search filters");
    } catch (err) {
      toastErrorFromApi(err, "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const openShift = Boolean(myStatus?.open);
  const todayStatus = myStatus?.status || (openShift ? "IN" : "OUT");
  const onBreak = openShift && todayStatus === "BREAK_IN";
  const alreadyPunched = Boolean(myStatus?.already_punched_today);

  const punchState = {
    IN: {
      enabled: !openShift && !alreadyPunched,
      hint:
        alreadyPunched && !openShift
          ? "Already punched today — one shift per day."
          : "Start today's shift",
    },
    OUT: {
      enabled: openShift,
      hint: openShift ? "Close the open shift" : "Punch in first to start a shift.",
    },
    BREAK_IN: {
      enabled: openShift && !onBreak,
      hint: onBreak ? "Already on break." : openShift ? "Start a break" : "Punch in first to start a shift.",
    },
    BREAK_OUT: {
      enabled: onBreak,
      hint: onBreak ? "End the break and resume work" : "Start a break first.",
    },
  };

  const filterPanelValues = useMemo(
    () => ({ ...list.filters, q: list.q }),
    [list.filters, list.q]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Attendance"
        subtitle="Punch records, monthly totals and employee calendars — same clock as mobile Punch In/Out"
        actions={
          <div className="flex items-center gap-1.5">
            {canExport && (
              <Button
                size="sm"
                variant="outline"
                onClick={onExport}
                loading={exporting}
                title="Monthly attendance report for the selected month, department, employee and search filters"
              >
                <IconDownload className="size-4" /> Export
              </Button>
            )}
          </div>
        }
      >
        <div className="mb-1.5 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            compact
            icon={<IconUsers size={16} />}
            label="Present today"
            value={counts.present ?? "—"}
            accentColor="#00823b"
            subLabel="Distinct employees punched today"
            loading={countsLoading}
          />
          <StatCard
            compact
            icon={<IconFingerprint size={16} />}
            label="Open punches"
            value={counts.open ?? "—"}
            accentColor="#f37021"
            subLabel="Not punched out yet (today)"
            loading={countsLoading}
          />
          <StatCard
            compact
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
            <div className="flex min-w-0 items-center gap-2">
              <span className="rounded-md bg-primary/10 p-2 text-primary">
                <IconFingerprint className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">My punch</span>
                  <StatusBadge status={todayStatus} />
                  {onBreak ? <Badge variant="accent">On break</Badge> : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {myStatus?.attendance?.check_in_at
                    ? `Punched in at ${fmtTime(myStatus.attendance.check_in_at)} IST${
                        myStatus.attendance.check_out_at
                          ? ` · out at ${fmtTime(myStatus.attendance.check_out_at)} IST`
                          : " · shift still open"
                      }`
                    : openShift
                      ? "You have an open punch for today."
                      : "You are not punched in right now. Field staff use Punch In/Out on mobile — same clock."}
                </div>
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              {PUNCH_ACTIONS.map((action) => {
                const Icon = action.icon;
                const state = punchState[action.key];
                return (
                  <Button
                    key={action.key}
                    size="sm"
                    variant={action.variant}
                    disabled={!state.enabled || punching !== null}
                    loading={punching === action.key}
                    title={state.hint}
                    onClick={() => onPunch(action.key)}
                  >
                    <Icon className="h-4 w-4" /> {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <AttendanceFilterPanel
          values={filterPanelValues}
          quickSearch={list.q}
          yearOptions={YEAR_OPTIONS}
          monthOptions={MONTH_OPTIONS}
          activeCount={advancedActiveCount}
          onQuickSearch={(v) => list.setQ(v)}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onRemove={handleRemoveFilter}
          loadDepartments={(q) => hrmsService.searchHrmsDepartments(q)}
          loadDesignations={(q) => hrmsService.searchHrmsDesignations(q)}
          loadEmployees={(q, opts = {}) =>
            hrmsService.searchHrmsEmployees(q, {
              department_id: opts.department_id || undefined,
              designation_id: opts.designation_id || undefined,
            })
          }
          resolveDepartment={(id) => hrmsService.resolveHrmsDepartment(id)}
          resolveDesignation={(id) => hrmsService.resolveHrmsDesignation(id)}
          resolveEmployee={(id) => hrmsService.resolveHrmsEmployee(id)}
        />

        <Tabs
          value={view}
          onValueChange={(next) => {
            setView(next);
            list.setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="records">Punch records</TabsTrigger>
            <TabsTrigger value="summary">Monthly summary</TabsTrigger>
            <TabsTrigger value="calendar">Employee calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="mt-2">
            <div className="flex min-h-[320px] flex-1 flex-col">
              <PaginatedTable
                key={`records-${refreshKey}`}
                columns={recordColumns}
                fetcher={recordsFetcher}
                showSearch={false}
                height="100%"
                columnFilterValues={list.filters}
                filterParams={{ ...list.filters, q: list.q }}
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
                    icon={IconFingerprint}
                    title={
                      advancedActiveCount || list.q
                        ? "No punches match these filters"
                        : "No punches for this month"
                    }
                    description={
                      advancedActiveCount || list.q
                        ? "Try removing a filter chip or clearing the quick search."
                        : "Pick another month, clear the filters, or record your own punch above."
                    }
                  />
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="summary" className="mt-2">
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-foreground">
                Monthly totals by employee
              </h3>
              <p className="text-xs text-muted-foreground">
                Present, half days, late marks, holiday attendance and open punches for the
                selected month (distinct days) — filters and quick search apply here too.
              </p>
            </div>
            <div className="flex min-h-[320px] flex-1 flex-col">
              <PaginatedTable
                key={`summary-${refreshKey}`}
                columns={summaryColumns}
                fetcher={summaryFetcher}
                showSearch={false}
                height="100%"
                columnFilterValues={list.filters}
                filterParams={{ ...list.filters, q: list.q }}
                page={list.page}
                limit={list.limit}
                q={list.q}
                sortBy={list.sortBy}
                sortOrder={list.sortOrder}
                onPageChange={(zeroBased) => list.setPage(zeroBased + 1)}
                onRowsPerPageChange={list.setLimit}
                onQChange={list.setQ}
                onSortChange={list.setSort}
                initialSortBy="employee_name"
                initialSortOrder="asc"
                emptyState={
                  <EmptyState
                    icon={IconCalendarStats}
                    title={
                      advancedActiveCount || list.q
                        ? "No totals match these filters"
                        : "No attendance totals for this month"
                    }
                    description={
                      advancedActiveCount || list.q
                        ? "Try removing a filter chip or clearing the quick search."
                        : "Totals appear once punches are recorded for the selected month."
                    }
                  />
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-2">
            <AttendanceCalendar
              year={Number(year)}
              month={Number(month)}
              employeeId={list.filters.employee_id || null}
              refreshKey={refreshKey}
            />
          </TabsContent>
        </Tabs>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}