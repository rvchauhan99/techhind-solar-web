"use client"

import { useCallback, useEffect, useState } from "react"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import ListingPageContainer from "@/components/common/ListingPageContainer"
import Checkbox from "@/components/common/Checkbox"
import Input from "@/components/common/Input"
import { Button } from "@/components/ui/button"
import { toastError, toastSuccess } from "@/utils/toast"
import locationTrackingService from "@/services/locationTrackingService"

const WEEKDAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
]

const DEFAULT_HOURS = {
  sun: null,
  mon: { start: "09:30", end: "18:30" },
  tue: { start: "09:30", end: "18:30" },
  wed: { start: "09:30", end: "18:30" },
  thu: { start: "09:30", end: "18:30" },
  fri: { start: "09:30", end: "18:30" },
  sat: { start: "09:30", end: "18:30" },
}

function SettingsContent() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    enabled: false,
    capture_interval_minutes: 5,
    sync_interval_minutes: 10,
    timezone: "Asia/Kolkata",
    working_hours: DEFAULT_HOURS,
    min_accuracy_m: 150,
    grace_minutes: 15,
    retention_days: 365,
    duty_gate_enabled: true,
    stale_session_hours: 16,
  })
  const [bounds, setBounds] = useState({
    capture: { min: 1, max: 60 },
    sync: { min: 5, max: 60 },
  })
  const [trackedUserCount, setTrackedUserCount] = useState(0)
  const [errors, setErrors] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await locationTrackingService.getSettings()
      setForm({
        enabled: !!data.enabled,
        capture_interval_minutes: Number(data.capture_interval_minutes) || 5,
        sync_interval_minutes: Number(data.sync_interval_minutes) || 10,
        timezone: data.timezone || "Asia/Kolkata",
        working_hours: data.working_hours || DEFAULT_HOURS,
        min_accuracy_m: Number(data.min_accuracy_m) || 150,
        grace_minutes: Number(data.grace_minutes) || 15,
        retention_days: Number(data.retention_days) || 365,
        duty_gate_enabled: data.duty_gate_enabled !== false,
        stale_session_hours: Number(data.stale_session_hours) || 16,
      })
      if (data.bounds) setBounds(data.bounds)
      setTrackedUserCount(Number(data.tracked_user_count) || 0)
    } catch (err) {
      toastError(err?.response?.data?.message || err.message || "Failed to load settings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const setDayHours = (day, field, value) => {
    setForm((prev) => {
      const current = prev.working_hours?.[day]
      const nextDay =
        field === "enabled"
          ? value
            ? current || { start: "09:30", end: "18:30" }
            : null
          : current
            ? { ...current, [field]: value }
            : { start: "09:30", end: "18:30", [field]: value }
      return {
        ...prev,
        working_hours: { ...prev.working_hours, [day]: nextDay },
      }
    })
  }

  const validate = () => {
    const next = {}
    const capture = Number(form.capture_interval_minutes)
    const sync = Number(form.sync_interval_minutes)
    if (!Number.isInteger(capture) || capture < bounds.capture.min || capture > bounds.capture.max) {
      next.capture_interval_minutes = `Capture must be ${bounds.capture.min}-${bounds.capture.max} min`
    }
    if (!Number.isInteger(sync) || sync < bounds.sync.min || sync > bounds.sync.max) {
      next.sync_interval_minutes = `Sync must be ${bounds.sync.min}-${bounds.sync.max} min`
    }
    if (!next.capture_interval_minutes && !next.sync_interval_minutes && sync < capture) {
      next.sync_interval_minutes = "Sync must be ≥ capture interval"
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const data = await locationTrackingService.updateSettings({
        enabled: !!form.enabled,
        capture_interval_minutes: Number(form.capture_interval_minutes),
        sync_interval_minutes: Number(form.sync_interval_minutes),
        timezone: form.timezone,
        working_hours: form.working_hours,
        min_accuracy_m: Number(form.min_accuracy_m),
        grace_minutes: Number(form.grace_minutes),
        retention_days: Number(form.retention_days),
        duty_gate_enabled: !!form.duty_gate_enabled,
        stale_session_hours: Number(form.stale_session_hours),
      })
      setForm((prev) => ({
        ...prev,
        enabled: !!data.enabled,
        capture_interval_minutes: data.capture_interval_minutes,
        sync_interval_minutes: data.sync_interval_minutes,
        retention_days: data.retention_days,
        duty_gate_enabled: data.duty_gate_enabled !== false,
        stale_session_hours: data.stale_session_hours,
        working_hours: data.working_hours || prev.working_hours,
      }))
      toastSuccess("Location tracking settings saved")
    } catch (err) {
      toastError(err?.response?.data?.message || err.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const captureWarn = Number(form.capture_interval_minutes) > 0 && Number(form.capture_interval_minutes) < 5

  if (loading) {
    return (
      <ListingPageContainer title="Location Tracking Settings">
        <p className="text-sm text-muted-foreground py-4">Loading…</p>
      </ListingPageContainer>
    )
  }

  return (
    <ListingPageContainer
      title="Location Tracking Settings"
      subtitle={`${trackedUserCount} user(s) currently flagged for tracking`}
      actions={
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      }
    >
      <div className="grid gap-2 max-w-3xl">
        <div className="rounded border border-border bg-card p-2">
          <Checkbox
            name="enabled"
            label="Enable location tracking for this tenant"
            checked={!!form.enabled}
            onChange={(e) => setField("enabled", e.target.checked)}
          />
          <p className="text-xs text-muted-foreground mt-0.5">
            Master switch. Per-user flags in User Master are shown only when this is on.
          </p>
          <div className="mt-2 pt-2 border-t border-border space-y-1.5">
            <Checkbox
              name="duty_gate_enabled"
              label="Duty gate on mobile (consent + Start duty prompts)"
              checked={!!form.duty_gate_enabled}
              onChange={(e) => setField("duty_gate_enabled", e.target.checked)}
            />
            <Input
              name="stale_session_hours"
              label="Auto-close stale open duty sessions (hours)"
              type="number"
              value={form.stale_session_hours}
              onChange={(e) => setField("stale_session_hours", e.target.value)}
            />
          </div>
        </div>

        <div className="rounded border border-border bg-card p-2 grid gap-1.5 sm:grid-cols-2">
          <Input
            name="capture_interval_minutes"
            label="Default capture interval (min)"
            type="number"
            value={form.capture_interval_minutes}
            onChange={(e) => setField("capture_interval_minutes", e.target.value)}
            error={!!errors.capture_interval_minutes}
            helperText={errors.capture_interval_minutes}
          />
          <Input
            name="sync_interval_minutes"
            label="Default sync interval (min)"
            type="number"
            value={form.sync_interval_minutes}
            onChange={(e) => setField("sync_interval_minutes", e.target.value)}
            error={!!errors.sync_interval_minutes}
            helperText={errors.sync_interval_minutes}
          />
          {captureWarn ? (
            <p className="sm:col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Capture below 5 minutes increases storage, vacuum load, and battery use. Prefer 5+ unless required.
            </p>
          ) : null}
          <Input
            name="min_accuracy_m"
            label="Min accuracy (m)"
            type="number"
            value={form.min_accuracy_m}
            onChange={(e) => setField("min_accuracy_m", e.target.value)}
          />
          <Input
            name="grace_minutes"
            label="Working-hours grace (min)"
            type="number"
            value={form.grace_minutes}
            onChange={(e) => setField("grace_minutes", e.target.value)}
          />
          <Input
            name="retention_days"
            label="Raw ping retention (days)"
            type="number"
            value={form.retention_days}
            onChange={(e) => setField("retention_days", e.target.value)}
          />
          <Input
            name="timezone"
            label="Timezone"
            value={form.timezone}
            onChange={(e) => setField("timezone", e.target.value)}
          />
        </div>

        <div className="rounded border border-border bg-card p-2">
          <p className="text-sm font-medium text-[#1b365d] mb-1">Working hours</p>
          <div className="grid gap-1">
            {WEEKDAYS.map(({ key, label }) => {
              const day = form.working_hours?.[key]
              const enabled = !!day
              return (
                <div key={key} className="grid grid-cols-[40px_1fr_1fr_auto] gap-1.5 items-end">
                  <span className="text-xs font-medium pb-2">{label}</span>
                  <Input
                    name={`${key}_start`}
                    label="Start"
                    type="time"
                    value={day?.start || ""}
                    disabled={!enabled}
                    onChange={(e) => setDayHours(key, "start", e.target.value)}
                  />
                  <Input
                    name={`${key}_end`}
                    label="End"
                    type="time"
                    value={day?.end || ""}
                    disabled={!enabled}
                    onChange={(e) => setDayHours(key, "end", e.target.value)}
                  />
                  <Checkbox
                    name={`${key}_enabled`}
                    label="On"
                    checked={enabled}
                    onChange={(e) => setDayHours(key, "enabled", e.target.checked)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </ListingPageContainer>
  )
}

export default function LocationTrackingSettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  )
}
