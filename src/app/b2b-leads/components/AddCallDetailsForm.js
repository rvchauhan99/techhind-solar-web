"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Input from "@/components/common/Input";
import Textarea from "@/components/common/Textarea";
import DateTimeField from "@/components/common/DateTimeField";
import Select, { MenuItem } from "@/components/common/Select";
import FormContainer from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import LoadingButton from "@/components/common/LoadingButton";
import { Button } from "@/components/ui/button";
import b2bLeadService from "@/services/b2bLeadService";
import { toastError, toastSuccess } from "@/utils/toast";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";

const CHANNEL_OPTIONS = [
  { value: "phone_call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "visit", label: "Visit" },
  { value: "video_meeting", label: "Video Meeting" },
];

const INITIAL_FORM = {
  contacted_at: new Date().toISOString(),
  contact_channel: "phone_call",
  outcome: "",
  outcome_sub_status: "",
  notes: "",
  next_follow_up_at: "",
  promised_action: "",
};

const ALL_OUTCOME_OPTIONS = [
  { value: "viewed", label: "Viewed" },
  { value: "follow_up", label: "Follow Up Needed" },
  { value: "callback_scheduled", label: "Callback Scheduled" },
  { value: "converted", label: "Converted" },
  { value: "no_answer", label: "No Answer" },
  { value: "switched_off", label: "Switch Off" },
  { value: "not_interested", label: "Not Interested" },
  { value: "wrong_number", label: "Wrong Number" },
];

export default function AddCallDetailsForm({
  leadId,
  lead,
  onSaved,
  onConverted,
  defaultValues,
  forcedStatus,
  forcedOutcome = null,
  allowedOutcomes = null,
}) {
  const initialState = useMemo(() => {
    const contactedAt = defaultValues?.contacted_at || new Date().toISOString();
    const outcome = forcedOutcome ?? defaultValues?.outcome ?? "";
    return {
      ...INITIAL_FORM,
      ...(defaultValues || {}),
      contacted_at: contactedAt,
      outcome,
    };
  }, [defaultValues, forcedOutcome]);

  const [formData, setFormData] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [convertConfirmStep, setConvertConfirmStep] = useState(false);

  useEffect(() => {
    setFormData((prev) => ({
      ...initialState,
      outcome: forcedOutcome ?? (prev.outcome || initialState.outcome),
    }));
    setErrors({});
    setConvertConfirmStep(false);
  }, [initialState, leadId, forcedStatus, forcedOutcome]);

  const isAlreadyConverted =
    lead?.status === "converted" || !!lead?.converted_client_id;

  const buildPayload = useCallback(
    (overrides = {}) => {
      const merged = {
        ...formData,
        ...overrides,
        outcome: forcedOutcome ?? formData.outcome,
        ...(forcedStatus ? { status: forcedStatus } : {}),
      };
      const status = forcedStatus || merged.outcome || undefined;
      return {
        ...merged,
        follow_up_type: merged.contact_channel || "phone_call",
        follow_up_at: merged.contacted_at || new Date().toISOString(),
        discussion: merged.notes || null,
        status,
        outcome_status: status,
        ...(status === "not_interested"
          ? { pipeline_stage: "lost", lost_reason: merged.outcome_sub_status || "not_interested" }
          : {}),
        ...(status === "converted" ? { pipeline_stage: "won" } : {}),
      };
    },
    [formData, forcedStatus, forcedOutcome]
  );

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value ?? "" }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }, [errors]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const newErrors = {};
      const outcomeToValidate = forcedOutcome ?? formData.outcome;
      if (!outcomeToValidate) {
        newErrors.outcome = "Please select outcome";
      }

      if (Object.keys(newErrors).length) {
        const firstMsg = Object.values(newErrors).find((m) => typeof m === "string" && m);
        if (firstMsg) toastError(firstMsg);
        setErrors(newErrors);
        return;
      }
      setErrors({});
      if (outcomeToValidate === "converted" && lead) {
        setConvertConfirmStep(true);
        return;
      }
      try {
        setSaving(true);
        await b2bLeadService.addB2bLeadFollowUp(leadId, buildPayload());
        toastSuccess("Follow-up saved");
        setFormData((prev) => ({
          ...prev,
          ...INITIAL_FORM,
          contacted_at: new Date().toISOString(),
          contact_channel: prev.contact_channel,
        }));
        onSaved?.();
      } catch (err) {
        const msg =
          err?.response?.data?.message || err?.message || "Failed to save follow-up";
        toastError(msg);
      } finally {
        setSaving(false);
      }
    },
    [leadId, formData, forcedOutcome, onSaved, lead, buildPayload]
  );

  const handleConfirmConvert = useCallback(async () => {
    if (!leadId) return;
    try {
      setSaving(true);
      await b2bLeadService.addB2bLeadFollowUp(leadId, buildPayload());
      const res = await b2bLeadService.convertB2bLead(leadId);
      const client = res?.result ?? res?.data ?? res;
      const clientCode = client?.client_code || client?.code || "";
      toastSuccess(
        clientCode
          ? `B2B Lead converted successfully (${clientCode})`
          : "B2B Lead converted successfully"
      );
      setConvertConfirmStep(false);
      setFormData((prev) => ({
        ...prev,
        ...INITIAL_FORM,
        contacted_at: new Date().toISOString(),
        contact_channel: prev.contact_channel,
      }));
      onConverted?.(client);
      onSaved?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to convert lead";
      toastError(msg);
    } finally {
      setSaving(false);
    }
  }, [leadId, buildPayload, onConverted, onSaved]);

  return (
    <FormContainer className="mx-auto ml-2 pr-1 max-w-full">
      {!convertConfirmStep ? (
        <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} noValidate>
          <FormSection title="Call Details">
            <FormGrid cols={2}>
              <DateTimeField
                name="contacted_at"
                label="Contacted At"
                value={formData.contacted_at}
                onChange={handleChange}
              />
              <Select
                name="contact_channel"
                label="Channel"
                value={formData.contact_channel}
                onChange={handleChange}
              >
                {CHANNEL_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
              {forcedOutcome ? (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Outcome</label>
                  <div
                    className={`rounded-md border bg-muted/50 px-3 py-2 text-sm ${
                      errors.outcome ? "border-destructive" : "border-input"
                    }`}
                  >
                    {ALL_OUTCOME_OPTIONS.find((o) => o.value === forcedOutcome)?.label ?? forcedOutcome}
                  </div>
                  {errors.outcome ? (
                    <p className="text-xs text-destructive">{errors.outcome}</p>
                  ) : null}
                </div>
              ) : (
                <Select
                  name="outcome"
                  label="Outcome"
                  value={formData.outcome}
                  onChange={handleChange}
                  error={!!errors.outcome}
                  helperText={errors.outcome}
                  required
                >
                  <MenuItem value="">Select...</MenuItem>
                  {(allowedOutcomes && allowedOutcomes.length > 0
                    ? ALL_OUTCOME_OPTIONS.filter((o) => allowedOutcomes.includes(o.value))
                    : ALL_OUTCOME_OPTIONS
                  ).map((opt) => (
                    <MenuItem
                      key={opt.value}
                      value={opt.value}
                      disabled={opt.value === "converted" && isAlreadyConverted}
                    >
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              )}
              <Input
                name="outcome_sub_status"
                label="Sub-status / Reason"
                value={formData.outcome_sub_status || ""}
                onChange={handleChange}
              />
              <DateTimeField
                name="next_follow_up_at"
                label="Next Follow-up"
                value={formData.next_follow_up_at}
                onChange={handleChange}
              />
              <Input
                name="promised_action"
                label="Promised Action"
                value={formData.promised_action || ""}
                onChange={handleChange}
              />
              <div className="sm:col-span-2">
                <Textarea
                  name="notes"
                  label="Notes"
                  value={formData.notes || ""}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                <LoadingButton type="submit" size="sm" loading={saving}>
                  Save Follow-Up
                </LoadingButton>
              </div>
            </FormGrid>
          </FormSection>
        </form>
      ) : (
        <FormSection title="Convert B2B lead?">
          <div className="space-y-3 py-1 text-sm">
            <p className="text-muted-foreground">
              This will log the call outcome and convert this lead to a B2B client.
              The lead will be marked as <span className="font-semibold">Converted</span>{" "}
              and hidden from day-to-day lead views unless you filter by converted status.
            </p>
            {lead && (
              <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs space-y-1.5">
                <div className="flex gap-2">
                  <span className="w-20 text-muted-foreground">Lead</span>
                  <span className="font-medium">
                    {lead.company_name || "-"}{" "}
                    {lead.lead_number ? `(#${lead.lead_number})` : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20 text-muted-foreground">Contact</span>
                  <span>{lead.contact_person || "-"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20 text-muted-foreground">Mobile</span>
                  <span>{lead.mobile_number || "-"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20 text-muted-foreground">City</span>
                  <span>{lead.city || "N/A"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20 text-muted-foreground">GSTIN</span>
                  <span>{lead.gstin || "N/A"}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setConvertConfirmStep(false)}
              disabled={saving}
            >
              Back
            </Button>
            <LoadingButton
              size="sm"
              type="button"
              onClick={handleConfirmConvert}
              loading={saving}
            >
              Convert to Client
            </LoadingButton>
          </div>
        </FormSection>
      )}
    </FormContainer>
  );
}
