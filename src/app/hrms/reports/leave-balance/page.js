"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Select, { MenuItem } from "@/components/common/Select";
import EmptyState from "@/components/common/EmptyState";
import { IconScale } from "@tabler/icons-react";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const remainingVariant = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "secondary";
  if (n < 0) return "destructive";
  if (n === 0) return "secondary";
  return "success";
};

export default function HrmsLeaveBalanceReportPage() {
  const now = new Date();
  const defaultFy = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const [fyYear, setFyYear] = useState(String(defaultFy));
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const years = useMemo(() => [defaultFy - 1, defaultFy, defaultFy + 1].map(String), [defaultFy]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hrmsService.listLeaveBalanceReport({ fy_year: Number(fyYear), limit: 50 });
      setRows(unwrap(res)?.data || []);
    } catch (err) {
      toastErrorFromApi(err, "Load failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fyYear]);

  useEffect(() => {
    load();
  }, [load]);

  const leaveTypes = useMemo(() => {
    const seen = new Map();
    for (const row of rows) {
      for (const b of row.balances || []) {
        if (!b.counts_toward_balance) continue;
        if (!seen.has(b.leave_type_id)) seen.set(b.leave_type_id, b.title);
      }
    }
    return Array.from(seen, ([id, title]) => ({ id, title }));
  }, [rows]);

  const cellFor = (row, typeId) =>
    (row.balances || []).find((b) => b.leave_type_id === typeId && b.counts_toward_balance);

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

  const onExport = async () => {
    setBusy(true);
    try {
      const blob = await hrmsService.exportLeaveBalanceReport({ fy_year: Number(fyYear) });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leave-balance-${fyYear}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toastSuccess("Export downloaded for the selected financial year");
    } catch (err) {
      toastErrorFromApi(err, "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Leave Balance Report" listHref="/hrms" listLabel="HRMS">
        <FormContainer>
          <FormSection title="Financial year (Apr–Mar)">
            <p className="text-xs text-muted-foreground mb-2">
              Remaining = entitlement minus approved leave usage on the balance ledger.
            </p>
            <FormGrid cols={2}>
              <FormField>
                <Select
                  label="FY start year"
                  name="fy_year"
                  value={fyYear}
                  onChange={(e) => setFyYear(e.target.value)}
                >
                  {years.map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}–{Number(y) + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormField>
            </FormGrid>
          </FormSection>
          <FormActions>
            <Button size="sm" disabled={busy} onClick={onExport}>
              {busy ? "Working…" : "Download Excel"}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={load}>
              Refresh
            </Button>
          </FormActions>
          <div className="mt-3 overflow-x-auto rounded-md border border-border">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-2 py-2 font-semibold">Employee</th>
                  <th className="px-2 py-2 font-semibold">Code</th>
                  {leaveTypes.map((t) => (
                    <th key={t.id} className="whitespace-nowrap px-2 py-2 font-semibold">
                      {t.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading &&
                  [0, 1, 2, 3, 4].map((i) => (
                    <tr key={`sk-${i}`} className="border-t border-border">
                      <td className="px-2 py-2" colSpan={2 + Math.max(1, leaveTypes.length)}>
                        <span className="block h-3.5 w-full animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))}
                {!loading &&
                  rows.map((r) => (
                    <tr key={r.employee_id} className="border-t border-border align-top">
                      <td className="px-2 py-2 font-medium text-foreground">{r.name || "—"}</td>
                      <td className="px-2 py-2 text-muted-foreground">{r.emp_code}</td>
                      {leaveTypes.map((t) => {
                        const cell = cellFor(r, t.id);
                        return (
                          <td key={t.id} className="whitespace-nowrap px-2 py-2">
                            {cell ? (
                              <span className="flex items-center gap-1">
                                <Badge variant={remainingVariant(cell.remaining)}>{cell.remaining}</Badge>
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
                    <td colSpan={2 + Math.max(1, leaveTypes.length)} className="p-0">
                      <EmptyState
                        icon={IconScale}
                        title="No balances for this financial year"
                        description="Pick another FY start year, or make sure employees have leave quotas configured."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
              {!loading && rows.length > 0 && leaveTypes.length > 0 && (
                <tfoot className="bg-muted/40 font-semibold">
                  <tr className="border-t border-border">
                    <td className="px-2 py-2" colSpan={2}>
                      Totals ({rows.length} employees)
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
        </FormContainer>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
