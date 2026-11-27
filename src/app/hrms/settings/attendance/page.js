"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import Checkbox from "@/components/common/Checkbox";
import { Button } from "@/components/ui/button";
import useModulePermission from "@/hooks/useModulePermission";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const MODULE_KEY = "hrms_attendance_settings";

const TABS = [
  { id: "shift", label: "Shift & cutoffs" },
  { id: "late", label: "Late penalty" },
  { id: "pay", label: "Pay & LWP" },
  { id: "rules", label: "Punch & corrections" },
  { id: "weekoff", label: "Week off" },
  { id: "auto", label: "Auto punch-out" },
  { id: "visibility", label: "Visibility" },
];

const EMPTY = {
  shift_start: "09:30",
  grace_minutes: 15,
  late_after: "09:45:59",
  half_day_checkin_after: "11:30",
  full_day_hours: 8,
  half_day_below_hours: 8,
  absent_below_hours: 4.5,
  late_penalty_mode: "flat",
  late_penalty_rate: 200,
  late_penalty_cap: 0,
  late_penalty_min_salary: 0,
  absent_is_lwp: true,
  half_day_lwp_factor: 0.5,
  paid_leave_type_ids: [],
  unpaid_leave_type_ids: [],
  late_waiver_leave_type_ids: [],
  monthly_correction_limit: 4,
  default_break_minutes: 45,
  block_punch_on_leave: true,
  block_punch_on_holiday: true,
  weekoff_days: ["Sunday"],
  saturday_policy: "first_third",
  use_holiday_calendar: true,
  auto_checkout_enabled: true,
  auto_checkout_time: "23:30",
  manager_scope: "both",
  mobile_manager_team_view: true,
};

export default function HrmsAttendanceSettingsPage() {
  const perm = useModulePermission(MODULE_KEY);
  const [tab, setTab] = useState("shift");
  const [form, setForm] = useState(EMPTY);
  const [meta, setMeta] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, metaRes, typesRes] = await Promise.all([
        hrmsService.getAttendanceSettings(),
        hrmsService.getAttendanceSettingsMeta(),
        hrmsService.listLeaveTypes({ limit: 100 }),
      ]);
      const settings = unwrap(settingsRes) || {};
      setForm({ ...EMPTY, ...settings });
      setMeta(unwrap(metaRes) || null);
      setLeaveTypes(unwrap(typesRes)?.data || unwrap(typesRes) || []);
    } catch (err) {
      toastErrorFromApi(err, "Failed to load attendance settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleWeekday = (day) => {
    setForm((f) => {
      const cur = Array.isArray(f.weekoff_days) ? [...f.weekoff_days] : [];
      const idx = cur.indexOf(day);
      if (idx >= 0) cur.splice(idx, 1);
      else cur.push(day);
      return { ...f, weekoff_days: cur };
    });
  };

  const toggleLeaveType = (key, id) => {
    const num = Number(id);
    setForm((f) => {
      const cur = Array.isArray(f[key]) ? f[key].map(Number) : [];
      const next = cur.includes(num) ? cur.filter((x) => x !== num) : [...cur, num];
      return { ...f, [key]: next };
    });
  };

  const onSave = async () => {
    if (!perm.can_update) return;
    setSaving(true);
    try {
      const res = await hrmsService.updateAttendanceSettings(form);
      setForm({ ...EMPTY, ...(unwrap(res) || {}) });
      toastSuccess("Attendance settings saved");
    } catch (err) {
      toastErrorFromApi(err, "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    if (!perm.can_update) return;
    setSaving(true);
    try {
      const res = await hrmsService.resetAttendanceSettings();
      setForm({ ...EMPTY, ...(unwrap(res) || {}) });
      toastSuccess("Reset to defaults");
    } catch (err) {
      toastErrorFromApi(err, "Reset failed");
    } finally {
      setSaving(false);
    }
  };

  const weekDays = useMemo(
    () => meta?.weekoff_day_options || [
      { value: "Sunday", label: "Sunday" },
      { value: "Monday", label: "Monday" },
      { value: "Tuesday", label: "Tuesday" },
      { value: "Wednesday", label: "Wednesday" },
      { value: "Thursday", label: "Thursday" },
      { value: "Friday", label: "Friday" },
      { value: "Saturday", label: "Saturday" },
    ],
    [meta]
  );

  const typesList = Array.isArray(leaveTypes) ? leaveTypes : [];

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Attendance Settings" listHref="/hrms" listLabel="HRMS">
        <div className="mb-3 flex flex-wrap gap-1 border-b border-border pb-2">
          {TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? "default" : "outline"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <FormContainer>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading settings…</p>
          ) : (
            <>
              {tab === "shift" && (
                <FormSection title="Shift & cutoffs">
                  <FormGrid cols={3}>
                    <FormField>
                      <Input
                        label="Shift start"
                        value={form.shift_start || ""}
                        onChange={(e) => setField("shift_start", e.target.value)}
                        placeholder="09:30"
                      />
                    </FormField>
                    <FormField>
                      <Input
                        label="Grace (minutes)"
                        type="number"
                        value={form.grace_minutes ?? 15}
                        onChange={(e) => setField("grace_minutes", Number(e.target.value))}
                      />
                    </FormField>
                    <FormField>
                      <Input
                        label="Late after (derived)" value={form.late_after || ""} disabled readOnly />
                    </FormField>
                    <FormField>
                      <Input
                        label="Half-day if check-in after"
                        value={form.half_day_checkin_after || ""}
                        onChange={(e) => setField("half_day_checkin_after", e.target.value)}
                      />
                    </FormField>
                    <FormField>
                      <Input
                        label="Full day hours"
                        type="number"
                        step="0.01"
                        value={form.full_day_hours ?? 8}
                        onChange={(e) => setField("full_day_hours", Number(e.target.value))}
                      />
                    </FormField>
                    <FormField>
                      <Input
                        label="Half-day if worked below (h)"
                        type="number"
                        step="0.01"
                        value={form.half_day_below_hours ?? 8}
                        onChange={(e) => setField("half_day_below_hours", Number(e.target.value))}
                      />
                    </FormField>
                    <FormField>
                      <Input
                        label="Absent if worked below (h)"
                        type="number"
                        step="0.01"
                        value={form.absent_below_hours ?? 4.5}
                        onChange={(e) => setField("absent_below_hours", Number(e.target.value))}
                      />
                    </FormField>
                  </FormGrid>
                </FormSection>
              )}

              {tab === "late" && (
                <FormSection title="Late penalty">
                  <FormGrid cols={2}>
                    <FormField>
                      <Select
                        label="Mode"
                        value={form.late_penalty_mode || "flat"}
                        onChange={(e) => setField("late_penalty_mode", e.target.value)}
                      >
                        {(meta?.late_penalty_modes || [
                          { value: "none", label: "None" },
                          { value: "flat", label: "Flat per late mark" },
                          { value: "per_minute", label: "Per late minute" },
                        ]).map((o) => (
                          <MenuItem key={o.value} value={o.value}>
                            {o.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormField>
                    <FormField>
                      <Input
                        label="Rate (₹)"
                        type="number"
                        value={form.late_penalty_rate ?? 200}
                        onChange={(e) => setField("late_penalty_rate", Number(e.target.value))}
                        disabled={form.late_penalty_mode === "none"}
                      />
                    </FormField>
                    <FormField>
                      <Input
                        label="Cap (0 = none)"
                        type="number"
                        value={form.late_penalty_cap ?? 0}
                        onChange={(e) => setField("late_penalty_cap", Number(e.target.value))}
                        disabled={form.late_penalty_mode === "none"}
                      />
                    </FormField>
                    <FormField>
                      <Input
                        label="Min salary to apply"
                        type="number"
                        value={form.late_penalty_min_salary ?? 0}
                        onChange={(e) =>
                          setField("late_penalty_min_salary", Number(e.target.value))
                        }
                        disabled={form.late_penalty_mode === "none"}
                      />
                    </FormField>
                  </FormGrid>
                </FormSection>
              )}

              {tab === "pay" && (
                <FormSection title="Pay & LWP">
                  <FormGrid cols={2}>
                    <FormField>
                      <Checkbox
                        checked={Boolean(form.absent_is_lwp)}
                        onChange={(e) => setField("absent_is_lwp", e.target.checked)}
                        label="Treat absent as LWP"
                      />
                    </FormField>
                    <FormField>
                      <Input
                        label="Half-day LWP factor"
                        type="number"
                        step="0.01"
                        value={form.half_day_lwp_factor ?? 0.5}
                        onChange={(e) => setField("half_day_lwp_factor", Number(e.target.value))}
                      />
                    </FormField>
                  </FormGrid>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-medium text-foreground">Paid leave types</p>
                      <div className="max-h-40 space-y-1 overflow-auto rounded border border-border p-2">
                        {typesList.length === 0 && (
                          <p className="text-xs text-muted-foreground">No leave types</p>
                        )}
                        {typesList.map((t) => (
                          <Checkbox
                            key={`paid-${t.id}`}
                            checked={(form.paid_leave_type_ids || []).map(Number).includes(Number(t.id))}
                            onChange={() => toggleLeaveType("paid_leave_type_ids", t.id)}
                            label={t.name || t.title || `Type #${t.id}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-foreground">Unpaid leave types</p>
                      <div className="max-h-40 space-y-1 overflow-auto rounded border border-border p-2">
                        {typesList.map((t) => (
                          <Checkbox
                            key={`unpaid-${t.id}`}
                            checked={(form.unpaid_leave_type_ids || [])
                              .map(Number)
                              .includes(Number(t.id))}
                            onChange={() => toggleLeaveType("unpaid_leave_type_ids", t.id)}
                            label={t.name || t.title || `Type #${t.id}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="mb-1 text-xs font-medium text-foreground">
                        Late-waiver leave types (SolarAce “2 Hours Early Going”)
                      </p>
                      <div className="max-h-40 space-y-1 overflow-auto rounded border border-border p-2">
                        {typesList.map((t) => (
                          <Checkbox
                            key={`waiver-${t.id}`}
                            checked={(form.late_waiver_leave_type_ids || [])
                              .map(Number)
                              .includes(Number(t.id))}
                            onChange={() => toggleLeaveType("late_waiver_leave_type_ids", t.id)}
                            label={
                              (t.name || t.title || `Type #${t.id}`) +
                              (t.waives_late_mark ? " · flag on type" : "")
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </FormSection>
              )}

              {tab === "rules" && (
                <FormSection
                  title="Punch & corrections"
                  description="SolarAce parity: monthly mispunch cap, punch blocks, default break on break-in approve"
                >
                  {(meta?.rules_summary || []).length > 0 && (
                    <ul className="mb-3 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                      {meta.rules_summary.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  )}
                  <FormGrid cols={2}>
                    <FormField>
                      <Input
                        label="Monthly correction limit"
                        type="number"
                        value={form.monthly_correction_limit ?? 4}
                        onChange={(e) =>
                          setField("monthly_correction_limit", Number(e.target.value))
                        }
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Max correction requests per employee per month (0 = unlimited). Super Admin
                        bypasses.
                      </p>
                    </FormField>
                    <FormField>
                      <Input
                        label="Default break minutes"
                        type="number"
                        value={form.default_break_minutes ?? 45}
                        onChange={(e) =>
                          setField("default_break_minutes", Number(e.target.value))
                        }
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Applied when a break-in correction is approved without break-out.
                      </p>
                    </FormField>
                    <FormField>
                      <Checkbox
                        checked={Boolean(form.block_punch_on_leave)}
                        onChange={(e) => setField("block_punch_on_leave", e.target.checked)}
                        label="Block punch in on approved leave"
                      />
                    </FormField>
                    <FormField>
                      <Checkbox
                        checked={Boolean(form.block_punch_on_holiday)}
                        onChange={(e) => setField("block_punch_on_holiday", e.target.checked)}
                        label="Block punch in on holiday"
                      />
                    </FormField>
                  </FormGrid>
                </FormSection>
              )}

              {tab === "weekoff" && (
                <FormSection title="Week off">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {weekDays.map((d) => (
                      <Checkbox
                        key={d.value}
                        checked={(form.weekoff_days || []).includes(d.value)}
                        onChange={() => toggleWeekday(d.value)}
                        label={d.label}
                      />
                    ))}
                  </div>
                  <FormGrid cols={2}>
                    <FormField>
                      <Select
                        label="Saturday policy"
                        value={form.saturday_policy || "first_third"}
                        onChange={(e) => setField("saturday_policy", e.target.value)}
                      >
                        {(meta?.saturday_policies || [
                          { value: "none", label: "No Saturday off" },
                          { value: "first_third", label: "1st & 3rd Saturday off" },
                          { value: "all", label: "All Saturdays off" },
                        ]).map((o) => (
                          <MenuItem key={o.value} value={o.value}>
                            {o.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormField>
                    <FormField>
                      <Checkbox
                        checked={Boolean(form.use_holiday_calendar)}
                        onChange={(e) => setField("use_holiday_calendar", e.target.checked)}
                        label="Use company holiday calendar"
                      />
                    </FormField>
                  </FormGrid>
                </FormSection>
              )}

              {tab === "auto" && (
                <FormSection title="Auto punch-out">
                  <FormGrid cols={2}>
                    <FormField>
                      <Checkbox
                        checked={Boolean(form.auto_checkout_enabled)}
                        onChange={(e) => setField("auto_checkout_enabled", e.target.checked)}
                        label="Auto punch-out active"
                      />
                    </FormField>
                    <FormField>
                      <Input
                        type="time"
                        label="Auto punch-out time (IST)"
                        value={String(form.auto_checkout_time || "23:30").slice(0, 5)}
                        onChange={(e) => setField("auto_checkout_time", e.target.value)}
                        disabled={!form.auto_checkout_enabled}
                        helperText="Closes forgotten open punches at this IST time (and overnight catch-up if a window was missed). Stops live location duty when tracking is on, and opens an attendance request. API kill-switch: HRMS_AUTO_CHECKOUT_SCHEDULER_ENABLED=false."
                      />
                    </FormField>
                  </FormGrid>
                </FormSection>
              )}

              {tab === "visibility" && (
                <FormSection title="Visibility">
                  <FormGrid cols={2}>
                    <FormField>
                      <Select
                        label="Manager team scope"
                        value={form.manager_scope || "both"}
                        onChange={(e) => setField("manager_scope", e.target.value)}
                      >
                        {(meta?.manager_scopes || [
                          { value: "hierarchy", label: "Reporting hierarchy" },
                          { value: "department", label: "Same department" },
                          { value: "both", label: "Hierarchy + department" },
                        ]).map((o) => (
                          <MenuItem key={o.value} value={o.value}>
                            {o.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormField>
                    <FormField>
                      <Checkbox
                        checked={Boolean(form.mobile_manager_team_view)}
                        onChange={(e) => setField("mobile_manager_team_view", e.target.checked)}
                        label="Mobile manager team view"
                      />
                    </FormField>
                  </FormGrid>
                </FormSection>
              )}

              <FormActions>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving || !perm.can_update}
                  onClick={onReset}
                >
                  Reset to defaults
                </Button>
                <Button size="sm" disabled={saving || !perm.can_update} onClick={onSave}>
                  {saving ? "Saving…" : "Save settings"}
                </Button>
              </FormActions>
            </>
          )}
        </FormContainer>
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
