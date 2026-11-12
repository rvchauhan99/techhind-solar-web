"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import Checkbox from "@/components/common/Checkbox";
import { Badge } from "@/components/ui/badge";
import { IconCalendarPlus } from "@tabler/icons-react";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const DAY_MS = 24 * 60 * 60 * 1000;

const countDays = (form) => {
  if (form.duration === "half_am" || form.duration === "half_pm") return 0.5;
  if (form.duration !== "multi" || !form.start_date || !form.end_date) return 1;
  const start = new Date(`${form.start_date}T00:00:00`);
  const end = new Date(`${form.end_date}T00:00:00`);
  const diff = Math.round((end - start) / DAY_MS) + 1;
  return diff > 0 ? diff : 0;
};

export default function HrmsLeaveAddPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [types, setTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [form, setForm] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    duration: "full",
    reason: "",
    title: "",
    is_emergency: false,
  });

  useEffect(() => {
    hrmsService
      .listLeaveTypes({ status: "active", limit: 100 })
      .then((res) => {
        setTypes(unwrap(res)?.data || []);
      })
      .catch((err) => toastErrorFromApi(err, "Failed to load leave types"));
  }, []);

  useEffect(() => {
    hrmsService
      .getLeaveBalance({})
      .then((res) => {
        setBalances(unwrap(res)?.data || []);
      })
      .catch(() => setBalances([]));
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const requestedDays = countDays(form);
  const selectedBalance = useMemo(
    () => balances.find((b) => String(b.leave_type_id) === String(form.leave_type_id)),
    [balances, form.leave_type_id]
  );
  const overBalance =
    selectedBalance?.remaining != null && requestedDays > 0 && requestedDays > Number(selectedBalance.remaining);
  const dateError =
    form.duration === "multi" && form.start_date && form.end_date && form.end_date < form.start_date
      ? "End date cannot be before the start date."
      : null;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.leave_type_id) {
      toastErrorFromApi(null, "Leave type is required");
      return;
    }
    if (!form.start_date) {
      toastErrorFromApi(null, "Start date is required");
      return;
    }
    if (dateError) {
      toastErrorFromApi(null, dateError);
      return;
    }
    if (!form.reason.trim()) {
      toastErrorFromApi(null, "Reason is required");
      return;
    }
    setSaving(true);
    try {
      await hrmsService.applyLeave({
        leave_type_id: Number(form.leave_type_id),
        start_date: form.start_date,
        end_date: form.duration === "multi" ? form.end_date || form.start_date : form.start_date,
        duration: form.duration,
        reason: form.reason.trim(),
        title: form.title.trim() || undefined,
        is_emergency: form.is_emergency,
      });
      toastSuccess("Leave applied — sent to your manager for approval");
      router.push("/hrms/leaves");
    } catch (err) {
      toastErrorFromApi(err, "Apply failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Apply Leave" listHref="/hrms/leaves" listLabel="Leaves">
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <FormContainer className="space-y-2">
            {balances.filter((b) => b.counts_toward_balance && b.remaining != null).length > 0 && (
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Your balances
                  {balances[0]?.fy_year ? ` · FY ${balances[0].fy_year}–${Number(balances[0].fy_year) + 1}` : ""}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {balances
                    .filter((b) => b.counts_toward_balance && b.remaining != null)
                    .map((b) => (
                      <div key={b.leave_type_id} className="rounded-md border border-border px-2 py-1.5">
                        <div className="truncate text-[11px] text-muted-foreground">{b.title}</div>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={
                              Number(b.remaining) < 0
                                ? "destructive"
                                : Number(b.remaining) === 0
                                  ? "secondary"
                                  : "success"
                            }
                          >
                            {b.remaining}
                          </Badge>
                          <span className="text-xs text-muted-foreground">/ {b.entitlement}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            <FormSection
              variant="card"
              icon={<IconCalendarPlus className="size-4" />}
              title="Leave details"
              description="Pick the leave type, the dates and a short reason"
            >
              <FormGrid cols={2}>
                <FormField>
                  <Select
                    label="Leave type *"
                    name="leave_type_id"
                    value={form.leave_type_id}
                    onChange={(e) => setField("leave_type_id", e.target.value)}
                  >
                    <MenuItem value="">Select type</MenuItem>
                    {types.map((t) => (
                      <MenuItem key={t.id} value={String(t.id)}>
                        {t.title}
                      </MenuItem>
                    ))}
                  </Select>
                  {selectedBalance ? (
                    selectedBalance.counts_toward_balance === false ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        This type does not count toward your leave balance.
                      </p>
                    ) : (
                      <p className={`mt-1 text-xs ${overBalance ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                        Remaining {selectedBalance.remaining ?? "—"} of {selectedBalance.entitlement ?? "—"} days
                        {overBalance
                          ? ` — you are asking for ${requestedDays} days, which exceeds your balance.`
                          : ` for FY ${selectedBalance.fy?.label || selectedBalance.fy_year || ""}`}
                      </p>
                    )
                  ) : null}
                </FormField>
                <FormField>
                  <Select
                    label="Duration *"
                    name="duration"
                    value={form.duration}
                    onChange={(e) => setField("duration", e.target.value)}
                  >
                    <MenuItem value="half_am">Half day (AM)</MenuItem>
                    <MenuItem value="half_pm">Half day (PM)</MenuItem>
                    <MenuItem value="full">Full day</MenuItem>
                    <MenuItem value="multi">Multi-day</MenuItem>
                  </Select>
                </FormField>
                <FormField>
                  <Input
                    label="Start date *"
                    name="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setField("start_date", e.target.value)}
                    required
                  />
                </FormField>
                <FormField>
                  <Input
                    label="End date"
                    name="end_date"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setField("end_date", e.target.value)}
                    disabled={form.duration !== "multi"}
                    error={!!dateError}
                    helperText={dateError || (form.duration === "multi" ? "Required for multi-day leave" : undefined)}
                  />
                </FormField>
                <FormField>
                  <Input
                    label="Title"
                    name="title"
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                  />
                </FormField>
                <FormField>
                  <div className="pt-6">
                    <Checkbox
                      label="Emergency leave"
                      checked={form.is_emergency}
                      onCheckedChange={(v) => setField("is_emergency", Boolean(v))}
                    />
                  </div>
                </FormField>
                <FormField className="sm:col-span-2">
                  <Input
                    label="Reason *"
                    name="reason"
                    value={form.reason}
                    onChange={(e) => setField("reason", e.target.value)}
                    required
                  />
                </FormField>
              </FormGrid>
            </FormSection>
            <FormActions className="sticky bottom-0 items-center gap-2 border-t border-border bg-card/95 backdrop-blur">
              {requestedDays > 0 && (
                <span className="mr-auto text-xs text-muted-foreground">
                  Requesting <strong className="text-foreground">{requestedDays}</strong> day
                  {requestedDays === 1 ? "" : "s"}
                  {overBalance ? " · exceeds your balance" : ""}
                </span>
              )}
              <Button type="button" size="sm" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Submitting…" : "Apply"}
              </Button>
            </FormActions>
          </FormContainer>
        </form>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
