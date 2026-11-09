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
import Checkbox from "@/components/common/Checkbox";
import * as hrmsService from "@/services/hrmsService";

const EMPTY = {
  basic_salary_per_month: "0",
  hra_per_month: "0",
  hra_per_month_manual: false,
  conveyance_allow_per_month: "0",
  conveyance_allow_per_month_manual: false,
  medical_allow_per_month: "0",
  medical_allow_per_month_manual: false,
  other_allow_per_month: "0",
  other_allow_per_month_manual: false,
  employer_pf_contribution_per_month: "0",
  employer_esic_contribution_per_month: "0",
  ctc_employer_pf_contribution_per_month: "0",
  ctc_employer_esic_contribution_per_month: "0",
  ctc_employer_esic_contribution_per_month_manual: false,
  pt_per_month: "0",
  net_take_home: "0",
};

function fromRow(row) {
  if (!row) return { ...EMPTY };
  const next = { ...EMPTY };
  for (const k of Object.keys(EMPTY)) {
    if (row[k] != null) next[k] = String(row[k]);
  }
  next.hra_per_month_manual = Boolean(row.hra_per_month_manual);
  next.conveyance_allow_per_month_manual = Boolean(row.conveyance_allow_per_month_manual);
  next.medical_allow_per_month_manual = Boolean(row.medical_allow_per_month_manual);
  next.other_allow_per_month_manual = Boolean(row.other_allow_per_month_manual);
  next.ctc_employer_esic_contribution_per_month_manual = Boolean(
    row.ctc_employer_esic_contribution_per_month_manual
  );
  return next;
}

export default function HrmsEmployeeAnnexurePage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [history, setHistory] = useState([]);
  const [increments, setIncrements] = useState([]);
  const [incForm, setIncForm] = useState({ effective_month: "", salary: "" });
  const [empLabel, setEmpLabel] = useState(`Employee #${id}`);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true);
    try {
      const [empRes, annRes, incRes] = await Promise.all([
        hrmsService.getEmployee(id),
        hrmsService.getEmployeeAnnexure(id, { history: 1 }),
        hrmsService.listEmployeeSalaryIncrements(id),
      ]);
      const emp = empRes?.result ?? empRes?.data ?? empRes;
      setEmpLabel(`${emp?.emp_code || id}${emp?.user?.name ? ` — ${emp.user.name}` : ""}`);
      const ann = annRes?.result ?? annRes?.data ?? annRes;
      setForm(fromRow(ann?.current));
      setHistory(ann?.history || []);
      const incPayload = incRes?.result ?? incRes?.data ?? incRes;
      setIncrements(incPayload?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load annexure");
      router.push(`/hrms/employees/${id}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await hrmsService.upsertEmployeeAnnexure(id, {
        ...form,
        basic_salary_per_month: Number(form.basic_salary_per_month),
        hra_per_month: Number(form.hra_per_month),
        conveyance_allow_per_month: Number(form.conveyance_allow_per_month),
        medical_allow_per_month: Number(form.medical_allow_per_month),
        other_allow_per_month: Number(form.other_allow_per_month),
        employer_pf_contribution_per_month: Number(form.employer_pf_contribution_per_month),
        employer_esic_contribution_per_month: Number(form.employer_esic_contribution_per_month),
        ctc_employer_pf_contribution_per_month: Number(
          form.ctc_employer_pf_contribution_per_month
        ),
        ctc_employer_esic_contribution_per_month: Number(
          form.ctc_employer_esic_contribution_per_month
        ),
        pt_per_month: Number(form.pt_per_month),
        net_take_home: Number(form.net_take_home),
      });
      toast.success("Annexure saved");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onIncrement = async () => {
    if (!incForm.effective_month || !incForm.salary) {
      toast.error("Effective month and salary are required");
      return;
    }
    setSaving(true);
    try {
      await hrmsService.createEmployeeSalaryIncrement(id, {
        effective_month: incForm.effective_month,
        salary: Number(incForm.salary),
      });
      toast.success("Increment applied");
      setIncForm({ effective_month: "", salary: "" });
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Increment failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-3 text-sm text-muted-foreground">Loading annexure…</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AddEditPageShell
        title={`Annexure — ${empLabel}`}
        listHref={`/hrms/employees/${id}`}
        listLabel="Employee"
      >
        <form onSubmit={onSave} className="flex flex-col flex-1 min-h-0">
          <FormContainer>
            <FormSection title="Earnings (A)">
              <FormGrid cols={2}>
                <FormField>
                  <Input
                    label="Basic / month *"
                    name="basic_salary_per_month"
                    type="number"
                    step="0.01"
                    value={form.basic_salary_per_month}
                    onChange={(e) => setField("basic_salary_per_month", e.target.value)}
                    required
                  />
                </FormField>
                <FormField>
                  <Input
                    label="HRA / month"
                    name="hra_per_month"
                    type="number"
                    step="0.01"
                    value={form.hra_per_month}
                    onChange={(e) => setField("hra_per_month", e.target.value)}
                  />
                  <div className="mt-1">
                    <Checkbox
                      label="Manual HRA"
                      checked={form.hra_per_month_manual}
                      onCheckedChange={(v) => setField("hra_per_month_manual", Boolean(v))}
                    />
                  </div>
                </FormField>
                <FormField>
                  <Input
                    label="Conveyance / month"
                    name="conveyance_allow_per_month"
                    type="number"
                    step="0.01"
                    value={form.conveyance_allow_per_month}
                    onChange={(e) => setField("conveyance_allow_per_month", e.target.value)}
                  />
                  <div className="mt-1">
                    <Checkbox
                      label="Manual conveyance"
                      checked={form.conveyance_allow_per_month_manual}
                      onCheckedChange={(v) =>
                        setField("conveyance_allow_per_month_manual", Boolean(v))
                      }
                    />
                  </div>
                </FormField>
                <FormField>
                  <Input
                    label="Medical / month"
                    name="medical_allow_per_month"
                    type="number"
                    step="0.01"
                    value={form.medical_allow_per_month}
                    onChange={(e) => setField("medical_allow_per_month", e.target.value)}
                  />
                  <div className="mt-1">
                    <Checkbox
                      label="Manual medical"
                      checked={form.medical_allow_per_month_manual}
                      onCheckedChange={(v) =>
                        setField("medical_allow_per_month_manual", Boolean(v))
                      }
                    />
                  </div>
                </FormField>
                <FormField>
                  <Input
                    label="Other / month"
                    name="other_allow_per_month"
                    type="number"
                    step="0.01"
                    value={form.other_allow_per_month}
                    onChange={(e) => setField("other_allow_per_month", e.target.value)}
                  />
                  <div className="mt-1">
                    <Checkbox
                      label="Manual other"
                      checked={form.other_allow_per_month_manual}
                      onCheckedChange={(v) =>
                        setField("other_allow_per_month_manual", Boolean(v))
                      }
                    />
                  </div>
                </FormField>
              </FormGrid>
            </FormSection>

            <FormSection title="Employer contributions (B)">
              <FormGrid cols={2}>
                <FormField>
                  <Input
                    label="Employer PF / month"
                    name="employer_pf_contribution_per_month"
                    type="number"
                    step="0.01"
                    value={form.employer_pf_contribution_per_month}
                    onChange={(e) =>
                      setField("employer_pf_contribution_per_month", e.target.value)
                    }
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Employer ESI / month"
                    name="employer_esic_contribution_per_month"
                    type="number"
                    step="0.01"
                    value={form.employer_esic_contribution_per_month}
                    onChange={(e) =>
                      setField("employer_esic_contribution_per_month", e.target.value)
                    }
                  />
                </FormField>
              </FormGrid>
            </FormSection>

            <FormSection title="CTC / deductions (C)">
              <FormGrid cols={2}>
                <FormField>
                  <Input
                    label="CTC Employer PF / month"
                    name="ctc_employer_pf_contribution_per_month"
                    type="number"
                    step="0.01"
                    value={form.ctc_employer_pf_contribution_per_month}
                    onChange={(e) =>
                      setField("ctc_employer_pf_contribution_per_month", e.target.value)
                    }
                  />
                </FormField>
                <FormField>
                  <Input
                    label="CTC Employer ESI / month"
                    name="ctc_employer_esic_contribution_per_month"
                    type="number"
                    step="0.01"
                    value={form.ctc_employer_esic_contribution_per_month}
                    onChange={(e) =>
                      setField("ctc_employer_esic_contribution_per_month", e.target.value)
                    }
                  />
                  <div className="mt-1">
                    <Checkbox
                      label="Manual CTC ESI"
                      checked={form.ctc_employer_esic_contribution_per_month_manual}
                      onCheckedChange={(v) =>
                        setField(
                          "ctc_employer_esic_contribution_per_month_manual",
                          Boolean(v)
                        )
                      }
                    />
                  </div>
                </FormField>
                <FormField>
                  <Input
                    label="PT / month"
                    name="pt_per_month"
                    type="number"
                    step="0.01"
                    value={form.pt_per_month}
                    onChange={(e) => setField("pt_per_month", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Net take-home / month"
                    name="net_take_home"
                    type="number"
                    step="0.01"
                    value={form.net_take_home}
                    onChange={(e) => setField("net_take_home", e.target.value)}
                  />
                </FormField>
              </FormGrid>
            </FormSection>

            <FormActions>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving…" : "Save annexure"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.push(`/hrms/employees/${id}`)}
              >
                Back
              </Button>
            </FormActions>

            <FormSection title="Salary increment">
              <p className="text-xs text-muted-foreground mb-2">
                Creates a new annexure version and keeps the previous one as superseded.
              </p>
              <FormGrid cols={2}>
                <FormField>
                  <Input
                    label="Effective month (YYYY-MM)"
                    name="effective_month"
                    type="month"
                    value={incForm.effective_month}
                    onChange={(e) =>
                      setIncForm((f) => ({ ...f, effective_month: e.target.value }))
                    }
                  />
                </FormField>
                <FormField>
                  <Input
                    label="New basic / salary"
                    name="salary"
                    type="number"
                    step="0.01"
                    value={incForm.salary}
                    onChange={(e) => setIncForm((f) => ({ ...f, salary: e.target.value }))}
                  />
                </FormField>
              </FormGrid>
              <div className="mt-2">
                <Button type="button" size="sm" disabled={saving} onClick={onIncrement}>
                  Apply increment
                </Button>
              </div>
              {increments.length > 0 && (
                <div className="mt-3 overflow-x-auto text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-1 pr-2">Month</th>
                        <th className="py-1 pr-2">Salary</th>
                        <th className="py-1 pr-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {increments.map((r) => (
                        <tr key={r.id} className="border-b">
                          <td className="py-1 pr-2">{r.effective_month}</td>
                          <td className="py-1 pr-2">{r.salary}</td>
                          <td className="py-1 pr-2 capitalize">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </FormSection>

            <FormSection title="Annexure history">
              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-1 pr-2">ID</th>
                      <th className="py-1 pr-2">Basic</th>
                      <th className="py-1 pr-2">HRA</th>
                      <th className="py-1 pr-2">Net</th>
                      <th className="py-1 pr-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="py-1 pr-2">{r.id}</td>
                        <td className="py-1 pr-2">{r.basic_salary_per_month}</td>
                        <td className="py-1 pr-2">
                          {r.hra_per_month}
                          {r.hra_per_month_manual ? " (M)" : ""}
                        </td>
                        <td className="py-1 pr-2">{r.net_take_home}</td>
                        <td className="py-1 pr-2 capitalize">{r.status}</td>
                      </tr>
                    ))}
                    {!history.length && (
                      <tr>
                        <td colSpan={5} className="py-2 text-muted-foreground">
                          No versions yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </FormSection>
          </FormContainer>
        </form>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
