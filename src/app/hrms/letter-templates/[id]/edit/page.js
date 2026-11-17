"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function HrmsLetterTemplateEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [placeholders, setPlaceholders] = useState({});
  const [form, setForm] = useState({
    letter_type: "",
    letter_type_label: "",
    title: "",
    content: "",
    status: "active",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [metaRes, rowRes] = await Promise.all([
          hrmsService.getLetterTemplateMeta(),
          hrmsService.getLetterTemplate(id),
        ]);
        if (cancelled) return;
        const meta = unwrap(metaRes) || {};
        setPlaceholders(meta.placeholders || {});
        const row = unwrap(rowRes) || {};
        setForm({
          letter_type: row.letter_type || "",
          letter_type_label: row.letter_type_label || row.letter_type || "",
          title: row.title || "",
          content: row.content || "",
          status: row.status === "inactive" ? "inactive" : "active",
        });
      } catch (err) {
        toastErrorFromApi(err, "Failed to load template");
        router.push("/hrms/letter-templates");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const typePlaceholders = useMemo(() => {
    if (!form.letter_type) return {};
    return placeholders[form.letter_type] || {};
  }, [form.letter_type, placeholders]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.content.trim()) errs.content = "Content is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await hrmsService.updateLetterTemplate(id, {
        title: form.title.trim(),
        content: form.content.trim(),
        status: form.status,
      });
      toastSuccess("Letter template updated");
      router.push("/hrms/letter-templates");
    } catch (err) {
      toastErrorFromApi(err, "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell
        title="Edit letter template"
        listHref="/hrms/letter-templates"
        listLabel="Letter templates"
      >
        <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
          <FormContainer>
            <FormSection
              variant="card"
              title="Template"
              description="Letter type is fixed after create. Update title, content and status."
            >
              <FormGrid>
                <FormField>
                  <Input
                    label="Letter type"
                    name="letter_type_label"
                    value={form.letter_type_label}
                    disabled
                  />
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
              <Button type="submit" size="sm" loading={saving} disabled={loading}>
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
