"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import userService from "@/services/userMasterService";
import marketingLeadsService from "@/services/marketingLeadsService";
import { useAuth } from "@/hooks/useAuth";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import LoadingButton from "@/components/common/LoadingButton";

const OUTCOME_OPTIONS = [
  { key: "follow_up", value: "follow_up", label: "Follow Up" },
  { key: "callback_scheduled", value: "callback_scheduled", label: "Callback Scheduled" },
  { key: "viewed", value: "viewed", label: "Viewed / Interested" },
  { key: "no_answer", value: "no_answer", label: "No Answer" },
  { key: "switched_off", value: "switched_off", label: "Switched Off" },
  { key: "not_interested", value: "not_interested", label: "Not Interested" },
  { key: "wrong_number", value: "wrong_number", label: "Wrong Number" },
  { key: "converted", value: "converted", label: "Converted" },
];

const CONTACT_CHANNEL_OPTIONS = [
  { key: "phone", value: "phone", label: "Phone" },
  { key: "whatsapp", value: "whatsapp", label: "WhatsApp" },
  { key: "email", value: "email", label: "Email" },
  { key: "in_person", value: "in_person", label: "In Person" },
];

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const getDefaultReminderDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
};

export default function LeadFollowupForm({
  leadId,
  leadDetails = null,
  onSubmit,
  loading,
  serverError = null,
  onClearServerError = () => {},
  onCancel = null,
}) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    outcome: "",
    notes: "",
    next_follow_up_at: getDefaultReminderDate(),
    contact_channel: "phone",
    contacted_at: getTodayDate(),
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (serverError) onClearServerError();
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.outcome) newErrors.outcome = "Outcome is required";
    if (!formData.notes || formData.notes.trim() === "") newErrors.notes = "Notes / Remarks are required";
    if (!formData.next_follow_up_at) newErrors.next_follow_up_at = "Next Follow-Up date is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const payload = {
      outcome: formData.outcome,
      notes: formData.notes || null,
      next_follow_up_at: formData.next_follow_up_at
        ? new Date(formData.next_follow_up_at + "T00:00:00").toISOString()
        : null,
      contact_channel: formData.contact_channel || null,
      contacted_at: formData.contacted_at
        ? new Date(formData.contacted_at + "T00:00:00").toISOString()
        : new Date().toISOString(),
    };

    onSubmit(leadId, payload);
  };

  return (
    <FormContainer>
      {/* Lead context info */}
      {leadDetails && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm mb-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight col-span-full mb-0.5">
            Lead Details
          </p>
          <div>
            <span className="text-muted-foreground text-xs">Lead #:</span>{" "}
            <span className="font-medium">{leadDetails.lead_number || `ML-${leadDetails.id}`}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Name:</span>{" "}
            <span className="font-medium">{leadDetails.customer_name || "N/A"}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Mobile:</span>{" "}
            <span className="font-medium">{leadDetails.mobile_number || "N/A"}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Status:</span>{" "}
            <span className="font-medium capitalize">{(leadDetails.status || "").replace(/_/g, " ")}</span>
          </div>
          {leadDetails.priority && (
            <div>
              <span className="text-muted-foreground text-xs">Priority:</span>{" "}
              <span className="font-medium capitalize">{leadDetails.priority}</span>
            </div>
          )}
        </div>
      )}

      <form id="lead-followup-form" onSubmit={handleSubmit} noValidate className="grid gap-4 max-w-[700px]">
        {serverError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AutocompleteField
            name="outcome"
            label="Outcome"
            options={OUTCOME_OPTIONS}
            getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
            value={OUTCOME_OPTIONS.find((o) => o.value === formData.outcome) || null}
            onChange={(e, newVal) =>
              handleChange({ target: { name: "outcome", value: newVal?.value ?? "" } })
            }
            placeholder="Select Outcome"
            required
            error={!!errors.outcome}
            helperText={errors.outcome}
          />

          <AutocompleteField
            name="contact_channel"
            label="Contact Channel"
            options={CONTACT_CHANNEL_OPTIONS}
            getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
            value={CONTACT_CHANNEL_OPTIONS.find((o) => o.value === formData.contact_channel) || null}
            onChange={(e, newVal) =>
              handleChange({ target: { name: "contact_channel", value: newVal?.value ?? "" } })
            }
            placeholder="Select Channel"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DateField
            name="contacted_at"
            label="Contacted At"
            value={formData.contacted_at}
            onChange={handleChange}
            inputProps={{ max: getTodayDate() }}
          />

          <DateField
            name="next_follow_up_at"
            label="Next Follow-Up Date"
            value={formData.next_follow_up_at}
            onChange={handleChange}
            inputProps={{ min: getTodayDate() }}
            required
            error={!!errors.next_follow_up_at}
            helperText={errors.next_follow_up_at}
          />
        </div>

        <Input
          name="notes"
          label="Notes / Remarks"
          value={formData.notes}
          onChange={handleChange}
          multiline
          rows={3}
          required
          error={!!errors.notes}
          helperText={errors.notes}
          placeholder="Describe the conversation outcome..."
        />

        <Input
          fullWidth
          name="call_by"
          label="Called By"
          value={user?.name || user?.email || "Current User"}
          disabled
        />
      </form>

      <FormActions>
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <LoadingButton type="submit" form="lead-followup-form" loading={loading}>
          Save Follow-Up
        </LoadingButton>
      </FormActions>
    </FormContainer>
  );
}
