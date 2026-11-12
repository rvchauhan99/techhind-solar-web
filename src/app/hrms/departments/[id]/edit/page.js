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
import AutocompleteField from "@/components/common/AutocompleteField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { unwrap } from "@/lib/apiUnwrap";

export default function HrmsDepartmentEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState({ title: "", status: "active", department_head_user_id: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [deptRes, empRes] = await Promise.all([
          hrmsService.getDepartment(id),
          hrmsService.listEmployees({ limit: 100, status: "active" }).catch(() => null),
        ]);
        if (cancelled) return;
        const row = unwrap(deptRes);
        setForm({
          title: row?.title || "",
          status: row?.status || "active",
          department_head_user_id:
            row?.department_head_user_id != null ? String(row.department_head_user_id) : "",
        });
        setEmployees(unwrap(empRes)?.data || []);
      } catch (err) {
        toastErrorFromApi(err, "Load failed");
        router.push("/hrms/departments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const headOptions = useMemo(
    () =>
      employees
        .filter((e) => e.user_id)
        .map((e) => ({ value: String(e.user_id), label: e.user?.name || e.emp_code || `User ${e.user_id}` })),
    [employees]
  );

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await hrmsService.updateDepartment(id, {
        title: form.title.trim(),
        status: form.status,
        department_head_user_id: form.department_head_user_id ? Number(form.department_head_user_id) : null,
      });
      toastSuccess("Department updated");
      router.push("/hrms/departments");
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
      <AddEditPageShell title="Edit Department" listHref="/hrms/departments" listLabel="Departments">
        <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
          <FormContainer>
            <FormSection
              variant="card"
              title="Department details"
              description="Name the department and pick the person who heads it"
            >
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
                  <AutocompleteField
                    label="Department Head (optional)"
                    placeholder="Select employee"
                    options={headOptions}
                    getOptionLabel={(o) => o?.label ?? ""}
                    value={form.department_head_user_id}
                    onChange={(e, opt) => setField("department_head_user_id", opt?.value ?? "")}
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
