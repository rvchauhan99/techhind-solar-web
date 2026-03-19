"use client";

import { useState, useEffect, useCallback } from "react";
import { IconFilter, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import Select, { MenuItem } from "@/components/common/Select";

const FILTER_KEYS = [
  "followup_next_reminder_from",
  "followup_next_reminder_to",
  "date_of_inquiry_from",
  "date_of_inquiry_to",
  "status",
  "followup_status",
  "followup_remarks",
  "capacity",
  "capacity_to",
  "capacity_op",
];

const EMPTY_VALUES = Object.fromEntries(FILTER_KEYS.map((k) => [k, ""]));

const STATUS_OPTIONS = [
  { value: "New", label: "New" },
  { value: "Connected", label: "Connected" },
  { value: "Site Visit Done", label: "Site Visit Done" },
  { value: "Quotation", label: "Quotation" },
  { value: "Under Discussion", label: "Under Discussion" },
];

/** Default: today's follow-ups (next_reminder = today) */
function getDefaultTodayFilter() {
  const d = new Date().toISOString().slice(0, 10);
  return { ...EMPTY_VALUES, followup_next_reminder_from: d, followup_next_reminder_to: d };
}

export default function FollowupListFilterPanel({
  open: controlledOpen,
  onToggle,
  values = {},
  onApply,
  onClear,
  defaultOpen = false,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (next) => {
      if (controlledOpen === undefined) setInternalOpen(next);
      else onToggle?.(next);
    },
    [controlledOpen, onToggle]
  );

  const [localValues, setLocalValues] = useState(() => ({ ...EMPTY_VALUES, ...values }));

  useEffect(() => {
    setLocalValues((prev) => ({ ...EMPTY_VALUES, ...values }));
  }, [values]);

  const handleChange = useCallback((key, value) => {
    setLocalValues((prev) => ({ ...prev, [key]: value ?? "" }));
  }, []);

  const handleApply = useCallback(() => {
    const applied = { ...EMPTY_VALUES, ...localValues };
    onApply?.(applied);
    setOpen(false);
  }, [localValues, onApply, setOpen]);

  const handleClear = useCallback(() => {
    setLocalValues({ ...EMPTY_VALUES });
    onClear?.();
  }, [onClear]);

  const activeCount = Object.entries(values || {})
    .filter(
      ([key]) =>
        FILTER_KEYS.includes(key) &&
        values[key] != null &&
        String(values[key]).trim() !== ""
    ).length;

  const getAppliedFiltersSummary = () => {
    const labels = {
      followup_next_reminder_from: "Reminder From",
      followup_next_reminder_to: "Reminder To",
      date_of_inquiry_from: "Inq From",
      date_of_inquiry_to: "Inq To",
      status: "Status",
      followup_status: "FU Status",
      followup_remarks: "Remarks",
      capacity: "Capacity",
    };
    return Object.entries(values || {})
      .filter(
        ([key, val]) =>
          FILTER_KEYS.includes(key) && val != null && String(val).trim() !== ""
      )
      .map(([key]) => labels[key] || key);
  };

  const appliedSummary = getAppliedFiltersSummary();

  return (
    <Card className="rounded-xl shadow-sm border-slate-200 bg-white mb-2 overflow-visible">
      <div className="flex flex-col sm:flex-row items-center gap-2 px-2.5 py-1.5 h-auto sm:h-10">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-2.5 py-1 hover:bg-slate-50 transition-colors rounded-lg border border-slate-200 focus:outline-none shrink-0"
        >
          <span className="flex items-center gap-2 text-[11px] font-bold text-slate-700 uppercase tracking-tight">
            <IconFilter size={12} /> Advanced Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="text-[9px] h-3.5 px-1 leading-none bg-green-100 text-green-700 border-green-200">
                {activeCount}
              </Badge>
            )}
          </span>
          {open ? (
            <IconChevronUp size={12} className="text-slate-400" />
          ) : (
            <IconChevronDown size={12} className="text-slate-400" />
          )}
        </button>

        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {appliedSummary.map((label) => (
            <span
              key={label}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-200 whitespace-nowrap uppercase tracking-tighter"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-2.5 py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 bg-slate-50/30">
          <DateField
            name="followup_next_reminder_from"
            label="Next Reminder From"
            value={localValues.followup_next_reminder_from}
            onChange={(e) => handleChange("followup_next_reminder_from", e.target.value)}
          />
          <DateField
            name="followup_next_reminder_to"
            label="Next Reminder To"
            value={localValues.followup_next_reminder_to}
            onChange={(e) => handleChange("followup_next_reminder_to", e.target.value)}
          />
          <DateField
            name="date_of_inquiry_from"
            label="Inquiry Date From"
            value={localValues.date_of_inquiry_from}
            onChange={(e) => handleChange("date_of_inquiry_from", e.target.value)}
          />
          <DateField
            name="date_of_inquiry_to"
            label="Inquiry Date To"
            value={localValues.date_of_inquiry_to}
            onChange={(e) => handleChange("date_of_inquiry_to", e.target.value)}
          />
          <Select
            name="status"
            label="Inquiry Status"
            placeholder="All"
            value={localValues.status}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
          <Select
            name="followup_status"
            label="Followup Status"
            placeholder="All"
            value={localValues.followup_status}
            onChange={(e) => handleChange("followup_status", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
          <Input
            name="followup_remarks"
            label="Remarks"
            placeholder="Search remarks..."
            value={localValues.followup_remarks}
            onChange={(e) => handleChange("followup_remarks", e.target.value)}
          />
          <Input
            name="capacity"
            label="Capacity (kW)"
            type="number"
            placeholder="Min"
            value={localValues.capacity}
            onChange={(e) => handleChange("capacity", e.target.value)}
          />
          <Input
            name="capacity_to"
            label="Capacity To (kW)"
            type="number"
            placeholder="Max"
            value={localValues.capacity_to}
            onChange={(e) => handleChange("capacity_to", e.target.value)}
          />

          <div className="col-span-1 sm:col-span-2 lg:col-span-6 flex items-center justify-end gap-2 pt-1.5 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={handleClear} className="h-7 px-2.5 text-[11px]">
              Clear
            </Button>
            <Button size="sm" onClick={handleApply} className="h-7 px-2.5 text-[11px]">
              Apply
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export { FILTER_KEYS, EMPTY_VALUES, getDefaultTodayFilter };
