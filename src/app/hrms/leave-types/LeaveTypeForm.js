"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import Checkbox from "@/components/common/Checkbox";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";

const EMPTY = {
  title: "",
  quarterly_leave: "0",
  status: "active",
  counts_toward_balance: true,
  waives_late_mark: false,
};

function toFormState(row) {
  if (!row) return { ...EMPTY };
  return {
    title: row.title || "",
    quarterly_leave: row?.quarterly_leave != null ? String(row.quarterly_leave) : "0",
    status: row.status || "active",
    counts_toward_balance: row?.counts_toward_balance !== false,
    waives_late_mark: row?.waives_late_mark === true,
  };
}

/**
 * Shared create/edit form for a leave type (shell-free).
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
export default function LeaveTypeForm({
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
    if (key === "title" && serverError) onClearServerError();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSubmit?.({
      title: form.title.trim(),
      quarterly_leave: Number(form.quarterly_leave) || 0,
      status: form.status,
      counts_toward_balance: !!form.counts_toward_balance,
      waives_late_mark: !!form.waives_late_mark,
    });
  };

  return (
    <form id="hrms-leave-type-form" onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} noValidate>
      <FormContainer>
        <FormSection
          variant={variant}
          title="Leave type"
          description="Entitlement per quarter and whether it deducts from the balance"
        >
          <FormGrid cols={2}>
            <FormField>
              <Input
                label="Title"
                name="title"
                placeholder="e.g. Casual Leave"
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
                label="Quarterly Entitlement"
                name="quarterly_leave"
                type="number"
                min="0"
                value={form.quarterly_leave}
                onChange={(e) => setField("quarterly_leave", e.target.value)}
                disabled={loading}
              />
            </FormField>
            <FormField>
              <Select
                label="Status"
                name="status"
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
                disabled={loading}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormField>
            <FormField>
              <Checkbox
                name="counts_toward_balance"
                label="Counts toward leave balance"
                checked={!!form.counts_toward_balance}
                onChange={(e) => setField("counts_toward_balance", e.target.checked)}
                disabled={loading}
              />
            </FormField>
            <FormField>
              <Checkbox
                name="waives_late_mark"
                label="Waives late mark (treat day as present for late)"
                checked={!!form.waives_late_mark}
                onChange={(e) => setField("waives_late_mark", e.target.checked)}
                disabled={loading}
              />
            </FormField>
          </FormGrid>
        </FormSection>
        {hideActions ? null : (
          <FormActions>
            <Button type="submit" size="sm" loading={loading} disabled={loading}>
              {isEdit ? "Save changes" : "Create leave type"}
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
