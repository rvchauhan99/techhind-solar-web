"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import * as hrmsService from "@/services/hrmsService";
import { unwrap } from "@/lib/apiUnwrap";

const EMPTY = { title: "", department_id: "", status: "active" };

function toFormState(row) {
  if (!row) return { ...EMPTY };
  return {
    title: row.title || "",
    department_id: row.department_id != null ? String(row.department_id) : "",
    status: row.status || "active",
  };
}

/**
 * Shared create/edit form for a designation (shell-free).
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
export default function DesignationForm({
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
  const [departments, setDepartments] = useState([]);

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

  useEffect(() => {
    let cancelled = false;
    hrmsService
      .listDepartments({ limit: 100 })
      .then((res) => {
        if (!cancelled) setDepartments(unwrap(res)?.data || []);
      })
      .catch(() => {
        if (!cancelled) setDepartments([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const deptOptions = useMemo(
    () => departments.map((d) => ({ value: String(d.id), label: d.title })),
    [departments]
  );

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
    if (key === "title" && serverError) onClearServerError();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.department_id) errs.department_id = "Department is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSubmit?.({
      title: form.title.trim(),
      department_id: Number(form.department_id),
      status: form.status,
    });
  };

  return (
    <form id="hrms-designation-form" onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} noValidate>
      <FormContainer>
        <FormSection
          variant={variant}
          title="Designation details"
          description="Job title and the department it belongs to"
        >
          <FormGrid cols={2}>
            <FormField>
              <Input
                label="Title"
                name="title"
                placeholder="e.g. Sales Executive"
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
                label="Department"
                name="department_id"
                value={form.department_id}
                onChange={(e) => setField("department_id", e.target.value)}
                error={!!errors.department_id}
                helperText={errors.department_id}
                required
                disabled={loading}
              >
                {deptOptions.map((d) => (
                  <MenuItem key={d.value} value={d.value}>
                    {d.label}
                  </MenuItem>
                ))}
              </Select>
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
              {isEdit ? "Save changes" : "Create designation"}
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
