"use client";

import { useState } from "react";
import Select, { MenuItem } from "@/components/common/Select";
import Textarea from "@/components/common/Textarea";
import DateTimeField from "@/components/common/DateTimeField";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";

export const B2B_FOLLOW_UP_TYPES = [
  { value: "phone_call", label: "Phone Call" },
  { value: "visit", label: "Visit" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "video_meeting", label: "Video Meeting" },
];

export const B2B_FOLLOW_UP_STATUSES = [
  { value: "follow_up", label: "Follow-up" },
  { value: "on_hold", label: "On Hold" },
  { value: "not_interested", label: "Not Interested" },
];

const DEFAULT_NEXT_DAYS = 15;

const getDefaultNextFollowUp = () => {
  const d = new Date();
  d.setDate(d.getDate() + DEFAULT_NEXT_DAYS);
  return d.toISOString().slice(0, 16);
};

export default function B2bLeadFollowupForm({
  onSubmit,
  loading,
  onCancel,
  allowReopen = false,
}) {
  const [formData, setFormData] = useState({
    follow_up_type: "phone_call",
    follow_up_at: new Date().toISOString().slice(0, 16),
    discussion: "",
    next_follow_up_at: getDefaultNextFollowUp(),
    status: "follow_up",
  });
  const [errors, setErrors] = useState({});

  const statusOptions = allowReopen
    ? [{ value: "follow_up", label: "Reopen to Follow-up" }, ...B2B_FOLLOW_UP_STATUSES.filter((s) => s.value !== "follow_up")]
    : B2B_FOLLOW_UP_STATUSES;

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!formData.follow_up_type) next.follow_up_type = "Required";
    if (!formData.discussion?.trim()) next.discussion = "Required";
    if (!formData.next_follow_up_at) next.next_follow_up_at = "Required";
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit?.(formData);
  };

  return (
    <form id="b2b-followup-form" onSubmit={handleSubmit} onKeyDown={preventEnterSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Select
          label="Follow-up Type *"
          value={formData.follow_up_type}
          onChange={(e) => setFormData((p) => ({ ...p, follow_up_type: e.target.value }))}
          error={!!errors.follow_up_type}
          helperText={errors.follow_up_type}
        >
          {B2B_FOLLOW_UP_TYPES.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </Select>
        <DateTimeField
          label="Follow-up At"
          value={formData.follow_up_at}
          onChange={(v) => setFormData((p) => ({ ...p, follow_up_at: v }))}
        />
        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
        >
          {statusOptions.map((s) => (
            <MenuItem key={s.value} value={s.value}>
              {s.label}
            </MenuItem>
          ))}
        </Select>
        <DateTimeField
          label={`Next Follow-up * (default +${DEFAULT_NEXT_DAYS}d)`}
          value={formData.next_follow_up_at}
          onChange={(v) => setFormData((p) => ({ ...p, next_follow_up_at: v }))}
          error={!!errors.next_follow_up_at}
          helperText={errors.next_follow_up_at}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Discussion *"
            value={formData.discussion}
            onChange={(e) => setFormData((p) => ({ ...p, discussion: e.target.value }))}
            error={!!errors.discussion}
            helperText={errors.discussion}
            rows={3}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-border/40">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <LoadingButton type="submit" loading={loading} form="b2b-followup-form">
          Save Follow-up
        </LoadingButton>
      </div>
    </form>
  );
}
