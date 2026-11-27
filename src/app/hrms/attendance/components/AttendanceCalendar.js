"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconCalendarStats, IconRefresh } from "@tabler/icons-react";
import EmptyState from "@/components/common/EmptyState";
import { unwrap } from "@/lib/apiUnwrap";
import { toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const TYPE_STYLE = {
  present: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  late: "bg-amber-500/15 text-amber-800 border-amber-500/30",
  half_day: "bg-sky-500/15 text-sky-800 border-sky-500/30",
  absent: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  leave: "bg-violet-500/15 text-violet-800 border-violet-500/30",
  lwp: "bg-fuchsia-500/15 text-fuchsia-800 border-fuchsia-500/30",
  holiday: "bg-blue-500/15 text-blue-800 border-blue-500/30",
  week_off: "bg-muted text-muted-foreground border-border",
  mis_punch: "bg-orange-500/15 text-orange-800 border-orange-500/30",
  future: "bg-background text-muted-foreground/50 border-dashed border-border",
};

const TYPE_LABEL = {
  present: "P",
  late: "L",
  half_day: "H",
  absent: "A",
  leave: "LV",
  lwp: "LWP",
  holiday: "Hol",
  week_off: "WO",
  mis_punch: "MP",
  future: "·",
};

const TYPE_LEGEND = [
  ["present", "Present"],
  ["late", "Late"],
  ["half_day", "Half day"],
  ["absent", "Absent"],
  ["leave", "On leave"],
  ["lwp", "LWP"],
  ["holiday", "Holiday"],
  ["week_off", "Week off"],
  ["mis_punch", "Mis punch"],
  ["future", "Upcoming"],
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const timeIST = (v) =>
  v
    ? new Date(v).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : null;

/**
 * Dense month grid — SolarAce attendance_list parity (Present/Late/Absent/
 * Holiday/Leave) with TechHind polish: skeleton loading, retry, badge legend,
 * per-day in/out times and working hours, selected-employee support.
 */
export default function AttendanceCalendar({
  year,
  month,
  employeeId = null,
  refreshKey = 0,
  compact = false,
}) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hrmsService.getAttendanceCalendar({
        year: Number(year),
        month: Number(month),
        employee_id: employeeId || undefined,
      });
      setPayload(unwrap(res));
    } catch (err) {
      setPayload(null);
      toastErrorFromApi(err, "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [year, month, employeeId]);

  useEffect(() => {
    load();
  }, [load, reloadToken, refreshKey]);

  const cells = useMemo(() => {
    const days = payload?.days || [];
    if (!days.length) return [];
    const firstWeekday = days[0]?.weekday ?? 0;
    const leading = Array.from({ length: firstWeekday }, (_, i) => ({
      key: `pad-${i}`,
      empty: true,
    }));
    const body = days.map((d) => ({
      key: d.date,
      empty: false,
      ...d,
    }));
    return [...leading, ...body];
  }, [payload]);

  if (loading) {
    return (
      <div className="rounded-md border border-border bg-card p-3" aria-busy="true">
        <div className="mb-2 h-4 w-44 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-16 animate-pulse rounded bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <EmptyState
        icon={IconCalendarStats}
        title="No calendar data"
        description="We could not load the attendance calendar for this month."
        actionLabel="Retry"
        onAction={() => setReloadToken((t) => t + 1)}
      />
    );
  }

  const summary = payload.summary || {};
  const summaryChips = [
    ["Present days", summary.present_days],
    ["Half days", summary.half_days],
    ["Late marks", summary.late_marks],
    ["Mis punches", summary.mis_punch_days],
    ["Absent", summary.absent_days],
    ["On leave", summary.leave_days],
    ["LWP", summary.lwp_days],
    ["Holidays", summary.holiday_days],
    ["Week offs", summary.week_off_days],
    ["Open punches", summary.open_punches],
  ];

  return (
    <div className={`rounded-md border border-border bg-card ${compact ? "p-2" : "p-3"}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {payload.employee_name || "Employee"}
            {payload.emp_code ? (
              <span className="ml-1 font-normal text-muted-foreground">({payload.emp_code})</span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {employeeId
              ? "Calendar for the employee selected in Advanced Filters."
              : "Showing your own calendar — pick an employee in Advanced Filters to view theirs."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {!compact &&
            summaryChips.map(([label, value]) => (
              <Badge key={label} variant="secondary" className="text-[10px]">
                {label} {value ?? 0}
              </Badge>
            ))}
          {!compact && summary.working_hours != null ? (
            <Badge variant="secondary" className="text-[10px]">
              Hours {Number(summary.working_hours || 0).toFixed(2)}
            </Badge>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setReloadToken((t) => t + 1)}
            title="Refresh calendar"
          >
            <IconRefresh size={14} /> Refresh
          </Button>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
        {TYPE_LEGEND.map(([key, label]) => (
          <span
            key={key}
            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${
              TYPE_STYLE[key] || "border-border bg-background text-foreground"
            }`}
          >
            <span className="font-semibold">{TYPE_LABEL[key]}</span>
            {label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {w}
              </div>
            ))}
            {cells.map((cell) =>
              cell.empty ? (
                <div key={cell.key} className="min-h-16 rounded border border-transparent" />
              ) : (
                <div
                  key={cell.key}
                  title={`${cell.date}${cell.type ? ` · ${cell.type}` : ""}${
                    cell.late_waived ? " · late waived" : ""
                  }${cell.check_in_at ? ` · in ${timeIST(cell.check_in_at)}` : ""}${
                    cell.check_out_at ? ` · out ${timeIST(cell.check_out_at)}` : ""
                  }`}
                  aria-label={`Day ${cell.day}: ${
                    TYPE_LEGEND.find(([k]) => k === cell.type)?.[1] || "No record"
                  }`}
                  className={`min-h-16 rounded border px-1 py-0.5 ${
                    TYPE_STYLE[cell.type] || "bg-background border-border text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] tabular-nums opacity-70">{cell.day}</span>
                    <span className="text-[10px] font-semibold">
                      {TYPE_LABEL[cell.type] || (cell.type ? "·" : "")}
                    </span>
                  </div>
                  {cell.check_in_at || cell.check_out_at ? (
                    <div className="mt-0.5 text-[9px] tabular-nums opacity-80">
                      {timeIST(cell.check_in_at) || "—"} – {timeIST(cell.check_out_at) || "—"}
                    </div>
                  ) : null}
                  {cell.working_hours != null ? (
                    <div className="text-[9px] tabular-nums opacity-70">
                      {Number(cell.working_hours).toFixed(2)}h
                    </div>
                  ) : null}
                  {cell.late_waived ? (
                    <div className="text-[9px] font-medium text-amber-700">★ waived</div>
                  ) : null}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
