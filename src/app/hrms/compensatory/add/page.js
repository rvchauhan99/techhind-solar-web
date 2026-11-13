"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import Textarea from "@/components/common/Textarea";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MIN_HOURS = 4;

export default function CompensatoryAddPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    employee_id: "",
    worked_date: "",
    requested_leave_date: "",
    number_of_days: "1",
    hours_worked: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await hrmsService.listEmployees({ limit: 100, status: "active" });
        if (!cancelled) setEmployees(unwrap(res)?.data || []);
      } catch {
        /* employee list is best-effort */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  // Mirrors the server rule so the user sees the problem before submitting.
  const workedDateHint = (() => {
    if (!form.worked_date) return "Must be a company holiday or a weekend";
    const d = new Date(`${form.worked_date}T00:00:00Z`);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) return "Weekend — eligible for comp-off";
    return "Weekday — only a company holiday qualifies (validated on save)";
  })();

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.employee_id) errs.employee_id = "Employee is required";
    if (!form.worked_date) errs.worked_date = "Worked date is required";
    if (!form.requested_leave_date) errs.requested_leave_date = "Leave date is required";
    const days = Number(form.number_of_days);
    if (!Number.isFinite(days) || days <= 0) errs.number_of_days = "Days must be greater than 0";
    const hours = Number(form.hours_worked);
    if (form.hours_worked === "" || !Number.isFinite(hours)) {
      errs.hours_worked = "Hours worked is required";
    } else if (hours < MIN_HOURS) {
      errs.hours_worked = `At least ${MIN_HOURS} hours must have been worked`;
    }
    if (
      form.worked_date &&
      form.requested_leave_date &&
      form.requested_leave_date < form.worked_date
    ) {
      errs.requested_leave_date = "Leave date must be on or after the worked date";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await hrmsService.createCompensatory({
        employee_id: Number(form.employee_id),
        worked_date: form.worked_date,
        requested_leave_date: form.requested_leave_date,
        number_of_days: Math.round(days * 100) / 100,
        hours_worked: Math.round(hours * 100) / 100,
        notes: form.notes.trim() || null,
      });
      toastSuccess("Compensatory request created — pending approval");
      router.push("/hrms/compensatory");
    } catch (err) {
      toastErrorFromApi(err, "Could not create the request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell
        title="Request Compensatory Leave"
        listHref="/hrms/compensatory"
        listLabel="Compensatory Leave"
      >
        <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
          <FormContainer>
            <FormSection
              variant="card"
              step={1}
              title="Who and when"
              description="Compensatory leave is earned by working on a holiday or weekend"
            >
              <FormGrid>
                <FormField>
                  <Select
                    label="Employee"
                    name="employee_id"
                    value={form.employee_id}
                    onChange={(e) => setField("employee_id", e.target.value)}
                    error={!!errors.employee_id}
                    helperText={errors.employee_id}
                    required
                    disabled={loading}
                  >
                    <MenuItem value="">Select employee…</MenuItem>
                    {employees.map((emp) => (
                      <MenuItem key={emp.id} value={String(emp.id)}>
                        {emp.user?.name ? `${emp.user.name} (${emp.emp_code})` : emp.emp_code}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
                <FormField>
                  <DateField
                    label="Worked on"
                    name="worked_date"
                    value={form.worked_date}
                    onChange={(e) => setField("worked_date", e.target.value)}
                    error={!!errors.worked_date}
                    helperText={errors.worked_date || workedDateHint}
                    required
                    disabled={loading}
                  />
                </FormField>
                <FormField>
                  <DateField
                    label="Leave taken on"
                    name="requested_leave_date"
                    value={form.requested_leave_date}
                    onChange={(e) => setField("requested_leave_date", e.target.value)}
                    error={!!errors.requested_leave_date}
                    helperText={errors.requested_leave_date || "The date this comp-off will be used"}
                    required
                    disabled={loading}
                  />
                </FormField>
              </FormGrid>
            </FormSection>

            <FormSection
              variant="card"
              step={2}
              title="Days, hours and note"
              description="Approval credits these days to the employee's leave balance"
            >
              <FormGrid cols={2}>
                <FormField>
                  <Input
                    label="Number of days"
                    name="number_of_days"
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={form.number_of_days}
                    onChange={(e) => setField("number_of_days", e.target.value)}
                    error={!!errors.number_of_days}
                    helperText={errors.number_of_days || "Typically 1 day per holiday/weekend worked"}
                    required
                    disabled={loading}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Hours worked"
                    name="hours_worked"
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.hours_worked}
                    onChange={(e) => setField("hours_worked", e.target.value)}
                    error={!!errors.hours_worked}
                    helperText={errors.hours_worked || `Minimum ${MIN_HOURS} hours to qualify`}
                    required
                    disabled={loading}
                  />
                </FormField>
              </FormGrid>
              <div className="mt-3">
                <Textarea
                  label="Note (optional)"
                  name="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  helperText="What work was done on that day"
                  disabled={loading}
                />
              </div>
            </FormSection>

            <FormActions>
              <Button type="submit" size="sm" loading={saving} disabled={loading}>
                Submit request
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </FormActions>
          </FormContainer>
        </form>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
