"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import FormSectionNav from "@/components/common/FormSectionNav";
import Input from "@/components/common/Input";
import Checkbox from "@/components/common/Checkbox";
import StatusBadge from "@/components/common/StatusBadge";
import { IconCoin, IconBuildingFactory2, IconReceipt2, IconTrendingUp, IconHistory } from "@tabler/icons-react";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MONEY_FIELDS = [
  "basic_salary_per_month",
  "hra_per_month",
  "conveyance_allow_per_month",
  "medical_allow_per_month",
  "other_allow_per_month",
  "employer_pf_contribution_per_month",
  "employer_esic_contribution_per_month",
  "ctc_employer_pf_contribution_per_month",
  "ctc_employer_esic_contribution_per_month",
  "pt_per_month",
  "net_take_home",
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const formatMoney = (v) =>
  num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
      const emp = unwrap(empRes);
      setEmpLabel(`${emp?.emp_code || id}${emp?.user?.name ? ` — ${emp.user.name}` : ""}`);
      const ann = unwrap(annRes);
      setForm(fromRow(ann?.current));
      setHistory(ann?.history || []);
      setIncrements(unwrap(incRes)?.data || []);
    } catch (err) {
      toastErrorFromApi(err, "Failed to load annexure");
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
      toastSuccess("Annexure saved");
      await load();
    } catch (err) {
      toastErrorFromApi(err, "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onIncrement = async () => {
    if (!incForm.effective_month || !incForm.salary) {
      toastErrorFromApi(null, "Effective month and salary are required");
      return;
    }
    setSaving(true);
    try {
      await hrmsService.createEmployeeSalaryIncrement(id, {
        effective_month: incForm.effective_month,
        salary: Number(incForm.salary),
      });
      toastSuccess("Increment applied — a new annexure version was created");
      setIncForm({ effective_month: "", salary: "" });
      await load();
    } catch (err) {
      toastErrorFromApi(err, "Increment failed");
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    const earnings =
      num(form.basic_salary_per_month) +
      num(form.hra_per_month) +
      num(form.conveyance_allow_per_month) +
      num(form.medical_allow_per_month) +
      num(form.other_allow_per_month);
    const employer =
      num(form.employer_pf_contribution_per_month) + num(form.employer_esic_contribution_per_month);
    const ctcEmployer =
      num(form.ctc_employer_pf_contribution_per_month) + num(form.ctc_employer_esic_contribution_per_month);
    return {
      earnings,
      employer,
      ctcEmployer,
      monthlyCtc: earnings + employer + ctcEmployer,
      net: num(form.net_take_home),
    };
  }, [form]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-4 space-y-3">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted/60" />
            ))}
          </div>
          <div className="h-32 animate-pulse rounded-md bg-muted/40" />
        </div>
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
          <FormContainer className="space-y-2">
            <FormSectionNav
              sections={[
                { id: "ann-a", label: "A · Earnings" },
                { id: "ann-b", label: "B · Employer" },
                { id: "ann-c", label: "C · CTC" },
                { id: "ann-increment", label: "Increment" },
                { id: "ann-history", label: "History" },
              ]}
            />
            <div className="space-y-2">
            <FormSection
              variant="card"
              id="ann-a"
              step="A"
              icon={<IconCoin className="size-4" />}
              title="Earnings"
              description="Monthly gross components — basic and allowances"
            >
              <FormGrid cols={4}>
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

            <FormSection
              variant="card"
              id="ann-b"
              step="B"
              icon={<IconBuildingFactory2 className="size-4" />}
              title="Employer contributions"
              description="What the company pays on top of salary"
            >
              <FormGrid cols={4}>
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

            <FormSection
              variant="card"
              id="ann-c"
              step="C"
              icon={<IconReceipt2 className="size-4" />}
              title="CTC adjustments & take-home"
              description="PF/ESIC as counted in CTC, professional tax and the net payout"
            >
              <FormGrid cols={4}>
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

            <FormActions className="sticky bottom-0 flex-wrap items-center gap-2 border-t border-border bg-card/95 backdrop-blur">
              <div className="mr-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="text-muted-foreground">
                  A <span className="font-semibold text-foreground">₹ {formatMoney(totals.earnings)}</span>
                </span>
                <span className="text-muted-foreground">
                  B <span className="font-semibold text-foreground">₹ {formatMoney(totals.employer)}</span>
                </span>
                <span className="text-muted-foreground">
                  C <span className="font-semibold text-foreground">₹ {formatMoney(totals.ctcEmployer)}</span>
                </span>
                <span className="text-muted-foreground">
                  CTC{" "}
                  <span className="font-semibold text-[#00823b]">₹ {formatMoney(totals.monthlyCtc)}</span>
                </span>
                <span className="text-muted-foreground">
                  Net <span className="font-semibold text-foreground">₹ {formatMoney(totals.net)}</span>
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.push(`/hrms/employees/${id}`)}
              >
                Back
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving…" : "Save annexure"}
              </Button>
            </FormActions>

            <FormSection
              variant="card"
              id="ann-increment"
              icon={<IconTrendingUp className="size-4" />}
              title="Salary increment"
              description="Creates a new annexure version and keeps the previous one as superseded"
            >
              <FormGrid cols={4}>
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
                <div className="mt-3 overflow-x-auto rounded-md border border-border text-xs">
                  <table className="w-full border-collapse">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="px-2 py-2 font-semibold">Effective month</th>
                        <th className="px-2 py-2 font-semibold">New salary</th>
                        <th className="px-2 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {increments.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className="px-2 py-2">{r.effective_month}</td>
                          <td className="px-2 py-2">₹ {formatMoney(r.salary)}</td>
                          <td className="px-2 py-2"><StatusBadge status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </FormSection>

            <FormSection
              variant="card"
              id="ann-history"
              icon={<IconHistory className="size-4" />}
              title="Annexure history"
              description="Superseded versions, newest first"
            >
              <div className="overflow-x-auto rounded-md border border-border text-xs">
                <table className="w-full border-collapse">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-2 py-2 font-semibold">Version</th>
                      <th className="px-2 py-2 font-semibold">Basic</th>
                      <th className="px-2 py-2 font-semibold">HRA</th>
                      <th className="px-2 py-2 font-semibold">Net take-home</th>
                      <th className="px-2 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((r) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-2 py-2 font-medium text-foreground">#{r.id}</td>
                        <td className="px-2 py-2">₹ {formatMoney(r.basic_salary_per_month)}</td>
                        <td className="px-2 py-2">
                          ₹ {formatMoney(r.hra_per_month)}
                          {r.hra_per_month_manual ? (
                            <span className="ml-1 text-muted-foreground">(manual)</span>
                          ) : null}
                        </td>
                        <td className="px-2 py-2">₹ {formatMoney(r.net_take_home)}</td>
                        <td className="px-2 py-2"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                    {!history.length && (
                      <tr>
                        <td colSpan={5} className="px-2 py-3 text-muted-foreground">
                          No versions yet — saving the annexure creates the first version.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </FormSection>
            </div>
          </FormContainer>
        </form>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
