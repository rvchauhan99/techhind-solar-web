"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconArrowLeft,
  IconCalendarPlus,
  IconCircleCheck,
  IconFileText,
  IconMail,
  IconMapPin,
  IconPencil,
  IconPhone,
  IconX,
} from "@tabler/icons-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import FormField from "@/components/common/FormField";
import Select, { MenuItem } from "@/components/common/Select";
import Textarea from "@/components/common/Textarea";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const STEPS = [
  { value: 1, label: "Applied" },
  { value: 2, label: "Screening" },
  { value: 3, label: "Shortlisted" },
  { value: 4, label: "Interview R1" },
  { value: 5, label: "Interview R2" },
  { value: 6, label: "Final Eval" },
  { value: 7, label: "Selected" },
  { value: 8, label: "Offer Released" },
  { value: 9, label: "Offer Accepted" },
  { value: 10, label: "Joined" },
];

const ROUND_LABELS = { 1: "Round 1", 2: "Round 2", 3: "Final Evaluation" };

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatCtc(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function initials(first, last) {
  return `${(first || "").charAt(0)}${(last || "").charAt(0)}`.toUpperCase() || "?";
}

export default function HrmsCandidateDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageBusy, setStageBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [stageValue, setStageValue] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [rowRes, metaRes] = await Promise.all([
        hrmsService.getCandidate(id),
        hrmsService.getCandidateMeta(),
      ]);
      const row = unwrap(rowRes) || {};
      setCandidate(row);
      setStageValue(row.stage != null ? String(row.stage) : "1");
      setStages(unwrap(metaRes)?.stages || []);
    } catch (err) {
      toastErrorFromApi(err, "Failed to load candidate");
      router.push("/hrms/candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isRejected = Number(candidate?.stage) === 0;
  const currentStage = Number(candidate?.stage) || 1;
  const schedules = useMemo(() => {
    const list = candidate?.interview_schedules || [];
    return Array.isArray(list) ? list : [];
  }, [candidate]);

  const stageOptions = useMemo(() => {
    return (stages.length ? stages : STEPS)
      .filter((s) => {
        const v = Number(s.value);
        if (v === 0) return false;
        if ([8, 9, 10].includes(v)) return false;
        if (candidate?.is_onboarded) return v === currentStage;
        return v >= currentStage;
      })
      .map((s) => ({ value: String(s.value), label: s.label }));
  }, [stages, currentStage, candidate?.is_onboarded]);

  const onUpdateStage = async () => {
    if (!stageValue || Number(stageValue) === currentStage) return;
    setStageBusy(true);
    try {
      await hrmsService.patchCandidateStage(id, { stage: Number(stageValue) });
      toastSuccess("Stage updated");
      await load();
    } catch (err) {
      toastErrorFromApi(err, "Stage update failed");
    } finally {
      setStageBusy(false);
    }
  };

  const onReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError("Reason is required");
      return;
    }
    setRejecting(true);
    try {
      await hrmsService.patchCandidateStage(id, { reject: true, reason: rejectReason.trim() });
      toastSuccess("Candidate rejected");
      setRejectOpen(false);
      setRejectReason("");
      await load();
    } catch (err) {
      toastErrorFromApi(err, "Reject failed");
    } finally {
      setRejecting(false);
    }
  };

  const name = [candidate?.first_name, candidate?.last_name].filter(Boolean).join(" ") || "Candidate";

  return (
    <ProtectedRoute>
      <AddEditPageShell
        title={loading ? "Candidate" : name}
        listHref="/hrms/candidates"
        listLabel="Candidates"
        loading={loading}
      >
        {!loading && candidate ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.push("/hrms/candidates")}
              >
                <IconArrowLeft className="mr-1 h-4 w-4" />
                Pipeline
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.push(`/hrms/candidates/${id}/edit`)}
              >
                <IconPencil className="mr-1 h-4 w-4" />
                Edit / Evaluate
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  router.push(`/hrms/interviews/add?candidate_id=${id}`)
                }
                disabled={isRejected || candidate.is_onboarded}
              >
                <IconCalendarPlus className="mr-1 h-4 w-4" />
                Schedule Interview
              </Button>
            </div>

            {/* Workflow stepper */}
            <div className="rounded-lg border bg-card p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-foreground">Recruitment Workflow</div>
                <Badge variant={isRejected ? "destructive" : currentStage >= 7 ? "success" : "secondary"}>
                  {isRejected ? "Rejected" : candidate.stage_label || `Stage ${currentStage}`}
                </Badge>
              </div>
              <div className="flex flex-wrap items-start gap-1 overflow-x-auto pb-1">
                {STEPS.map((step, idx) => {
                  const done = !isRejected && step.value < currentStage;
                  const current = !isRejected && step.value === currentStage;
                  return (
                    <div key={step.value} className="flex items-center gap-1">
                      <div className="flex min-w-[64px] flex-col items-center gap-1">
                        <div
                          className={[
                            "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold",
                            done
                              ? "bg-emerald-600 text-white"
                              : current
                                ? "bg-primary text-primary-foreground"
                                : isRejected
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-muted text-muted-foreground",
                          ].join(" ")}
                        >
                          {done ? <IconCircleCheck className="h-4 w-4" /> : step.value}
                        </div>
                        <div
                          className={[
                            "text-center text-[10px] leading-tight",
                            current ? "font-semibold text-foreground" : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {step.label}
                        </div>
                      </div>
                      {idx < STEPS.length - 1 ? (
                        <div className="mb-4 h-px w-3 bg-border sm:w-4" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Interviews: <span className="font-semibold text-foreground">{schedules.length}</span>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
              {/* Profile + quick actions */}
              <div className="space-y-4 lg:col-span-4">
                <div className="rounded-lg border bg-card p-4 text-center shadow-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {initials(candidate.first_name, candidate.last_name)}
                  </div>
                  <div className="mt-2 text-base font-semibold text-foreground">{name}</div>
                  <div className="text-sm text-muted-foreground">
                    {candidate.position_title || candidate.position?.title || "—"}
                  </div>
                  <div className="mt-2">
                    <Badge variant={isRejected ? "destructive" : "secondary"}>
                      {isRejected ? "Rejected" : candidate.stage_label}
                    </Badge>
                  </div>
                  <ul className="mt-4 space-y-2 text-left text-sm">
                    <li className="flex items-start gap-2">
                      <IconMail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <a href={`mailto:${candidate.email}`} className="break-all hover:underline">
                        {candidate.email || "—"}
                      </a>
                    </li>
                    <li className="flex items-start gap-2">
                      <IconPhone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <a href={`tel:${candidate.mobile}`} className="hover:underline">
                        {candidate.mobile || "—"}
                      </a>
                    </li>
                    <li className="flex items-start gap-2">
                      <IconMapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>
                        {[candidate.city, candidate.state].filter(Boolean).join(", ") ||
                          candidate.address ||
                          "—"}
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-muted-foreground">
                      Applied: {formatDate(candidate.created_at)}
                    </li>
                    {candidate.resume_url ? (
                      <li className="flex items-start gap-2">
                        <IconFileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <a
                          href={candidate.resume_url}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-primary hover:underline"
                        >
                          Resume
                        </a>
                      </li>
                    ) : null}
                  </ul>
                </div>

                {!isRejected && !candidate.is_onboarded ? (
                  <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
                    <div className="text-sm font-semibold">Quick Actions</div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => router.push(`/hrms/interviews/add?candidate_id=${id}`)}
                    >
                      <IconCalendarPlus className="mr-2 h-4 w-4" />
                      Schedule Interview
                    </Button>
                    <FormField>
                      <Select
                        label="Update Status"
                        value={stageValue}
                        onChange={(e) => setStageValue(e.target.value)}
                      >
                        {stageOptions.map((s) => (
                          <MenuItem key={s.value} value={s.value}>
                            {s.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormField>
                    <Button
                      type="button"
                      size="sm"
                      loading={stageBusy}
                      disabled={Number(stageValue) === currentStage}
                      onClick={onUpdateStage}
                      className="w-full"
                    >
                      Save stage
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      onClick={() => setRejectOpen(true)}
                    >
                      <IconX className="mr-1 h-4 w-4" />
                      Reject Candidate
                    </Button>
                  </div>
                ) : null}
              </div>

              {/* Experience + history */}
              <div className="space-y-4 lg:col-span-8">
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="mb-3 text-sm font-semibold">Experience & Compensation</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ["Total Experience", candidate.experience_in_field || candidate.experience || "—"],
                      ["Work Experience", candidate.experience || "—"],
                      ["Current CTC", formatCtc(candidate.current_ctc)],
                      ["Expected CTC", formatCtc(candidate.expected_ctc)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md border bg-muted/30 px-2.5 py-2">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {label}
                        </div>
                        <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>
                      Notice Period:{" "}
                      <b className="text-foreground">
                        {candidate.notice_period_days != null
                          ? `${candidate.notice_period_days} days`
                          : "—"}
                      </b>
                    </span>
                    <span>
                      Relocation:{" "}
                      <b className="text-foreground">{candidate.relocation || "—"}</b>
                    </span>
                    <span>
                      Join timeline:{" "}
                      <b className="text-foreground">{candidate.join_timeline || "—"}</b>
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">Interview History</div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isRejected || candidate.is_onboarded}
                      onClick={() => router.push(`/hrms/interviews/add?candidate_id=${id}`)}
                    >
                      <IconCalendarPlus className="mr-1 h-4 w-4" />
                      Schedule
                    </Button>
                  </div>
                  {schedules.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No interviews scheduled yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {schedules.map((h) => (
                        <div
                          key={h.id}
                          className="flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2"
                        >
                          <div>
                            <div className="text-sm font-medium">
                              {ROUND_LABELS[h.round] || `Round ${h.round}`}
                              {h.mode ? ` · ${String(h.mode).replace(/_/g, " ")}` : ""}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(h.scheduled_at)}
                              {h.duration_minutes ? ` · ${h.duration_minutes} min` : ""}
                              {h.panel ? ` · ${h.panel}` : ""}
                            </div>
                            {h.notes ? (
                              <div className="mt-1 text-xs text-muted-foreground">{h.notes}</div>
                            ) : null}
                          </div>
                          <Badge
                            variant={
                              h.status === "completed"
                                ? "success"
                                : h.status === "cancelled"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {h.status || "scheduled"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <AlertDialog open={rejectOpen} onOpenChange={(open) => !open && setRejectOpen(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject candidate?</AlertDialogTitle>
              <AlertDialogDescription>
                Rejection is final for this candidate. Add a reason so the timeline stays auditable.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <FormField>
              <Textarea
                label="Reason"
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectError) setRejectError("");
                }}
                error={!!rejectError}
                helperText={rejectError}
                rows={3}
              />
            </FormField>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={rejecting}>Back</AlertDialogCancel>
              <AlertDialogAction
                size="sm"
                variant="destructive"
                loading={rejecting}
                onClick={onReject}
              >
                Reject
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
