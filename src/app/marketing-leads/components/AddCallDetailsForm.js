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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import marketingLeadsService from "@/services/marketingLeadsService";
import { toastError, toastSuccess } from "@/utils/toast";

const INITIAL_FORM = {
  contacted_at: new Date().toISOString(),
  contact_channel: "call",
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setFormData((prev) => ({
      ...initialState,
      outcome: forcedOutcome ?? (prev.outcome || initialState.outcome),
    }));
    setErrors({});
    setConfirmOpen(false);
  }, [initialState, leadId, forcedStatus, forcedOutcome]);

  const isAlreadyConverted =
    lead?.status === "converted" || !!lead?.converted_inquiry_id;

  const buildPayload = useCallback(
    (overrides = {}) => ({
      ...formData,
      ...overrides,
      outcome: forcedOutcome ?? formData.outcome,
      ...(forcedStatus ? { status: forcedStatus } : {}),
    }),
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
      if (outcomeToValidate === "converted" && isAlreadyConverted) {
        newErrors.outcome = "This lead is already converted to an inquiry";
      }
      if (Object.keys(newErrors).length) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      if (outcomeToValidate === "converted" && lead) {
        setConfirmOpen(true);
        return;
      }
      try {
        setSaving(true);
        await marketingLeadsService.addFollowUp(leadId, buildPayload());
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
    [leadId, formData, forcedOutcome, onSaved, lead, isAlreadyConverted, buildPayload]
  );

  const handleConfirmConvert = useCallback(async () => {
    if (!leadId) return;
    try {
      setSaving(true);
      // 1) Save follow-up
      await marketingLeadsService.addFollowUp(leadId, buildPayload());
      // 2) Convert lead to inquiry (idempotent on backend)
      await marketingLeadsService.convertToInquiry(leadId, {});
      toastSuccess("Lead converted to inquiry successfully");
      setConfirmOpen(false);
      setFormData((prev) => ({
        ...prev,
        ...INITIAL_FORM,
        contacted_at: new Date().toISOString(),
        contact_channel: prev.contact_channel,
      }));
      onSaved?.();
      onConverted?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to convert lead to inquiry";
      toastError(msg);
    } finally {
      setSaving(false);
    }
  }, [leadId, onSaved, onConverted, buildPayload]);

  return (
    <>
      <FormContainer className="mx-auto ml-2 pr-1 max-w-full">
        <form
          id="add-call-details-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <FormSection title="Add Call Details">
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
                <MenuItem value="call">Call</MenuItem>
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="sms">SMS</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="visit">Visit</MenuItem>
              </Select>
              {forcedOutcome ? (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Outcome</label>
                  <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                    {ALL_OUTCOME_OPTIONS.find((o) => o.value === forcedOutcome)?.label ?? forcedOutcome}
                  </div>
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
                label="Next Follow-Up"
                value={formData.next_follow_up_at}
                onChange={handleChange}
              />
              <Input
                name="promised_action"
                label="Promised Action"
                value={formData.promised_action || ""}
                onChange={handleChange}
              />
              <Textarea
                name="notes"
                label="Remarks"
                value={formData.notes || ""}
                onChange={handleChange}
                minRows={8}
                className="md:col-span-2"
              />
              <div className="col-span-2 flex justify-end pt-2">
                <LoadingButton
                  type="submit"
                  form="add-call-details-form"
                  size="sm"
                  loading={saving}
                >
                  Save Follow-Up
                </LoadingButton>
              </div>
            </FormGrid>
          </FormSection>
        </form>
      </FormContainer>

      <Dialog open={confirmOpen} onOpenChange={(open) => !open && setConfirmOpen(false)}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Convert lead to inquiry?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 text-sm">
            <p className="text-muted-foreground">
              This will log the call outcome and create an inquiry based on this lead&apos;s
              details. The lead will be marked as <span className="font-semibold">Converted</span>{" "}
              and will be hidden from day-to-day lead views unless you filter by converted status.
            </p>
            {lead && (
              <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs space-y-1.5">
                <div className="flex gap-2">
                  <span className="w-20 text-muted-foreground">Lead</span>
                  <span className="font-medium">
                    {lead.customer_name || "-"}{" "}
                    {lead.lead_number ? `(#${lead.lead_number})` : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20 text-muted-foreground">Mobile</span>
                  <span>{lead.mobile_number || "-"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20 text-muted-foreground">Branch</span>
                  <span>{lead.branch_name || "N/A"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20 text-muted-foreground">Source</span>
                  <span>{lead.inquiry_source_name || "N/A"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20 text-muted-foreground">Capacity</span>
                  <span>
                    {lead.expected_capacity_kw != null
                      ? `${lead.expected_capacity_kw} kW`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-20 text-muted-foreground">Value</span>
                  <span>
                    {lead.expected_project_cost != null
                      ? `₹ ${Number(lead.expected_project_cost).toLocaleString()}`
                      : "N/A"}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={handleConfirmConvert}
              disabled={saving}
            >
              Convert to Inquiry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
