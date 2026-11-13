"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconDownload, IconCash } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import EmptyState from "@/components/common/EmptyState";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const money = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export default function PayoutReportPage() {
  const months = useMemo(monthOptions, []);
  const [filters, setFilters] = useState({ month: months[0].value });
  const [tableKey, setTableKey] = useState(0);
  const [busy, setBusy] = useState(false);

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
      { field: "salary_days", label: "Salary days", sortable: true },
      {
        field: "payable_income",
        label: "Payable",
        sortable: true,
        render: (row) => <span className="tabular-nums">{money(row.payable_income)}</span>,
      },
      {
        field: "total_deduction",
        label: "Deductions",
        sortable: true,
        render: (row) => <span className="tabular-nums">{money(row.total_deduction)}</span>,
      },
      {
        field: "net_amount",
        label: "Net pay",
        sortable: true,
        render: (row) => (
          <span className="font-medium tabular-nums text-foreground">{money(row.net_amount)}</span>
        ),
      },
    ],
    []
  );

  const fetcher = useMemo(
    () =>
      async ({ page, limit }) => {
        const res = await hrmsService.listPayrollReports({
          page,
          limit,
          month: filters.month || undefined,
        });
        const payload = unwrap(res);
        const rows = payload?.data || [];
        const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
        return { data: rows, meta };
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, tableKey]
  );

  const onExport = async () => {
    setBusy(true);
    try {
      const blob = await hrmsService.exportPayoutReport({ month: filters.month });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `payout-${filters.month}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Export downloaded — matches the selected month");
    } catch (err) {
      toastErrorFromApi(err, "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Payout Report"
        subtitle="Bank-ready payout for the month — one row per employee"
        actions={
          <Button size="sm" variant="outline" onClick={onExport} loading={busy}>
            <IconDownload className="size-4" /> Export
          </Button>
        }
        filterConfig={[{ key: "month", label: "Month", type: "select", options: months }]}
        filterValues={filters}
        showFilterLabels
        onFilterChange={(key, value) => {
          setFilters((f) => ({ ...f, [key]: value }));
          setTableKey((k) => k + 1);
        }}
        onClearFilters={() => {
          setFilters({ month: months[0].value });
          setTableKey((k) => k + 1);
        }}
      >
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          height="60vh"
          initialSortBy="net_amount"
          initialSortOrder="desc"
          emptyState={
            <EmptyState
              icon={IconCash}
              title="No payout for this month"
              description="Run payroll for the month to generate the payout."
            />
          }
        />
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
