"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";

const EMPTY = { holiday_date: "", title: "", status: "active" };

function toFormState(row) {
  if (!row) return { ...EMPTY };
  return {
    holiday_date: row.holiday_date ? String(row.holiday_date).slice(0, 10) : "",
    title: row.title || "",
    status: row.status || "active",
  };
}

/**
 * Shared create/edit form for a holiday (shell-free).
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
export default function HolidayForm({
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

  // Surface duplicate-date API errors on the field.
  useEffect(() => {
    if (!serverError) return;
    const msg = String(serverError).toLowerCase();
    if (msg.includes("already exists")) {
      setErrors((prev) => ({ ...prev, holiday_date: serverError }));
    }
  }, [serverError]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
    if ((key === "holiday_date" || key === "title") && serverError) onClearServerError();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.holiday_date) errs.holiday_date = "Date is required";
    if (!form.title.trim()) errs.title = "Title is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSubmit?.({ holiday_date: form.holiday_date, title: form.title.trim(), status: form.status });
  };

  return (
    <form id="hrms-holiday-form" onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} noValidate>
      <FormContainer>
        <FormSection
          variant={variant}
          title="Holiday"
          description="Date, name and whether it counts as a company holiday"
        >
          <FormGrid cols={2}>
            <FormField>
              <DateField
                label="Date"
                name="holiday_date"
                value={form.holiday_date}
                onChange={(e) => setField("holiday_date", e.target.value)}
                error={!!errors.holiday_date}
                helperText={errors.holiday_date}
                required
                disabled={loading}
              />
            </FormField>
            <FormField>
              <Input
                label="Title"
                name="title"
                placeholder="e.g. Republic Day"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                error={!!errors.title}
                helperText={errors.title}
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
              {isEdit ? "Save changes" : "Create holiday"}
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
