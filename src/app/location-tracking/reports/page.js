"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import ListingPageContainer from "@/components/common/ListingPageContainer"
import Input from "@/components/common/Input"
import MultiSelect from "@/components/common/MultiSelect"
import { Button } from "@/components/ui/button"
import { toastError, toastSuccess } from "@/utils/toast"
import locationTrackingService from "@/services/locationTrackingService"
import { openGoogleMapsPoint, openGoogleMapsRoute } from "../utils/googleMapsLinks"

const LocationTrackingMap = dynamic(
  () => import("../components/LocationTrackingMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[360px] rounded border border-border bg-muted/30 animate-pulse" />
    ),
  }
)

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

function KpiChip({ label, value }) {
  return (
    <div className="rounded border border-border bg-card px-2 py-1 min-w-[72px]">
      <div className="text-[10px] uppercase text-muted-foreground leading-none">{label}</div>
      <div className="text-sm font-semibold tabular-nums leading-tight mt-0.5">{value}</div>
    </div>
  )
}

function ReportsContent() {
  const [from, setFrom] = useState(daysAgoIso(7))
  const [to, setTo] = useState(todayIso())
  const [userIds, setUserIds] = useState([])
  const [userOptions, setUserOptions] = useState([])
  const [rows, setRows] = useState([])
  const [totals, setTotals] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [trail, setTrail] = useState([])
  const [trailSummary, setTrailSummary] = useState(null)
  const [trailLoading, setTrailLoading] = useState(false)

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
        // User filter stays empty; report still works without it
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await locationTrackingService.getDailyReport({
        from,
        to,
        user_ids: userIds,
      })
      setRows(Array.isArray(data?.rows) ? data.rows : [])
      setTotals(data?.totals || null)
      setSelected(null)
      setTrail([])
      setTrailSummary(null)
    } catch (err) {
      toastError(err?.response?.data?.message || err.message || "Failed to load report")
    } finally {
      setLoading(false)
    }
  }, [from, to, userIds])

  useEffect(() => {
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- initial load only; Apply triggers thereafter

  const loadTrail = async (row) => {
    setSelected(row)
    setTrailLoading(true)
    setTrailSummary(null)
    try {
      const data = await locationTrackingService.getUserTrail(row.user_id, {
        date: String(row.summary_date).slice(0, 10),
      })
      setTrail(Array.isArray(data?.points) ? data.points : [])
      setTrailSummary(data?.summary || null)
    } catch (err) {
      setTrail([])
      setTrailSummary(null)
      toastError(err?.response?.data?.message || err.message || "Failed to load trail")
    } finally {
      setTrailLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const blob = await locationTrackingService.exportDailyReport({
        from,
        to,
        user_ids: userIds,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `location-tracking-${from}-to-${to}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess("Export downloaded")
    } catch (err) {
      toastError(err?.response?.data?.message || err.message || "Export failed")
    }
  }

  const routeMeta = useMemo(() => {
    if (trailSummary) {
      return {
        first: trailSummary.first_ping_at,
        last: trailSummary.last_ping_at,
        pings: trailSummary.ping_count,
        expected: trailSummary.expected_ping_count,
        coverage: trailSummary.coverage_pct,
        km: trailSummary.distance_km,
        gap: trailSummary.max_gap_minutes,
      }
    }
    if (selected) {
      return {
        first: selected.first_ping_at,
        last: selected.last_ping_at,
        pings: selected.ping_count,
        expected: selected.expected_ping_count,
        coverage: selected.coverage_pct,
        km: selected.distance_km,
        gap: selected.max_gap_minutes,
      }
    }
    return null
  }, [selected, trailSummary])

  return (
    <ListingPageContainer
      title="Location Tracking Reports"
      subtitle="Day-route explorer · select a row to show route of day · attendance is on Timesheet"
      fullWidth
      exportButtonLabel="Export CSV"
      onExportClick={handleExport}
      actions={
        <Button size="sm" variant="outline" asChild>
          <a href="/location-tracking/timesheet">Open timesheet</a>
        </Button>
      }
    >
      <div className="flex flex-wrap items-end gap-2 border-b border-border pb-1.5 mb-1.5">
        <div className="w-[150px]">
          <Input
            name="from"
            label="From"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="w-[150px]">
          <Input
            name="to"
            label="To"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="min-w-[220px] flex-1 max-w-sm">
          <MultiSelect
            name="user_ids"
            label="Users"
            placeholder="All tracked users"
            options={userOptions}
            value={userIds}
            onChange={(e) => setUserIds(e.target.value || [])}
            size="small"
          />
        </div>
        <Button size="sm" onClick={load} disabled={loading}>
          {loading ? "…" : "Apply"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-1.5">
        <KpiChip label="Coverage" value={totals ? `${totals.coverage_pct}%` : "—"} />
        <KpiChip
          label="Pings"
          value={
            totals ? `${totals.ping_count}/${totals.expected_ping_count}` : "—"
          }
        />
        <KpiChip label="Distance" value={totals ? `${totals.distance_km} km` : "—"} />
        <KpiChip label="Mocked" value={totals ? totals.mocked_ping_count : "—"} />
        <KpiChip label="Rows" value={rows.length} />
      </div>

      <div className="grid gap-1.5 lg:grid-cols-[1.35fr_1fr] lg:h-[calc(100vh-260px)] min-h-[440px]">
        <div className="rounded border border-border bg-card overflow-auto min-h-0">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur z-10">
              <tr className="text-left border-b border-border">
                <th className="px-2 py-1 font-medium">Date</th>
                <th className="px-2 py-1 font-medium">User</th>
                <th className="px-2 py-1 font-medium">Role</th>
                <th className="px-2 py-1 font-medium">Coverage</th>
                <th className="px-2 py-1 font-medium">Pings</th>
                <th className="px-2 py-1 font-medium">Km</th>
                <th className="px-2 py-1 font-medium">First</th>
                <th className="px-2 py-1 font-medium">Last</th>
                <th className="px-2 py-1 font-medium">Max gap</th>
                <th className="px-2 py-1 font-medium">Mocked</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-2 py-4 text-muted-foreground">
                    {loading ? "Loading…" : "No summary rows for this range"}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const active =
                    selected?.user_id === row.user_id &&
                    String(selected?.summary_date) === String(row.summary_date)
                  return (
                    <tr
                      key={`${row.user_id}-${row.summary_date}`}
                      className={`border-b border-border/60 cursor-pointer hover:bg-muted/40 ${
                        active ? "bg-muted/50" : ""
                      }`}
                      onClick={() => loadTrail(row)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          loadTrail(row)
                        }
                      }}
                      tabIndex={0}
                      aria-label={`Show route for ${row.user_name} on ${String(row.summary_date).slice(0, 10)}`}
                    >
                      <td className="px-2 py-1 tabular-nums">
                        {String(row.summary_date).slice(0, 10)}
                      </td>
                      <td className="px-2 py-1 font-medium">{row.user_name}</td>
                      <td className="px-2 py-1 text-muted-foreground">{row.role_name || "—"}</td>
                      <td className="px-2 py-1 tabular-nums">{row.coverage_pct}%</td>
                      <td className="px-2 py-1 tabular-nums">
                        {row.ping_count}/{row.expected_ping_count}
                      </td>
                      <td className="px-2 py-1 tabular-nums">{row.distance_km}</td>
                      <td className="px-2 py-1 tabular-nums">{fmtTime(row.first_ping_at)}</td>
                      <td className="px-2 py-1 tabular-nums">{fmtTime(row.last_ping_at)}</td>
                      <td className="px-2 py-1 tabular-nums">{row.max_gap_minutes}m</td>
                      <td className="px-2 py-1 tabular-nums">{row.mocked_ping_count}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col min-h-0 gap-1.5">
          <div className="rounded border border-border bg-card px-2 py-1.5 text-xs space-y-1">
            {selected ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <p className="font-medium text-[#1b365d]">
                    Route of day · {selected.user_name} ·{" "}
                    {String(selected.summary_date).slice(0, 10)}
                    {trailLoading ? " (loading…)" : ""}
                  </p>
                  {trail.length > 0 && !trailLoading ? (
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-2"
                        onClick={() => openGoogleMapsRoute(trail)}
                      >
                        View route on Google Maps
                      </Button>
                      {trail.length === 1 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2"
                          onClick={() => {
                            const p = trail[0]
                            openGoogleMapsPoint(p.latitude, p.longitude)
                          }}
                        >
                          Open last point
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {routeMeta ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground tabular-nums">
                    <span>First {fmtTime(routeMeta.first)}</span>
                    <span>Last {fmtTime(routeMeta.last)}</span>
                    <span>
                      Pings {routeMeta.pings}
                      {routeMeta.expected != null ? `/${routeMeta.expected}` : ""}
                    </span>
                    <span>Coverage {routeMeta.coverage}%</span>
                    <span>{routeMeta.km} km</span>
                    <span>Max gap {routeMeta.gap}m</span>
                    <span>{trail.length} pts on map</span>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">Select a row to show route of day</p>
            )}
          </div>
          <div className="flex-1 min-h-[360px]">
            <LocationTrackingMap
              trail={trail}
              emptyMessage={
                selected
                  ? trailLoading
                    ? "Loading route…"
                    : "No GPS points for this day"
                  : "Select a row to show route of day"
              }
            />
          </div>
        </div>
      </div>
    </ListingPageContainer>
  )
}

export default function LocationTrackingReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  )
}
