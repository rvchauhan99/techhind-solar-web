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
import * as hrmsService from "@/services/hrmsService";

export default function HrmsLeaveTypeEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [quarterlyLeave, setQuarterlyLeave] = useState("0");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    hrmsService
      .getLeaveType(id)
      .then((res) => {
        const row = res?.result ?? res?.data ?? res;
        setTitle(row.title || "");
        setQuarterlyLeave(String(row.quarterly_leave ?? "0"));
        setStatus(row.status || "active");
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Failed to load");
        router.push("/hrms/leave-types");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      await hrmsService.updateLeaveType(id, {
        title: title.trim(),
        quarterly_leave: Number(quarterlyLeave) || 0,
        status,
      });
      toast.success("Leave type updated");
      router.push("/hrms/leave-types");
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
      <AddEditPageShell title="Edit Leave Type" listHref="/hrms/leave-types" listLabel="Leave Types">
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <FormContainer>
            <FormSection title="Leave type">
              <FormGrid cols={2}>
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
                  <Input
                    label="Quarterly entitlement"
                    name="quarterly_leave"
                    type="number"
                    value={quarterlyLeave}
                    onChange={(e) => setQuarterlyLeave(e.target.value)}
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.push("/hrms/leave-types")}
              >
                Cancel
              </Button>
            </FormActions>
          </FormContainer>
        </form>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
