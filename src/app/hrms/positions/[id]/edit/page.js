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
import Checkbox from "@/components/common/Checkbox";
import HtmlTemplateField from "@/components/common/HtmlTemplateField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsPositionEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({
    title: "",
    job_description: "",
    status: "active",
    branch_ids: [],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [metaRes, rowRes] = await Promise.all([
          hrmsService.getPositionMeta(),
          hrmsService.getPosition(id),
        ]);
        if (cancelled) return;
        setBranches(unwrap(metaRes)?.branches || []);
        const row = unwrap(rowRes) || {};
        setForm({
          title: row.title || "",
          job_description: row.job_description || "",
          status: row.status || "active",
          branch_ids: (row.branch_ids || []).map(Number),
        });
      } catch (err) {
        toastErrorFromApi(err, "Failed to load position");
        router.push("/hrms/positions");
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

  const toggleBranch = (branchId) => {
    const n = Number(branchId);
    setForm((f) => {
      const set = new Set((f.branch_ids || []).map(Number));
      if (set.has(n)) set.delete(n);
      else set.add(n);
      return { ...f, branch_ids: Array.from(set) };
    });
    if (errors.branch_ids) setErrors((p) => ({ ...p, branch_ids: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!(form.branch_ids || []).length) errs.branch_ids = "Select at least one branch";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await hrmsService.updatePosition(id, {
        title: form.title.trim(),
        job_description: form.job_description.trim() || null,
        status: form.status,
        branch_ids: form.branch_ids.map(Number),
      });
      toastSuccess("Position updated");
      router.push("/hrms/positions");
    } catch (err) {
      toastErrorFromApi(err, "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Edit position" listHref="/hrms/positions" listLabel="Open Positions">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : null}
        <form
          onSubmit={onSubmit}
          onKeyDown={preventEnterSubmit}
          className={loading ? "hidden" : undefined}
        >
          <FormContainer>
            <FormSection variant="card" title="Position">
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

              <FormField className="mt-3">
                <div className="mb-1.5 text-sm font-medium">
                  Branches <span className="text-destructive">*</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {branches.map((b) => (
                    <Checkbox
                      key={b.id}
                      name={`branch_${b.id}`}
                      label={b.name || b.label}
                      checked={(form.branch_ids || []).map(Number).includes(Number(b.id))}
                      onChange={() => toggleBranch(b.id)}
                    />
                  ))}
                </div>
                {errors.branch_ids ? (
                  <p className="mt-1.5 text-xs text-destructive">{errors.branch_ids}</p>
                ) : null}
              </FormField>

              <FormField className="mt-3">
                <HtmlTemplateField
                  name="job_description"
                  label="Job description"
                  value={form.job_description}
                  onChange={(e) => setField("job_description", e.target.value)}
                  placeholders={{}}
                  minRows={8}
                />
              </FormField>
            </FormSection>
            <FormActions>
              <Button type="button" variant="outline" onClick={() => router.push("/hrms/positions")}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save
              </Button>
            </FormActions>
          </FormContainer>
        </form>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
