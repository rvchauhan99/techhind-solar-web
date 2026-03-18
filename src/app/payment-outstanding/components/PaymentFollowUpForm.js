"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import DateTimeField from "@/components/common/DateTimeField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import paymentOutstandingService from "@/services/paymentOutstandingService";
import { toastError, toastSuccess } from "@/utils/toast";

const OUTCOMES = [
  { value: "follow_up", label: "Follow Up Needed" },
  { value: "callback_scheduled", label: "Callback Scheduled" },
  { value: "promised_payment", label: "Promised Payment" },
  { value: "payment_received", label: "Payment Received" },
  { value: "no_answer", label: "No Answer" },
  { value: "switched_off", label: "Switched Off" },
  { value: "not_interested", label: "Not Interested" },
];

const CHANNELS = [
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "visit", label: "Visit" },
];

export default function PaymentFollowUpForm({ orderId, onSaved }) {
  const [form, setForm] = useState({
    contacted_at: new Date().toISOString(),
    contact_channel: "call",
    outcome: "follow_up",
    promised_amount: "",
    promised_date: "",
    outcome_sub_status: "",
    next_follow_up_at: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    if (!form.outcome) return toastError("Please select an outcome");
    try {
      setLoading(true);
      await paymentOutstandingService.createFollowUp(orderId, form);
      toastSuccess("Follow-up saved");
      onSaved?.();
      // keep channel, reset others
      setForm((p) => ({
        ...p,
        contacted_at: new Date().toISOString(),
        outcome_sub_status: "",
        promised_amount: "",
        promised_date: "",
        next_follow_up_at: "",
        notes: "",
      }));
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to save follow-up");
    } finally {
      setLoading(false);
    }
  };

  const showPromise = form.outcome === "promised_payment";

  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <DateTimeField
          label="Contacted At"
          value={form.contacted_at}
          onChange={(e) => handleChange("contacted_at", e.target.value)}
          size="small"
          fullWidth
        />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted-foreground">Channel</label>
          <Select value={form.contact_channel} onValueChange={(v) => handleChange("contact_channel", v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted-foreground">Outcome</label>
          <Select value={form.outcome} onValueChange={(v) => handleChange("outcome", v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select outcome" />
            </SelectTrigger>
            <SelectContent>
              {OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Input
          value={form.outcome_sub_status}
          onChange={(e) => handleChange("outcome_sub_status", e.target.value)}
          className="h-8 text-sm"
          placeholder="Sub-status / Reason"
        />
        {showPromise && (
          <>
            <Input
              type="number"
              value={form.promised_amount}
              onChange={(e) => handleChange("promised_amount", e.target.value)}
              className="h-8 text-sm"
              placeholder="Promised Amount (₹)"
            />
            <DateTimeField
              label="Promised Date"
              value={form.promised_date}
              onChange={(e) => handleChange("promised_date", e.target.value)}
              size="small"
              fullWidth
            />
          </>
        )}
        <DateTimeField
          label="Next Follow-Up"
          value={form.next_follow_up_at}
          onChange={(e) => handleChange("next_follow_up_at", e.target.value)}
          size="small"
          fullWidth
        />
        <div className="md:col-span-2">
          <Textarea
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            rows={4}
            placeholder="Remarks"
          />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button size="sm" disabled={loading} onClick={handleSubmit}>
          {loading ? "Saving…" : "Save Follow-Up"}
        </Button>
      </div>
    </div>
  );
}

