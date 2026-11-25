"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import Textarea from "@/components/common/Textarea";
import AutocompleteField from "@/components/common/AutocompleteField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import * as hrmsService from "@/services/hrmsService";

const THIS_MONTH = new Date().toISOString().slice(0, 7);

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const EMPTY = {
  employee_id: "",
  penalty_id: "",
  penalty_month: THIS_MONTH,
  amount: "",
  remarks: "",
};

function toFormState(row) {
  if (!row) return { ...EMPTY };
  return {
    employee_id: row.employee_id != null ? String(row.employee_id) : "",
    penalty_id: row.penalty_id != null ? String(row.penalty_id) : "",
    penalty_month: row.penalty_month || THIS_MONTH,
    amount: row.amount != null ? String(row.amount) : "",
    remarks: row.remarks || "",
  };
}

/**
 * Shared create/edit form for a penalty issue (shell-free).
 * Loads its own employee and penalty option lists. Rendered inside a Dialog
 * on the list page and reused by the standalone add and edit routes.
 *
 * @param {Object|null} [defaultValues] - Row to edit; omit for create mode
 * @param {function(Object): void} [onSubmit] - Called with the payload on valid submit
 * @param {boolean} [loading] - Parent-driven saving state
 * @param {string|null} [serverError] - Parent-driven API error message
 * @param {function(): void} [onClearServerError]
 * @param {function(): void} [onCancel]
 * @param {boolean} [hideActions] - Hide built-in actions (Dialog footer renders them)
 * @param {"plain"|"card"} [variant] - FormSection style; "plain" keeps dialogs compact
 */
export default function PenaltyIssueForm({
  defaultValues = null,
  onSubmit,
  loading = false,
  serverError = null,
  onClearServerError = () => {},
  onCancel = null,
  hideActions = false,
  variant = "card",
}) {
  const isEdit = Boolean(defaultValues?.id);
  const [form, setForm] = useState(() => toFormState(defaultValues));
  const [errors, setErrors] = useState({});
  const [penaltyLabel, setPenaltyLabel] = useState("");
  const [employeeLabel, setEmployeeLabel] = useState("");
  const [selectedPenaltyAmount, setSelectedPenaltyAmount] = useState(null);

  // Hydrate whenever the parent supplies a (newly fetched) record.
  useEffect(() => {
    const next = toFormState(defaultValues);
    setForm(next);
    setErrors({});
    if (defaultValues?.employee?.user?.name || defaultValues?.employee?.emp_code) {
      const name = defaultValues.employee.user?.name || "";
      const code = defaultValues.employee.emp_code ? ` (${defaultValues.employee.emp_code})` : "";
      setEmployeeLabel(name ? `${name}${code}` : defaultValues.employee.emp_code || "");
    }
    if (defaultValues?.penalty?.title) {
      setPenaltyLabel(defaultValues.penalty.title);
      setSelectedPenaltyAmount(defaultValues.penalty.amount ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues]);

  const monthOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en", { month: "short", year: "numeric" });
      return { value, label };
    });
  }, []);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
    if ((key === "employee_id" || key === "penalty_id" || key === "amount") && serverError) {
      onClearServerError();
    }
  };

  const busy = loading;

  const handleSubmit = (e) => {
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
    onSubmit?.({
      employee_id: Number(form.employee_id),
      penalty_id: Number(form.penalty_id),
      penalty_month: form.penalty_month,
      amount: Math.round(amountNum * 100) / 100,
      remarks: form.remarks.trim() || null,
    });
  };

  return (
    <form id="hrms-penalty-issue-form" onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} noValidate>
      <FormContainer>
        <FormSection
          variant={variant}
          title="Who and what"
          description="Pick the employee and the penalty type being issued"
        >
          <FormGrid cols={2}>
            <FormField>
              <AutocompleteField
                label="Employee"
                name="employee_id"
                required
                placeholder="Type to search…"
                asyncLoadOptions={(q) => hrmsService.searchHrmsEmployees(q)}
                resolveOptionById={(eid) => hrmsService.resolveHrmsEmployee(eid)}
                getOptionLabel={(o) => o?.label ?? ""}
                value={
                  form.employee_id
                    ? { id: form.employee_id, value: form.employee_id, label: employeeLabel || "" }
                    : null
                }
                onChange={(_e, opt) => {
                  setField("employee_id", opt?.id != null ? String(opt.id) : "");
                  setEmployeeLabel(opt?.label ?? "");
                }}
                error={!!errors.employee_id}
                helperText={errors.employee_id || "Only active employees can be penalised"}
                disabled={busy || isEdit}
              />
            </FormField>
            <FormField>
              <AutocompleteField
                label="Penalty"
                name="penalty_id"
                required
                placeholder="Type to search…"
                asyncLoadOptions={async (q) => {
                  const opts = await hrmsService.searchHrmsPenalties(q);
                  return (opts || []).map((p) => ({
                    ...p,
                    label: `${p.label || p.title} — ${money(p.amount)}`,
                  }));
                }}
                resolveOptionById={async (pid) => {
                  const p = await hrmsService.resolveHrmsPenalty(pid);
                  if (!p) return null;
                  return { ...p, label: `${p.label || p.title} — ${money(p.amount)}` };
                }}
                getOptionLabel={(o) => o?.label ?? o?.title ?? ""}
                value={
                  form.penalty_id
                    ? { id: form.penalty_id, value: form.penalty_id, label: penaltyLabel || "" }
                    : null
                }
                onChange={(_e, opt) => {
                  setField("penalty_id", opt?.id != null ? String(opt.id) : "");
                  setPenaltyLabel(opt?.label ?? opt?.title ?? "");
                  setSelectedPenaltyAmount(opt?.amount ?? null);
                  if (opt?.amount != null && opt.amount !== "") {
                    setField("amount", String(opt.amount));
                  }
                }}
                error={!!errors.penalty_id}
                helperText={
                  errors.penalty_id ||
                  (selectedPenaltyAmount != null
                    ? `Standard amount ${money(selectedPenaltyAmount)}`
                    : "Only active penalties can be issued")
                }
                disabled={busy}
              />
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
                disabled={busy}
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
          variant={variant}
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
                disabled={busy}
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
                disabled={busy}
              />
            </FormField>
          </FormGrid>
        </FormSection>
        {hideActions ? null : (
          <FormActions>
            <Button type="submit" size="sm" loading={loading} disabled={busy}>
              {isEdit ? "Save changes" : "Issue penalty"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onCancel ?? undefined}>
              Cancel
            </Button>
          </FormActions>
        )}
      </FormContainer>
    </form>
  );
}
