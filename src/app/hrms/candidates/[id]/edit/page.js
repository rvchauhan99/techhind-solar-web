"use client";

import { useEffect, useState } from "react";
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
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import roleService from "@/services/roleMasterService";
import { listBranches } from "@/services/companyService";

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
  });
  const [onboardForm, setOnboardForm] = useState({
    emp_code: "",
    department_id: "",
    designation_id: "",
    joining_date: "",
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
    Number(candidate.stage) >= 7 &&
    Number(candidate.stage) !== 0;

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
        setForm({
          position_id: row.position_id != null ? String(row.position_id) : "",
          first_name: row.first_name || "",
          last_name: row.last_name || "",
          email: row.email || "",
          mobile: row.mobile || "",
          reference: row.reference || "",
          notes: row.notes || "",
          stage: row.stage != null ? String(row.stage) : "1",
        });
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
      });
      const row = unwrap(res) || {};
      setCandidate(row);
      toastSuccess("Candidate updated");
      router.push("/hrms/candidates");
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
      <AddEditPageShell title="Edit candidate" listHref="/hrms/candidates" listLabel="Candidates">
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
                    Employee {candidate.employee_emp_code || candidate.employee?.emp_code || candidate.employee_id}
                  </span>
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
                  Creates an active employee and login from this Selected candidate.
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
                    <Select
                      label="Department"
                      name="department_id"
                      value={onboardForm.department_id}
                      onChange={(e) => {
                        setOnboardField("department_id", e.target.value);
                        setOnboardField("designation_id", "");
                      }}
                      error={!!onboardErrors.department_id}
                      helperText={onboardErrors.department_id}
                      required
                    >
                      <MenuItem value="">Select department</MenuItem>
                      {departments.map((d) => (
                        <MenuItem key={d.id} value={String(d.id)}>
                          {d.title || d.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormField>
                  <FormField>
                    <Select
                      label="Designation"
                      name="designation_id"
                      value={onboardForm.designation_id}
                      onChange={(e) => setOnboardField("designation_id", e.target.value)}
                      error={!!onboardErrors.designation_id}
                      helperText={onboardErrors.designation_id}
                      required
                      disabled={!onboardForm.department_id}
                    >
                      <MenuItem value="">Select designation</MenuItem>
                      {designations.map((d) => (
                        <MenuItem key={d.id} value={String(d.id)}>
                          {d.title || d.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormField>
                  <FormField>
                    <DateField
                      label="Joining date"
                      name="joining_date"
                      value={onboardForm.joining_date}
                      onChange={(e) => setOnboardField("joining_date", e.target.value)}
                      error={!!onboardErrors.joining_date}
                      helperText={onboardErrors.joining_date}
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
