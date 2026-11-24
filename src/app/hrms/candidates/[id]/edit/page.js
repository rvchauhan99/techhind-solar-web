"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import Textarea from "@/components/common/Textarea";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import roleService from "@/services/roleMasterService";
import { listBranches } from "@/services/companyService";

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function HrmsCandidateEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [positions, setPositions] = useState([]);
  const [stages, setStages] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [candidate, setCandidate] = useState(null);
  const [form, setForm] = useState({
    position_id: "",
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    reference: "",
    notes: "",
    stage: "1",
    date_of_birth: "",
    gender: "",
    marital_status: "",
    address: "",
    state: "",
    city: "",
    education: "",
    experience: "",
    current_designation: "",
    current_ctc: "",
    expected_ctc: "",
    in_hand_salary: "",
    joining_date: "",
    salary: "",
    meet_link: "",
    offer_letter_url: "",
    manager_feedback: "",
    describe_yourself: "",
    same_field: "",
    experience_in_field: "",
    job_responsibilities: "",
    why_this_job: "",
    previous_job_status: "",
    days_left: "",
    gap_months: "",
    join_timeline: "",
    notice_period_days: "",
    relocation: "",
    solar_experience: "",
    currently_working: "",
    ready_for_travel: "",
    own_vehicle: "",
    aptitude_mark: "",
    aptitude_upload_url: "",
    practical_upload_url: "",
    practical_comments_others: "",
    practical_comments_admin: "",
    policy_understanding: "",
    probation_understanding: "",
    notice_understanding: "",
    time_rules_understanding: "",
  });
  const [activities, setActivities] = useState([]);
  const [evalBusy, setEvalBusy] = useState(null);
  const [onboardForm, setOnboardForm] = useState({
    emp_code: "",
    department_id: "",
    designation_id: "",
    joining_date: todayYmd(),
    role_id: "",
    branch_ids: [],
  });
  const [errors, setErrors] = useState({});
  const [onboardErrors, setOnboardErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [onboarding, setOnboarding] = useState(false);

  const canOnboard =
    candidate &&
    !candidate.is_onboarded &&
    !candidate.employee_id &&
    Number(candidate.stage) >= 8 &&
    Number(candidate.stage) !== 0;

  const departmentOptions = useMemo(
    () =>
      (departments || []).map((d) => ({
        value: String(d.id),
        label: d.title || d.name || `Department #${d.id}`,
      })),
    [departments]
  );
  const designationOptions = useMemo(
    () =>
      (designations || []).map((d) => ({
        value: String(d.id),
        label: d.title || d.name || `Designation #${d.id}`,
      })),
    [designations]
  );
  const onboardedEmployeeHref = useMemo(() => {
    const eid =
      candidate?.employee_id != null && candidate.employee_id !== ""
        ? Number(candidate.employee_id)
        : null;
    return eid && Number.isFinite(eid) ? `/hrms/employees/${eid}` : null;
  }, [candidate?.employee_id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [metaRes, rowRes, deptRes, roleRes, branchRes] = await Promise.all([
          hrmsService.getCandidateMeta(),
          hrmsService.getCandidate(id),
          hrmsService.listDepartments({ limit: 100, status: "active" }).catch(() => null),
          roleService.listRoleMasters({ page: 1, limit: 200 }).catch(() => null),
          listBranches().catch(() => null),
        ]);
        if (cancelled) return;
        const meta = unwrap(metaRes) || {};
        setPositions(meta.positions || []);
        setStages(meta.stages || []);
        const d = unwrap(deptRes);
        setDepartments(d?.data || []);
        const rp = unwrap(roleRes);
        setRoles(rp?.data || rp?.rows || (Array.isArray(rp) ? rp : []));
        const bp = unwrap(branchRes);
        setBranches(bp?.data || (Array.isArray(bp) ? bp : []));
        const row = unwrap(rowRes) || {};
        setCandidate(row);
        setForm((f) => ({
          ...f,
          position_id: row.position_id != null ? String(row.position_id) : "",
          first_name: row.first_name || "",
          last_name: row.last_name || "",
          email: row.email || "",
          mobile: row.mobile || "",
          reference: row.reference || "",
          notes: row.notes || "",
          stage: row.stage != null ? String(row.stage) : "1",
          date_of_birth: row.date_of_birth || "",
          gender: row.gender || "",
          marital_status: row.marital_status || "",
          address: row.address || "",
          state: row.state || "",
          city: row.city || "",
          education: row.education || "",
          experience: row.experience || "",
          current_designation: row.current_designation || "",
          current_ctc: row.current_ctc != null ? String(row.current_ctc) : "",
          expected_ctc: row.expected_ctc != null ? String(row.expected_ctc) : "",
          in_hand_salary: row.in_hand_salary != null ? String(row.in_hand_salary) : "",
          joining_date: row.joining_date || "",
          salary: row.salary != null ? String(row.salary) : "",
          meet_link: row.meet_link || "",
          offer_letter_url: row.offer_letter_url || "",
          manager_feedback: row.manager_feedback || "",
          describe_yourself: row.describe_yourself || "",
          same_field: row.same_field || "",
          experience_in_field: row.experience_in_field || "",
          job_responsibilities: row.job_responsibilities || "",
          why_this_job: row.why_this_job || "",
          previous_job_status: row.previous_job_status || "",
          days_left: row.days_left != null ? String(row.days_left) : "",
          gap_months: row.gap_months != null ? String(row.gap_months) : "",
          join_timeline: row.join_timeline || "",
          notice_period_days: row.notice_period_days != null ? String(row.notice_period_days) : "",
          relocation: row.relocation || "",
          solar_experience: row.solar_experience || "",
          currently_working: row.currently_working || "",
          ready_for_travel: row.ready_for_travel || "",
          own_vehicle: row.own_vehicle || "",
          aptitude_mark: row.aptitude_mark != null ? String(row.aptitude_mark) : "",
          aptitude_upload_url: row.aptitude_upload_url || "",
          practical_upload_url: row.practical_upload_url || "",
          practical_comments_others: row.practical_comments_others || "",
          practical_comments_admin: row.practical_comments_admin || "",
          policy_understanding: row.policy_understanding || "",
          probation_understanding: row.probation_understanding || "",
          notice_understanding: row.notice_understanding || "",
          time_rules_understanding: row.time_rules_understanding || "",
        }));
        hrmsService
          .listCandidateActivities(id, { limit: 30 })
          .then((actRes) => {
            const payload = unwrap(actRes);
            setActivities(payload?.data || payload?.rows || (Array.isArray(payload) ? payload : []));
          })
          .catch(() => setActivities([]));
      } catch (err) {
        toastErrorFromApi(err, "Failed to load candidate");
        router.push("/hrms/candidates");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  useEffect(() => {
    if (!onboardForm.department_id) {
      setDesignations([]);
      return;
    }
    hrmsService
      .listDesignations({
        department_id: onboardForm.department_id,
        limit: 100,
        status: "active",
      })
      .then((res) => setDesignations(unwrap(res)?.data || []))
      .catch(() => setDesignations([]));
  }, [onboardForm.department_id]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const setOnboardField = (key, value) => {
    setOnboardForm((f) => ({ ...f, [key]: value }));
    if (onboardErrors[key]) setOnboardErrors((p) => ({ ...p, [key]: undefined }));
  };

  const toggleBranch = (branchId) => {
    setOnboardForm((f) => {
      const set = new Set((f.branch_ids || []).map(Number));
      if (set.has(Number(branchId))) set.delete(Number(branchId));
      else set.add(Number(branchId));
      return { ...f, branch_ids: Array.from(set) };
    });
    if (onboardErrors.branch_ids) {
      setOnboardErrors((p) => ({ ...p, branch_ids: undefined }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.position_id) errs.position_id = "Position is required";
    if (!form.first_name.trim()) errs.first_name = "First name is required";
    if (!form.last_name.trim()) errs.last_name = "Last name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!form.mobile.trim()) errs.mobile = "Mobile is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const res = await hrmsService.updateCandidate(id, {
        position_id: Number(form.position_id),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        reference: form.reference.trim() || null,
        notes: form.notes.trim() || null,
        stage: Number(form.stage),
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        address: form.address.trim() || null,
        education: form.education.trim() || null,
        experience: form.experience.trim() || null,
        current_ctc: form.current_ctc !== "" ? Number(form.current_ctc) : null,
        expected_ctc: form.expected_ctc !== "" ? Number(form.expected_ctc) : null,
        joining_date: form.joining_date || null,
        salary: form.salary !== "" ? Number(form.salary) : null,
        meet_link: form.meet_link.trim() || null,
        offer_letter_url: form.offer_letter_url.trim() || null,
        manager_feedback: form.manager_feedback.trim() || null,
      });
      const row = unwrap(res) || {};
      setCandidate(row);
      toastSuccess("Candidate updated");
    } catch (err) {
      toastErrorFromApi(err, "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const onReject = async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError("A reason is required to reject a candidate");
      return;
    }
    setRejecting(true);
    try {
      const res = await hrmsService.patchCandidateStage(id, { reject: true, reason });
      const row = unwrap(res) || {};
      setCandidate(row);
      setForm((f) => ({ ...f, stage: String(row.stage ?? 0) }));
      setRejectOpen(false);
      setRejectReason("");
      setRejectError("");
      toastSuccess("Candidate rejected");
    } catch (err) {
      toastErrorFromApi(err, "Reject failed");
    } finally {
      setRejecting(false);
    }
  };

  const onOnboard = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!onboardForm.emp_code.trim()) errs.emp_code = "Employee code is required";
    if (!onboardForm.department_id) errs.department_id = "Department is required";
    if (!onboardForm.designation_id) errs.designation_id = "Designation is required";
    if (!onboardForm.joining_date) errs.joining_date = "Joining date is required";
    if (!(onboardForm.branch_ids || []).length) errs.branch_ids = "Select at least one branch";
    setOnboardErrors(errs);
    if (Object.keys(errs).length) return;

    setOnboarding(true);
    try {
      const payload = {
        emp_code: onboardForm.emp_code.trim(),
        department_id: Number(onboardForm.department_id),
        designation_id: Number(onboardForm.designation_id),
        joining_date: onboardForm.joining_date,
        branch_ids: (onboardForm.branch_ids || []).map(Number),
      };
      if (onboardForm.role_id) payload.role_id = Number(onboardForm.role_id);
      const res = await hrmsService.onboardCandidate(id, payload);
      const row = unwrap(res) || {};
      setCandidate(row);
      setForm((f) => ({ ...f, stage: String(row.stage ?? 10) }));
      toastSuccess("Candidate onboarded");
      const eid = row.employee_id != null ? Number(row.employee_id) : null;
      if (eid && Number.isFinite(eid)) {
        router.push(`/hrms/employees/${eid}`);
        return;
      }
      router.push(`/hrms/candidates/${id}`);
    } catch (err) {
      toastErrorFromApi(err, "Onboard failed");
    } finally {
      setOnboarding(false);
    }
  };

  // Manual edits may move forward (and skip) but never backwards; offer/joined
  // are action-only, so keep them out of the dropdown.
  const currentStage = Number(candidate?.stage ?? form.stage ?? 1);
  const stageOptions = stages.filter((s) => {
    const value = Number(s.value);
    if (value === currentStage) return true;
    if (value < currentStage) return false;
    if (value === 8 || value === 9 || value === 10) return false;
    return true;
  });

  return (
    <ProtectedRoute>
      <AddEditPageShell
        title="Edit candidate"
        listHref={`/hrms/candidates/${id}`}
        listLabel="Dashboard"
      >
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
            <FormSection variant="card" title="Candidate">
              {candidate?.is_onboarded ? (
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="success">Onboarded</Badge>
                  <span className="text-muted-foreground">
                    Employee{" "}
                    {candidate.employee_emp_code ||
                      candidate.employee?.emp_code ||
                      candidate.employee_id}
                  </span>
                  {onboardedEmployeeHref ? (
                    <Button type="button" size="sm" variant="outline" asChild>
                      <Link href={onboardedEmployeeHref}>View employee</Link>
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <FormGrid>
                <FormField>
                  <Select
                    label="Position"
                    name="position_id"
                    value={form.position_id}
                    onChange={(e) => setField("position_id", e.target.value)}
                    error={!!errors.position_id}
                    helperText={errors.position_id}
                    required
                  >
                    <MenuItem value="">Select position</MenuItem>
                    {positions.map((p) => (
                      <MenuItem key={p.id ?? p.value} value={String(p.id ?? p.value)}>
                        {p.title || p.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
                <FormField>
                  <Select
                    label="Stage"
                    name="stage"
                    value={form.stage}
                    onChange={(e) => setField("stage", e.target.value)}
                    disabled={!!candidate?.is_onboarded}
                  >
                    {stageOptions.map((s) => (
                      <MenuItem key={s.value} value={String(s.value)}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormField>
                <FormField>
                  <Input
                    label="First name"
                    name="first_name"
                    value={form.first_name}
                    onChange={(e) => setField("first_name", e.target.value)}
                    error={!!errors.first_name}
                    helperText={errors.first_name}
                    required
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Last name"
                    name="last_name"
                    value={form.last_name}
                    onChange={(e) => setField("last_name", e.target.value)}
                    error={!!errors.last_name}
                    helperText={errors.last_name}
                    required
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    error={!!errors.email}
                    helperText={errors.email}
                    required
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Mobile"
                    name="mobile"
                    value={form.mobile}
                    onChange={(e) => setField("mobile", e.target.value)}
                    error={!!errors.mobile}
                    helperText={errors.mobile}
                    required
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Reference"
                    name="reference"
                    value={form.reference}
                    onChange={(e) => setField("reference", e.target.value)}
                  />
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

            <FormSection variant="card" title="Personal Info">
              <p className="mb-2 text-xs text-muted-foreground">
                Status: {candidate?.personal_info_status || "pending"}
              </p>
              <FormGrid>
                <FormField>
                  <DateField
                    label="Date of birth"
                    name="date_of_birth"
                    value={form.date_of_birth}
                    onChange={(e) => setField("date_of_birth", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Select
                    label="Gender"
                    value={form.gender}
                    onChange={(e) => setField("gender", e.target.value)}
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormField>
                <FormField>
                  <Select
                    label="Marital Status"
                    value={form.marital_status}
                    onChange={(e) => setField("marital_status", e.target.value)}
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="married">Married</MenuItem>
                    <MenuItem value="unmarried">Unmarried</MenuItem>
                  </Select>
                </FormField>
                <FormField>
                  <Input
                    label="State"
                    value={form.state}
                    onChange={(e) => setField("state", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="City"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                  />
                </FormField>
                <FormField className="sm:col-span-2">
                  <Textarea
                    label="Address"
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                    rows={2}
                  />
                </FormField>
                <FormField>
                  <Textarea
                    label="Education Qualification"
                    value={form.education}
                    onChange={(e) => setField("education", e.target.value)}
                    rows={2}
                  />
                </FormField>
                <FormField>
                  <Textarea
                    label="Work Experience"
                    value={form.experience}
                    onChange={(e) => setField("experience", e.target.value)}
                    rows={2}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Current Designation"
                    value={form.current_designation}
                    onChange={(e) => setField("current_designation", e.target.value)}
                  />
                </FormField>
              </FormGrid>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={evalBusy === "personal-pass"}
                  disabled={!!candidate?.is_onboarded}
                  onClick={async () => {
                    setEvalBusy("personal-pass");
                    try {
                      const res = await hrmsService.patchCandidateEval(id, {
                        section: "personal",
                        status: "pass",
                        date_of_birth: form.date_of_birth || null,
                        gender: form.gender || null,
                        marital_status: form.marital_status || null,
                        address: form.address || null,
                        state: form.state || null,
                        city: form.city || null,
                        education: form.education || null,
                        experience: form.experience || null,
                        current_designation: form.current_designation || null,
                      });
                      setCandidate(unwrap(res));
                      toastSuccess("Personal info marked Pass");
                    } catch (err) {
                      toastErrorFromApi(err, "Eval failed");
                    } finally {
                      setEvalBusy(null);
                    }
                  }}
                >
                  Pass
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  loading={evalBusy === "personal-fail"}
                  disabled={!!candidate?.is_onboarded}
                  onClick={async () => {
                    setEvalBusy("personal-fail");
                    try {
                      const res = await hrmsService.patchCandidateEval(id, {
                        section: "personal",
                        status: "fail",
                      });
                      setCandidate(unwrap(res));
                      toastSuccess("Personal info marked Fail");
                    } catch (err) {
                      toastErrorFromApi(err, "Eval failed");
                    } finally {
                      setEvalBusy(null);
                    }
                  }}
                >
                  Fail
                </Button>
              </div>
            </FormSection>

            <FormSection variant="card" title="HR Details">
              <p className="mb-2 text-xs text-muted-foreground">
                Status: {candidate?.hr_status || "pending"}
              </p>
              <FormGrid>
                <FormField className="sm:col-span-2">
                  <Textarea
                    label="Describe yourself"
                    value={form.describe_yourself}
                    onChange={(e) => setField("describe_yourself", e.target.value)}
                    rows={2}
                  />
                </FormField>
                <FormField>
                  <Select
                    label="Same field as applied?"
                    value={form.same_field}
                    onChange={(e) => setField("same_field", e.target.value)}
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormField>
                <FormField>
                  <Select
                    label="Experience in this field"
                    value={form.experience_in_field}
                    onChange={(e) => setField("experience_in_field", e.target.value)}
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="0-1">0 - 1 Year</MenuItem>
                    <MenuItem value="1-3">1 - 3 Year</MenuItem>
                    <MenuItem value="3-5">3 - 5 Year</MenuItem>
                    <MenuItem value="5+">5+ Year</MenuItem>
                  </Select>
                </FormField>
                <FormField className="sm:col-span-2">
                  <Textarea
                    label="Current job responsibilities"
                    value={form.job_responsibilities}
                    onChange={(e) => setField("job_responsibilities", e.target.value)}
                    rows={2}
                  />
                </FormField>
                <FormField className="sm:col-span-2">
                  <Textarea
                    label="Why do you want this job?"
                    value={form.why_this_job}
                    onChange={(e) => setField("why_this_job", e.target.value)}
                    rows={2}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Previous job status"
                    value={form.previous_job_status}
                    onChange={(e) => setField("previous_job_status", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Days left / notice"
                    value={form.days_left}
                    onChange={(e) => setField("days_left", e.target.value.replace(/\D/g, ""))}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Gap months"
                    value={form.gap_months}
                    onChange={(e) => setField("gap_months", e.target.value.replace(/\D/g, ""))}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Current CTC"
                    value={form.current_ctc}
                    onChange={(e) => setField("current_ctc", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Expected CTC"
                    value={form.expected_ctc}
                    onChange={(e) => setField("expected_ctc", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Month In Hand Salary"
                    value={form.in_hand_salary}
                    onChange={(e) => setField("in_hand_salary", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Select
                    label="Join timeline"
                    value={form.join_timeline}
                    onChange={(e) => setField("join_timeline", e.target.value)}
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="immediate">Immediate</MenuItem>
                    <MenuItem value="15_days">15 days</MenuItem>
                    <MenuItem value="1_month">1 month</MenuItem>
                    <MenuItem value="2_month">2 month</MenuItem>
                  </Select>
                </FormField>
                <FormField>
                  <Input
                    label="Notice Period (days)"
                    value={form.notice_period_days}
                    onChange={(e) => setField("notice_period_days", e.target.value.replace(/\D/g, ""))}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Relocation"
                    value={form.relocation}
                    onChange={(e) => setField("relocation", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Meet link"
                    value={form.meet_link}
                    onChange={(e) => setField("meet_link", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Textarea
                    label="Manager feedback"
                    value={form.manager_feedback}
                    onChange={(e) => setField("manager_feedback", e.target.value)}
                    rows={2}
                  />
                </FormField>
              </FormGrid>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={evalBusy === "hr-pass"}
                  disabled={!!candidate?.is_onboarded}
                  onClick={async () => {
                    setEvalBusy("hr-pass");
                    try {
                      const res = await hrmsService.patchCandidateEval(id, {
                        section: "hr",
                        status: "pass",
                        current_ctc: form.current_ctc !== "" ? Number(form.current_ctc) : null,
                        expected_ctc: form.expected_ctc !== "" ? Number(form.expected_ctc) : null,
                        in_hand_salary: form.in_hand_salary !== "" ? Number(form.in_hand_salary) : null,
                        meet_link: form.meet_link || null,
                        manager_feedback: form.manager_feedback || null,
                        manager_feedback_status: "pass",
                        describe_yourself: form.describe_yourself || null,
                        same_field: form.same_field || null,
                        experience_in_field: form.experience_in_field || null,
                        job_responsibilities: form.job_responsibilities || null,
                        why_this_job: form.why_this_job || null,
                        previous_job_status: form.previous_job_status || null,
                        days_left: form.days_left !== "" ? Number(form.days_left) : null,
                        gap_months: form.gap_months !== "" ? Number(form.gap_months) : null,
                        join_timeline: form.join_timeline || null,
                        notice_period_days:
                          form.notice_period_days !== "" ? Number(form.notice_period_days) : null,
                        relocation: form.relocation || null,
                      });
                      setCandidate(unwrap(res));
                      toastSuccess("HR details marked Pass");
                    } catch (err) {
                      toastErrorFromApi(err, "Eval failed");
                    } finally {
                      setEvalBusy(null);
                    }
                  }}
                >
                  Pass
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  loading={evalBusy === "hr-fail"}
                  disabled={!!candidate?.is_onboarded}
                  onClick={async () => {
                    setEvalBusy("hr-fail");
                    try {
                      const res = await hrmsService.patchCandidateEval(id, {
                        section: "hr",
                        status: "fail",
                        manager_feedback_status: "fail",
                      });
                      setCandidate(unwrap(res));
                      toastSuccess("HR details marked Fail");
                    } catch (err) {
                      toastErrorFromApi(err, "Eval failed");
                    } finally {
                      setEvalBusy(null);
                    }
                  }}
                >
                  Fail
                </Button>
              </div>
            </FormSection>

            <FormSection variant="card" title="Aptitude">
              <p className="mb-2 text-xs text-muted-foreground">
                Status: {candidate?.aptitude_status || "pending"}
              </p>
              <FormGrid>
                <FormField>
                  <Input
                    label="Mark"
                    value={form.aptitude_mark}
                    onChange={(e) => setField("aptitude_mark", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Upload URL"
                    value={form.aptitude_upload_url}
                    onChange={(e) => setField("aptitude_upload_url", e.target.value)}
                  />
                </FormField>
              </FormGrid>
              <div className="mt-2 flex flex-wrap gap-2">
                {["pass", "fail", "hold"].map((st) => (
                  <Button
                    key={st}
                    type="button"
                    size="sm"
                    variant={st === "fail" ? "destructive" : "outline"}
                    loading={evalBusy === `apt-${st}`}
                    disabled={!!candidate?.is_onboarded}
                    onClick={async () => {
                      setEvalBusy(`apt-${st}`);
                      try {
                        const res = await hrmsService.patchCandidateEval(id, {
                          section: "aptitude",
                          status: st,
                          aptitude_mark: form.aptitude_mark !== "" ? Number(form.aptitude_mark) : null,
                          aptitude_upload_url: form.aptitude_upload_url || null,
                        });
                        setCandidate(unwrap(res));
                        toastSuccess(`Aptitude: ${st}`);
                      } catch (err) {
                        toastErrorFromApi(err, "Eval failed");
                      } finally {
                        setEvalBusy(null);
                      }
                    }}
                  >
                    {st === "pass" ? "Pass" : st === "fail" ? "Fail" : "Hold"}
                  </Button>
                ))}
              </div>
            </FormSection>

            <FormSection variant="card" title="Practical">
              <p className="mb-2 text-xs text-muted-foreground">
                Status: {candidate?.practical_status || "pending"}
              </p>
              <FormGrid>
                <FormField className="sm:col-span-2">
                  <Input
                    label="Upload documents URL"
                    value={form.practical_upload_url}
                    onChange={(e) => setField("practical_upload_url", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Textarea
                    label="Comments by other employees"
                    value={form.practical_comments_others}
                    onChange={(e) => setField("practical_comments_others", e.target.value)}
                    rows={2}
                  />
                </FormField>
                <FormField>
                  <Textarea
                    label="Comments by admin"
                    value={form.practical_comments_admin}
                    onChange={(e) => setField("practical_comments_admin", e.target.value)}
                    rows={2}
                  />
                </FormField>
              </FormGrid>
              <div className="mt-2 flex flex-wrap gap-2">
                {["pass", "fail", "hold"].map((st) => (
                  <Button
                    key={st}
                    type="button"
                    size="sm"
                    variant={st === "fail" ? "destructive" : "outline"}
                    loading={evalBusy === `prac-${st}`}
                    disabled={!!candidate?.is_onboarded}
                    onClick={async () => {
                      setEvalBusy(`prac-${st}`);
                      try {
                        const res = await hrmsService.patchCandidateEval(id, {
                          section: "practical",
                          status: st,
                          practical_upload_url: form.practical_upload_url || null,
                          practical_comments_others: form.practical_comments_others || null,
                          practical_comments_admin: form.practical_comments_admin || null,
                        });
                        setCandidate(unwrap(res));
                        toastSuccess(`Practical: ${st}`);
                      } catch (err) {
                        toastErrorFromApi(err, "Eval failed");
                      } finally {
                        setEvalBusy(null);
                      }
                    }}
                  >
                    {st === "pass" ? "Pass" : st === "fail" ? "Fail" : "Hold"}
                  </Button>
                ))}
              </div>
            </FormSection>

            <FormSection variant="card" title="Final">
              <p className="mb-2 text-xs text-muted-foreground">
                Status: {candidate?.final_status || "pending"}
              </p>
              <FormGrid>
                <FormField>
                  <DateField
                    label="Joining date"
                    name="joining_date_final"
                    value={form.joining_date}
                    onChange={(e) => setField("joining_date", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Offer salary"
                    value={form.salary}
                    onChange={(e) => setField("salary", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <Select
                    label="Policy understanding"
                    value={form.policy_understanding}
                    onChange={(e) => setField("policy_understanding", e.target.value)}
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormField>
                <FormField>
                  <Select
                    label="Probation understanding"
                    value={form.probation_understanding}
                    onChange={(e) => setField("probation_understanding", e.target.value)}
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormField>
                <FormField>
                  <Select
                    label="Notice period understanding"
                    value={form.notice_understanding}
                    onChange={(e) => setField("notice_understanding", e.target.value)}
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormField>
                <FormField>
                  <Select
                    label="Time & rules understanding"
                    value={form.time_rules_understanding}
                    onChange={(e) => setField("time_rules_understanding", e.target.value)}
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormField>
                <FormField className="sm:col-span-2">
                  <Input
                    label="Offer letter URL"
                    value={form.offer_letter_url}
                    onChange={(e) => setField("offer_letter_url", e.target.value)}
                  />
                </FormField>
              </FormGrid>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={evalBusy === "final-short"}
                  disabled={!!candidate?.is_onboarded}
                  onClick={async () => {
                    setEvalBusy("final-short");
                    try {
                      const res = await hrmsService.patchCandidateEval(id, {
                        section: "final",
                        status: "shortlisted",
                        joining_date: form.joining_date || null,
                        salary: form.salary !== "" ? Number(form.salary) : null,
                        offer_letter_url: form.offer_letter_url || null,
                      });
                      const row = unwrap(res);
                      setCandidate(row);
                      if (row?.stage != null) setForm((f) => ({ ...f, stage: String(row.stage) }));
                      toastSuccess("Final: shortlisted / selected");
                    } catch (err) {
                      toastErrorFromApi(err, "Eval failed");
                    } finally {
                      setEvalBusy(null);
                    }
                  }}
                >
                  Shortlisted
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={evalBusy === "final-hold"}
                  disabled={!!candidate?.is_onboarded}
                  onClick={async () => {
                    setEvalBusy("final-hold");
                    try {
                      const res = await hrmsService.patchCandidateEval(id, {
                        section: "final",
                        status: "hold",
                      });
                      setCandidate(unwrap(res));
                      toastSuccess("Final: on hold");
                    } catch (err) {
                      toastErrorFromApi(err, "Eval failed");
                    } finally {
                      setEvalBusy(null);
                    }
                  }}
                >
                  Hold
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  loading={evalBusy === "final-rej"}
                  disabled={!!candidate?.is_onboarded}
                  onClick={async () => {
                    setEvalBusy("final-rej");
                    try {
                      const res = await hrmsService.patchCandidateEval(id, {
                        section: "final",
                        status: "rejected",
                        reason: "Final evaluation rejected",
                      });
                      const row = unwrap(res);
                      setCandidate(row);
                      if (row?.stage != null) setForm((f) => ({ ...f, stage: String(row.stage) }));
                      toastSuccess("Final: rejected");
                    } catch (err) {
                      toastErrorFromApi(err, "Eval failed");
                    } finally {
                      setEvalBusy(null);
                    }
                  }}
                >
                  Rejected
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={evalBusy === "offer"}
                  disabled={!!candidate?.is_onboarded || !form.offer_letter_url.trim()}
                  onClick={async () => {
                    setEvalBusy("offer");
                    try {
                      const res = await hrmsService.patchCandidateOfferLetter(id, {
                        offer_letter_url: form.offer_letter_url.trim(),
                      });
                      const row = unwrap(res);
                      setCandidate(row);
                      if (row?.stage != null) setForm((f) => ({ ...f, stage: String(row.stage) }));
                      toastSuccess("Offer letter saved");
                    } catch (err) {
                      toastErrorFromApi(err, "Offer update failed");
                    } finally {
                      setEvalBusy(null);
                    }
                  }}
                >
                  Save offer letter
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={evalBusy === "accept-offer"}
                  disabled={!!candidate?.is_onboarded || Number(candidate?.stage) < 8}
                  onClick={async () => {
                    setEvalBusy("accept-offer");
                    try {
                      const res = await hrmsService.acceptCandidateOffer(id, {
                        reason: "Offer accepted by candidate",
                      });
                      const row = unwrap(res);
                      setCandidate(row);
                      if (row?.stage != null) setForm((f) => ({ ...f, stage: String(row.stage) }));
                      toastSuccess("Offer accepted");
                    } catch (err) {
                      toastErrorFromApi(err, "Accept offer failed");
                    } finally {
                      setEvalBusy(null);
                    }
                  }}
                >
                  Accept offer
                </Button>
              </div>
            </FormSection>

            <FormSection variant="card" title="Activity timeline">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="space-y-2">
                  {activities.map((a) => (
                    <li
                      key={a.id || `${a.action}-${a.created_at}`}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="font-medium capitalize">
                        {String(a.action || "").replace(/_/g, " ")}
                        {a.field ? ` · ${a.field}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.from != null || a.to != null
                          ? `${a.from ?? "—"} → ${a.to ?? "—"}`
                          : a.reason || ""}
                        {a.created_at
                          ? ` · ${new Date(a.created_at).toLocaleString("en-IN")}`
                          : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </FormSection>

            <FormActions>
              <Button type="button" variant="outline" onClick={() => router.push("/hrms/candidates")}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                loading={rejecting}
                disabled={Number(form.stage) === 0 || !!candidate?.is_onboarded}
                onClick={() => setRejectOpen(true)}
              >
                Reject
              </Button>
              <Button type="submit" loading={saving} disabled={!!candidate?.is_onboarded}>
                Save
              </Button>
            </FormActions>
          </FormContainer>
        </form>

        {canOnboard ? (
          <form
            onSubmit={onOnboard}
            onKeyDown={preventEnterSubmit}
            className={loading ? "hidden" : "mt-4"}
          >
            <FormContainer>
              <FormSection variant="card" title="Onboard to employee">
                <p className="mb-3 text-sm text-muted-foreground">
                  Creates an active employee and login. Requires stage Offer Released (8+) and a
                  complete onboarding checklist.
                </p>
                <FormGrid>
                  <FormField>
                    <Input
                      label="Employee code"
                      name="emp_code"
                      value={onboardForm.emp_code}
                      onChange={(e) => setOnboardField("emp_code", e.target.value)}
                      error={!!onboardErrors.emp_code}
                      helperText={onboardErrors.emp_code}
                      required
                    />
                  </FormField>
                  <FormField>
                    <AutocompleteField
                      label="Department"
                      name="department_id"
                      placeholder="Search department…"
                      options={departmentOptions}
                      getOptionLabel={(o) => o?.label ?? ""}
                      value={onboardForm.department_id || null}
                      onChange={(_e, opt) => {
                        setOnboardField("department_id", opt?.value ?? "");
                        setOnboardField("designation_id", "");
                      }}
                      error={!!onboardErrors.department_id}
                      helperText={onboardErrors.department_id}
                      required
                    />
                  </FormField>
                  <FormField>
                    <AutocompleteField
                      label="Designation"
                      name="designation_id"
                      placeholder={
                        onboardForm.department_id
                          ? "Search designation…"
                          : "Select department first"
                      }
                      options={designationOptions}
                      getOptionLabel={(o) => o?.label ?? ""}
                      value={onboardForm.designation_id || null}
                      onChange={(_e, opt) =>
                        setOnboardField("designation_id", opt?.value ?? "")
                      }
                      error={!!onboardErrors.designation_id}
                      helperText={onboardErrors.designation_id}
                      required
                      disabled={!onboardForm.department_id}
                    />
                  </FormField>
                  <FormField>
                    <DateField
                      label="Joining date"
                      name="joining_date"
                      value={onboardForm.joining_date}
                      onChange={(e) => setOnboardField("joining_date", e.target.value)}
                      error={!!onboardErrors.joining_date}
                      helperText={
                        onboardErrors.joining_date ||
                        "Pick from calendar (preferred) or type DD/MM/YYYY"
                      }
                      required
                    />
                  </FormField>
                  <FormField>
                    <Select
                      label="Role (optional)"
                      name="role_id"
                      value={onboardForm.role_id}
                      onChange={(e) => setOnboardField("role_id", e.target.value)}
                    >
                      <MenuItem value="">Default role</MenuItem>
                      {roles.map((r) => (
                        <MenuItem key={r.id} value={String(r.id)}>
                          {r.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormField>
                </FormGrid>
                <div className="mt-3">
                  <p className="mb-2 text-sm font-medium">Branches</p>
                  {onboardErrors.branch_ids ? (
                    <p className="mb-2 text-sm text-destructive">{onboardErrors.branch_ids}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    {branches.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={(onboardForm.branch_ids || []).map(Number).includes(Number(b.id))}
                          onChange={() => toggleBranch(b.id)}
                        />
                        {b.name || b.title || `Branch ${b.id}`}
                      </label>
                    ))}
                  </div>
                </div>
              </FormSection>
              <FormActions>
                <Button type="submit" loading={onboarding}>
                  Submit onboard
                </Button>
              </FormActions>
            </FormContainer>
          </form>
        ) : null}
        <AlertDialog
          open={rejectOpen}
          onOpenChange={(open) => {
            setRejectOpen(open);
            if (!open) setRejectError("");
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject candidate?</AlertDialogTitle>
              <AlertDialogDescription>
                Rejection is final for this candidate. Add a reason so the timeline stays auditable.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Textarea
                label="Rejection reason"
                name="reject_reason"
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectError) setRejectError("");
                }}
                rows={3}
                error={!!rejectError}
                helperText={rejectError}
                required
              />
            </div>
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
