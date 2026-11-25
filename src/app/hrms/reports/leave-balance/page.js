"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconDownload,
  IconUsers,
  IconScale,
  IconAlertTriangle,
  IconCircleOff,
  IconCalendarStats,
  IconSum,
} from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import StatCard from "@/components/common/StatCard";
import EmptyState from "@/components/common/EmptyState";
import PaginationControls from "@/components/common/PaginationControls";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import LeaveBalanceFilterPanel from "./components/LeaveBalanceFilterPanel";

const NOW = new Date();
const DEFAULT_FY = NOW.getMonth() + 1 >= 4 ? NOW.getFullYear() : NOW.getFullYear() - 1;

const DEFAULT_FILTERS = {
  fy_year: String(DEFAULT_FY),
  as_of: "",
  department_id: "",
  designation_id: "",
  employee_id: "",
  leave_type_id: "",
  employee_status: "active",
  remaining_status: "",
  joining_from: "",
  joining_to: "",
};

const ADVANCED_KEYS = [
  "as_of",
  "department_id",
  "designation_id",
  "employee_id",
  "leave_type_id",
  "remaining_status",
  "joining_from",
  "joining_to",
];

const remainingVariant = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "secondary";
  if (n < 0) return "destructive";
  if (n === 0) return "secondary";
  if (n <= 2) return "accent";
  return "success";
};

function buildApiParams(filters, q, page, limit) {
  return {
    fy_year: Number(filters.fy_year) || DEFAULT_FY,
    page,
    limit,
    q: q.trim() || undefined,
    department_id: filters.department_id || undefined,
    designation_id: filters.designation_id || undefined,
    employee_id: filters.employee_id || undefined,
    leave_type_id: filters.leave_type_id || undefined,
    employee_status: filters.employee_status || "active",
    remaining_status: filters.remaining_status || undefined,
    joining_from: filters.joining_from || undefined,
    joining_to: filters.joining_to || undefined,
    as_of: filters.as_of || undefined,
  };
}

export default function HrmsLeaveBalanceReportPage() {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1, limit: 50 });
  const [fyWindow, setFyWindow] = useState(null);

  const fyYearOptions = useMemo(
    () =>
      [DEFAULT_FY - 1, DEFAULT_FY, DEFAULT_FY + 1].map((y) => ({
        value: String(y),
        label: `${y}–${y + 1}`,
      })),
    []
  );

  const advancedActiveCount = useMemo(() => {
    let n = 0;
    for (const key of ADVANCED_KEYS) {
      if (filters[key] != null && String(filters[key]).trim() !== "") n += 1;
    }
    if (filters.employee_status && filters.employee_status !== "active") n += 1;
    if (filters.fy_year && String(filters.fy_year) !== String(DEFAULT_FY)) n += 1;
    if (q.trim()) n += 1;
    return n;
  }, [filters, q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildApiParams(filters, q, page, limit);
      const res = await hrmsService.listLeaveBalanceReport(params);
      const payload = unwrap(res) || {};
      setRows(payload.data || []);
      setLeaveTypes(payload.leave_types || []);
      setSummary(payload.summary || null);
      setMeta(
        payload.meta || {
          total: (payload.data || []).length,
          page,
          pages: 1,
          limit,
        }
      );
      setFyWindow(payload.fy || null);
    } catch (err) {
      toastErrorFromApi(err, "Load failed");
      setRows([]);
      setLeaveTypes([]);
      setSummary(null);
      setMeta({ total: 0, page: 1, pages: 1, limit });
    } finally {
      setLoading(false);
    }
  }, [filters, q, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const cellFor = (row, typeId) =>
    (row.balances || []).find((b) => b.leave_type_id === typeId && b.counts_toward_balance !== false);

  const totals = useMemo(() => {
    const map = {};
    for (const t of leaveTypes) {
      let remaining = 0;
      let entitlement = 0;
      for (const row of rows) {
        const cell = cellFor(row, t.id);
        if (!cell) continue;
        remaining += Number(cell.remaining) || 0;
        entitlement += Number(cell.entitlement) || 0;
      }
      map[t.id] = { remaining, entitlement };
    }
    return map;
  }, [leaveTypes, rows]);

  const handleApplyFilters = (next) => {
    setFilters({
      ...DEFAULT_FILTERS,
      ...next,
      fy_year: next?.fy_year ? String(next.fy_year) : String(DEFAULT_FY),
      employee_status: next?.employee_status || "active",
    });
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setQ("");
    setPage(1);
  };

  const handleRemoveFilter = (key) => {
    if (key === "q") {
      setQ("");
      setPage(1);
      return;
    }
    setFilters((prev) => ({
      ...prev,
      [key]: key === "fy_year" ? String(DEFAULT_FY) : key === "employee_status" ? "active" : "",
    }));
    setPage(1);
  };

  const onExport = async () => {
    setBusy(true);
    try {
      const params = buildApiParams(filters, q, 1, 5000);
      delete params.page;
      delete params.limit;
      const blob = await hrmsService.exportLeaveBalanceReport(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leave-balance-${filters.fy_year}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Export downloaded — matches the selected filters");
    } catch (err) {
      toastErrorFromApi(err, "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const fyLabel = filters.fy_year
    ? `${filters.fy_year}–${Number(filters.fy_year) + 1}`
    : "—";
  const periodHint =
    fyWindow?.start && fyWindow?.end
      ? `FY ${fyLabel} (${fyWindow.start} → ${fyWindow.end})`
      : `FY ${fyLabel}`;

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Leave Balance Report"
        subtitle={`${periodHint} — remaining = entitlement minus approved leave on the balance ledger`}
        fullWidth
        actions={
          <Button size="sm" variant="outline" onClick={onExport} loading={busy}>
            <IconDownload className="size-4" /> Export
          </Button>
        }
      >
        <LeaveBalanceFilterPanel
          values={{ ...filters, q }}
          quickSearch={q}
          fyYearOptions={fyYearOptions}
          activeCount={advancedActiveCount}
          onQuickSearch={(v) => {
            setQ(v);
            setPage(1);
          }}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onRemove={handleRemoveFilter}
          loadDepartments={(term) => hrmsService.searchHrmsDepartments(term)}
          loadDesignations={(term, departmentId) =>
            hrmsService.searchHrmsDesignations(term, {
              department_id: departmentId || undefined,
            })
          }
          loadEmployees={(term, opts = {}) =>
            hrmsService.searchHrmsEmployees(term, {
              department_id: opts.department_id || undefined,
              designation_id: opts.designation_id || undefined,
            })
          }
          loadLeaveTypes={(term) => hrmsService.searchHrmsLeaveTypes(term)}
          resolveDepartment={(id) => hrmsService.resolveHrmsDepartment(id)}
          resolveDesignation={(id) => hrmsService.resolveHrmsDesignation(id)}
          resolveEmployee={(id) => hrmsService.resolveHrmsEmployee(id)}
          resolveLeaveType={(id) => hrmsService.resolveHrmsLeaveType(id)}
        />

        <div className="mb-1.5 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            compact
            icon={<IconUsers size={16} />}
            label="Employees"
            value={summary?.employees ?? "—"}
            accentColor="#1b365d"
            subLabel="Matching filters"
            loading={loading}
          />
          <StatCard
            compact
            icon={<IconCalendarStats size={16} />}
            label="Leave types"
            value={summary?.leave_types ?? "—"}
            accentColor="#0891b2"
            subLabel="Columns shown"
            loading={loading}
          />
          <StatCard
            compact
            icon={<IconSum size={16} />}
            label="Entitlement"
            value={summary != null ? summary.entitlement : "—"}
            accentColor="#7c3aed"
            subLabel="Total days"
            loading={loading}
          />
          <StatCard
            compact
            icon={<IconScale size={16} />}
            label="Remaining"
            value={summary != null ? summary.remaining : "—"}
            accentColor="#00823b"
            subLabel="Across types"
            loading={loading}
          />
          <StatCard
            compact
            icon={<IconAlertTriangle size={16} />}
            label="Negative"
            value={summary?.negative_employees ?? "—"}
            accentColor="#dc2626"
            subLabel="Overdrawn staff"
            loading={loading}
          />
          <StatCard
            compact
            icon={<IconCircleOff size={16} />}
            label="Zero / low"
            value={
              summary != null
                ? `${summary.zero_employees ?? 0} / ${summary.low_employees ?? 0}`
                : "—"
            }
            accentColor="#f37021"
            subLabel="Zero · ≤2 days"
            loading={loading}
          />
        </div>

        <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <tr className="text-left">
                  <th className="whitespace-nowrap px-2 py-2 font-semibold">Employee</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold">Department</th>
                  <th className="whitespace-nowrap px-2 py-2 font-semibold">Designation</th>
                  {leaveTypes.map((t) => (
                    <th key={t.id} className="whitespace-nowrap px-2 py-2 font-semibold">
                      {t.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading &&
                  [0, 1, 2, 3, 4, 5].map((i) => (
                    <tr key={`sk-${i}`} className="border-t border-border">
                      <td
                        className="px-2 py-2"
                        colSpan={3 + Math.max(1, leaveTypes.length)}
                      >
                        <span className="block h-3.5 w-full animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))}
                {!loading &&
                  rows.map((r) => (
                    <tr key={r.employee_id} className="border-t border-border align-top hover:bg-muted/30">
                      <td className="px-2 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{r.name || "—"}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {r.emp_code}
                            {r.status && r.status !== "active" ? ` · ${r.status}` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {r.department_title || "—"}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {r.designation_title || "—"}
                      </td>
                      {leaveTypes.map((t) => {
                        const cell = cellFor(r, t.id);
                        return (
                          <td key={t.id} className="whitespace-nowrap px-2 py-2">
                            {cell ? (
                              <span className="flex items-center gap-1">
                                <Badge variant={remainingVariant(cell.remaining)}>
                                  {cell.remaining}
                                </Badge>
                                <span className="text-muted-foreground">/ {cell.entitlement}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={3 + Math.max(1, leaveTypes.length)} className="p-0">
                      <EmptyState
                        icon={IconScale}
                        title={
                          advancedActiveCount
                            ? "No balances match these filters"
                            : "No balances for this financial year"
                        }
                        description={
                          advancedActiveCount
                            ? "Try removing a filter chip or clearing the quick search."
                            : "Pick another FY, or make sure employees have leave quotas configured."
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
              {!loading && rows.length > 0 && leaveTypes.length > 0 && (
                <tfoot className="bg-muted/40 font-semibold">
                  <tr className="border-t border-border">
                    <td className="px-2 py-2" colSpan={3}>
                      Page totals ({rows.length} of {meta.total} employees)
                    </td>
                    {leaveTypes.map((t) => (
                      <td key={t.id} className="whitespace-nowrap px-2 py-2">
                        {totals[t.id]?.remaining ?? 0}
                        <span className="ml-1 font-normal text-muted-foreground">
                          / {totals[t.id]?.entitlement ?? 0}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="shrink-0 border-t border-border px-1 py-1">
            <PaginationControls
              page={Math.max(0, page - 1)}
              rowsPerPage={limit}
              totalCount={Number(meta.total) || 0}
              onPageChange={(zeroBased) => setPage(zeroBased + 1)}
              onRowsPerPageChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
              rowsPerPageOptions={[20, 50, 100, 200]}
            />
          </div>
        </div>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
