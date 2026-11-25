"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconHistory } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import { unwrap } from "@/lib/apiUnwrap";
import { currentMonthKey } from "@/components/common/hrmsFilterDates";
import * as hrmsService from "@/services/hrmsService";
import PayrollRunsFilterPanel from "./components/PayrollRunsFilterPanel";

const DEFAULT_MONTH = currentMonthKey();

const EMPTY_FILTERS = {
  month: DEFAULT_MONTH,
  status: "",
};

function payrollRunMatchesQ(row, search) {
  const needle = String(search || "").trim().toLowerCase();
  if (!needle) return true;
  const hay = [row.id, row.trigger, row.status, row.salary_month, row.note]
    .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

function monthOptions() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en", { month: "short", year: "numeric" }),
    };
  });
}

export default function PayrollRunsPage() {
  const router = useRouter();
  const months = useMemo(monthOptions, []);
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [q, setQ] = useState("");
  const [tableKey, setTableKey] = useState(0);

  const listParams = useMemo(
    () => ({
      month: filters.month || DEFAULT_MONTH,
      status: filters.status || undefined,
    }),
    [filters]
  );

  const filterPanelValues = useMemo(() => ({ ...filters, q }), [filters, q]);

  const advancedActiveCount = useMemo(() => {
    let n = 0;
    if (filters.status) n += 1;
    if (filters.month && filters.month !== DEFAULT_MONTH) n += 1;
    if (q.trim()) n += 1;
    return n;
  }, [filters, q]);

  const handleApplyFilters = (next) => {
    setFilters({
      month: next.month || DEFAULT_MONTH,
      status: next.status || "",
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
    if (key === "month") {
      setFilters((prev) => ({ ...prev, month: DEFAULT_MONTH }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: "" }));
    }
    setTableKey((k) => k + 1);
  };

  const columns = useMemo(
    () => [
      { field: "salary_month", label: "Month", sortable: true },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => <StatusBadge status={row.status} />,
      },
      { field: "trigger", label: "Trigger", sortable: false },
      { field: "employees_total", label: "Total", sortable: true },
      { field: "employees_processed", label: "Processed", sortable: true },
      { field: "employees_skipped", label: "Skipped", sortable: true },
      {
        field: "employees_failed",
        label: "Failed",
        sortable: true,
        render: (row) =>
          Number(row.employees_failed) > 0 ? (
            <span className="font-medium text-destructive">{row.employees_failed}</span>
          ) : (
            <span className="text-muted-foreground">0</span>
          ),
      },
      {
        field: "started_at",
        label: "Started",
        sortable: false,
        render: (row) =>
          row.started_at ? new Date(row.started_at).toLocaleString("en-IN") : "—",
      },
    ],
    []
  );

  const fetcher = useCallback(
    async ({ page, limit }) => {
      const search = q.trim();
      if (search) {
        const res = await hrmsService.listPayrollRuns({
          page: 1,
          limit: 100,
          ...listParams,
        });
        const payload = unwrap(res);
        const allRows = (payload?.data || []).filter((row) => payrollRunMatchesQ(row, search));
        const total = allRows.length;
        const start = (page - 1) * limit;
        const rows = allRows.slice(start, start + limit);
        return {
          data: rows,
          meta: {
            total,
            page,
            pages: Math.ceil(total / limit) || 1,
            limit: limit || 20,
          },
        };
      }
      const res = await hrmsService.listPayrollRuns({
        page,
        limit,
        ...listParams,
      });
      const payload = unwrap(res);
      const rows = payload?.data || [];
      const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
      return { data: rows, meta };
    },
    [listParams, q]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Payroll Run History"
        subtitle="Every payroll attempt — manual and scheduled — with what it processed"
        actions={
          <Button size="sm" variant="outline" onClick={() => router.push("/hrms/payroll")}>
            <IconArrowLeft className="size-4" /> Back to payroll
          </Button>
        }
      >
        <PayrollRunsFilterPanel
          values={filterPanelValues}
          quickSearch={q}
          monthOptions={months}
          activeCount={advancedActiveCount}
          onQuickSearch={(v) => {
            setQ(v || "");
            setTableKey((k) => k + 1);
          }}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onRemove={handleRemoveFilter}
        />

        <div className="flex min-h-[320px] flex-1 flex-col">
          <PaginatedTable
            key={tableKey}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            height="100%"
            initialSortBy="id"
            initialSortOrder="desc"
            emptyState={
              <EmptyState
                icon={IconHistory}
                title="No payroll runs yet"
                description="Runs appear here after you run payroll, either manually or by the scheduler."
              />
            }
          />
        </div>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}