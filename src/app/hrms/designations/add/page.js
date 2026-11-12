"use client";

import { useEffect, useState } from "react";
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
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { unwrap } from "@/lib/apiUnwrap";

export default function HrmsDesignationAddPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", department_id: "", status: "active" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    hrmsService
      .listDepartments({ limit: 100 })
      .then((res) => {
        setDepartments(unwrap(res)?.data || []);
      })
      .catch(() => setDepartments([]));
  }, []);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.department_id) errs.department_id = "Department is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await hrmsService.createDesignation({
        title: form.title.trim(),
        department_id: Number(form.department_id),
        status: form.status,
      });
      toastSuccess("Designation created");
      router.push("/hrms/designations");
    } catch (err) {
      toastErrorFromApi(err, "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add Designation" listHref="/hrms/designations" listLabel="Designations">
        <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
          <FormContainer>
            <FormSection
              variant="card"
              title="Designation details"
              description="Job title and the department it belongs to"
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
                  <Select
                    label="Department"
                    name="department_id"
                    value={form.department_id}
                    onChange={(e) => setField("department_id", e.target.value)}
                    error={!!errors.department_id}
                    helperText={errors.department_id}
                    required
                    placeholder="Select department"
                  >
                    {departments.map((d) => (
                      <MenuItem key={d.id} value={String(d.id)}>
                        {d.title}
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
