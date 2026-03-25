"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Input from "@/components/common/Input";
import Textarea from "@/components/common/Textarea";
import DateTimeField from "@/components/common/DateTimeField";
import Select, { MenuItem } from "@/components/common/Select";
import AutocompleteField from "@/components/common/AutocompleteField";
import FormContainer from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import LoadingButton from "@/components/common/LoadingButton";
import { Button } from "@/components/ui/button";
import marketingLeadsService from "@/services/marketingLeadsService";
import mastersService, { getReferenceOptionsSearch } from "@/services/mastersService";
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
  /** Inline step inside parent dialog (nested Radix Dialog broke stacking/focus). */
  const [convertConfirmStep, setConvertConfirmStep] = useState(false);
  const [paymentTypeOptions, setPaymentTypeOptions] = useState([]);
  const [selectedPaymentType, setSelectedPaymentType] = useState("");
  const [paymentTypeError, setPaymentTypeError] = useState("");
  const [selectedHandledBy, setSelectedHandledBy] = useState(null);

  useEffect(() => {
    setFormData((prev) => ({
      ...initialState,
      outcome: forcedOutcome ?? (prev.outcome || initialState.outcome),
    }));
    setErrors({});
    setConvertConfirmStep(false);
    setSelectedPaymentType("");
    setPaymentTypeError("");
    setSelectedHandledBy(null);
  }, [initialState, leadId, forcedStatus, forcedOutcome]);

  useEffect(() => {
    if (convertConfirmStep && lead) {
      setSelectedHandledBy(lead.assigned_to ?? null);
    } else if (!convertConfirmStep) {
      setSelectedHandledBy(null);
    }
  }, [convertConfirmStep, lead?.assigned_to]);

  useEffect(() => {
    const loadPaymentTypes = async () => {
      try {
        const res = await mastersService.getConstants();
        const payload = res?.result || res;
        const raw = payload?.paymentTypes || [];
        const normalized =
          Array.isArray(raw)
            ? raw
                .map((p) =>
                  typeof p === "string" ? p : p?.name ?? p?.label ?? p?.value ?? ""
                )
                .filter(Boolean)
            : [];
        setPaymentTypeOptions(normalized);
      } catch (err) {
        // Non-blocking; user can still attempt convert, backend will validate
        // eslint-disable-next-line no-console
        console.error("Failed to load payment types", err);
      }
    };
    loadPaymentTypes();
  }, []);

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
    [leadId, formData, forcedOutcome, onSaved, lead, buildPayload]
  );

  const handleConfirmConvert = useCallback(async () => {
    if (!leadId) return;
    try {
      setSaving(true);
      // 1) Save follow-up
      await marketingLeadsService.addFollowUp(
        leadId,
        buildPayload(
          selectedPaymentType
            ? { payment_type: selectedPaymentType }
            : {}
        )
      );
      // 2) Convert lead to inquiry (idempotent on backend)
      const convertPayload = {};
      if (selectedPaymentType) convertPayload.payment_type = selectedPaymentType;
      if (selectedHandledBy) convertPayload.handled_by = selectedHandledBy;
      await marketingLeadsService.convertToInquiry(leadId, convertPayload);
      toastSuccess("Lead converted to inquiry successfully");
      setConvertConfirmStep(false);
      setFormData((prev) => ({
        ...prev,
        ...INITIAL_FORM,
        contacted_at: new Date().toISOString(),
        contact_channel: prev.contact_channel,
      }));
      setSelectedPaymentType("");
      setPaymentTypeError("");
      setSelectedHandledBy(null);
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
  }, [leadId, onSaved, onConverted, buildPayload, selectedPaymentType, selectedHandledBy]);

  return (
    <FormContainer className="mx-auto ml-2 pr-1 max-w-full">
      {!convertConfirmStep ? (
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
              {(forcedOutcome === "converted" || formData.outcome === "converted") && (
                <Select
                  name="payment_type"
                  label="Payment Type"
                  value={selectedPaymentType}
                  onChange={(e) => {
                    setSelectedPaymentType(e.target.value ?? "");
                    if (paymentTypeError) {
                      setPaymentTypeError("");
                    }
                  }}
                  error={!!paymentTypeError}
                  helperText={paymentTypeError}
                >
                  <MenuItem value="">Select...</MenuItem>
                  {paymentTypeOptions.map((pt) => (
                    <MenuItem key={pt} value={pt}>
                      {pt}
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
                error={!!errors.next_follow_up_at}
                helperText={errors.next_follow_up_at}
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
      ) : (
        <FormSection title="Convert lead to inquiry?">
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
            <AutocompleteField
              name="handled_by"
              label="Handled By"
              asyncLoadOptions={(q) =>
                getReferenceOptionsSearch("user.model", {
                  q,
                  limit: 20,
                  status_in: "active,inactive",
                })
              }
              referenceModel="user.model"
              getOptionLabel={(opt) =>
                opt?.name ?? opt?.label ?? (opt?.id != null ? String(opt.id) : "")
              }
              value={selectedHandledBy ? { id: selectedHandledBy } : null}
              onChange={(e, v) => setSelectedHandledBy(v?.id ?? null)}
              placeholder="Select user..."
            />
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
              Convert to Inquiry
            </LoadingButton>
          </div>
        </FormSection>
      )}
    </FormContainer>
  );
}
