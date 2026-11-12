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
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { unwrap } from "@/lib/apiUnwrap";

export default function HrmsLeaveTypeEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState({ title: "", quarterly_leave: "0", status: "active", counts_toward_balance: true });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await hrmsService.getLeaveType(id);
        const row = unwrap(res);
        setForm({
          title: row?.title || "",
          quarterly_leave: row?.quarterly_leave != null ? String(row.quarterly_leave) : "0",
          status: row?.status || "active",
          counts_toward_balance: row?.counts_toward_balance !== false,
        });
      } catch (err) {
        toastErrorFromApi(err, "Load failed");
        router.push("/hrms/leave-types");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

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
      await hrmsService.updateLeaveType(id, {
        title: form.title.trim(),
        quarterly_leave: Number(form.quarterly_leave) || 0,
        status: form.status,
        counts_toward_balance: !!form.counts_toward_balance,
      });
      toastSuccess("Leave type updated");
      router.push("/hrms/leave-types");
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
      <AddEditPageShell title="Edit Leave Type" listHref="/hrms/leave-types" listLabel="Leave Types">
        <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
          <FormContainer>
            <FormSection
              variant="card"
              title="Leave type"
              description="Entitlement per quarter and whether it deducts from the balance"
            >
              <FormGrid>
                <FormField>
                  <Input label="Title" name="title" value={form.title} onChange={(e) => setField("title", e.target.value)} error={!!errors.title} helperText={errors.title} required />
                </FormField>
                <FormField>
                  <Input label="Quarterly Entitlement" name="quarterly_leave" type="number" value={form.quarterly_leave} onChange={(e) => setField("quarterly_leave", e.target.value)} />
                </FormField>
                <FormField>
                  <Select label="Status" name="status" value={form.status} onChange={(e) => setField("status", e.target.value)}>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormField>
                <FormField>
                  <Checkbox name="counts_toward_balance" label="Counts toward leave balance" checked={!!form.counts_toward_balance} onChange={(e) => setField("counts_toward_balance", e.target.checked)} />
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
