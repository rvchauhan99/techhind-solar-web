"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import Input from "@/components/common/Input"
import DateField from "@/components/common/DateField"
import Select, { MenuItem } from "@/components/common/Select"
import MultiSelect from "@/components/common/MultiSelect"

const EMPTY_VALUES = {
  from: "",
  to: "",
  user_ids: "",
  is_mocked: "",
  is_within_working_hours: "",
  source: "",
  min_accuracy_m: "",
  max_accuracy_m: "",
  event_type: "all",
  device_id: "",
}

/**
 * Advanced filter body for Tracking Logs (Order/Followup grid pattern).
 * Page owns Filters/Hide + quick tabs; this panel is draft fields + Clear/Apply only.
 */
export default function TrackingLogsFilterPanel({
  open = true,
  mode = "pings",
  values = {},
  userOptions = [],
  onApply,
  onClear,
}) {
  const [localValues, setLocalValues] = useState(() => ({
    ...EMPTY_VALUES,
    ...values,
  }))

  const valuesKey = useMemo(() => JSON.stringify(values ?? {}), [values])
  useEffect(() => {
    setLocalValues({ ...EMPTY_VALUES, ...values })
  }, [valuesKey])

  const selectedUserValues = useMemo(() => {
    if (!localValues.user_ids) return []
    return String(localValues.user_ids)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }, [localValues.user_ids])

  if (!open) return null

  const handleChange = (key, value) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleApply = () => {
    onApply?.({ ...EMPTY_VALUES, ...localValues })
  }

  const handleClear = () => {
    setLocalValues({ ...EMPTY_VALUES })
    onClear?.()
  }

  const isPings = mode !== "duty"

  return (
    <div className="mb-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-2.5 py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 bg-slate-50/30">
        <DateField
          name="from"
          label="From"
          value={localValues.from || ""}
          onChange={(e) => handleChange("from", e.target.value)}
        />
        <DateField
          name="to"
          label="To"
          value={localValues.to || ""}
          onChange={(e) => handleChange("to", e.target.value)}
        />
        <div className="sm:col-span-2 lg:col-span-2">
          <MultiSelect
            label="Users"
            options={userOptions}
            value={selectedUserValues}
            onChange={(e) =>
              handleChange("user_ids", (e?.target?.value || []).join(","))
            }
            placeholder="All users"
          />
        </div>

        {isPings ? (
          <>
            <Select
              name="is_mocked"
              label="Mocked"
              value={localValues.is_mocked || ""}
              onChange={(e) => handleChange("is_mocked", e.target.value)}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="true">Mocked only</MenuItem>
              <MenuItem value="false">Not mocked</MenuItem>
            </Select>
            <Select
              name="is_within_working_hours"
              label="Working hours"
              value={localValues.is_within_working_hours || ""}
              onChange={(e) =>
                handleChange("is_within_working_hours", e.target.value)
              }
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="true">Within hours</MenuItem>
              <MenuItem value="false">Outside hours</MenuItem>
            </Select>
            <Input
              name="source"
              label="Source"
              placeholder="e.g. periodic"
              value={localValues.source || ""}
              onChange={(e) => handleChange("source", e.target.value)}
            />
            <Input
              name="min_accuracy_m"
              label="Min accuracy (m)"
              type="number"
              value={localValues.min_accuracy_m || ""}
              onChange={(e) => handleChange("min_accuracy_m", e.target.value)}
            />
            <Input
              name="max_accuracy_m"
              label="Max accuracy (m)"
              type="number"
              value={localValues.max_accuracy_m || ""}
              onChange={(e) => handleChange("max_accuracy_m", e.target.value)}
            />
          </>
        ) : (
          <>
            <Select
              name="event_type"
              label="Event type"
              value={localValues.event_type || "all"}
              onChange={(e) => handleChange("event_type", e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="duty_session">Duty sessions</MenuItem>
              <MenuItem value="device_event">Device events</MenuItem>
            </Select>
            <div className="lg:col-span-2">
              <Input
                name="device_id"
                label="Device ID"
                placeholder="Partial match"
                value={localValues.device_id || ""}
                onChange={(e) => handleChange("device_id", e.target.value)}
              />
            </div>
          </>
        )}

        <p className="col-span-1 sm:col-span-2 lg:col-span-6 text-[10px] text-muted-foreground">
          Max 31-day range. Raw pings older than retention may be empty.
        </p>

        <div className="col-span-1 sm:col-span-2 lg:col-span-6 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="h-8 px-3 text-xs w-20"
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className="h-8 px-3 text-xs w-20"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}
