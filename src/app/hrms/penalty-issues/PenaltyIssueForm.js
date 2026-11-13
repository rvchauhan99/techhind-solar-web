"use client";

import { useEffect, useMemo, useState } from "react";
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
import Textarea from "@/components/common/Textarea";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const THIS_MONTH = new Date().toISOString().slice(0, 7);

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function PenaltyIssueForm({ issueId = null }) {
  const router = useRouter();
  const isEdit = !!issueId;

  const [form, setForm] = useState({
    employee_id: "",
    penalty_id: "",
    penalty_month: THIS_MONTH,
    amount: "",
    remarks: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [penalties, setPenalties] = useState([]);

  const monthOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en", { month: "short", year: "numeric" });
      return { value, label };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [empRes, penRes] = await Promise.all([
          hrmsService.listEmployees({ limit: 100, status: "active" }),
          hrmsService.listPenalties({ limit: 100, status: "active" }),
        ]);
        if (cancelled) return;
        setEmployees(unwrap(empRes)?.data || []);
        setPenalties(unwrap(penRes)?.data || []);

        if (isEdit) {
          const res = await hrmsService.getPenaltyIssue(issueId);
          const row = unwrap(res);
          if (row && !cancelled) {
            setForm({
              employee_id: String(row.employee_id ?? ""),
              penalty_id: String(row.penalty_id ?? ""),
              penalty_month: row.penalty_month || THIS_MONTH,
              amount: row.amount != null ? String(row.amount) : "",
              remarks: row.remarks || "",
            });
          }
        }
      } catch (err) {
        toastErrorFromApi(err, "Could not load form data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, issueId]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  // Choosing a penalty pre-fills its master amount (still editable).
  const onPenaltyChange = (value) => {
    const chosen = penalties.find((p) => String(p.id) === String(value));
    setForm((f) => ({
      ...f,
      penalty_id: value,
      amount: chosen ? String(chosen.amount ?? "") : f.amount,
    }));
    if (errors.penalty_id) setErrors((p) => ({ ...p, penalty_id: undefined }));
  };

  const selectedPenalty = penalties.find((p) => String(p.id) === String(form.penalty_id));

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.employee_id) errs.employee_id = "Employee is required";
    if (!form.penalty_id) errs.penalty_id = "Penalty is required";
    if (!form.penalty_month) errs.penalty_month = "Month is required";
    const amountNum = Number(form.amount);
    if (form.amount === "" || !Number.isFinite(amountNum)) errs.amount = "Amount is required";
    else if (amountNum < 0) errs.amount = "Amount must be 0 or more";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    const payload = {
      employee_id: Number(form.employee_id),
      penalty_id: Number(form.penalty_id),
      penalty_month: form.penalty_month,
      amount: Math.round(amountNum * 100) / 100,
      remarks: form.remarks.trim() || null,
    };
    try {
      if (isEdit) {
        await hrmsService.updatePenaltyIssue(issueId, payload);
        toastSuccess("Penalty issue updated");
      } else {
        await hrmsService.createPenaltyIssue(payload);
        toastSuccess("Penalty issued");
      }
      router.push("/hrms/penalty-issues");
    } catch (err) {
      toastErrorFromApi(err, isEdit ? "Update failed" : "Could not issue penalty");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell
        title={isEdit ? "Edit Penalty Issue" : "Issue Penalty"}
        listHref="/hrms/penalty-issues"
        listLabel="Penalty Issues"
      >
        <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
          <FormContainer>
            <FormSection
              variant="card"
              step={1}
              title="Who and what"
              description="Pick the employee and the penalty type being issued"
            >
              <FormGrid>
                <FormField>
                  <Select
                    label="Employee"
                    name="employee_id"
                    value={form.employee_id}
                    onChange={(e) => setField("employee_id", e.target.value)}
                    error={!!errors.employee_id}
                    helperText={errors.employee_id || "Only active employees can be penalised"}
                    required
                    disabled={loading || isEdit}
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
                  <Select
                    label="Penalty"
                    name="penalty_id"
                    value={form.penalty_id}
                    onChange={(e) => onPenaltyChange(e.target.value)}
                    error={!!errors.penalty_id}
                    helperText={
                      errors.penalty_id ||
                      (selectedPenalty
                        ? `Standard amount ${money(selectedPenalty.amount)}`
                        : "Only active penalties can be issued")
                    }
                    required
                    disabled={loading}
                  >
                    <MenuItem value="">Select penalty…</MenuItem>
                    {penalties.map((p) => (
                      <MenuItem key={p.id} value={String(p.id)}>
                        {`${p.title} — ${money(p.amount)}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
                <FormField>
                  <Select
                    label="Month"
                    name="penalty_month"
                    value={form.penalty_month}
                    onChange={(e) => setField("penalty_month", e.target.value)}
                    error={!!errors.penalty_month}
                    helperText={errors.penalty_month || "Payroll deducts this in the selected month"}
                    required
                    disabled={loading}
                  >
                    {monthOptions.map((m) => (
                      <MenuItem key={m.value} value={m.value}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
              </FormGrid>
            </FormSection>

            <FormSection
              variant="card"
              step={2}
              title="Amount and note"
              description="Amount is snapshotted now — later changes to the penalty master do not affect this issue"
            >
              <FormGrid cols={2}>
                <FormField>
                  <Input
                    label="Amount (₹)"
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setField("amount", e.target.value)}
                    error={!!errors.amount}
                    helperText={errors.amount || "Override the standard penalty amount if needed"}
                    required
                    disabled={loading}
                  />
                </FormField>
                <FormField>
                  <Textarea
                    label="Remarks"
                    name="remarks"
                    rows={3}
                    value={form.remarks}
                    onChange={(e) => setField("remarks", e.target.value)}
                    helperText="Reason or reference, visible in the issues list"
                    disabled={loading}
                  />
                </FormField>
              </FormGrid>
            </FormSection>

            <FormActions>
              <Button type="submit" size="sm" loading={saving} disabled={loading}>
                {isEdit ? "Save changes" : "Issue penalty"}
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
