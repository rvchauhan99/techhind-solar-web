"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Textarea from "@/components/common/Textarea";
import DateTimeField from "@/components/common/DateTimeField";
import AutocompleteField from "@/components/common/AutocompleteField";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi, toastInfo } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

/** Optional interview time: ISO string, or null when blank / unparsable. */
function toOptionalIso(value) {
  const raw = value && typeof value === "object" && value.target != null ? value.target.value : value;
  if (raw == null || raw === "") return null;
  const str = String(raw).trim();
  if (!str || str.toLowerCase() === "invalid date") return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function extractFromResumeText(text) {
  const out = {};
  if (!text) return out;
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (email) out.email = email[0];
  const mobile = text.match(/(?:\+91[\s-]?)?[6-9]\d{9}/);
  if (mobile) out.mobile = mobile[0].replace(/\D/g, "").slice(-10);
  const nameLine = text
    .split(/\n/)
    .map((l) => l.trim())
    .find((l) => l && l.length < 60 && /^[A-Za-z][A-Za-z .'-]+$/.test(l));
  if (nameLine) {
    const parts = nameLine.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      out.first_name = parts[0];
      out.last_name = parts.slice(1).join(" ");
    }
  }
  return out;
}

async function readResumeAutofill(file) {
  const name = String(file.name || "").toLowerCase();
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    const text = await file.text();
    return extractFromResumeText(text);
  }
  // Best-effort: read binary as latin1 and regex email/phone (works for many PDFs)
  const buf = await file.arrayBuffer();
  const text = new TextDecoder("latin1").decode(buf);
  return extractFromResumeText(text);
}

export default function HrmsCandidateAddPage() {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState(null);
  const [form, setForm] = useState({
    position_id: "",
    position_label: "",
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    reference: "",
    notes: "",
    interview_datetime: "",
    taken_by: "",
    taken_by_label: "",
    job_desc_snapshot: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const onResumePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toastInfo("Resume must be 2MB or smaller");
      return;
    }
    setResumeFile(file);
    try {
      const filled = await readResumeAutofill(file);
      setForm((f) => ({
        ...f,
        first_name: filled.first_name || f.first_name,
        last_name: filled.last_name || f.last_name,
        email: filled.email || f.email,
        mobile: filled.mobile || f.mobile,
      }));
      if (filled.email || filled.mobile || filled.first_name) {
        toastInfo("Resume fields auto-filled where detected");
      }
    } catch (_) {
      /* ignore OCR failures */
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
    else if (!/^\d{10}$/.test(form.mobile.trim())) errs.mobile = "Mobile must be 10 digits";
    if (!form.reference.trim()) errs.reference = "Reference is required";
    if (!resumeFile) errs.resume = "Resume is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const createdRes = await hrmsService.createCandidate({
        position_id: Number(form.position_id),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        reference: form.reference.trim(),
        notes: form.notes.trim() || null,
        interview_datetime: toOptionalIso(form.interview_datetime),
        taken_by: form.taken_by ? Number(form.taken_by) : null,
        job_desc_snapshot: form.job_desc_snapshot.trim() || null,
      });
      const created = unwrap(createdRes) || createdRes;
      const id = created?.id || created?.result?.id;
      if (id && resumeFile) {
        await hrmsService.uploadCandidateResume(id, resumeFile);
      }
      toastSuccess("Candidate created");
      router.push(id ? `/hrms/candidates/${id}` : "/hrms/candidates");
    } catch (err) {
      toastErrorFromApi(err, "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add candidate" listHref="/hrms/candidates" listLabel="Candidates">
        <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
          <FormContainer>
            <FormSection
              variant="card"
              title="Candidate"
              description="Linked to an active open position. Stage starts at Applied. Invite email is sent on create."
            >
              <FormGrid>
                <FormField>
                  <AutocompleteField
                    label="Position"
                    name="position_id"
                    required
                    placeholder="Type to search…"
                    asyncLoadOptions={(q) => hrmsService.searchHrmsPositions(q)}
                    resolveOptionById={(pid) => hrmsService.resolveHrmsPosition(pid)}
                    getOptionLabel={(o) => o?.label ?? o?.title ?? ""}
                    value={
                      form.position_id
                        ? { id: form.position_id, value: form.position_id, label: form.position_label || "" }
                        : null
                    }
                    onChange={(_e, opt) => {
                      setField("position_id", opt?.id != null ? String(opt.id) : "");
                      setField("position_label", opt?.label ?? opt?.title ?? "");
                      if (opt?.job_description) setField("job_desc_snapshot", opt.job_description);
                    }}
                    error={!!errors.position_id}
                    helperText={errors.position_id}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Reference Portal/By"
                    name="reference"
                    value={form.reference}
                    onChange={(e) => setField("reference", e.target.value)}
                    error={!!errors.reference}
                    helperText={errors.reference}
                    required
                  />
                </FormField>
                <FormField>
                  <Input
                    label="First name"
                    name="first_name"
                    value={form.first_name}
                    onChange={(e) => setField("first_name", e.target.value.replace(/[^A-Za-z .'-]/g, ""))}
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
                    onChange={(e) => setField("last_name", e.target.value.replace(/[^A-Za-z .'-]/g, ""))}
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
                    onChange={(e) => setField("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    error={!!errors.mobile}
                    helperText={errors.mobile}
                    required
                  />
                </FormField>
                <FormField>
                  <DateTimeField
                    label="Interview Date and Time"
                    name="interview_datetime"
                    value={form.interview_datetime}
                    onChange={(e) => setField("interview_datetime", e?.target?.value ?? "")}
                    error={!!errors.interview_datetime}
                    helperText={errors.interview_datetime}
                  />
                </FormField>
                <FormField>
                  <AutocompleteField
                    label="First Interview By"
                    name="taken_by"
                    placeholder="Type to search…"
                    asyncLoadOptions={(q) => hrmsService.searchHrmsEmployees(q)}
                    resolveOptionById={(eid) => hrmsService.resolveHrmsEmployee(eid)}
                    getOptionLabel={(o) => o?.label ?? o?.name ?? ""}
                    value={
                      form.taken_by
                        ? { id: form.taken_by, value: form.taken_by, label: form.taken_by_label || "" }
                        : null
                    }
                    onChange={(_e, opt) => {
                      const uid = opt?.user_id ?? opt?.id ?? opt?.value ?? "";
                      setField("taken_by", uid !== "" ? String(uid) : "");
                      setField("taken_by_label", opt?.label ?? opt?.name ?? "");
                    }}
                    error={!!errors.taken_by}
                    helperText={errors.taken_by}
                  />
                </FormField>
                <FormField className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    Upload Resume <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf"
                    className="block w-full text-sm"
                    onChange={onResumePick}
                  />
                  {resumeFile ? (
                    <p className="mt-1 text-xs text-muted-foreground">{resumeFile.name}</p>
                  ) : null}
                  {errors.resume ? (
                    <p className="mt-1 text-xs text-destructive">{errors.resume}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">PDF/DOC/DOCX, max 2MB</p>
                  )}
                </FormField>
                <FormField className="sm:col-span-2">
                  <Textarea
                    label="Job Description"
                    name="job_desc_snapshot"
                    value={form.job_desc_snapshot}
                    onChange={(e) => setField("job_desc_snapshot", e.target.value)}
                    rows={3}
                  />
                </FormField>
                <FormField className="sm:col-span-2">
                  <Textarea
                    label="Notes"
                    name="notes"
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    rows={2}
                  />
                </FormField>
              </FormGrid>
            </FormSection>
            <FormActions>
              <Button type="button" variant="outline" onClick={() => router.push("/hrms/candidates")}>
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
