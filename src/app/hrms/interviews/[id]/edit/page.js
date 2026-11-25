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
import Textarea from "@/components/common/Textarea";
import DateTimeField from "@/components/common/DateTimeField";
import AutocompleteField from "@/components/common/AutocompleteField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const SCORECARD_CRITERIA = [
  "Communication",
  "Technical",
  "Culture Fit",
  "Problem Solving",
];

function defaultScorecardCriteria() {
  return SCORECARD_CRITERIA.map((name) => ({ name, score: "" }));
}

export default function HrmsInterviewEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [rounds, setRounds] = useState([]);
  const [modes, setModes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [results, setResults] = useState([]);
  const [form, setForm] = useState({
    candidate_id: "",
    candidate_label: "",
    round: "1",
    scheduled_at: "",
    mode: "in_person",
    duration_minutes: "60",
    panel: "",
    notes: "",
    status: "scheduled",
    result: "",
    feedback: "",
  });
  const [evalForm, setEvalForm] = useState({
    result: "pass",
    feedback: "",
    criteria: defaultScorecardCriteria(),
  });
  const [savedScorecard, setSavedScorecard] = useState(null);
  const [errors, setErrors] = useState({});
  const [evalErrors, setEvalErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [panelMembers, setPanelMembers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [metaRes, rowRes] = await Promise.all([
          hrmsService.getInterviewMeta(),
          hrmsService.getInterview(id),
        ]);
        if (cancelled) return;
        const meta = unwrap(metaRes) || {};
        setRounds(meta.rounds || []);
        setModes(meta.modes || []);
        setStatuses(meta.statuses || []);
        setResults(meta.results || []);
        const row = unwrap(rowRes) || {};
        const candName = row.candidate
          ? `${row.candidate.first_name || ""} ${row.candidate.last_name || ""}`.trim()
          : row.candidate_name || "";
        setForm({
          candidate_id: row.candidate_id != null ? String(row.candidate_id) : "",
          candidate_label: candName,
          round: row.round != null ? String(row.round) : "1",
          scheduled_at: row.scheduled_at || "",
          mode: row.mode || "in_person",
          duration_minutes: row.duration_minutes != null ? String(row.duration_minutes) : "60",
          panel: row.panel || "",
          notes: row.notes || "",
          status: row.status || "scheduled",
          result: row.result || "",
          feedback: row.feedback || "",
        });
        const memberIds = Array.isArray(row.panel_member_ids)
          ? row.panel_member_ids.map(Number).filter((n) => Number.isFinite(n) && n > 0)
          : [];
        if (memberIds.length) {
          const resolved = await Promise.all(
            memberIds.map((eid) =>
              hrmsService.resolveHrmsEmployee(eid).catch(() => ({ id: eid, label: `#${eid}` }))
            )
          );
          if (!cancelled) {
            setPanelMembers(
              resolved.filter(Boolean).map((r) => ({
                id: r.id,
                label: r.label || r.name || `#${r.id}`,
              }))
            );
          }
        } else if (row.panel) {
          // Free-text panel from older rows — keep as one chip (name-only, no id).
          setPanelMembers([{ id: `text:${row.panel}`, label: row.panel }]);
        }
        setSavedScorecard(row.scorecard || null);
      } catch (err) {
        toastErrorFromApi(err, "Failed to load interview");
        router.push("/hrms/interviews");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const syncPanelFields = (members) => {
    const labels = members.map((m) => m.label).filter(Boolean);
    setField("panel", labels.join(", "));
  };

  const addPanelMember = (_e, opt) => {
    if (!opt?.id) return;
    const id = String(opt.id);
    setPanelMembers((prev) => {
      if (prev.some((m) => String(m.id) === id)) return prev;
      const next = [...prev.filter((m) => !String(m.id).startsWith("text:")), { id: opt.id, label: opt.label || opt.name || `#${opt.id}` }];
      syncPanelFields(next);
      return next;
    });
  };

  const removePanelMember = (mid) => {
    setPanelMembers((prev) => {
      const next = prev.filter((m) => String(m.id) !== String(mid));
      syncPanelFields(next);
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
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const panelIds = panelMembers
        .map((m) => Number(m.id))
        .filter((n) => Number.isFinite(n) && n > 0);
      await hrmsService.updateInterview(id, {
        candidate_id: Number(form.candidate_id),
        round: Number(form.round),
        scheduled_at: form.scheduled_at,
        mode: form.mode,
        duration_minutes: mins,
        panel: form.panel.trim() || null,
        panel_member_ids: panelIds.length ? panelIds : null,
        notes: form.notes.trim() || null,
        status: form.status,
      });
      toastSuccess("Interview updated");
      router.push("/hrms/interviews");
    } catch (err) {
      toastErrorFromApi(err, "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const onCancelInterview = async () => {
    setCancelling(true);
    try {
      const res = await hrmsService.cancelInterview(id);
      const row = unwrap(res) || {};
      setForm((f) => ({ ...f, status: row.status || "cancelled" }));
      toastSuccess("Interview cancelled");
    } catch (err) {
      toastErrorFromApi(err, "Cancel failed");
    } finally {
      setCancelling(false);
    }
  };

  const setCriterionScore = (index, value) => {
    setEvalForm((f) => {
      const criteria = f.criteria.map((c, i) => (i === index ? { ...c, score: value } : c));
      return { ...f, criteria };
    });
    const errKey = `criteria_${index}`;
    if (evalErrors[errKey]) setEvalErrors((p) => ({ ...p, [errKey]: undefined }));
  };

  const onEvaluate = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!evalForm.result) errs.result = "Result is required";
    evalForm.criteria.forEach((c, index) => {
      const s = Number(c.score);
      if (!Number.isInteger(s) || s < 1 || s > 5) {
        errs[`criteria_${index}`] = "Score 1–5 required";
      }
    });
    setEvalErrors(errs);
    if (Object.keys(errs).length) return;

    setEvaluating(true);
    try {
      const res = await hrmsService.evaluateInterview(id, {
        result: evalForm.result,
        feedback: evalForm.feedback.trim() || null,
        scorecard: {
          criteria: evalForm.criteria.map((c) => ({
            name: c.name,
            score: Number(c.score),
            max: 5,
          })),
          overall_result: evalForm.result,
        },
      });
      const row = unwrap(res) || {};
      setForm((f) => ({
        ...f,
        status: row.status || "completed",
        result: row.result || evalForm.result,
        feedback: row.feedback || evalForm.feedback,
      }));
      setSavedScorecard(row.scorecard || null);
      toastSuccess("Interview evaluated");
    } catch (err) {
      toastErrorFromApi(err, "Evaluate failed");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Edit interview" listHref="/hrms/interviews" listLabel="Interviews">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : null}
        <form
          onSubmit={onSubmit}
          onKeyDown={preventEnterSubmit}
          className={loading ? "hidden" : undefined}
        >
          <FormContainer>
            <FormSection variant="card" title="Interview">
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
                <FormField>
                  <Select
                    label="Status"
                    name="status"
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                  >
                    {statuses.map((s) => (
                      <MenuItem key={s.value} value={s.value}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
                <FormField className="sm:col-span-2">
                  <div className="mb-1 text-xs font-medium text-foreground">Interview Panel</div>
                  <AutocompleteField
                    label=""
                    name="panel_search"
                    placeholder="Type to search employees…"
                    asyncLoadOptions={(q) => hrmsService.searchHrmsEmployees(q)}
                    getOptionLabel={(o) => o?.label ?? ""}
                    value={null}
                    onChange={addPanelMember}
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
              {form.result ? (
                <FormGrid className="mt-3">
                  <FormField>
                    <Input label="Result" name="result_display" value={form.result} disabled />
                  </FormField>
                  <FormField>
                    <Textarea
                      label="Feedback"
                      name="feedback_display"
                      value={form.feedback}
                      rows={2}
                      disabled
                    />
                  </FormField>
                </FormGrid>
              ) : null}
              {savedScorecard?.criteria?.length ? (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold text-foreground">Scorecard</p>
                  <FormGrid>
                    {savedScorecard.criteria.map((c) => (
                      <FormField key={c.name}>
                        <Input
                          label={c.name}
                          value={`${c.score ?? "—"} / ${c.max ?? 5}`}
                          disabled
                        />
                      </FormField>
                    ))}
                  </FormGrid>
                  {savedScorecard.overall_result ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Overall result:{" "}
                      <span className="font-medium text-foreground">{savedScorecard.overall_result}</span>
                      {savedScorecard.overall_score != null ? (
                        <span className="ml-2">
                          (avg {Number(savedScorecard.overall_score).toFixed(1)})
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </FormSection>
            <FormActions>
              <Button type="button" variant="outline" onClick={() => router.push("/hrms/interviews")}>
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                loading={cancelling}
                disabled={form.status !== "scheduled"}
                onClick={onCancelInterview}
              >
                Cancel interview
              </Button>
              <Button type="submit" loading={saving} disabled={form.status !== "scheduled"}>
                Save
              </Button>
            </FormActions>
          </FormContainer>
        </form>

        {form.status === "scheduled" && !loading ? (
          <form onSubmit={onEvaluate} onKeyDown={preventEnterSubmit} className="mt-4">
            <FormContainer>
              <FormSection
                variant="card"
                title="Evaluate"
                description="Pass advances the candidate; fail rejects; hold completes without stage change."
              >
                <FormGrid>
                  <FormField>
                    <Select
                      label="Result"
                      name="eval_result"
                      value={evalForm.result}
                      onChange={(e) => {
                        setEvalForm((f) => ({ ...f, result: e.target.value }));
                        if (evalErrors.result) setEvalErrors((p) => ({ ...p, result: undefined }));
                      }}
                      error={!!evalErrors.result}
                      helperText={evalErrors.result}
                      required
                    >
                      {(results.length
                        ? results
                        : [
                            { value: "pass", label: "Pass" },
                            { value: "fail", label: "Fail" },
                            { value: "hold", label: "Hold" },
                          ]
                      ).map((r) => (
                        <MenuItem key={r.value} value={r.value}>
                          {r.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormField>
                </FormGrid>
                <p className="mt-3 text-xs font-semibold text-foreground">Scorecard (1–5 each)</p>
                <FormGrid className="mt-2">
                  {evalForm.criteria.map((c, index) => (
                    <FormField key={c.name}>
                      <Select
                        label={c.name}
                        name={`score_${index}`}
                        value={c.score}
                        onChange={(e) => setCriterionScore(index, e.target.value)}
                        error={!!evalErrors[`criteria_${index}`]}
                        helperText={evalErrors[`criteria_${index}`]}
                        required
                      >
                        <MenuItem value="">Select</MenuItem>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <MenuItem key={n} value={String(n)}>
                            {n}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormField>
                  ))}
                </FormGrid>
                <FormField className="mt-3">
                  <Textarea
                    label="Feedback"
                    name="eval_feedback"
                    value={evalForm.feedback}
                    onChange={(e) => setEvalForm((f) => ({ ...f, feedback: e.target.value }))}
                    rows={3}
                  />
                </FormField>
              </FormSection>
              <FormActions>
                <Button type="submit" loading={evaluating}>
                  Submit evaluation
                </Button>
              </FormActions>
            </FormContainer>
          </form>
        ) : null}
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
