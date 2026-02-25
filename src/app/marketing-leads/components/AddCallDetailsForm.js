"use client";

import { useState, useCallback } from "react";
import Input from "@/components/common/Input";
import Textarea from "@/components/common/Textarea";
import DateTimeField from "@/components/common/DateTimeField";
import Select, { MenuItem } from "@/components/common/Select";
import FormContainer from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import LoadingButton from "@/components/common/LoadingButton";
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

export default function AddCallDetailsForm({ leadId, onSaved }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

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
      if (!formData.outcome) {
        newErrors.outcome = "Please select outcome";
      }
      if (Object.keys(newErrors).length) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      try {
        setSaving(true);
        await marketingLeadsService.addFollowUp(leadId, formData);
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
    [leadId, formData, onSaved]
  );

  return (
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
              <MenuItem value="interested">Interested</MenuItem>
              <MenuItem value="follow_up">Need Follow-up</MenuItem>
              <MenuItem value="callback_scheduled">Callback Scheduled</MenuItem>
              <MenuItem value="converted">Converted</MenuItem>
              <MenuItem value="no_answer">No Answer</MenuItem>
              <MenuItem value="switched_off">Switched Off</MenuItem>
              <MenuItem value="not_interested">Not Interested</MenuItem>
              <MenuItem value="wrong_number">Wrong Number</MenuItem>
            </Select>
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
              label="Call Notes"
              value={formData.notes || ""}
              onChange={handleChange}
              minRows={4}
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
  );
}
