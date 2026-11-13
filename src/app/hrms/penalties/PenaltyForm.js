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
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const EMPTY = { title: "", amount: "", status: "active" };

/**
 * Shared create/edit form for a penalty type.
 * `penaltyId` omitted → create mode.
 */
export default function PenaltyForm({ penaltyId = null }) {
  const router = useRouter();
  const isEdit = !!penaltyId;

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await hrmsService.getPenalty(penaltyId);
        const row = unwrap(res);
        if (!cancelled && row) {
          setForm({
            title: row.title || "",
            amount: row.amount != null ? String(row.amount) : "",
            status: row.status || "active",
          });
        }
      } catch (err) {
        toastErrorFromApi(err, "Could not load penalty");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, penaltyId]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    const amountNum = Number(form.amount);
    if (form.amount === "" || !Number.isFinite(amountNum)) {
      errs.amount = "Amount is required";
    } else if (amountNum < 0) {
      errs.amount = "Amount must be 0 or more";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      amount: Math.round(amountNum * 100) / 100,
      status: form.status,
    };
    try {
      if (isEdit) {
        await hrmsService.updatePenalty(penaltyId, payload);
        toastSuccess("Penalty updated");
      } else {
        await hrmsService.createPenalty(payload);
        toastSuccess("Penalty created");
      }
      router.push("/hrms/penalties");
    } catch (err) {
      toastErrorFromApi(err, isEdit ? "Update failed" : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell
        title={isEdit ? "Edit Penalty" : "Add Penalty"}
        listHref="/hrms/penalties"
        listLabel="Penalties"
      >
        <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
          <FormContainer>
            <FormSection
              variant="card"
              step={1}
              title="Penalty type"
              description="A short name and the standard amount charged when this penalty is issued"
            >
              <FormGrid>
                <FormField>
                  <Input
                    label="Title"
                    name="title"
                    placeholder="e.g. Late Coming"
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    error={!!errors.title}
                    helperText={errors.title}
                    required
                    disabled={loading}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Amount (₹)"
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setField("amount", e.target.value)}
                    error={!!errors.amount}
                    helperText={errors.amount || "Snapshot at issue time — later edits do not change past issues"}
                    required
                    disabled={loading}
                  />
                </FormField>
                <FormField>
                  <Select
                    label="Status"
                    name="status"
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                    disabled={loading}
                    helperText="Only active penalties can be issued"
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormField>
              </FormGrid>
            </FormSection>
            <FormActions>
              <Button type="submit" size="sm" loading={saving} disabled={loading}>
                {isEdit ? "Save changes" : "Create penalty"}
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
