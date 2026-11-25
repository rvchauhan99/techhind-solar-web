"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  IconDownload,
  IconUsers,
  IconUserCheck,
  IconClockExclamation,
  IconCalendarStats,
  IconCalendarOff,
  IconFileSpreadsheet,
  IconBeach,
  IconAlertTriangle,
  IconCoffee,
  IconLogout,
  IconHeartbeat,
} from "@tabler/icons-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { monthDateBounds } from "@/components/common/hrmsFilterDates";
import AttendanceReportFilterPanel, {
  ATTENDANCE_REPORT_TYPE_OPTIONS,
} from "./components/AttendanceReportFilterPanel";

const NOW = new Date();
const DEFAULT_YEAR = String(NOW.getFullYear());
const DEFAULT_MONTH = String(NOW.getMonth() + 1);
const DEFAULT_BOUNDS = monthDateBounds(DEFAULT_YEAR, DEFAULT_MONTH);

const YEAR_OPTIONS = [NOW.getFullYear() - 1, NOW.getFullYear(), NOW.getFullYear() + 1].map((y) => ({
  value: String(y),
  label: String(y),
}));
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2000, i, 1).toLocaleString("en", { month: "short" }),
}));

const TYPE_LABELS = Object.fromEntries(ATTENDANCE_REPORT_TYPE_OPTIONS.map((o) => [o.value, o.label]));

const IST = { timeZone: "Asia/Kolkata" };

const EMPTY_FILTERS = {
  year: DEFAULT_YEAR,
  month: DEFAULT_MONTH,
  from: DEFAULT_BOUNDS.from,
  to: DEFAULT_BOUNDS.to,
  department_id: "",
  designation_id: "",
  employee_id: "",
  attendance_type: "",
};

function buildApiParams(filters, q) {
  const params = {
    year: Number(filters.year) || Number(DEFAULT_YEAR),
    month: Number(filters.month) || Number(DEFAULT_MONTH),
  };
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (q?.trim()) params.q = q.trim();
  if (filters.department_id) params.department_id = filters.department_id;
  if (filters.designation_id) params.designation_id = filters.designation_id;
  if (filters.employee_id) params.employee_id = filters.employee_id;
  if (filters.attendance_type) params.attendance_type = filters.attendance_type;
  return params;
}

const fmtDate = (value) => {
  if (!value) return "—";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00+05:30`);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...IST,
    });
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...IST,
  });
};

const timeOf = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", ...IST });
};

export default function HrmsAttendanceReportPage() {
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [q, setQ] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [tab, setTab] = useState("summary");

  const apiParams = useMemo(() => buildApiParams(filters, q), [filters, q]);

  const filterPanelValues = useMemo(() => ({ ...filters, q }), [filters, q]);

  const advancedActiveCount = useMemo(() => {
    const keys = ["department_id", "designation_id", "employee_id", "attendance_type"];
    let n = keys.filter((k) => String(filters[k] ?? "").trim() !== "").length;
    if (q.trim()) n += 1;
    if (String(filters.year) !== DEFAULT_YEAR || String(filters.month) !== DEFAULT_MONTH) n += 1;
    if (
      filters.from &&
      filters.to &&
      (filters.from !== DEFAULT_BOUNDS.from || filters.to !== DEFAULT_BOUNDS.to)
    ) {
      n += 1;
    }
    return n;
  }, [filters, q]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await hrmsService.listAttendanceReport(apiParams);
      setSummary(unwrap(res)?.summary || null);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [apiParams]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleApplyFilters = (next) => {
    const year = next.year || DEFAULT_YEAR;
    const month = next.month || DEFAULT_MONTH;
    const bounds = monthDateBounds(year, month);
    setFilters({
      year: String(year),
      month: String(month),
      from: next.from || bounds.from,
      to: next.to || bounds.to,
      department_id: next.department_id || "",
      designation_id: next.designation_id || "",
      employee_id: next.employee_id || "",
      attendance_type: next.attendance_type || "",
    });
    setTableKey((k) => k + 1);
  };

  const handleResetFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setQ("");
    setTableKey((k) => k + 1);
  };

  const handleRemoveFilter = (key) => {
    if (key === "q") {
      setQ("");
      setTableKey((k) => k + 1);
      return;
    }
    if (key === "year" || key === "month" || key === "from" || key === "to") {
      setFilters((prev) => ({
        ...prev,
        year: DEFAULT_YEAR,
        month: DEFAULT_MONTH,
        from: DEFAULT_BOUNDS.from,
        to: DEFAULT_BOUNDS.to,
      }));
      setTableKey((k) => k + 1);
      return;
    }
    setFilters((prev) => ({ ...prev, [key]: "" }));
    setTableKey((k) => k + 1);
  };

  const summaryFetcher = useMemo(
    () =>
      async ({ page, limit }) => {
        const res = await hrmsService.listAttendanceReport(apiParams);
        const payload = unwrap(res);
        if (payload?.summary) setSummary(payload.summary);
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
    [apiParams, tableKey]
  );

  const detailFetcher = useMemo(
    () =>
      async ({ page, limit }) => {
        const take = Math.min(100, Math.max(1, Number(limit) || 20));
        const pageNum = Math.max(1, Number(page) || 1);
        const res = await hrmsService.listAttendanceReport({
          ...apiParams,
          detail_page: pageNum,
          detail_limit: take,
        });
        const payload = unwrap(res);
        if (payload?.summary) setSummary(payload.summary);
        const meta = payload?.detail_meta || {};
        return {
          data: payload?.detail || [],
          meta: {
            total: Number(meta.total || 0),
            page: Number(meta.page || pageNum),
            pages: Number(meta.pages || 1),
            limit: Number(meta.limit || take),
          },
        };
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiParams, tableKey]
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
            {row.emp_code ? (
              <span className="text-xs text-muted-foreground">{row.emp_code}</span>
            ) : null}
          </div>
        ),
      },
      {
        field: "department_title",
        label: "Department",
        sortable: false,
        render: (row) => <span>{row.department_title || "—"}</span>,
      },
      { field: "present_days", label: "Present", sortable: false },
      { field: "late_marks", label: "Late", sortable: false },
      { field: "half_days", label: "Half", sortable: false },
      { field: "absent_days", label: "Absent", sortable: false },
      { field: "leave_days", label: "Leave", sortable: false },
      { field: "lwp_days", label: "LWP", sortable: false },
      { field: "cl_days", label: "CL", sortable: false },
      { field: "sl_days", label: "SL", sortable: false },
      { field: "holiday_days", label: "Holiday", sortable: false },
      { field: "week_off_days", label: "Week off", sortable: false },
      { field: "open_punches", label: "Open", sortable: false },
      { field: "mis_punch_days", label: "Mis punch", sortable: false },
      {
        field: "working_hours",
        label: "Hours",
        sortable: false,
        render: (row) => (
          <span className="tabular-nums">{Number(row.working_hours || 0).toFixed(2)}</span>
        ),
      },
    ],
    []
  );

  const detailColumns = useMemo(
    () => [
      {
        field: "employee_name",
        label: "Employee",
        sortable: false,
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
        field: "date",
        label: "Date",
        sortable: false,
        render: (row) => <span>{fmtDate(row.date)}</span>,
      },
      {
        field: "attendance_type",
        label: "Type",
        sortable: false,
        render: (row) => (
          <StatusBadge
            status={row.attendance_type}
            label={TYPE_LABELS[row.attendance_type] || row.attendance_type}
          />
        ),
      },
      {
        field: "check_in_at",
        label: "In",
        sortable: false,
        render: (row) => <span>{timeOf(row.check_in_at)}</span>,
      },
      {
        field: "check_out_at",
        label: "Out",
        sortable: false,
        render: (row) => <span>{timeOf(row.check_out_at)}</span>,
      },
      {
        field: "working_hours",
        label: "Hours",
        sortable: false,
        render: (row) => (
          <span className="tabular-nums">{Number(row.working_hours || 0).toFixed(2)}</span>
        ),
      },
      {
        field: "leave_type",
        label: "Leave type",
        sortable: false,
        render: (row) => <span>{row.leave_type || "—"}</span>,
      },
    ],
    []
  );

  const onExport = async () => {
    setBusy(true);
    try {
      const blob = await hrmsService.exportAttendanceReport(apiParams);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-report-${filters.year}-${String(filters.month).padStart(2, "0")}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Export downloaded — matches the selected filters");
    } catch (err) {
      toastErrorFromApi(err, "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const periodLabel =
    filters.from && filters.to ? `${fmtDate(filters.from)} – ${fmtDate(filters.to)}` : "Selected period";

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Attendance Report"
        subtitle="Premium monthly attendance — KPIs, employee summary, and daily punch detail for the applied filters"
        actions={
          <Button size="sm" variant="outline" onClick={onExport} loading={busy}>
            <IconDownload className="size-4" /> Export
          </Button>
        }
      >
        <AttendanceReportFilterPanel
          values={filterPanelValues}
          quickSearch={q}
          yearOptions={YEAR_OPTIONS}
          monthOptions={MONTH_OPTIONS}
          activeCount={advancedActiveCount}
          onQuickSearch={(v) => {
            setQ(v || "");
            setTableKey((k) => k + 1);
          }}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onRemove={handleRemoveFilter}
          loadDepartments={(query) => hrmsService.searchHrmsDepartments(query)}
          loadDesignations={(query) => hrmsService.searchHrmsDesignations(query)}
          loadEmployees={(query, opts = {}) =>
            hrmsService.searchHrmsEmployees(query, {
              department_id: opts.department_id || undefined,
              designation_id: opts.designation_id || undefined,
            })
          }
          resolveDepartment={(id) => hrmsService.resolveHrmsDepartment(id)}
          resolveDesignation={(id) => hrmsService.resolveHrmsDesignation(id)}
          resolveEmployee={(id) => hrmsService.resolveHrmsEmployee(id)}
        />

        <div className="mb-1.5 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <StatCard
            compact
            icon={<IconUsers size={16} />}
            label="Employees"
            value={summary?.employees ?? "—"}
            accentColor="#1b365d"
            subLabel={periodLabel}
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconUserCheck size={16} />}
            label="Present"
            value={summary?.present_days ?? "—"}
            accentColor="#00823b"
            subLabel="Worked days"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconClockExclamation size={16} />}
            label="Late"
            value={summary?.late_marks ?? "—"}
            accentColor="#f37021"
            subLabel="After grace"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconCalendarStats size={16} />}
            label="Half day"
            value={summary?.half_days ?? "—"}
            accentColor="#7c3aed"
            subLabel="Short / half leave"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconCalendarOff size={16} />}
            label="Absent"
            value={summary?.absent_days ?? "—"}
            accentColor="#dc2626"
            subLabel="No punch / leave"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconBeach size={16} />}
            label="Leave"
            value={summary?.leave_days ?? "—"}
            accentColor="#0d9488"
            subLabel="Approved leave"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconAlertTriangle size={16} />}
            label="LWP"
            value={summary?.lwp_days ?? "—"}
            accentColor="#b45309"
            subLabel="Leave without pay"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconCoffee size={16} />}
            label="CL"
            value={summary?.cl_days ?? "—"}
            accentColor="#2563eb"
            subLabel="Casual leave"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconHeartbeat size={16} />}
            label="SL"
            value={summary?.sl_days ?? "—"}
            accentColor="#db2777"
            subLabel="Sick leave"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconCalendarOff size={16} />}
            label="Holiday"
            value={summary?.holiday_days ?? "—"}
            accentColor="#64748b"
            subLabel="Calendar holiday"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconCalendarStats size={16} />}
            label="Week off"
            value={summary?.week_off_days ?? "—"}
            accentColor="#475569"
            subLabel="Weekly off"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconLogout size={16} />}
            label="Open punches"
            value={summary?.open_punches ?? "—"}
            accentColor="#ea580c"
            subLabel="Not punched out"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconAlertTriangle size={16} />}
            label="Mis punch"
            value={summary?.mis_punch_days ?? "—"}
            accentColor="#c026d3"
            subLabel="Policy exceptions"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconFileSpreadsheet size={16} />}
            label="Working hours"
            value={summary ? Number(summary.working_hours || 0).toFixed(2) : "—"}
            accentColor="#0891b2"
            subLabel="Net of breaks"
            loading={summaryLoading}
          />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mb-2 w-fit">
            <TabsTrigger value="summary">Employee summary</TabsTrigger>
            <TabsTrigger value="detail">Daily detail</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-0 flex min-h-[360px] flex-1 flex-col">
            <PaginatedTable
              key={`summary-${tableKey}`}
              columns={summaryColumns}
              fetcher={summaryFetcher}
              showSearch={false}
              height="100%"
              initialSortBy="employee_name"
              initialSortOrder="asc"
              emptyState={
                <EmptyState
                  icon={IconUsers}
                  title="No attendance rows"
                  description="No employees match the selected dates and filters. Adjust Advanced Filters or Reset to this month."
                />
              }
            />
          </TabsContent>

          <TabsContent value="detail" className="mt-0 flex min-h-[360px] flex-1 flex-col">
            <p className="mb-1.5 text-xs text-muted-foreground">
              Daily punches and exceptions for {periodLabel}. Export matches these filters.
            </p>
            <PaginatedTable
              key={`detail-${tableKey}`}
              columns={detailColumns}
              fetcher={detailFetcher}
              showSearch={false}
              height="100%"
              emptyState={
                <EmptyState
                  icon={IconFileSpreadsheet}
                  title="No daily rows"
                  description="No punches or exceptions for the selected date range and filters."
                />
              }
            />
          </TabsContent>
        </Tabs>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
