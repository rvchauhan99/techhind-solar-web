"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsAttendanceRequestAddPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    request_type: "check_in",
    request_at: "",
    reason: "",
  });

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      toastErrorFromApi({ message: "Reason is required" }, "Reason is required");
      return;
    }
    setSaving(true);
    try {
      await hrmsService.createAttendanceRequest({
        request_type: form.request_type,
        request_at: form.request_at || new Date().toISOString(),
        reason: form.reason.trim(),
      });
      toastSuccess("Request submitted");
      router.push("/hrms/attendance-requests");
    } catch (err) {
      toastErrorFromApi(err, "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell
        title="New Attendance Request"
        listHref="/hrms/attendance-requests"
        listLabel="Attendance Requests"
      >
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <FormContainer>
            <FormSection
              variant="card"
              title="Correction request"
              description="What punch needs correcting, when it should have been, and why"
            >
              <FormGrid cols={2}>
                <FormField>
                  <Select
                    label="Request type *"
                    name="request_type"
                    value={form.request_type}
                    onChange={(e) => setField("request_type", e.target.value)}
                  >
                    <MenuItem value="check_in">Check in</MenuItem>
                    <MenuItem value="check_out">Check out</MenuItem>
                    <MenuItem value="break_in">Break in</MenuItem>
                    <MenuItem value="break_out">Break out</MenuItem>
                  </Select>
                </FormField>
                <FormField>
                  <Input
                    label="Requested date/time"
                    name="request_at"
                    type="datetime-local"
                    value={form.request_at}
                    onChange={(e) => setField("request_at", e.target.value)}
                  />
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
                {saving ? "Submitting…" : "Submit"}
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
