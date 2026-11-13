"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconHistory } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import { unwrap } from "@/lib/apiUnwrap";
import * as hrmsService from "@/services/hrmsService";

export default function PayrollRunsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ status: "" });
  const [tableKey, setTableKey] = useState(0);

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

  const fetcher = useMemo(
    () =>
      async ({ page, limit }) => {
        const res = await hrmsService.listPayrollRuns({
          page,
          limit,
          status: filters.status || undefined,
        });
        const payload = unwrap(res);
        const rows = payload?.data || [];
        const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
        return { data: rows, meta };
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, tableKey]
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
        filterConfig={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "completed", label: "Completed" },
              { value: "failed", label: "Failed" },
              { value: "running", label: "Running" },
              { value: "queued", label: "Queued" },
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
          setFilters({ status: "" });
          setTableKey((k) => k + 1);
        }}
      >
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          height="60vh"
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
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
