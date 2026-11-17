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
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsCandidateEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [positions, setPositions] = useState([]);
  const [stages, setStages] = useState([]);
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
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [metaRes, rowRes] = await Promise.all([
          hrmsService.getCandidateMeta(),
          hrmsService.getCandidate(id),
        ]);
        if (cancelled) return;
        const meta = unwrap(metaRes) || {};
        setPositions(meta.positions || []);
        setStages(meta.stages || []);
        const row = unwrap(rowRes) || {};
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

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
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
      await hrmsService.updateCandidate(id, {
        position_id: Number(form.position_id),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        reference: form.reference.trim() || null,
        notes: form.notes.trim() || null,
        stage: Number(form.stage),
      });
      toastSuccess("Candidate updated");
      router.push("/hrms/candidates");
    } catch (err) {
      toastErrorFromApi(err, "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const onReject = async () => {
    setRejecting(true);
    try {
      const res = await hrmsService.patchCandidateStage(id, { reject: true });
      const row = unwrap(res) || {};
      setForm((f) => ({ ...f, stage: String(row.stage ?? 0) }));
      toastSuccess("Candidate rejected");
    } catch (err) {
      toastErrorFromApi(err, "Reject failed");
    } finally {
      setRejecting(false);
    }
  };

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
                  >
                    {stages.map((s) => (
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
                disabled={Number(form.stage) === 0}
                onClick={onReject}
              >
                Reject
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
