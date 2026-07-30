"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import Input from "@/components/common/Input";
import LoadingButton from "@/components/common/LoadingButton";
import { Button } from "@/components/ui/button";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import b2bClientService from "@/services/b2bClientService";
import b2bSalesPlanningService from "@/services/b2bSalesPlanningService";

export default function AddB2bSalesPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [intervalDays, setIntervalDays] = useState(30);
  const [form, setForm] = useState({
    client_id: "",
    client_label: "",
    plan_date: "",
    assigned_to: "",
    assigned_to_name: "",
    remarks: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    b2bSalesPlanningService
      .getB2bSalesPlanningConfig()
      .then((res) => {
        const cfg = res?.result ?? res;
        if (cfg?.interval_days) setIntervalDays(cfg.interval_days);
      })
      .catch(() => {});
  }, []);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.client_id) next.client_id = "Required";
    if (!form.plan_date) next.plan_date = "Required";
    if (!form.assigned_to) next.assigned_to = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError(null);
    try {
      const res = await b2bSalesPlanningService.createB2bSalesPlan({
        client_id: Number(form.client_id),
        plan_date: form.plan_date,
        assigned_to: Number(form.assigned_to),
        planning_interval_days: intervalDays,
        remarks: form.remarks || null,
      });
      const plan = res?.result ?? res;
      toast.success("Sales plan created");
      router.push(`/b2b-sales-planning/${plan.id}`);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to create plan";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell
        title="Add Sales Plan"
        listHref="/b2b-sales-planning"
        listLabel="Sales Planning"
      >
        <FormContainer>
          <form onSubmit={handleSubmit} className="space-y-3">
            {serverError && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {serverError}
              </div>
            )}
            <FormSection title="Plan Details">
              <FormGrid>
                <AutocompleteField
                  label="Client *"
                  placeholder="Search client..."
                  asyncLoadOptions={async (q) => {
                    const res = await b2bClientService.getB2bClients({
                      q,
                      limit: 20,
                      is_active: true,
                    });
                    return res?.result?.data ?? res?.data ?? res?.result?.rows ?? [];
                  }}
                  getOptionLabel={(c) =>
                    c
                      ? `${c.client_code ?? ""} – ${c.client_name ?? ""}`.trim()
                      : ""
                  }
                  value={
                    form.client_id
                      ? { id: form.client_id, client_name: form.client_label }
                      : null
                  }
                  onChange={(_e, v) => {
                    setField("client_id", v?.id ?? "");
                    setField(
                      "client_label",
                      v ? `${v.client_code ?? ""} – ${v.client_name ?? ""}` : ""
                    );
                  }}
                  error={!!errors.client_id}
                  helperText={errors.client_id}
                  required
                />
                <DateField
                  label="Plan Date *"
                  value={form.plan_date}
                  onChange={(e) => setField("plan_date", e?.target?.value || "")}
                  error={!!errors.plan_date}
                  helperText={errors.plan_date}
                  required
                />
                <AutocompleteField
                  label="Assigned To *"
                  referenceModel="user.model"
                  asyncLoadOptions={(q) =>
                    getReferenceOptionsSearch("user.model", { q, limit: 20 })
                  }
                  getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                  value={
                    form.assigned_to
                      ? { id: form.assigned_to, name: form.assigned_to_name }
                      : null
                  }
                  onChange={(_e, v) => {
                    setField("assigned_to", v?.id ?? "");
                    setField("assigned_to_name", v?.name ?? "");
                  }}
                  error={!!errors.assigned_to}
                  helperText={errors.assigned_to}
                  required
                />
                <Input
                  label="Planning Interval (days)"
                  value={String(intervalDays)}
                  disabled
                  helperText="From tenant config — used after first shipment"
                />
                <Input
                  label="Remarks"
                  value={form.remarks}
                  onChange={(e) => setField("remarks", e.target.value)}
                />
              </FormGrid>
            </FormSection>
            <FormActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/b2b-sales-planning")}
              >
                Cancel
              </Button>
              <LoadingButton type="submit" loading={loading}>
                Create Plan
              </LoadingButton>
            </FormActions>
          </form>
        </FormContainer>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
