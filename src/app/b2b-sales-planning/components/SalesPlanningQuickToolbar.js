"use client";

import { IconCalendar, IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import Select, { MenuItem } from "@/components/common/Select";

export const DATE_FILTER_FIELD_OPTIONS = [
  { value: "plan_date", label: "Plan Date" },
  { value: "completed_at", label: "Completed Date" },
];

function toYmd(d) {
  return d.toISOString().split("T")[0];
}

/** Raw date ranges as { from, to } — mapped by applyDatePreset onto plan/completed fields. */
export const PLAN_DATE_PRESETS = [
  {
    label: "Today",
    fn: () => {
      const d = toYmd(new Date());
      return { from: d, to: d };
    },
  },
  {
    label: "This Week",
    fn: () => {
      const n = new Date();
      const dy = n.getDay();
      const m = new Date(n);
      m.setDate(n.getDate() - (dy === 0 ? 6 : dy - 1));
      const e = new Date(m);
      e.setDate(m.getDate() + 6);
      return { from: toYmd(m), to: toYmd(e) };
    },
  },
  {
    label: "This Month",
    fn: () => {
      const n = new Date();
      return {
        from: toYmd(new Date(n.getFullYear(), n.getMonth(), 1)),
        to: toYmd(new Date(n.getFullYear(), n.getMonth() + 1, 0)),
      };
    },
  },
  {
    label: "Last 30 Days",
    fn: () => {
      const d = new Date();
      const p = new Date();
      p.setDate(p.getDate() - 30);
      return { from: toYmd(p), to: toYmd(d) };
    },
  },
  {
    label: "Last 6M",
    fn: () => {
      const n = new Date();
      const p = new Date(n);
      p.setMonth(n.getMonth() - 6);
      return { from: toYmd(p), to: toYmd(n) };
    },
  },
  {
    label: "This Year",
    fn: () => {
      const n = new Date();
      return {
        from: toYmd(new Date(n.getFullYear(), 0, 1)),
        to: toYmd(new Date(n.getFullYear(), 11, 31)),
      };
    },
  },
];

export const QUICK_STATUS_TABS = [
  { key: "all", label: "All", status: [] },
  { key: "DUE_TODAY", label: "Due Today", status: ["DUE_TODAY"] },
  { key: "UPCOMING", label: "Upcoming", status: ["UPCOMING"] },
  { key: "OVERDUE", label: "Overdue", status: ["OVERDUE"] },
  { key: "PIPELINE", label: "Pipeline", status: ["PIPELINE", "PIPELINE_OVERDUE"] },
  { key: "PIPELINE_OVERDUE", label: "Pipeline Overdue", status: ["PIPELINE_OVERDUE"] },
  { key: "COMPLETED", label: "Completed", status: ["COMPLETED"] },
];

function normalizeStatus(status) {
  if (Array.isArray(status)) return status.map(String).filter(Boolean).sort();
  if (status != null && status !== "") return [String(status)];
  return [];
}

function statusEquals(a, b) {
  const aa = normalizeStatus(a);
  const bb = normalizeStatus(b);
  if (aa.length !== bb.length) return false;
  return aa.every((v, i) => v === bb[i]);
}

export function isQuickStatusSelected(filters, tab) {
  return statusEquals(filters?.status, tab.status);
}

export function applyQuickStatus(filters, tab) {
  return { ...filters, status: [...(tab.status || [])] };
}

export function applyDatePreset(filters, preset) {
  const range = preset.fn();
  const field = filters?.date_filter_field || "plan_date";
  if (field === "completed_at") {
    return {
      ...filters,
      completed_from: range.from,
      completed_to: range.to,
      plan_date_from: "",
      plan_date_to: "",
    };
  }
  return {
    ...filters,
    plan_date_from: range.from,
    plan_date_to: range.to,
    completed_from: "",
    completed_to: "",
  };
}

const pillClass = (selected) =>
  [
    "text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all",
    selected
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-white border-slate-200 text-slate-500 hover:border-primary hover:text-primary",
  ].join(" ");

export default function SalesPlanningQuickToolbar({
  filters = {},
  activePreset = null,
  onStatusChange,
  onDateFieldChange,
  onPresetChange,
  onReset,
}) {
  const dateField = filters.date_filter_field || "plan_date";
  const dateFieldLabel =
    DATE_FILTER_FIELD_OPTIONS.find((o) => o.value === dateField)?.label || "Plan Date";

  return (
    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] text-slate-400">Status:</span>
        {QUICK_STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onStatusChange?.(tab)}
            className={pillClass(isQuickStatusSelected(filters, tab))}
          >
            {tab.label}
          </button>
        ))}

        <div className="flex items-center gap-1 ml-0.5">
          <span className="text-[10px] text-slate-400 whitespace-nowrap">Filtered by:</span>
          <Select
            name="date_filter_field"
            value={dateField}
            onChange={(e) => onDateFieldChange?.(e.target.value || "plan_date")}
            className="min-w-[9.5rem]"
            size="small"
          >
            {DATE_FILTER_FIELD_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </div>

        <span
          className="flex items-center gap-1 text-[10px] text-slate-400"
          title={`Quick range for ${dateFieldLabel}`}
        >
          <IconCalendar size={11} /> Quick:
        </span>
        {PLAN_DATE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onPresetChange?.(p)}
            className={pillClass(activePreset === p.label)}
          >
            {p.label}
          </button>
        ))}

        <div className="h-4 w-px bg-slate-200 mx-0.5" />
        <Button
          size="sm"
          variant="outline"
          onClick={() => onReset?.()}
          className="h-7 text-xs gap-1 px-2"
        >
          <IconRefresh size={11} /> Reset
        </Button>
      </div>
    </div>
  );
}
