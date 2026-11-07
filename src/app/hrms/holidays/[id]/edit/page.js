"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
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
import * as hrmsService from "@/services/hrmsService";

export default function HrmsHolidayEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    hrmsService
      .getHoliday(id)
      .then((res) => {
        const row = res?.result ?? res?.data ?? res;
        setTitle(row.title || "");
        setHolidayDate(row.holiday_date || "");
        setStatus(row.status || "active");
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Failed to load");
        router.push("/hrms/holidays");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !holidayDate) {
      toast.error("Title and date are required");
      return;
    }
    setSaving(true);
    try {
      await hrmsService.updateHoliday(id, {
        title: title.trim(),
        holiday_date: holidayDate,
        status,
      });
      toast.success("Holiday updated");
      router.push("/hrms/holidays");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-3 text-sm text-muted-foreground">Loading…</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Edit Holiday" listHref="/hrms/holidays" listLabel="Holidays">
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <FormContainer>
            <FormSection title="Holiday">
              <FormGrid cols={2}>
                <FormField>
                  <DateField
                    label="Date *"
                    name="holiday_date"
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    required
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Title *"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </FormField>
                <FormField>
                  <Select
                    label="Status"
                    name="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormField>
              </FormGrid>
            </FormSection>
            <FormActions>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => router.push("/hrms/holidays")}>
                Cancel
              </Button>
            </FormActions>
          </FormContainer>
        </form>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
