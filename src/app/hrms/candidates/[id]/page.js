"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconArrowLeft,
  IconCalendarPlus,
  IconCircleCheck,
  IconExternalLink,
  IconFileText,
  IconMail,
  IconMapPin,
  IconPencil,
  IconPhone,
  IconUser,
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
import Input from "@/components/common/Input";
import Checkbox from "@/components/common/Checkbox";
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

function activityFrom(a) {
  return a.from_value ?? a.from ?? null;
}

function activityTo(a) {
  return a.to_value ?? a.to ?? null;
}

function sortActivitiesNewestFirst(list) {
  return [...list].sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    if (tb !== ta) return tb - ta;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}

function InterviewHistoryBlock({
  schedules,
  isRejected,
  isOnboarded,
  candidateId,
  router,
  showEvaluateLinks = false,
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Interview History</div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isRejected || isOnboarded}
          onClick={() => router.push(`/hrms/interviews/add?candidate_id=${candidateId}`)}
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
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">
                  {ROUND_LABELS[h.round] || `Round ${h.round}`}
                  {h.mode ? ` · ${String(h.mode).replace(/_/g, " ")}` : ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(h.scheduled_at)}
                  {h.duration_minutes ? ` · ${h.duration_minutes} min` : ""}
                  {h.panel ? ` · ${h.panel}` : ""}
                </div>
                {h.notes ? <div className="mt-1 text-xs text-muted-foreground">{h.notes}</div> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {showEvaluateLinks && h.id ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => router.push(`/hrms/interviews/${h.id}/edit`)}
                  >
                    Evaluate
                    <IconExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                ) : null}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
  const [activeTab, setActiveTab] = useState("timeline");

  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);

  const [checklist, setChecklist] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistLoaded, setChecklistLoaded] = useState(false);
  const [checklistBusyKey, setChecklistBusyKey] = useState(null);

  const [offerUrlPaste, setOfferUrlPaste] = useState("");
  const [generateBusy, setGenerateBusy] = useState(false);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [offerPasteBusy, setOfferPasteBusy] = useState(false);

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
      if (row.offer_letter_url) {
        setOfferUrlPaste(row.offer_letter_url);
      }
      setActivitiesLoaded(false);
      setChecklistLoaded(false);
    } catch (err) {
      toastErrorFromApi(err, "Failed to load candidate");
      router.push("/hrms/candidates");
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const actRes = await hrmsService.listCandidateActivities(id, { limit: 100 });
      const payload = unwrap(actRes);
      const rows = payload?.data || payload?.rows || (Array.isArray(payload) ? payload : []);
      setActivities(sortActivitiesNewestFirst(rows));
      setActivitiesLoaded(true);
    } catch (err) {
      toastErrorFromApi(err, "Failed to load timeline");
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, [id]);

  const loadChecklist = useCallback(async () => {
    setChecklistLoading(true);
    try {
      const res = await hrmsService.getCandidateOnboardingChecklist(id);
      const payload = unwrap(res);
      const items = payload?.checklist || payload?.data?.checklist || [];
      setChecklist(Array.isArray(items) ? items : []);
      setChecklistLoaded(true);
    } catch (err) {
      toastErrorFromApi(err, "Failed to load onboarding checklist");
      setChecklist([]);
    } finally {
      setChecklistLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (activeTab === "timeline" && !activitiesLoaded && !loading) {
      loadActivities();
    }
    if (activeTab === "onboarding" && !checklistLoaded && !loading) {
      loadChecklist();
    }
  }, [activeTab, activitiesLoaded, checklistLoaded, loading, loadActivities, loadChecklist]);

  const isRejected = Number(candidate?.stage) === 0;
  const currentStage = Number(candidate?.stage) || 1;
  const schedules = useMemo(() => {
    const list = candidate?.interview_schedules || [];
    return Array.isArray(list) ? list : [];
  }, [candidate]);

  const checklistComplete = useMemo(
    () => checklist.length > 0 && checklist.every((t) => t.done),
    [checklist]
  );
  const checklistOpenCount = useMemo(
    () => checklist.filter((t) => !t.done).length,
    [checklist]
  );

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
      if (activeTab === "timeline") await loadActivities();
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
      if (activeTab === "timeline") await loadActivities();
    } catch (err) {
      toastErrorFromApi(err, "Reject failed");
    } finally {
      setRejecting(false);
    }
  };

  const onGenerateOffer = async () => {
    setGenerateBusy(true);
    try {
      const res = await hrmsService.generateCandidateOfferLetter(id, {
        letter_type: "offer_letter",
        send_email: false,
        terms: "",
      });
      const row = unwrap(res);
      if (row) setCandidate(row);
      toastSuccess("Offer letter generated");
      await load();
      if (activeTab === "timeline") await loadActivities();
    } catch (err) {
      toastErrorFromApi(err, "Generate offer failed");
    } finally {
      setGenerateBusy(false);
    }
  };

  const onAcceptOffer = async () => {
    setAcceptBusy(true);
    try {
      const res = await hrmsService.acceptCandidateOffer(id, {
        reason: "Offer accepted by candidate",
      });
      const row = unwrap(res);
      if (row) setCandidate(row);
      toastSuccess("Offer accepted");
      await load();
      if (activeTab === "timeline") await loadActivities();
    } catch (err) {
      toastErrorFromApi(err, "Accept offer failed");
    } finally {
      setAcceptBusy(false);
    }
  };

  const onSaveOfferUrl = async () => {
    const url = offerUrlPaste.trim();
    if (!url) return;
    setOfferPasteBusy(true);
    try {
      const res = await hrmsService.patchCandidateOfferLetter(id, { offer_letter_url: url });
      const row = unwrap(res);
      if (row) setCandidate(row);
      toastSuccess("Offer letter URL saved");
      await load();
      if (activeTab === "timeline") await loadActivities();
    } catch (err) {
      toastErrorFromApi(err, "Offer URL update failed");
    } finally {
      setOfferPasteBusy(false);
    }
  };

  const onToggleChecklistItem = async (key, done) => {
    const prev = checklist;
    setChecklist((items) =>
      items.map((t) => (t.key === key ? { ...t, done: !!done } : t))
    );
    setChecklistBusyKey(key);
    try {
      const res = await hrmsService.patchCandidateOnboardingChecklist(id, {
        key,
        done: !!done,
      });
      const row = unwrap(res);
      if (row?.onboarding_checklist) {
        setChecklist(row.onboarding_checklist);
      } else {
        await loadChecklist();
      }
      if (row) setCandidate(row);
      toastSuccess("Checklist updated");
      if (activeTab === "timeline") await loadActivities();
    } catch (err) {
      setChecklist(prev);
      toastErrorFromApi(err, "Checklist update failed");
    } finally {
      setChecklistBusyKey(null);
    }
  };

  const name = [candidate?.first_name, candidate?.last_name].filter(Boolean).join(" ") || "Candidate";
  const showViewEmployee =
    candidate?.is_onboarded && candidate?.employee_id != null && candidate.employee_id !== "";
  const employeeId =
    candidate?.employee_id != null && candidate.employee_id !== ""
      ? Number(candidate.employee_id)
      : null;
  const employeeHref =
    employeeId && Number.isFinite(employeeId) ? `/hrms/employees/${employeeId}` : null;

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
                onClick={() => router.push(`/hrms/interviews/add?candidate_id=${id}`)}
                disabled={isRejected || candidate.is_onboarded}
              >
                <IconCalendarPlus className="mr-1 h-4 w-4" />
                Schedule Interview
              </Button>
              {showViewEmployee && employeeHref ? (
                <Button type="button" size="sm" className="ml-auto sm:ml-0" asChild>
                  <Link href={employeeHref}>
                    <IconUser className="mr-1 h-4 w-4" />
                    View employee
                  </Link>
                </Button>
              ) : null}
            </div>

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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
              <TabsList className="h-9 w-full justify-start gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1">
                <TabsTrigger value="timeline" className="text-xs sm:text-sm">
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="interviews" className="text-xs sm:text-sm">
                  Interviews
                </TabsTrigger>
                <TabsTrigger value="offer" className="text-xs sm:text-sm">
                  Offer
                </TabsTrigger>
                <TabsTrigger value="onboarding" className="text-xs sm:text-sm">
                  Onboarding
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs sm:text-sm">
                  Documents
                </TabsTrigger>
              </TabsList>

            <div className="grid gap-4 lg:grid-cols-12">
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
                  <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
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

                  <TabsContent value="timeline" className="mt-0">
                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                      <div className="mb-3 text-sm font-semibold">Activity timeline</div>
                      {activitiesLoading ? (
                        <p className="text-sm text-muted-foreground">Loading timeline…</p>
                      ) : activities.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No activity yet.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {activities.map((a) => {
                            const from = activityFrom(a);
                            const to = activityTo(a);
                            const hasTransition = from != null || to != null;
                            return (
                              <li
                                key={a.id || `${a.action}-${a.created_at}`}
                                className="rounded-md border px-3 py-2 text-sm"
                              >
                                <div className="font-medium capitalize text-foreground">
                                  {String(a.action || "").replace(/_/g, " ")}
                                  {a.field ? (
                                    <span className="font-normal text-muted-foreground"> · {a.field}</span>
                                  ) : null}
                                </div>
                                {hasTransition ? (
                                  <div className="text-xs text-muted-foreground">
                                    {from ?? "—"} → {to ?? "—"}
                                  </div>
                                ) : null}
                                {a.reason ? (
                                  <div className="text-xs text-muted-foreground">{a.reason}</div>
                                ) : null}
                                <div className="mt-0.5 text-[11px] text-muted-foreground">
                                  {formatDateTime(a.created_at)}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="interviews" className="mt-0">
                    <InterviewHistoryBlock
                      schedules={schedules}
                      isRejected={isRejected}
                      isOnboarded={!!candidate.is_onboarded}
                      candidateId={id}
                      router={router}
                      showEvaluateLinks
                    />
                  </TabsContent>

                  <TabsContent value="offer" className="mt-0">
                    <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4">
                      <div className="text-sm font-semibold">Offer letter</div>
                      {candidate.offer_letter_url ? (
                        <OfferLetterPreview url={candidate.offer_letter_url} />
                      ) : (
                        <p className="text-sm text-muted-foreground">No offer letter on file yet.</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          loading={generateBusy}
                          disabled={isRejected || !!candidate.is_onboarded}
                          onClick={onGenerateOffer}
                        >
                          Generate Offer
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          loading={acceptBusy}
                          disabled={
                            isRejected ||
                            !!candidate.is_onboarded ||
                            currentStage < 8 ||
                            currentStage >= 9
                          }
                          onClick={onAcceptOffer}
                        >
                          Accept Offer
                        </Button>
                      </div>
                      <OfferUrlPasteFallback
                        value={offerUrlPaste}
                        onChange={setOfferUrlPaste}
                        busy={offerPasteBusy}
                        disabled={!!candidate.is_onboarded}
                        onSave={onSaveOfferUrl}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="onboarding" className="mt-0">
                    <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4">
                      <div className="text-sm font-semibold">Onboarding checklist</div>
                      <p className="text-xs text-muted-foreground">
                        Onboarding requires stage ≥ Offer Released (8) and all checklist items complete.
                        {checklistOpenCount > 0 ? (
                          <span className="font-medium text-foreground">
                            {" "}
                            {checklistOpenCount} item{checklistOpenCount === 1 ? "" : "s"} open.
                          </span>
                        ) : checklist.length > 0 ? (
                          <span className="font-medium text-emerald-700"> All items complete.</span>
                        ) : null}
                      </p>
                      {checklistLoading ? (
                        <p className="text-sm text-muted-foreground">Loading checklist…</p>
                      ) : checklist.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No checklist items.</p>
                      ) : (
                        <ul className="space-y-2">
                          {checklist.map((item) => (
                            <li
                              key={item.key}
                              className="flex items-center gap-2 rounded-md border px-3 py-2"
                            >
                              <Checkbox
                                name={`checklist_${item.key}`}
                                label={item.label}
                                checked={!!item.done}
                                disabled={
                                  !!candidate.is_onboarded || checklistBusyKey === item.key
                                }
                                onCheckedChange={(next) =>
                                  onToggleChecklistItem(item.key, next)
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {employeeHref ? (
                          <Button type="button" size="sm" asChild>
                            <Link href={employeeHref}>
                              <IconUser className="mr-1 h-4 w-4" />
                              View employee
                            </Link>
                          </Button>
                        ) : null}
                        {!candidate.is_onboarded && !employeeId ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/hrms/candidates/${id}/edit`)}
                          >
                            Complete onboard on edit
                          </Button>
                        ) : null}
                      </div>
                      {!candidate.is_onboarded && currentStage < 8 ? (
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          Move candidate to Offer Released or later before onboarding.
                        </p>
                      ) : null}
                      {!candidate.is_onboarded && currentStage >= 8 && !checklistComplete ? (
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          Finish all checklist items, then use Edit to submit onboard.
                        </p>
                      ) : null}
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="mt-0">
                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                      <div className="mb-3 text-sm font-semibold">Documents</div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                          <span className="font-medium">Resume</span>
                          {candidate.resume_url ? (
                            <a
                              href={candidate.resume_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              Open
                              <IconExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Not uploaded</span>
                          )}
                        </li>
                        <li className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                          <span className="font-medium">Offer letter</span>
                          {candidate.offer_letter_url ? (
                            <a
                              href={candidate.offer_letter_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              Open
                              <IconExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Not available</span>
                          )}
                        </li>
                      </ul>
                    </div>
                  </TabsContent>
              </div>
            </div>
            </Tabs>
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

function OfferLetterPreview({ url }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
      <span className="text-muted-foreground">Preview: </span>
      <a href={url} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
        {url}
      </a>
    </div>
  );
}

function OfferUrlPasteFallback({ value, onChange, busy, disabled, onSave }) {
  return (
    <div className="space-y-2 border-t pt-3">
      <div className="text-xs font-medium text-muted-foreground">Paste offer URL (fallback)</div>
      <FormField>
        <Input
          label="Offer letter URL"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      </FormField>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={busy}
        disabled={disabled || !value.trim()}
        onClick={onSave}
      >
        Save URL
      </Button>
    </div>
  );
}