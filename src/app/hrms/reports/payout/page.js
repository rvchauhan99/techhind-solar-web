"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  IconDownload,
  IconCash,
  IconUsers,
  IconWallet,
} from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import EmptyState from "@/components/common/EmptyState";
import { currentMonthKey } from "@/components/common/hrmsFilterDates";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import PayoutReportFilterPanel from "./components/PayoutReportFilterPanel";

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

const DEFAULT_MONTH = currentMonthKey();

const EMPTY_FILTERS = {
  month: DEFAULT_MONTH,
  employee_id: "",
  is_acknowledged: "",
  query_status: "",
};

function buildApiParams(filters, q) {
  const params = {};
  if (filters.month) params.month = filters.month;
  if (filters.employee_id) params.employee_id = filters.employee_id;
  if (filters.is_acknowledged !== "" && filters.is_acknowledged != null) {
    params.is_acknowledged = filters.is_acknowledged;
  }
  if (filters.query_status) params.query_status = filters.query_status;
  if (q?.trim()) params.q = q.trim();
  return params;
}

export default function PayoutReportPage() {
  const monthOpts = useMemo(monthOptions, []);
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS }));
  const [q, setQ] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const apiParams = useMemo(() => buildApiParams(filters, q), [filters, q]);
  const filterPanelValues = useMemo(() => ({ ...filters, q }), [filters, q]);

  const advancedActiveCount = useMemo(() => {
    const keys = ["employee_id", "is_acknowledged", "query_status"];
    let n = keys.filter((k) => String(filters[k] ?? "").trim() !== "").length;
    if (q.trim()) n += 1;
    if (filters.month && filters.month !== DEFAULT_MONTH) n += 1;
    return n;
  }, [filters, q]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await hrmsService.listPayrollReports({ ...apiParams, page: 1, limit: 1 });
      const s = unwrap(res)?.summary;
      setSummary(s || null);
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
    setFilters((prev) => ({
      ...prev,
      ...next,
      month: next.month || prev.month || DEFAULT_MONTH,
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
    if (key === "month") {
      setFilters((prev) => ({ ...prev, month: DEFAULT_MONTH }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: "" }));
    }
    setTableKey((k) => k + 1);
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
          ...apiParams,
          page,
          limit,
        });
        const payload = unwrap(res);
        const rows = payload?.data || [];
        const meta = payload?.meta || { total: rows.length, page: 1, pages: 1, limit: limit || 20 };
        if (payload?.summary) setSummary(payload.summary);
        return { data: rows, meta };
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiParams, tableKey]
  );

  const onExport = async () => {
    setBusy(true);
    try {
      const blob = await hrmsService.exportPayoutReport(apiParams);
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
      >
        <PayoutReportFilterPanel
          values={filterPanelValues}
          quickSearch={q}
          monthOptions={monthOpts}
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
            icon={<IconUsers size={16} />}
            label="Employees"
            value={summary?.employees ?? "—"}
            accentColor="#1b365d"
            subLabel={filters.month}
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconCash size={16} />}
            label="Total net pay"
            value={summary?.totalNet == null ? "—" : money(summary.totalNet)}
            accentColor="#00823b"
            subLabel="After deductions"
            loading={summaryLoading}
          />
          <StatCard
            compact
            icon={<IconWallet size={16} />}
            label="Total deductions"
            value={summary?.totalDeductions == null ? "—" : money(summary.totalDeductions)}
            accentColor="#f37021"
            subLabel="PF, ESI, PT, penalties"
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
        </div>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}