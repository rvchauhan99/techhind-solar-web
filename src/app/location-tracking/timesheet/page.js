"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import ListingPageContainer from "@/components/common/ListingPageContainer"
import Input from "@/components/common/Input"
import MultiSelect from "@/components/common/MultiSelect"
import { Button } from "@/components/ui/button"
import { toastError, toastSuccess } from "@/utils/toast"
import locationTrackingService from "@/services/locationTrackingService"

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoIso(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function fmtTime(v) {
  if (!v) return "—"
  try {
    return new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return "—"
  }
}

function fmtMinutes(mins) {
  const n = Number(mins) || 0
  const h = Math.floor(n / 60)
  const m = n % 60
  if (h <= 0) return `${m}m`
  return `${h}h ${String(m).padStart(2, "0")}m`
}

function KpiChip({ label, value, tone }) {
  const tones = {
    live: "border-green-200 bg-green-50 text-green-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    muted: "border-border bg-muted/40 text-foreground",
  }
  return (
    <div className={`rounded border px-2 py-1 min-w-[72px] ${tones[tone] || tones.muted}`}>
      <div className="text-[10px] uppercase text-muted-foreground leading-none">{label}</div>
      <div className="text-sm font-semibold tabular-nums leading-tight mt-0.5">{value}</div>
    </div>
  )
}

function FlagChips({ flags = [] }) {
  if (!flags.length) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-0.5">
      {flags.map((f) => (
        <span
          key={f}
          className="rounded bg-amber-50 text-amber-800 border border-amber-200 px-1 py-0 text-[9px] uppercase font-medium"
        >
          {f.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  )
}

function TimesheetContent() {
  const [from, setFrom] = useState(daysAgoIso(7))
  const [to, setTo] = useState(todayIso())
  const [userIds, setUserIds] = useState([])
  const [userOptions, setUserOptions] = useState([])
  const [rows, setRows] = useState([])
  const [kpis, setKpis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await locationTrackingService.getLiveLocations()
        if (cancelled) return
        const opts = (Array.isArray(data?.users) ? data.users : []).map((u) => ({
          value: String(u.user_id),
          label: u.name || u.email || String(u.user_id),
        }))
        setUserOptions(opts)
      } catch {
        // filter optional
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await locationTrackingService.getTimesheetDashboard({
        from,
        to,
        user_ids: userIds,
      })
      setRows(Array.isArray(data?.rows) ? data.rows : [])
      setKpis(data?.kpis || null)
      setSelected(null)
    } catch (err) {
      toastError(err?.response?.data?.message || err.message || "Failed to load timesheet")
    } finally {
      setLoading(false)
    }
  }, [from, to, userIds])

  useEffect(() => {
    load()
  }, [load])

  const handleExport = async () => {
    try {
      const blob = await locationTrackingService.exportTimesheetReport({
        from,
        to,
        user_ids: userIds,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `timesheet-${from}-to-${to}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess("Timesheet CSV downloaded")
    } catch (err) {
      toastError(err?.response?.data?.message || err.message || "Export failed")
    }
  }

  const avgDutyLabel = useMemo(
    () => (kpis ? fmtMinutes(kpis.avg_duty_minutes) : "—"),
    [kpis]
  )

  return (
    <ListingPageContainer
      title="Timesheet"
      subtitle="Duty clock-in/out vs planned hours · GPS coverage"
      fullWidth
      actions={
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={handleExport}>
            Export CSV
          </Button>
          <Button size="sm" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-end gap-1.5 rounded border border-border bg-card p-1.5">
          <div className="w-[130px]">
            <Input
              name="from"
              type="date"
              label="From"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="w-[130px]">
            <Input
              name="to"
              type="date"
              label="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <MultiSelect
              name="users"
              label="Users"
              options={userOptions}
              value={userIds}
              onChange={(e) => setUserIds(e.target.value || [])}
              placeholder="All tracked users"
              size="small"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
          <KpiChip label="On duty now" value={kpis?.on_duty_now ?? "—"} tone="live" />
          <KpiChip label="Not started" value={kpis?.not_started_today ?? "—"} tone="warn" />
          <KpiChip label="Avg duty" value={avgDutyLabel} />
          <KpiChip
            label="Avg GPS %"
            value={kpis?.avg_gps_coverage_pct != null ? kpis.avg_gps_coverage_pct : "—"}
          />
          <KpiChip label="Left open" value={kpis?.left_open ?? "—"} tone="warn" />
          <KpiChip label="Late start" value={kpis?.late_start ?? "—"} tone="warn" />
        </div>

        <div className="grid gap-1.5 lg:grid-cols-[1fr_280px]">
          <div className="rounded border border-border bg-card overflow-auto max-h-[calc(100vh-280px)]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                <tr className="text-left border-b border-border">
                  <th className="px-2 py-1 font-medium">Date</th>
                  <th className="px-2 py-1 font-medium">User</th>
                  <th className="px-2 py-1 font-medium">In</th>
                  <th className="px-2 py-1 font-medium">Out</th>
                  <th className="px-2 py-1 font-medium">Duty</th>
                  <th className="px-2 py-1 font-medium">Planned</th>
                  <th className="px-2 py-1 font-medium">Var%</th>
                  <th className="px-2 py-1 font-medium">GPS%</th>
                  <th className="px-2 py-1 font-medium">Sess</th>
                  <th className="px-2 py-1 font-medium">Flags</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-2 py-6 text-muted-foreground text-center">
                      {loading ? "Loading…" : "No timesheet rows for this range"}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const key = `${row.user_id}-${row.summary_date}`
                    const active =
                      selected?.user_id === row.user_id &&
                      selected?.summary_date === row.summary_date
                    return (
                      <tr
                        key={key}
                        className={`border-b border-border/60 cursor-pointer hover:bg-muted/40 ${
                          active ? "bg-muted/50" : ""
                        }`}
                        onClick={() => setSelected(row)}
                      >
                        <td className="px-2 py-1 tabular-nums">{row.summary_date}</td>
                        <td className="px-2 py-1">
                          <div className="font-medium leading-tight">{row.user_name}</div>
                          <div className="text-[10px] text-muted-foreground">{row.role_name || ""}</div>
                        </td>
                        <td className="px-2 py-1 tabular-nums">{fmtTime(row.clock_in)}</td>
                        <td className="px-2 py-1 tabular-nums">
                          {row.on_duty_now ? (
                            <span className="text-green-700 font-medium">Active</span>
                          ) : (
                            fmtTime(row.clock_out)
                          )}
                        </td>
                        <td className="px-2 py-1 tabular-nums">
                          {fmtMinutes(row.duty_duration_minutes)}
                        </td>
                        <td className="px-2 py-1 tabular-nums">
                          {fmtMinutes(row.planned_work_minutes)}
                        </td>
                        <td className="px-2 py-1 tabular-nums">{row.duty_vs_planned_pct}</td>
                        <td className="px-2 py-1 tabular-nums">{row.coverage_pct}</td>
                        <td className="px-2 py-1 tabular-nums">{row.duty_session_count}</td>
                        <td className="px-2 py-1">
                          <FlagChips flags={row.flags} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded border border-border bg-card p-2 min-h-[200px]">
            {!selected ? (
              <p className="text-xs text-muted-foreground">Select a row for day detail</p>
            ) : (
              <div className="space-y-2">
                <div>
                  <div className="text-sm font-semibold leading-tight">{selected.user_name}</div>
                  <div className="text-[11px] text-muted-foreground">{selected.summary_date}</div>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div>Clock-in: <b>{fmtTime(selected.clock_in)}</b></div>
                  <div>
                    Clock-out:{" "}
                    <b>{selected.on_duty_now ? "Active" : fmtTime(selected.clock_out)}</b>
                  </div>
                  <div>Duty: <b>{fmtMinutes(selected.duty_duration_minutes)}</b></div>
                  <div>Planned: <b>{fmtMinutes(selected.planned_work_minutes)}</b></div>
                  <div>GPS: <b>{selected.coverage_pct}%</b></div>
                  <div>Distance: <b>{selected.distance_km} km</b></div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground mb-0.5">Sessions</div>
                  {(selected.sessions || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">None</p>
                  ) : (
                    <ul className="space-y-0.5 text-xs">
                      {selected.sessions.map((s) => (
                        <li key={s.id} className="flex justify-between gap-2 border-b border-border/50 py-0.5">
                          <span>
                            {fmtTime(s.started_at)} → {s.ended_at ? fmtTime(s.ended_at) : "open"}
                          </span>
                          <span className="tabular-nums">{fmtMinutes(s.duration_minutes)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button size="sm" variant="outline" asChild className="w-full">
                  <Link
                    href={`/location-tracking/reports?user_id=${selected.user_id}&date=${selected.summary_date}`}
                  >
                    Open day route
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ListingPageContainer>
  )
}

export default function TimesheetPage() {
  return (
    <ProtectedRoute requiredRoute="/location-tracking/timesheet">
      <TimesheetContent />
    </ProtectedRoute>
  )
}
