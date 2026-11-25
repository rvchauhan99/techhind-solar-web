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
} from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import AutocompleteField from "@/components/common/AutocompleteField";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const NOW = new Date();

const TYPE_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late mark" },
  { value: "half_day", label: "Half day" },
  { value: "absent", label: "Absent" },
  { value: "leave", label: "On leave" },
  { value: "lwp", label: "LWP" },
  { value: "holiday", label: "Holiday" },
  { value: "week_off", label: "Week off" },
  { value: "mis_punch", label: "Mis punch" },
];

const TYPE_LABELS = Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, o.label]));

const timeOf = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

export default function HrmsAttendanceReportPage() {
  const [year, setYear] = useState(String(NOW.getFullYear()));
  const [month, setMonth] = useState(String(NOW.getMonth() + 1));
  const [departmentId, setDepartmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [attendanceType, setAttendanceType] = useState("");
  const [search, setSearch] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const filters = useMemo(
    () => ({
      year: Number(year),
      month: Number(month),
      department_id: departmentId || undefined,
      employee_id: employeeId || undefined,
      attendance_type: attendanceType || undefined,
      q: search.trim() || undefined,
    }),
    [year, month, departmentId, employeeId, attendanceType, search]
  );

  const yearOptions = useMemo(
    () =>
      [NOW.getFullYear() - 1, NOW.getFullYear(), NOW.getFullYear() + 1].map((y) => ({
        value: String(y),
        label: String(y),
      })),
    []
  );
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: new Date(2000, i, 1).toLocaleString("en", { month: "short" }),
      })),
    []
  );
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await hrmsService.listAttendanceReport(filters);
      setSummary(unwrap(res)?.summary || null);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const summaryFetcher = useMemo(
    () =>
      async ({ page, limit }) => {
        const res = await hrmsService.listAttendanceReport(filters);
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
    [filters, tableKey]
  );

  const detailFetcher = useMemo(
    () =>
      async ({ page, limit }) => {
        const take = Math.min(100, Math.max(1, Number(limit) || 20));
        const pageNum = Math.max(1, Number(page) || 1);
        const res = await hrmsService.listAttendanceReport({
          ...filters,
          detail_page: pageNum,
          detail_limit: take,
        });
        const payload = unwrap(res);
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
    [filters, tableKey]
  );
  const columnFilterValues = useMemo(
    () => ({
      q: search,
      department_id: departmentId,
      employee_id: employeeId,
      attendance_type: attendanceType,
    }),
    [search, departmentId, employeeId, attendanceType]
  );

  const onColumnFilterChange = useCallback((key, value) => {
    if (key === "attendance_type") setAttendanceType(value || "");
    else if (key === "q") setSearch(value || "");
    setTableKey((k) => k + 1);
  }, []);

  const bumpFilters = () => setTableKey((k) => k + 1);

  const summaryColumns = useMemo(
    () => [
      {
        field: "employee_name",
        label: "Employee",
        sortable: false,
        filterType: "text",
        filterKey: "q",
        defaultFilterOperator: "contains",
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
      { field: "week_off_days", label: "Week off", sortable: false },
      { field: "holiday_days", label: "Holiday", sortable: false },
      { field: "late_marks", label: "Late", sortable: false },
      { field: "half_days", label: "Half", sortable: false },
      { field: "absent_days", label: "Absent", sortable: false },
      { field: "leave_days", label: "Leave", sortable: false },
      { field: "lwp_days", label: "LWP", sortable: false },
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
      { field: "date", label: "Date", sortable: false },
      {
        field: "attendance_type",
        label: "Type",
        sortable: false,
        filterType: "select",
        filterKey: "attendance_type",
        filterOptions: TYPE_OPTIONS,
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
      const blob = await hrmsService.exportAttendanceReport(filters);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-report-${year}-${String(month).padStart(2, "0")}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Export downloaded — matches the selected filters");
    } catch (err) {
      toastErrorFromApi(err, "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Attendance Report"
        subtitle="Monthly employee-wise attendance — present, leave, late, half-day, holiday, absence and working-hour totals"
        actions={
          <Button size="sm" variant="outline" onClick={onExport} loading={busy}>
            <IconDownload className="size-4" /> Export
          </Button>
        }
        filterConfig={[
          { key: "year", label: "Year", type: "select", options: yearOptions },
          { key: "month", label: "Month", type: "select", options: monthOptions },
        ]}
        filterValues={{ year, month }}
        showFilterLabels
        onFilterChange={(key, value) => {
          if (key === "year") setYear(value || String(NOW.getFullYear()));
          else if (key === "month") setMonth(value || String(NOW.getMonth() + 1));
          setTableKey((k) => k + 1);
        }}
        onClearFilters={() => {
          setYear(String(NOW.getFullYear()));
          setMonth(String(NOW.getMonth() + 1));
          setDepartmentId("");
          setEmployeeId("");
          setAttendanceType("");
          setSearch("");
          setTableKey((k) => k + 1);
        }}
      >
        <div className="mb-2 rounded-md border border-border bg-card p-2">
          <FormGrid cols={3}>
            <FormField>
              <AutocompleteField
                label="Department"
                placeholder="Type to search…"
                asyncLoadOptions={(q) => hrmsService.searchHrmsDepartments(q)}
                resolveOptionById={(did) => hrmsService.resolveHrmsDepartment(did)}
                getOptionLabel={(o) => o?.label ?? o?.title ?? ""}
                value={departmentId || null}
                onChange={(_e, opt) => {
                  setDepartmentId(opt?.id != null ? String(opt.id) : "");
                  setEmployeeId("");
                  bumpFilters();
                }}
              />
            </FormField>
            <FormField>
              <AutocompleteField
                label="Employee"
                placeholder="Type to search…"
                asyncLoadOptions={(q) =>
                  hrmsService.searchHrmsEmployees(q, {
                    department_id: departmentId || undefined,
                  })
                }
                resolveOptionById={(eid) => hrmsService.resolveHrmsEmployee(eid)}
                getOptionLabel={(o) => o?.label ?? ""}
                value={employeeId || null}
                onChange={(_e, opt) => {
                  setEmployeeId(opt?.id != null ? String(opt.id) : "");
                  bumpFilters();
                }}
              />
            </FormField>
          </FormGrid>
        </div>
        <div className="mb-1.5 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            compact
            icon={<IconUsers size={16} />}
            label="Employees"
            value={summary?.employees ?? "—"}
            accentColor="#1b365d"
            subLabel="Matching filters"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconUserCheck size={16} />}
            label="Present days"
            value={summary?.present_days ?? "—"}
            accentColor="#00823b"
            subLabel="Worked days"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconClockExclamation size={16} />}
            label="Late marks"
            value={summary?.late_marks ?? "—"}
            accentColor="#f37021"
            subLabel="After shift grace"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconCalendarStats size={16} />}
            label="Half days"
            value={summary?.half_days ?? "—"}
            accentColor="#7c3aed"
            subLabel="Short / half-day leave"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconCalendarOff size={16} />}
            label="Absent days"
            value={summary?.absent_days ?? "—"}
            accentColor="#dc2626"
            subLabel="No punch, no leave"
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

        <div className="flex min-h-[320px] flex-1 flex-col">
          <PaginatedTable
            key={`summary-${tableKey}`}
            columns={summaryColumns}
            fetcher={summaryFetcher}
            showSearch={false}
            height="100%"
            columnFilterValues={columnFilterValues}
            onColumnFilterChange={onColumnFilterChange}
            filterParams={columnFilterValues}
            initialSortBy="employee_name"
            initialSortOrder="asc"
            emptyState={
              <EmptyState
                icon={IconUsers}
                title="No attendance rows"
                description="No employees or punches match the selected month and filters."
              />
            }
          />
        </div>

        <div className="mt-6 shrink-0">
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-foreground">
              Daily punch &amp; exception detail
            </h3>
            <p className="text-xs text-muted-foreground">
              Punch days plus absent, leave and LWP days for the selected month (the export matches
              these filters).
            </p>
          </div>
          <PaginatedTable
            key={`detail-${tableKey}`}
            columns={detailColumns}
            fetcher={detailFetcher}
            showSearch={false}
            height="40vh"
            columnFilterValues={columnFilterValues}
            onColumnFilterChange={onColumnFilterChange}
            filterParams={columnFilterValues}
            emptyState={
              <EmptyState
                icon={IconFileSpreadsheet}
                title="No daily rows"
                description="No punches or exceptions for the selected filters."
              />
            }
          />
        </div>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
