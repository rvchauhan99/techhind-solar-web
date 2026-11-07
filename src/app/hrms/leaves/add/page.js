"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import Checkbox from "@/components/common/Checkbox";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsLeaveAddPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    duration: "full",
    reason: "",
    title: "",
    is_emergency: false,
  });

  useEffect(() => {
    hrmsService
      .listLeaveTypes({ status: "active", limit: 100 })
      .then((res) => {
        const payload = res?.result ?? res?.data ?? res;
        setTypes(payload?.data || []);
      })
      .catch(() => toast.error("Failed to load leave types"));
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.leave_type_id) {
      toast.error("Leave type is required");
      return;
    }
    if (!form.start_date) {
      toast.error("Start date is required");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setSaving(true);
    try {
      await hrmsService.applyLeave({
        leave_type_id: Number(form.leave_type_id),
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
        duration: form.duration,
        reason: form.reason.trim(),
        title: form.title.trim() || undefined,
        is_emergency: form.is_emergency,
      });
      toast.success("Leave applied");
      router.push("/hrms/leaves");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Apply failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Apply Leave" listHref="/hrms/leaves" listLabel="Leaves">
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <FormContainer>
            <FormSection title="Leave details">
              <FormGrid cols={2}>
                <FormField>
                  <Select
                    label="Leave type *"
                    name="leave_type_id"
                    value={form.leave_type_id}
                    onChange={(e) => setField("leave_type_id", e.target.value)}
                  >
                    <MenuItem value="">Select type</MenuItem>
                    {types.map((t) => (
                      <MenuItem key={t.id} value={String(t.id)}>
                        {t.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
                <FormField>
                  <Select
                    label="Duration *"
                    name="duration"
                    value={form.duration}
                    onChange={(e) => setField("duration", e.target.value)}
                  >
                    <MenuItem value="half_am">Half day (AM)</MenuItem>
                    <MenuItem value="half_pm">Half day (PM)</MenuItem>
                    <MenuItem value="full">Full day</MenuItem>
                    <MenuItem value="multi">Multi-day</MenuItem>
                  </Select>
                </FormField>
                <FormField>
                  <Input
                    label="Start date *"
                    name="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setField("start_date", e.target.value)}
                    required
                  />
                </FormField>
                <FormField>
                  <Input
                    label="End date"
                    name="end_date"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setField("end_date", e.target.value)}
                    disabled={form.duration !== "multi"}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Title"
                    name="title"
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <div className="pt-6">
                    <Checkbox
                      label="Emergency leave"
                      checked={form.is_emergency}
                      onCheckedChange={(v) => setField("is_emergency", Boolean(v))}
                    />
                  </div>
                </FormField>
                <FormField className="sm:col-span-2">
                  <Input
                    label="Reason *"
                    name="reason"
                    value={form.reason}
                    onChange={(e) => setField("reason", e.target.value)}
                    required
                  />
                </FormField>
              </FormGrid>
            </FormSection>
            <FormActions>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Submitting…" : "Apply"}
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
