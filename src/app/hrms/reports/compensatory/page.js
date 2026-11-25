"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import {
  IconArrowsExchange,
  IconClock,
  IconCalendarStats,
  IconDownload,
} from "@tabler/icons-react";
import { fyYearSelectOptions, currentFyYear } from "@/components/common/hrmsFilterDates";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import CompensatoryReportFilterPanel from "./components/CompensatoryReportFilterPanel";

const DEFAULT_FY = currentFyYear();

const EMPTY_FILTERS = {
  fy_year: DEFAULT_FY,
  status: "",
  employee_id: "",
  worked_date: "",
  leave_date: "",
};

function buildApiParams(filters, q) {
  const params = {};
  if (filters.fy_year) params.fy_year = filters.fy_year;
  if (filters.status) params.status = filters.status;
  if (filters.employee_id) params.employee_id = filters.employee_id;
  if (filters.worked_date) params.worked_date = filters.worked_date;
  if (filters.leave_date) params.leave_date = filters.leave_date;
  if (q?.trim()) params.q = q.trim();
  return params;
}

export default function HrmsCompensatoryReportPage() {
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [q, setQ] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState({ rows: null, totalDays: null });
  const [summaryLoading, setSummaryLoading] = useState(true);

  const fyYearOptions = useMemo(() => fyYearSelectOptions(), []);
  const apiParams = useMemo(() => buildApiParams(filters, q), [filters, q]);
  const filterPanelValues = useMemo(() => ({ ...filters, q }), [filters, q]);

  const advancedActiveCount = useMemo(() => {
    const keys = ["status", "employee_id", "worked_date", "leave_date"];
    let n = keys.filter((k) => String(filters[k] ?? "").trim() !== "").length;
    if (q.trim()) n += 1;
    if (filters.fy_year && String(filters.fy_year) !== DEFAULT_FY) n += 1;
    return n;
  }, [filters, q]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await hrmsService.getCompensatoryReport(apiParams);
      const s = unwrap(res)?.summary;
      setSummary({ rows: s?.rows ?? 0, totalDays: s?.totalDays ?? 0 });
    } catch {
      setSummary({ rows: null, totalDays: null });
    } finally {
      setSummaryLoading(false);
    }
  }, [apiParams]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleApplyFilters = (next) => {
    setFilters((prev) => ({
      ...prev,
      ...next,
      fy_year: next.fy_year || prev.fy_year || DEFAULT_FY,
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
    if (key === "fy_year") {
      setFilters((prev) => ({ ...prev, fy_year: DEFAULT_FY }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: "" }));
    }
    setTableKey((k) => k + 1);
  };

  const fetcher = useMemo(
    () =>
      async (params) => {
        const res = await hrmsService.getCompensatoryReport(apiParams);
        const payload = unwrap(res);
        const rows = payload?.data || [];
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
          summary: payload?.summary,
        };
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiParams, tableKey]
  );

  const onExport = async () => {
    setBusy(true);
    try {
      const blob = await hrmsService.exportCompensatoryReport(apiParams);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `compensatory-FY${filters.fy_year || "all"}.xlsx`;
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
        field: "employee_name",
        label: "Employee",
        sortable: false,
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.employee_name || "—"}</span>
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
      { field: "worked_date", label: "Worked on", sortable: true },
      { field: "requested_leave_date", label: "Leave on", sortable: true },
      {
        field: "number_of_days",
        label: "Days",
        sortable: true,
        render: (row) => <span className="tabular-nums">{Number(row.number_of_days || 0)}</span>,
      },
      {
        field: "hours_worked",
        label: "Hours",
        sortable: true,
        render: (row) => <span className="tabular-nums">{Number(row.hours_worked || 0)}</span>,
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        field: "decision_note",
        label: "Decision note",
        sortable: false,
        render: (row) => (
          <span className="text-xs text-muted-foreground">{row.decision_note || "—"}</span>
        ),
      },
    ],
    []
  );

  const fyLabel =
    fyYearOptions.find((o) => o.value === filters.fy_year)?.label ||
    `${filters.fy_year}–${Number(filters.fy_year) + 1}`;

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Compensatory Report"
        subtitle="Approved and requested comp-off for the financial year (Apr–Mar)"
        actions={
          <Button size="sm" variant="outline" onClick={onExport} loading={busy}>
            <IconDownload className="size-4" /> Export
          </Button>
        }
      >
        <CompensatoryReportFilterPanel
          values={filterPanelValues}
          quickSearch={q}
          fyYearOptions={fyYearOptions}
          activeCount={advancedActiveCount}
          defaultOpen={false}
          onQuickSearch={(v) => {
            setQ(v || "");
            setTableKey((k) => k + 1);
          }}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onRemove={handleRemoveFilter}
          loadEmployees={(query) => hrmsService.searchHrmsEmployees(query)}
          resolveEmployee={(id) => hrmsService.resolveHrmsEmployee(id)}
        />

        <div className="mb-1.5 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            compact
            icon={<IconArrowsExchange size={16} />}
            label="Rows"
            value={summary.rows ?? "—"}
            accentColor="#1b365d"
            subLabel="Matching the filters"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconClock size={16} />}
            label="Total days"
            value={summary.totalDays ?? "—"}
            accentColor="#00823b"
            subLabel="Comp-off days in the selection"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconCalendarStats size={16} />}
            label="Financial year"
            value={fyLabel || "—"}
            accentColor="#f37021"
            subLabel={filters.status ? `Status: ${filters.status}` : "All statuses"}
          />
        </div>

        <div className="flex min-h-[320px] flex-1 flex-col">
          <PaginatedTable
            key={tableKey}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            height="100%"
            initialSortBy="worked_date"
            initialSortOrder="desc"
            emptyState={
              <EmptyState
                icon={IconArrowsExchange}
                title="No compensatory records"
                description="No comp-off was recorded for this financial year and status."
              />
            }
          />
        </div>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}