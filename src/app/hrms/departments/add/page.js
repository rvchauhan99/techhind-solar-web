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
import AutocompleteField from "@/components/common/AutocompleteField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { unwrap } from "@/lib/apiUnwrap";

export default function HrmsDepartmentAddPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", status: "active", department_head_user_id: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    hrmsService
      .listEmployees({ limit: 100, status: "active" })
      .then((res) => {
        setEmployees(unwrap(res)?.data || []);
      })
      .catch(() => setEmployees([]));
  }, []);

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
      await hrmsService.createDepartment({
        title: form.title.trim(),
        status: form.status,
        department_head_user_id: form.department_head_user_id ? Number(form.department_head_user_id) : null,
      });
      toastSuccess("Department created");
      router.push("/hrms/departments");
    } catch (err) {
      toastErrorFromApi(err, "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add Department" listHref="/hrms/departments" listLabel="Departments">
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
