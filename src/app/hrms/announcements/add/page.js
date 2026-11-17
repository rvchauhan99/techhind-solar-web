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
import DateField from "@/components/common/DateField";
import Checkbox from "@/components/common/Checkbox";
import HtmlTemplateField from "@/components/common/HtmlTemplateField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsAnnouncementAddPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "active",
    department_ids: [],
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    hrmsService
      .getAnnouncementMeta()
      .then((res) => setDepartments(unwrap(res)?.departments || []))
      .catch(() => setDepartments([]));
  }, []);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const toggleDept = (id) => {
    const n = Number(id);
    setForm((f) => {
      const set = new Set((f.department_ids || []).map(Number));
      if (set.has(n)) set.delete(n);
      else set.add(n);
      return { ...f, department_ids: Array.from(set) };
    });
    if (errors.department_ids) setErrors((p) => ({ ...p, department_ids: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.description.trim()) errs.description = "Description is required";
    if (!form.start_date) errs.start_date = "Start date is required";
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      errs.end_date = "End date cannot be before start date";
    }
    if (!(form.department_ids || []).length) errs.department_ids = "Select at least one department";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await hrmsService.createAnnouncement({
        title: form.title.trim(),
        description: form.description.trim(),
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: form.status,
        department_ids: form.department_ids.map(Number),
      });
      toastSuccess("Announcement created");
      router.push("/hrms/announcements");
    } catch (err) {
      toastErrorFromApi(err, "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add announcement" listHref="/hrms/announcements" listLabel="Announcements">
        <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
          <FormContainer>
            <FormSection
              variant="card"
              title="Announcement"
              description="Target one or more departments. Employees only see active items in the date window."
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
                  <DateField
                    label="Start date"
                    name="start_date"
                    value={form.start_date}
                    onChange={(e) => setField("start_date", e.target.value)}
                    error={!!errors.start_date}
                    helperText={errors.start_date}
                    required
                  />
                </FormField>
                <FormField>
                  <DateField
                    label="End date"
                    name="end_date"
                    value={form.end_date}
                    onChange={(e) => setField("end_date", e.target.value)}
                    error={!!errors.end_date}
                    helperText={errors.end_date || "Leave blank for open-ended"}
                  />
                </FormField>
              </FormGrid>

              <FormField className="mt-3">
                <div className="mb-1.5 text-sm font-medium">
                  Departments <span className="text-destructive">*</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {departments.map((d) => (
                    <Checkbox
                      key={d.id}
                      name={`dept_${d.id}`}
                      label={d.title || d.label}
                      checked={(form.department_ids || []).map(Number).includes(Number(d.id))}
                      onChange={() => toggleDept(d.id)}
                    />
                  ))}
                </div>
                {errors.department_ids ? (
                  <p className="mt-1.5 text-xs text-destructive">{errors.department_ids}</p>
                ) : null}
              </FormField>

              <FormField className="mt-3">
                <HtmlTemplateField
                  name="description"
                  label="Description"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholders={{}}
                  error={!!errors.description}
                  helperText={errors.description}
                  required
                  minRows={8}
                />
              </FormField>
            </FormSection>
            <FormActions>
              <Button type="button" variant="outline" onClick={() => router.push("/hrms/announcements")}>
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
