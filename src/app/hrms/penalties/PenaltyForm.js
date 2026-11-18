"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";

const EMPTY = { title: "", amount: "", status: "active" };

function toFormState(row) {
  if (!row) return { ...EMPTY };
  return {
    title: row.title || "",
    amount: row.amount != null ? String(row.amount) : "",
    status: row.status || "active",
  };
}

/**
 * Shared create/edit form for a penalty type (shell-free).
 * Rendered inside a Dialog on the list page and reused by the standalone
 * add and edit routes so the field logic lives in exactly one place.
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
export default function PenaltyForm({
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

  // Hydrate whenever the parent supplies a (newly fetched) record.
  useEffect(() => {
    setForm(toFormState(defaultValues));
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues]);

  // Surface duplicate-title API errors on the field.
  useEffect(() => {
    if (!serverError) return;
    const msg = String(serverError).toLowerCase();
    if (msg.includes("already exists")) {
      setErrors((prev) => ({ ...prev, title: serverError }));
    }
  }, [serverError]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
    if ((key === "title" || key === "amount") && serverError) onClearServerError();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    const amountNum = Number(form.amount);
    if (form.amount === "" || !Number.isFinite(amountNum)) {
      errs.amount = "Amount is required";
    } else if (amountNum < 0) {
      errs.amount = "Amount must be 0 or more";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSubmit?.({
      title: form.title.trim(),
      amount: Math.round(amountNum * 100) / 100,
      status: form.status,
    });
  };

  return (
    <form id="hrms-penalty-form" onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} noValidate>
      <FormContainer>
        <FormSection
          variant={variant}
          title="Penalty type"
          description="A short name and the standard amount charged when this penalty is issued"
        >
          <FormGrid cols={2}>
            <FormField>
              <Input
                label="Title"
                name="title"
                placeholder="e.g. Late Coming"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                error={!!errors.title}
                helperText={errors.title}
                required
                disabled={loading}
              />
            </FormField>
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
                helperText={errors.amount || "Snapshot at issue time — later edits do not change past issues"}
                required
                disabled={loading}
              />
            </FormField>
            <FormField>
              <Select
                label="Status"
                name="status"
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
                helperText="Only active penalties can be issued"
                disabled={loading}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormField>
          </FormGrid>
        </FormSection>
        {hideActions ? null : (
          <FormActions>
            <Button type="submit" size="sm" loading={loading} disabled={loading}>
              {isEdit ? "Save changes" : "Create penalty"}
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
