"use client";

import { useEffect, useState } from "react";
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
import DateField from "@/components/common/DateField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsPolicyEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: "",
    category: "",
    version: "",
    issue_date: "",
    status: "active",
  });
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [metaRes, rowRes] = await Promise.all([
          hrmsService.getPolicyMeta(),
          hrmsService.getPolicy(id),
        ]);
        if (cancelled) return;
        setCategories(unwrap(metaRes)?.categories || []);
        const row = unwrap(rowRes) || {};
        setForm({
          title: row.title || "",
          category: row.category || "",
          version: row.version || "",
          issue_date: row.issue_date || "",
          status: row.status === "inactive" ? "inactive" : "active",
        });
        setFileName(row.file_name || "");
      } catch (err) {
        toastErrorFromApi(err, "Failed to load policy");
        router.push("/hrms/policies");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.category) errs.category = "Category is required";
    if (!form.version.trim()) errs.version = "Version is required";
    if (!form.issue_date) errs.issue_date = "Issue date is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("category", form.category);
      fd.append("version", form.version.trim());
      fd.append("issue_date", form.issue_date);
      fd.append("status", form.status);
      if (file) fd.append("document", file);
      await hrmsService.updatePolicy(id, fd);
      toastSuccess("Policy updated");
      router.push("/hrms/policies");
    } catch (err) {
      toastErrorFromApi(err, "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-4 text-sm text-muted-foreground">Loading…</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Edit policy" listHref="/hrms/policies" listLabel="Policies">
        <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
          <FormContainer>
            <FormSection variant="card" title="Policy" description="Replace PDF only if uploading a new file.">
              <FormGrid>
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
                    label="Category"
                    name="category"
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                    error={!!errors.category}
                    helperText={errors.category}
                    required
                  >
                    {categories.map((c) => (
                      <MenuItem key={c.value} value={c.value}>
                        {c.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
                <FormField>
                  <Input
                    label="Version"
                    name="version"
                    value={form.version}
                    onChange={(e) => setField("version", e.target.value)}
                    error={!!errors.version}
                    helperText={errors.version}
                    required
                  />
                </FormField>
                <FormField>
                  <DateField
                    label="Issue date"
                    name="issue_date"
                    value={form.issue_date}
                    onChange={(e) => setField("issue_date", e.target.value)}
                    error={!!errors.issue_date}
                    helperText={errors.issue_date}
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
                <FormField>
                  <label className="mb-1.5 block text-sm font-medium">PDF (optional replace)</label>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Current: {fileName || "—"} · Max 1 MB
                  </p>
                </FormField>
              </FormGrid>
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
