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
import HtmlTemplateField from "@/components/common/HtmlTemplateField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsLetterTemplateAddPage() {
  const router = useRouter();
  const [types, setTypes] = useState([]);
  const [placeholders, setPlaceholders] = useState({});
  const [form, setForm] = useState({
    letter_type: "",
    title: "",
    content: "",
    status: "active",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    hrmsService
      .getLetterTemplateMeta()
      .then((res) => {
        const meta = unwrap(res) || {};
        setTypes(meta.types || []);
        setPlaceholders(meta.placeholders || {});
      })
      .catch(() => {});
  }, []);

  const typePlaceholders = useMemo(() => {
    if (!form.letter_type) return {};
    return placeholders[form.letter_type] || {};
  }, [form.letter_type, placeholders]);

  const setField = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "letter_type" && !f.title) {
        const label = types.find((t) => t.value === value)?.label;
        if (label) next.title = label;
      }
      return next;
    });
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.letter_type) errs.letter_type = "Letter type is required";
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.content.trim()) errs.content = "Content is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await hrmsService.createLetterTemplate({
        letter_type: form.letter_type,
        title: form.title.trim(),
        content: form.content.trim(),
        status: form.status,
      });
      toastSuccess("Letter template created");
      router.push("/hrms/letter-templates");
    } catch (err) {
      toastErrorFromApi(err, "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell
        title="Add letter template"
        listHref="/hrms/letter-templates"
        listLabel="Letter templates"
      >
        <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
          <FormContainer>
            <FormSection
              variant="card"
              title="Template"
              description="One template per letter type. Insert placeholders from the chip list."
            >
              <FormGrid>
                <FormField>
                  <Select
                    label="Letter type"
                    name="letter_type"
                    value={form.letter_type}
                    onChange={(e) => setField("letter_type", e.target.value)}
                    error={!!errors.letter_type}
                    helperText={errors.letter_type}
                    required
                  >
                    <MenuItem value="">Select type</MenuItem>
                    {types.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
                <FormField>
                  <Input
                    label="Title"
                    name="title"
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    error={!!errors.title}
                    helperText={errors.title}
                    required
                  />
                </FormField>
                <FormField>
                  <Select
                    label="Status"
                    name="status"
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormField>
              </FormGrid>
              <div className="mt-3">
                <HtmlTemplateField
                  name="content"
                  label="Content"
                  value={form.content}
                  onChange={(e) => setField("content", e.target.value)}
                  placeholders={typePlaceholders}
                  error={!!errors.content}
                  helperText={errors.content}
                  required
                  minRows={12}
                />
              </div>
            </FormSection>
            <FormActions>
              <Button type="submit" size="sm" loading={saving}>
                Save
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
