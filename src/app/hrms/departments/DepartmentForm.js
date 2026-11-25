"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import AutocompleteField from "@/components/common/AutocompleteField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import * as hrmsService from "@/services/hrmsService";
import {
  getReferenceOptionsSearch,
  getReferenceOptionById,
} from "@/services/mastersService";

const EMPTY = { title: "", status: "active", department_head_user_id: "" };

function toFormState(row) {
  if (!row) return { ...EMPTY };
  return {
    title: row.title || "",
    status: row.status || "active",
    department_head_user_id:
      row.department_head_user_id != null ? String(row.department_head_user_id) : "",
  };
}

/**
 * Shared create/edit form for a department (shell-free).
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
export default function DepartmentForm({
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
      status: form.status,
      department_head_user_id: form.department_head_user_id
        ? Number(form.department_head_user_id)
        : null,
    });
  };

  return (
    <form id="hrms-department-form" onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} noValidate>
      <FormContainer>
        <FormSection
          variant={variant}
          title="Department details"
          description="Name the department and pick the person who heads it"
        >
          <FormGrid cols={2}>
            <FormField>
              <Input
                label="Title"
                name="title"
                placeholder="e.g. Engineering"
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
            <FormField>
              <AutocompleteField
                label="Department Head (optional)"
                placeholder="Type to search…"
                asyncLoadOptions={(q) =>
                  getReferenceOptionsSearch("user.model", { q, limit: 20, status: "active" })
                }
                resolveOptionById={(uid) => getReferenceOptionById("user.model", uid)}
                referenceModel="user.model"
                getOptionLabel={(o) => o?.label ?? o?.name ?? ""}
                value={form.department_head_user_id || null}
                onChange={(_e, opt) =>
                  setField("department_head_user_id", opt?.id != null ? String(opt.id) : "")
                }
                disabled={loading}
              />
            </FormField>
          </FormGrid>
        </FormSection>
        {hideActions ? null : (
          <FormActions>
            <Button type="submit" size="sm" loading={loading} disabled={loading}>
              {isEdit ? "Save changes" : "Create department"}
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
