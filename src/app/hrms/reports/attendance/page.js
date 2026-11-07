"use client";

import { useMemo, useState } from "react";
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

export default function HrmsAttendanceReportPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [busy, setBusy] = useState(false);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1].map(String);
  }, [now]);

  const onExport = async () => {
    setBusy(true);
    try {
      const blob = await hrmsService.exportAttendanceReport({
        year: Number(year),
        month: Number(month),
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${year}-${String(month).padStart(2, "0")}.xlsx`;
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
      <AddEditPageShell title="Attendance Report" listHref="/hrms" listLabel="HRMS">
        <FormContainer>
          <FormSection title="Month export">
            <p className="text-xs text-muted-foreground mb-2">
              Excel includes a Holiday column using the company holiday calendar.
            </p>
            <FormGrid cols={2}>
              <FormField>
                <Select label="Year" name="year" value={year} onChange={(e) => setYear(e.target.value)}>
                  {years.map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormField>
              <FormField>
                <Select label="Month" name="month" value={month} onChange={(e) => setMonth(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </Select>
              </FormField>
            </FormGrid>
          </FormSection>
          <FormActions>
            <Button size="sm" disabled={busy} onClick={onExport}>
              {busy ? "Exporting…" : "Download Excel"}
            </Button>
          </FormActions>
        </FormContainer>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
