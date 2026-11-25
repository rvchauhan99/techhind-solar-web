"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  IconDownload,
  IconCalendarOff,
  IconClockExclamation,
  IconCircleCheck,
  IconAlertTriangle,
  IconFileSpreadsheet,
  IconSum,
} from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import LeaveReportFilterPanel, {
  monthDateBounds,
  LEAVE_DURATION_OPTIONS,
} from "./components/LeaveReportFilterPanel";

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

const EMPTY_FILTERS = {
  year: DEFAULT_YEAR,
  month: DEFAULT_MONTH,
  from: DEFAULT_BOUNDS.from,
  to: DEFAULT_BOUNDS.to,
  end_from: "",
  end_to: "",
  created_from: "",
  created_to: "",
  department_id: "",
  designation_id: "",
  employee_id: "",
  leave_type_id: "",
  status: "",
  is_emergency: "",
  is_lwp: "",
  duration: "",
  level1_status: "",
  level2_status: "",
  is_reverted_by_attendance: "",
};

const DURATION_LABELS = Object.fromEntries(
  LEAVE_DURATION_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label])
);

function buildApiParams(filters, q) {
  const params = {};
  if (q?.trim()) params.q = q.trim();
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.end_from) params.end_from = filters.end_from;
  if (filters.end_to) params.end_to = filters.end_to;
  if (filters.created_from) params.created_from = filters.created_from;
  if (filters.created_to) params.created_to = filters.created_to;
  if (filters.department_id) params.department_id = filters.department_id;
  if (filters.designation_id) params.designation_id = filters.designation_id;
  if (filters.employee_id) params.employee_id = filters.employee_id;
  if (filters.leave_type_id) params.leave_type_id = filters.leave_type_id;
  if (filters.status) params.status = filters.status;
  if (filters.is_emergency !== "" && filters.is_emergency != null) {
    params.is_emergency = filters.is_emergency;
  }
  if (filters.is_lwp !== "" && filters.is_lwp != null) params.is_lwp = filters.is_lwp;
  if (filters.duration) params.duration = filters.duration;
  if (filters.level1_status) params.level1_status = filters.level1_status;
  if (filters.level2_status) params.level2_status = filters.level2_status;
  if (filters.is_reverted_by_attendance !== "" && filters.is_reverted_by_attendance != null) {
    params.is_reverted_by_attendance = filters.is_reverted_by_attendance;
  }
  return params;
}

export default function HrmsLeaveReportPage() {
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [q, setQ] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const apiParams = useMemo(() => buildApiParams(filters, q), [filters, q]);

  const filterPanelValues = useMemo(
    () => ({
      ...filters,
      q,
    }),
    [filters, q]
  );

  const advancedActiveCount = useMemo(() => {
    const keys = [
      "department_id",
      "designation_id",
      "employee_id",
      "leave_type_id",
      "status",
      "is_emergency",
      "is_lwp",
      "duration",
      "level1_status",
      "level2_status",
      "is_reverted_by_attendance",
      "end_from",
      "end_to",
      "created_from",
      "created_to",
    ];
    let n = keys.filter((k) => String(filters[k] ?? "").trim() !== "").length;
    if (q.trim()) n += 1;
    if (filters.from && filters.from !== DEFAULT_BOUNDS.from) n += 1;
    if (filters.to && filters.to !== DEFAULT_BOUNDS.to) n += 1;
    if (String(filters.year) !== DEFAULT_YEAR || String(filters.month) !== DEFAULT_MONTH) {
      n += 1;
    }
    return n;
  }, [filters, q]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await hrmsService.listLeaveReport({ ...apiParams, page: 1, limit: 1 });
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

  const fetcher = useMemo(
    () => async (params) => {
      const res = await hrmsService.listLeaveReport({
        ...apiParams,
        page: params.page,
        limit: params.limit,
      });
      const payload = unwrap(res);
      if (payload?.summary) setSummary(payload.summary);
      const rows = payload?.data || [];
      const meta = payload?.meta || {
        total: rows.length,
        page: 1,
        pages: 1,
        limit: params.limit || 20,
      };
      return { data: rows, meta };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiParams, tableKey]
  );

  const handleApplyFilters = (next) => {
    setFilters((prev) => ({
      ...prev,
      ...next,
      year: next.year || prev.year,
      month: next.month || prev.month,
    }));
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
    if (key === "from" || key === "to" || key === "year" || key === "month") {
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

  const onExport = async () => {
    setBusy(true);
    try {
      const blob = await hrmsService.exportLeaveReport(apiParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leave-report-${filters.from || "all"}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Export downloaded — matches the selected filters");
    } catch (err) {
      toastErrorFromApi(err, "Export failed");
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
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {row.user?.name || `User #${row.user_id}`}
            </span>
            {row.employee?.emp_code ? (
              <span className="text-xs text-muted-foreground">{row.employee.emp_code}</span>
            ) : null}
          </div>
        ),
      },
      {
        field: "department",
        label: "Department",
        sortable: false,
        render: (row) => (
          <span>{row.employee?.department?.title || "—"}</span>
        ),
      },
      {
        field: "leaveType",
        label: "Type",
        sortable: false,
        render: (row) => row.leaveType?.title || row.leave_type_id || "—",
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
      {
        field: "duration",
        label: "Duration",
        sortable: false,
        render: (row) => (
          <span>{DURATION_LABELS[row.duration] || row.duration || "—"}</span>
        ),
      },
      {
        field: "days",
        label: "Days",
        sortable: false,
        render: (row) => (
          <span className="tabular-nums">{Number(row.days || 0).toFixed(1)}</span>
        ),
      },
      {
        field: "kind",
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
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        field: "reason",
        label: "Reason",
        sortable: false,
        render: (row) => (
          <span className="line-clamp-2 max-w-[220px] text-xs text-muted-foreground" title={row.reason || ""}>
            {row.reason || "—"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Leave Report"
        subtitle="Every leave application — filter by period, org, type, status and export matching Excel"
        actions={
          <Button size="sm" variant="outline" onClick={onExport} loading={busy}>
            <IconDownload className="size-4" /> Export
          </Button>
        }
      >
        <LeaveReportFilterPanel
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
          loadLeaveTypes={(query) => hrmsService.searchHrmsLeaveTypes(query)}
          resolveDepartment={(id) => hrmsService.resolveHrmsDepartment(id)}
          resolveDesignation={(id) => hrmsService.resolveHrmsDesignation(id)}
          resolveEmployee={(id) => hrmsService.resolveHrmsEmployee(id)}
          resolveLeaveType={(id) => hrmsService.resolveHrmsLeaveType(id)}
        />

        <div className="mb-1.5 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            compact
            icon={<IconClockExclamation size={16} />}
            label="Pending L1"
            value={summary?.pending_l1 ?? "—"}
            accentColor="#f37021"
            subLabel="Awaiting manager"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconClockExclamation size={16} />}
            label="Pending L2"
            value={summary?.pending_l2 ?? "—"}
            accentColor="#1b365d"
            subLabel="Awaiting HR"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconCircleCheck size={16} />}
            label="Approved"
            value={summary?.approved ?? "—"}
            accentColor="#00823b"
            subLabel="In selected scope"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconAlertTriangle size={16} />}
            label="Emergency"
            value={summary?.emergency ?? "—"}
            accentColor="#dc2626"
            subLabel="Urgent applications"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconCalendarOff size={16} />}
            label="LWP"
            value={summary?.lwp ?? "—"}
            accentColor="#7c3aed"
            subLabel="Leave without pay"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconSum size={16} />}
            label="Leave days"
            value={summary != null ? Number(summary.days || 0).toFixed(1) : "—"}
            accentColor="#0891b2"
            subLabel={`${summary?.total ?? "—"} applications`}
            loading={summaryLoading}
          />
        </div>

        <div className="flex min-h-[320px] flex-1 flex-col">
          <PaginatedTable
            key={tableKey}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            height="100%"
            emptyState={
              <EmptyState
                icon={IconFileSpreadsheet}
                title={
                  advancedActiveCount
                    ? "No leave rows for these filters"
                    : "No leave applications this month"
                }
                description={
                  advancedActiveCount
                    ? "Clear a filter chip or widen the date range."
                    : "Pick another month or apply leave from the Leaves screen."
                }
              />
            }
          />
        </div>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
