"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Select, { MenuItem } from "@/components/common/Select";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsLeaveBalanceReportPage() {
  const now = new Date();
  const defaultFy = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const [fyYear, setFyYear] = useState(String(defaultFy));
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState([]);

  const years = useMemo(() => {
    return [defaultFy - 1, defaultFy, defaultFy + 1].map(String);
  }, [defaultFy]);

  const load = async () => {
    setBusy(true);
    try {
      const res = await hrmsService.listLeaveBalanceReport({ fy_year: Number(fyYear), limit: 50 });
      const payload = res?.result ?? res?.data ?? res;
      setRows(payload?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Load failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fyYear]);

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
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Export failed");
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
          <div className="mt-3 overflow-x-auto text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1 pr-2">Employee</th>
                  <th className="py-1 pr-2">Code</th>
                  <th className="py-1 pr-2">Balances</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.employee_id} className="border-b align-top">
                    <td className="py-1 pr-2">{r.name || "—"}</td>
                    <td className="py-1 pr-2">{r.emp_code}</td>
                    <td className="py-1 pr-2">
                      {(r.balances || [])
                        .filter((b) => b.counts_toward_balance)
                        .map((b) => `${b.title}: ${b.remaining}/${b.entitlement}`)
                        .join(" · ") || "—"}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={3} className="py-2 text-muted-foreground">
                      No rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </FormContainer>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
