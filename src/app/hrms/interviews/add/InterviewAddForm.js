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
import AutocompleteField from "@/components/common/AutocompleteField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

export default function InterviewAddForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefCandidateId = searchParams.get("candidate_id") || "";
  const [rounds, setRounds] = useState([]);
  const [modes, setModes] = useState([]);
  const [panelMembers, setPanelMembers] = useState([]);
  const [form, setForm] = useState({
    candidate_id: prefCandidateId,
    candidate_label: "",
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
        setRounds(payload.rounds || []);
        setModes(payload.modes || []);
      })
      .catch(() => {
        setRounds([]);
        setModes([]);
      });
  }, []);

  useEffect(() => {
    if (prefCandidateId) setField("candidate_id", prefCandidateId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefCandidateId]);

  const panelIds = useMemo(() => panelMembers.map((m) => String(m.id)), [panelMembers]);

  const addPanelMember = (_e, opt) => {
    if (!opt?.id) return;
    const id = String(opt.id);
    setPanelMembers((prev) => {
      if (prev.some((m) => String(m.id) === id)) return prev;
      const next = [...prev, { id: opt.id, label: opt.label || opt.name || `#${opt.id}` }];
      setField("panel", next.map((m) => m.label).join(", "));
      return next;
    });
  };

  const removePanelMember = (id) => {
    setPanelMembers((prev) => {
      const next = prev.filter((m) => String(m.id) !== String(id));
      setField("panel", next.map((m) => m.label).join(", "));
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
                  <AutocompleteField
                    label="Candidate"
                    name="candidate_id"
                    required
                    placeholder="Type to search…"
                    asyncLoadOptions={(q) => hrmsService.searchHrmsCandidates(q)}
                    resolveOptionById={(cid) => hrmsService.resolveHrmsCandidate(cid)}
                    getOptionLabel={(o) => o?.label ?? o?.name ?? ""}
                    value={
                      form.candidate_id
                        ? { id: form.candidate_id, value: form.candidate_id, label: form.candidate_label || "" }
                        : null
                    }
                    onChange={(_e, opt) => {
                      setField("candidate_id", opt?.id != null ? String(opt.id) : "");
                      setField("candidate_label", opt?.label ?? opt?.name ?? "");
                    }}
                    error={!!errors.candidate_id}
                    helperText={errors.candidate_id}
                  />
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
                  <AutocompleteField
                    label=""
                    name="panel_search"
                    placeholder="Type to search employees…"
                    asyncLoadOptions={(q) => hrmsService.searchHrmsEmployees(q)}
                    getOptionLabel={(o) => o?.label ?? ""}
                    value={null}
                    onChange={addPanelMember}
                    error={!!errors.panel}
                    helperText={errors.panel}
                  />
                  {panelMembers.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {panelMembers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                          onClick={() => removePanelMember(m.id)}
                        >
                          {m.label}
                          <span aria-hidden>×</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">Search and add panel members</p>
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
