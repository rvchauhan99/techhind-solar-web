"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import Textarea from "@/components/common/Textarea";
import DateTimeField from "@/components/common/DateTimeField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

export default function InterviewAddForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefCandidateId = searchParams.get("candidate_id") || "";
  const [candidates, setCandidates] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [modes, setModes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [panelIds, setPanelIds] = useState([]);
  const [panelSearch, setPanelSearch] = useState("");
  const [form, setForm] = useState({
    candidate_id: prefCandidateId,
    round: "1",
    scheduled_at: "",
    mode: "in_person",
    duration_minutes: "60",
    panel: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  useEffect(() => {
    hrmsService
      .getInterviewMeta()
      .then((res) => {
        const payload = unwrap(res) || {};
        setCandidates(payload.candidates || []);
        setRounds(payload.rounds || []);
        setModes(payload.modes || []);
      })
      .catch(() => {
        setCandidates([]);
        setRounds([]);
        setModes([]);
      });
    hrmsService
      .listEmployees({ page: 1, limit: 200, status: "active" })
      .then((res) => setEmployees(unwrap(res)?.data || []))
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    if (prefCandidateId) setField("candidate_id", prefCandidateId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefCandidateId]);

  const filteredEmployees = useMemo(() => {
    const q = panelSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const hay = [
        emp.name,
        emp.full_name,
        emp.emp_code,
        emp.email,
        emp.department_name,
        emp.designation_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [employees, panelSearch]);

  const togglePanel = (emp) => {
    const id = String(emp.id);
    setPanelIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      const names = employees
        .filter((e) => next.includes(String(e.id)))
        .map((e) => e.name || e.full_name || e.emp_code)
        .filter(Boolean);
      setField("panel", names.join(", "));
      return next;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.candidate_id) errs.candidate_id = "Candidate is required";
    if (!form.round) errs.round = "Round is required";
    if (!form.scheduled_at) errs.scheduled_at = "Date & time is required";
    if (!form.mode) errs.mode = "Mode is required";
    const mins = Number(form.duration_minutes);
    if (!Number.isInteger(mins) || mins < 15) errs.duration_minutes = "Duration must be at least 15";
    if (!panelIds.length && !form.panel.trim()) errs.panel = "Select at least one panel member";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await hrmsService.createInterview({
        candidate_id: Number(form.candidate_id),
        round: Number(form.round),
        scheduled_at: form.scheduled_at,
        mode: form.mode,
        duration_minutes: mins,
        panel: form.panel.trim() || null,
        panel_member_ids: panelIds.length ? panelIds.map(Number) : null,
        notes: form.notes.trim() || null,
      });
      toastSuccess("Interview scheduled");
      if (prefCandidateId) router.push(`/hrms/candidates/${prefCandidateId}`);
      else router.push("/hrms/interviews");
    } catch (err) {
      toastErrorFromApi(err, "Schedule failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Schedule interview" listHref="/hrms/interviews" listLabel="Interviews">
        <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
          <FormContainer>
            <FormSection
              variant="card"
              title="Interview"
              description="Scheduling R1/R2/Final may advance the candidate stage when lower."
            >
              <FormGrid>
                <FormField>
                  <Select
                    label="Candidate"
                    name="candidate_id"
                    value={form.candidate_id}
                    onChange={(e) => setField("candidate_id", e.target.value)}
                    error={!!errors.candidate_id}
                    helperText={errors.candidate_id}
                    required
                  >
                    <MenuItem value="">Select candidate</MenuItem>
                    {candidates.map((c) => (
                      <MenuItem key={c.id ?? c.value} value={String(c.id ?? c.value)}>
                        {c.label || c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
                <FormField>
                  <Select
                    label="Round"
                    name="round"
                    value={form.round}
                    onChange={(e) => setField("round", e.target.value)}
                    error={!!errors.round}
                    helperText={errors.round}
                    required
                  >
                    {rounds.map((r) => (
                      <MenuItem key={r.value} value={String(r.value)}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
                <FormField>
                  <DateTimeField
                    label="Date & time"
                    name="scheduled_at"
                    value={form.scheduled_at}
                    onChange={(e) => setField("scheduled_at", e.target.value)}
                    error={!!errors.scheduled_at}
                    helperText={errors.scheduled_at}
                    required
                  />
                </FormField>
                <FormField>
                  <Select
                    label="Mode"
                    name="mode"
                    value={form.mode}
                    onChange={(e) => setField("mode", e.target.value)}
                    error={!!errors.mode}
                    helperText={errors.mode}
                    required
                  >
                    {modes.map((m) => (
                      <MenuItem key={m.value} value={m.value}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
                <FormField>
                  <Input
                    label="Duration (minutes)"
                    name="duration_minutes"
                    type="number"
                    value={form.duration_minutes}
                    onChange={(e) => setField("duration_minutes", e.target.value)}
                    error={!!errors.duration_minutes}
                    helperText={errors.duration_minutes}
                    required
                  />
                </FormField>
                <FormField className="sm:col-span-2">
                  <div className="text-xs font-medium text-foreground mb-1">
                    Interview Panel <span className="text-destructive">*</span>
                  </div>
                  <Input
                    name="panel_search"
                    placeholder="Search employees by name or code…"
                    value={panelSearch}
                    onChange={(e) => setPanelSearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="max-h-36 overflow-y-auto rounded-md border p-2 grid gap-1 sm:grid-cols-2">
                    {filteredEmployees.length === 0 ? (
                      <p className="col-span-full text-xs text-muted-foreground px-1 py-2">
                        No employees match “{panelSearch.trim()}”.
                      </p>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const id = String(emp.id);
                        const checked = panelIds.includes(id);
                        return (
                          <label key={id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePanel(emp)}
                            />
                            <span>
                              {emp.name || emp.full_name || emp.emp_code || `#${emp.id}`}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  {errors.panel ? (
                    <p className="mt-1 text-xs text-destructive">{errors.panel}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Selected ({panelIds.length}): {form.panel || "none"}
                    </p>
                  )}
                </FormField>
              </FormGrid>
              <FormField className="mt-3">
                <Textarea
                  label="Notes"
                  name="notes"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={3}
                />
              </FormField>
            </FormSection>
            <FormActions>
              <Button type="button" variant="outline" onClick={() => router.push("/hrms/interviews")}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save
              </Button>
            </FormActions>
          </FormContainer>
        </form>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
