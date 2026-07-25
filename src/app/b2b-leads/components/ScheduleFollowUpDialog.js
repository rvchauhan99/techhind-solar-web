"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import Input from "@/components/common/Input";
import Textarea from "@/components/common/Textarea";
import DateTimeField from "@/components/common/DateTimeField";
import Select, { MenuItem } from "@/components/common/Select";
import LoadingButton from "@/components/common/LoadingButton";
import { Button } from "@/components/ui/button";
import b2bLeadService from "@/services/b2bLeadService";
import { toastError, toastSuccess } from "@/utils/toast";
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";

const CHANNEL_OPTIONS = [
  { value: "phone_call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "visit", label: "Visit" },
  { value: "video_meeting", label: "Video Meeting" },
];

const DEFAULT_INTERVAL = 15;

/**
 * Schedule once or recurring follow-up (also used for Reopen → follow-up).
 */
export default function ScheduleFollowUpDialog({
  open,
  onOpenChange,
  lead,
  mode = "schedule", // schedule | reopen
  onSaved,
}) {
  const [scheduleType, setScheduleType] = useState("once");
  const [intervalDays, setIntervalDays] = useState(String(DEFAULT_INTERVAL));
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [followUpType, setFollowUpType] = useState("phone_call");
  const [discussion, setDiscussion] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setScheduleType("once");
    setIntervalDays(String(lead?.follow_up_interval_days || DEFAULT_INTERVAL));
    setNextFollowUpAt("");
    setFollowUpType("phone_call");
    setDiscussion("");
    setErrors({});
  }, [open, lead?.id, lead?.follow_up_interval_days]);

  const title =
    mode === "reopen"
      ? `Reopen to Follow-up — ${lead?.lead_number || lead?.company_name || ""}`
      : `Schedule Follow-up — ${lead?.lead_number || lead?.company_name || ""}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const days = parseInt(intervalDays, 10);
    const nextErr = {};
    if (!["once", "recurring"].includes(scheduleType)) {
      nextErr.scheduleType = "Select schedule mode";
    }
    if (!Number.isInteger(days) || days < 1) {
      nextErr.intervalDays = "Enter days ≥ 1";
    }
    if (!followUpType) nextErr.followUpType = "Required";
    setErrors(nextErr);
    if (Object.keys(nextErr).length) return;

    if (!lead?.id) return;
    setSaving(true);
    try {
      const payload = {
        schedule_type: scheduleType,
        interval_days: days,
        follow_up_type: followUpType,
        discussion: discussion?.trim() || undefined,
      };
      if (scheduleType === "once" && nextFollowUpAt) {
        payload.next_follow_up_at = nextFollowUpAt;
      }
      await b2bLeadService.scheduleB2bLeadFollowUp(lead.id, payload);
      toastSuccess(
        mode === "reopen" ? "Lead reopened to follow-up" : "Follow-up scheduled"
      );
      onOpenChange?.(false);
      onSaved?.();
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "Failed to schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_FORM_MEDIUM}>
        <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
        <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-2 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select
              label="Schedule mode *"
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value)}
              error={!!errors.scheduleType}
              helperText={errors.scheduleType}
            >
              <MenuItem value="once">Once</MenuItem>
              <MenuItem value="recurring">Recurring</MenuItem>
            </Select>
            <Input
              label="Interval (days) *"
              type="number"
              min={1}
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
              error={!!errors.intervalDays}
              helperText={
                errors.intervalDays ||
                (scheduleType === "recurring"
                  ? "Auto-set next after each logged follow-up"
                  : "Used when exact next date is empty")
              }
            />
            {scheduleType === "once" ? (
              <DateTimeField
                name="next_follow_up_at"
                label="Next Follow-up (optional)"
                value={nextFollowUpAt}
                onChange={(e) => setNextFollowUpAt(e?.target?.value ?? "")}
              />
            ) : null}
            <Select
              label="Channel *"
              value={followUpType}
              onChange={(e) => setFollowUpType(e.target.value)}
              error={!!errors.followUpType}
              helperText={errors.followUpType}
            >
              {CHANNEL_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
            <div className="sm:col-span-2">
              <Textarea
                label="Remarks"
                value={discussion}
                onChange={(e) => setDiscussion(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <LoadingButton type="submit" size="sm" loading={saving}>
              {mode === "reopen" ? "Reopen & Schedule" : "Schedule"}
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
