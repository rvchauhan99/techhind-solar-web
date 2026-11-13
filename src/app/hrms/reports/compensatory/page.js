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
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const FY_CURRENT = (() => {
  const now = new Date();
  return now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
})();

export default function HrmsCompensatoryReportPage() {
  const [filters, setFilters] = useState({ fy_year: String(FY_CURRENT), status: "" });
  const [tableKey, setTableKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState({ rows: null, totalDays: null });
  const [summaryLoading, setSummaryLoading] = useState(true);

  const fyOptions = useMemo(
    () =>
      [FY_CURRENT - 1, FY_CURRENT, FY_CURRENT + 1].map((y) => ({
        value: String(y),
        label: `FY ${y}-${String((y + 1) % 100).padStart(2, "0")}`,
      })),
    []
  );

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await hrmsService.getCompensatoryReport({
        fy_year: filters.fy_year || undefined,
        status: filters.status || undefined,
      });
      const s = unwrap(res)?.summary;
      setSummary({ rows: s?.rows ?? 0, totalDays: s?.totalDays ?? 0 });
    } catch {
      setSummary({ rows: null, totalDays: null });
    } finally {
      setSummaryLoading(false);
    }
  }, [filters.fy_year, filters.status]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const fetcher = useMemo(
    () =>
      async ({ page, limit }) => {
        const res = await hrmsService.getCompensatoryReport({
          fy_year: filters.fy_year || undefined,
          status: filters.status || undefined,
        });
        const payload = unwrap(res);
        const rows = payload?.data || [];
        // The report endpoint is not paginated server-side; page locally so the
        // shared table contract (data + meta) still holds.
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
          summary: payload?.summary,
        };
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, tableKey]
  );

  const onExport = async () => {
    setBusy(true);
    try {
      const blob = await hrmsService.exportCompensatoryReport({
        fy_year: filters.fy_year || undefined,
        status: filters.status || undefined,
      });
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
        filterConfig={[
          { key: "fy_year", label: "Financial year", type: "select", options: fyOptions },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "approved", label: "Approved" },
              { value: "pending", label: "Pending" },
              { value: "rejected", label: "Rejected" },
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
          setFilters({ fy_year: String(FY_CURRENT), status: "" });
          setTableKey((k) => k + 1);
        }}
      >
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            icon={<IconArrowsExchange size={16} />}
            label="Rows"
            value={summary.rows ?? "—"}
            accentColor="#1b365d"
            subLabel="Matching the filters"
            loading={summaryLoading}
          />
          <StatCard
            icon={<IconClock size={16} />}
            label="Total days"
            value={summary.totalDays ?? "—"}
            accentColor="#00823b"
            subLabel="Comp-off days in the selection"
            loading={summaryLoading}
          />
          <StatCard
            icon={<IconCalendarStats size={16} />}
            label="Financial year"
            value={fyOptions.find((o) => o.value === filters.fy_year)?.label || "—"}
            accentColor="#f37021"
            subLabel={filters.status ? `Status: ${filters.status}` : "All statuses"}
          />
        </div>

        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          height="58vh"
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
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
