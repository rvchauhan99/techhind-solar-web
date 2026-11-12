"use client";

import { useState } from "react";
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
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsHolidayAddPage() {
  const router = useRouter();
  const [form, setForm] = useState({ holiday_date: "", title: "", status: "active" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.holiday_date) errs.holiday_date = "Date is required";
    if (!form.title.trim()) errs.title = "Title is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await hrmsService.createHoliday({ holiday_date: form.holiday_date, title: form.title.trim(), status: form.status });
      toastSuccess("Holiday created");
      router.push("/hrms/holidays");
    } catch (err) {
      toastErrorFromApi(err, "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add Holiday" listHref="/hrms/holidays" listLabel="Holidays">
        <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
          <FormContainer>
            <FormSection
              variant="card"
              title="Holiday"
              description="Date, name and whether it counts as a company holiday"
            >
              <FormGrid>
                <FormField>
                  <DateField label="Date" name="holiday_date" value={form.holiday_date} onChange={(e) => setField("holiday_date", e.target.value)} error={!!errors.holiday_date} helperText={errors.holiday_date} required />
                </FormField>
                <FormField>
                  <Input label="Title" name="title" value={form.title} onChange={(e) => setField("title", e.target.value)} error={!!errors.title} helperText={errors.title} required />
                </FormField>
                <FormField>
                  <Select label="Status" name="status" value={form.status} onChange={(e) => setField("status", e.target.value)}>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormField>
              </FormGrid>
            </FormSection>
            <FormActions>
              <Button type="submit" size="sm" loading={saving}>Save</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </FormActions>
          </FormContainer>
        </form>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
