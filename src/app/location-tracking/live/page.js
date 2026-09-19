"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import ListingPageContainer from "@/components/common/ListingPageContainer"
import { Button } from "@/components/ui/button"
import { toastError } from "@/utils/toast"
import locationTrackingService from "@/services/locationTrackingService"
import { openGoogleMapsPoint } from "../utils/googleMapsLinks"

const LocationTrackingMap = dynamic(
  () => import("../components/LocationTrackingMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[420px] rounded border border-border bg-muted/30 animate-pulse" />
    ),
  }
)

const POLL_MS = 2 * 60 * 1000

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "stale", label: "Stale" },
  { key: "no_data", label: "No data" },
  { key: "on_duty", label: "On duty" },
  { key: "off_duty", label: "Off duty" },
]

function statusBadge(status) {
  const s = status || "no_data"
  const map = {
    live: "bg-green-100 text-green-800",
    stale: "bg-amber-100 text-amber-800",
    no_data: "bg-gray-100 text-gray-600",
  }
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${map[s] || map.no_data}`}
    >
      {s}
    </span>
  )
}

function KpiChip({ label, value, tone }) {
  const tones = {
    live: "border-green-200 bg-green-50 text-green-800",
    stale: "border-amber-200 bg-amber-50 text-amber-800",
    muted: "border-border bg-muted/40 text-foreground",
  }
  return (
    <div className={`rounded border px-2 py-1 ${tones[tone] || tones.muted}`}>
      <div className="text-[10px] uppercase text-muted-foreground leading-none">{label}</div>
      <div className="text-sm font-semibold tabular-nums leading-tight mt-0.5">{value}</div>
    </div>
  )
}

function LiveContent() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastFetchedAt, setLastFetchedAt] = useState(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [focusUserId, setFocusUserId] = useState(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await locationTrackingService.getLiveLocations()
      setUsers(Array.isArray(data?.users) ? data.users : [])
      setLastFetchedAt(new Date())
    } catch (err) {
      toastError(err?.response?.data?.message || err.message || "Failed to load live locations")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(() => load(true), POLL_MS)
    return () => clearInterval(id)
  }, [load])

  const counts = useMemo(() => {
    const c = { live: 0, stale: 0, no_data: 0, on_duty: 0, off_duty: 0, total: users.length }
    users.forEach((u) => {
      const s = u.status || "no_data"
      if (c[s] != null) c[s] += 1
      else c.no_data += 1
      if (u.on_duty) c.on_duty += 1
      else c.off_duty += 1
    })
    return c
  }, [users])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      const status = u.status || "no_data"
      if (statusFilter === "on_duty" && !u.on_duty) return false
      else if (statusFilter === "off_duty" && u.on_duty) return false
      else if (
        statusFilter !== "all" &&
        statusFilter !== "on_duty" &&
        statusFilter !== "off_duty" &&
        status !== statusFilter
      ) {
        return false
      }
      if (!q) return true
      const hay = `${u.name || ""} ${u.email || ""} ${u.role_name || ""}`.toLowerCase()
      return hay.includes(q)
    })
  }, [users, search, statusFilter])

  const mapMarkers = useMemo(
    () => filtered.filter((u) => u.latitude != null && u.longitude != null),
    [filtered]
  )

  return (
    <ListingPageContainer
      title="Live Location Map"
      subtitle={
        lastFetchedAt
          ? `Polled ${lastFetchedAt.toLocaleTimeString()} · ${mapMarkers.length}/${filtered.length} on map`
          : "Loading…"
      }
      fullWidth
      actions={
        <Button size="sm" variant="outline" onClick={() => load()} disabled={loading}>
          Refresh
        </Button>
      }
    >
      <div className="grid gap-1.5 lg:grid-cols-[1fr_300px] lg:h-[calc(100vh-160px)] min-h-[480px]">
        <LocationTrackingMap
          markers={mapMarkers}
          focusUserId={focusUserId}
          emptyMessage={loading ? "Loading…" : "No users with position in current filter"}
        />

        <div className="flex flex-col min-h-0 rounded border border-border bg-card">
          <div className="grid grid-cols-3 gap-1 p-1.5 border-b border-border">
            <KpiChip label="Live" value={counts.live} tone="live" />
            <KpiChip label="On duty" value={counts.on_duty} tone="live" />
            <KpiChip label="Off duty" value={counts.off_duty} tone="stale" />
          </div>

          <div className="p-1.5 border-b border-border space-y-1.5">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / email…"
              className="w-full h-8 rounded border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              aria-label="Search users"
            />
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.key
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatusFilter(f.key)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                      active
                        ? "bg-[#1b365d] text-white border-[#1b365d]"
                        : "bg-background text-muted-foreground border-border hover:bg-muted/50"
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                <tr className="text-left border-b border-border">
                  <th className="px-2 py-1 font-medium">User</th>
                  <th className="px-2 py-1 font-medium">Status</th>
                  <th className="px-2 py-1 font-medium">Age</th>
                  <th className="px-2 py-1 font-medium">Bat</th>
                  <th className="px-2 py-1 font-medium">Map</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-4 text-muted-foreground">
                      {loading ? "Loading…" : "No users match filters"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const selected = focusUserId === u.user_id
                    const hasPos = u.latitude != null && u.longitude != null
                    return (
                      <tr
                        key={u.user_id}
                        className={`border-b border-border/60 ${
                          hasPos ? "cursor-pointer hover:bg-muted/40" : "opacity-70"
                        } ${selected ? "bg-muted/60" : ""}`}
                        onClick={() => {
                          if (!hasPos) return
                          setFocusUserId(u.user_id)
                        }}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && hasPos) {
                            e.preventDefault()
                            setFocusUserId(u.user_id)
                          }
                        }}
                        tabIndex={hasPos ? 0 : -1}
                        aria-label={`Focus ${u.name} on map`}
                      >
                        <td className="px-2 py-1">
                          <div className="font-medium truncate max-w-[110px]">{u.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[110px]">
                            {u.role_name || "—"} · sync {u.sync_interval_minutes}m
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <div className="flex flex-col gap-0.5">
                            {statusBadge(u.status)}
                            {u.on_duty ? (
                              <span className="inline-flex rounded px-1.5 py-0.5 text-[9px] font-medium uppercase bg-blue-100 text-blue-800 w-fit">
                                on duty
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2 py-1 tabular-nums">
                          {u.age_minutes == null ? "—" : `${u.age_minutes}m`}
                        </td>
                        <td className="px-2 py-1 tabular-nums">
                          {u.battery_pct == null ? "—" : `${u.battery_pct}%`}
                        </td>
                        <td className="px-2 py-1">
                          {hasPos ? (
                            <button
                              type="button"
                              className="text-[10px] font-medium text-[#1b365d] underline underline-offset-2 whitespace-nowrap"
                              aria-label={`Open ${u.name} in Google Maps`}
                              onClick={(e) => {
                                e.stopPropagation()
                                openGoogleMapsPoint(u.latitude, u.longitude)
                              }}
                            >
                              Google
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ListingPageContainer>
  )
}

export default function LocationTrackingLivePage() {
  return (
    <ProtectedRoute>
      <LiveContent />
    </ProtectedRoute>
  )
}
