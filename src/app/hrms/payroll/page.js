"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  IconWallet,
  IconPlayerPlay,
  IconUsers,
  IconCash,
  IconReceiptRefund,
  IconDownload,
  IconFileInvoice,
} from "@tabler/icons-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_payroll";

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

export default function HrmsPayrollPage() {
  const router = useRouter();
  const perm = useModulePermission(MODULE_KEY);
  const months = useMemo(monthOptions, []);
  const [filters, setFilters] = useState({ month: months[0].value, is_acknowledged: "" });
  const [tableKey, setTableKey] = useState(0);
  const [summary, setSummary] = useState({ employees: null, totalNet: null, totalDeductions: null });
  const [runOpen, setRunOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const res = await hrmsService.listPayrollReports({ month: filters.month, limit: 1 });
      const s = unwrap(res)?.summary;
      setSummary({
        employees: s?.employees ?? 0,
        totalNet: s?.totalNet ?? 0,
        totalDeductions: s?.totalDeductions ?? 0,
      });
    } catch {
      setSummary({ employees: null, totalNet: null, totalDeductions: null });
    }
  }, [filters.month]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const fetcher = useMemo(
    () =>
      async ({ page, limit }) => {
        const res = await hrmsService.listPayrollReports({
          page,
          limit,
          month: filters.month || undefined,
          is_acknowledged: filters.is_acknowledged || undefined,
        });
        const payload = unwrap(res);
        const rows = payload?.data || [];
        const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
        return { data: rows, meta };
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, tableKey]
  );

  const doRun = async () => {
    setRunning(true);
    try {
      const res = await hrmsService.runPayroll({ month: filters.month, force: true });
      const r = unwrap(res);
      toastSuccess(
        `Payroll ${r?.status} — processed ${r?.employees_processed ?? 0}, skipped ${r?.employees_skipped ?? 0}`
      );
      setRunOpen(false);
      setTableKey((k) => k + 1);
      loadSummary();
    } catch (err) {
      toastErrorFromApi(err, "Payroll run failed");
    } finally {
      setRunning(false);
    }
  };

  const downloadSlip = async (row) => {
    try {
      const blob = await hrmsService.downloadSalarySlip(row.id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary-slip-${row.emp_code || row.employee_id}-${row.salary_month}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toastErrorFromApi(err, "Could not download slip");
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const blob = await hrmsService.exportPayoutReport({ month: filters.month });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `payout-${filters.month}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Payout exported");
    } catch (err) {
      toastErrorFromApi(err, "Export failed");
    } finally {
      setExporting(false);
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
      {
        field: "is_acknowledged",
        label: "Ack",
        sortable: false,
        render: (row) => (
          <StatusBadge
            status={row.is_acknowledged ? "approved" : "pending"}
            label={row.is_acknowledged ? "Acked" : "Pending"}
          />
        ),
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              title="Salary slip"
              aria-label={`Slip for ${row.employee_name || "employee"}`}
              onClick={() => downloadSlip(row)}
            >
              <IconFileInvoice className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Open"
              aria-label={`Open ${row.employee_name || "employee"}`}
              onClick={() => router.push(`/hrms/payroll/${row.id}`)}
            >
              <IconReceiptRefund className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Payroll"
        subtitle="Monthly salary runs, slips and payout — deductions come from attendance, leave and penalties"
        actions={
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => router.push("/hrms/payroll/runs")}>
              Run history
            </Button>
            <Button size="sm" variant="outline" onClick={doExport} loading={exporting}>
              <IconDownload className="size-4" /> Export
            </Button>
            {perm.can_create && (
              <Button size="sm" onClick={() => setRunOpen(true)}>
                <IconPlayerPlay className="size-4" /> Run payroll
              </Button>
            )}
          </div>
        }
        filterConfig={[
          { key: "month", label: "Month", type: "select", options: months },
          {
            key: "is_acknowledged",
            label: "Acknowledged",
            type: "select",
            options: [
              { value: "true", label: "Acknowledged" },
              { value: "false", label: "Pending" },
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
          setFilters({ month: months[0].value, is_acknowledged: "" });
          setTableKey((k) => k + 1);
        }}
      >
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            icon={<IconUsers size={16} />}
            label="Employees in run"
            value={summary.employees ?? "—"}
            accentColor="#1b365d"
            subLabel={filters.month}
          />
          <StatCard
            icon={<IconCash size={16} />}
            label="Total net pay"
            value={summary.totalNet == null ? "—" : money(summary.totalNet)}
            accentColor="#00823b"
            subLabel="After deductions"
          />
          <StatCard
            icon={<IconWallet size={16} />}
            label="Total deductions"
            value={summary.totalDeductions == null ? "—" : money(summary.totalDeductions)}
            accentColor="#f37021"
            subLabel="PF, ESI, PT, LWF, late, penalty"
          />
        </div>

        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          height="58vh"
          initialSortBy="net_amount"
          initialSortOrder="desc"
          emptyState={
            <EmptyState
              icon={IconPayments}
              title="No payroll for this month"
              description="Run payroll to calculate salaries from attendance, leave, annexure and penalties."
              actionLabel={perm.can_create ? "Run payroll" : undefined}
              onAction={perm.can_create ? () => setRunOpen(true) : undefined}
            />
          }
        />

        <AlertDialog open={runOpen} onOpenChange={setRunOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Run payroll for {filters.month}?</AlertDialogTitle>
              <AlertDialogDescription>
                This recalculates every active employee with an annexure. Slips already acknowledged
                are preserved. Re-running replaces unacknowledged results.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
              <AlertDialogAction size="sm" loading={running} onClick={doRun}>
                Run payroll
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
