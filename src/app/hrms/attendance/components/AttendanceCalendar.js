"use client";

import { useEffect, useMemo, useState } from "react";
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Dense month grid — SolarAce attendance_list parity (Present/Late/Absent/Holiday/Leave).
 */
export default function AttendanceCalendar({
  year,
  month,
  employeeId = null,
  compact = false,
}) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await hrmsService.getAttendanceCalendar({
          year: Number(year),
          month: Number(month),
          employee_id: employeeId || undefined,
        });
        if (!cancelled) setPayload(unwrap(res));
      } catch (err) {
        if (!cancelled) {
          setPayload(null);
          toastErrorFromApi(err, "Failed to load calendar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year, month, employeeId]);

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
      <div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
        Loading calendar…
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
        No calendar data
      </div>
    );
  }

  return (
    <div className={`rounded-md border border-border bg-card ${compact ? "p-2" : "p-3"}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className={`font-semibold text-foreground ${compact ? "text-sm" : "text-sm"}`}>
            {payload.employee_name || "Employee"}
            {payload.emp_code ? (
              <span className="ml-1 font-normal text-muted-foreground">({payload.emp_code})</span>
            ) : null}
          </p>
          {!compact && payload.summary ? (
            <p className="text-xs text-muted-foreground">
              Present {payload.summary.present_days ?? 0} · Late {payload.summary.late_marks ?? 0} ·
              Half {payload.summary.half_days ?? 0} · Absent {payload.summary.absent_days ?? 0} · Leave{" "}
              {payload.summary.leave_days ?? 0}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
          {[
            ["P", "Present"],
            ["L", "Late"],
            ["H", "Half"],
            ["A", "Absent"],
            ["LV", "Leave"],
            ["Hol", "Holiday"],
            ["WO", "Week off"],
            ["MP", "Mis punch"],
          ].map(([k, label]) => (
            <span key={k} className="rounded border border-border px-1.5 py-0.5">
              {k}={label}
            </span>
          ))}
        </div>
      </div>
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
            <div key={cell.key} className="min-h-10 rounded border border-transparent" />
          ) : (
            <div
              key={cell.key}
              title={`${cell.date}${cell.type ? ` · ${cell.type}` : ""}${
                cell.late_waived ? " · late waived" : ""
              }`}
              className={`min-h-10 rounded border px-1 py-0.5 ${
                TYPE_STYLE[cell.type] || "bg-background border-border text-foreground"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] tabular-nums opacity-70">{cell.day}</span>
                <span className="text-[10px] font-semibold">
                  {TYPE_LABEL[cell.type] || (cell.type ? "·" : "")}
                </span>
              </div>
              {cell.late_waived ? (
                <div className="text-[9px] font-medium text-amber-700">★ waived</div>
              ) : null}
            </div>
          )
        )}
      </div>
    </div>
  );
}
