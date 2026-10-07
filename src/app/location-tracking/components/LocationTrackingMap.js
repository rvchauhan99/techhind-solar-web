"use client"

import { useEffect, useMemo, useRef } from "react"
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { openGoogleMapsPoint } from "../utils/googleMapsLinks"
import { fmtTenantDateTime, fmtTenantTime } from "../utils/formatTrackingTime"

const STATUS_COLORS = {
  live: "#16a34a",
  stale: "#d97706",
  location_off: "#c2410c",
  no_fix: "#6b7280",
  no_data: "#6b7280",
  off_duty: "#64748b",
}

function makeDivIcon(color, label) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
      font:700 9px/1 system-ui,sans-serif;color:#fff;
    ">${label || ""}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  })
}

const startIcon = makeDivIcon("#16a34a", "S")
const endIcon = makeDivIcon("#dc2626", "E")

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points?.length) return
    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 15 })
  }, [map, points])
  return null
}

function InvalidateSize() {
  const map = useMap()
  useEffect(() => {
    const run = () => {
      try {
        map.invalidateSize()
      } catch {
        // ignore
      }
    }
    run()
    const t1 = setTimeout(run, 100)
    const t2 = setTimeout(run, 400)
    window.addEventListener("resize", run)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener("resize", run)
    }
  }, [map])
  return null
}

function FocusUser({ focusUserId, markers }) {
  const map = useMap()
  const markerRefs = useRef({})

  useEffect(() => {
    if (focusUserId == null) return
    const m = (markers || []).find(
      (x) => String(x.user_id) === String(focusUserId) && x.latitude != null && x.longitude != null
    )
    if (!m) return
    const lat = Number(m.latitude)
    const lng = Number(m.longitude)
    map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true })
    const ref = markerRefs.current[focusUserId]
    if (ref) {
      try {
        ref.openPopup()
      } catch {
        // ignore
      }
    }
  }, [focusUserId, markers, map])

  return (
    <>
      {(markers || [])
        .filter((m) => m.latitude != null && m.longitude != null)
        .map((m) => {
          const status = m.status || "no_data"
          const color = STATUS_COLORS[status] || STATUS_COLORS.no_data
          const icon = makeDivIcon(color)
          return (
            <Marker
              key={m.user_id || `${m.latitude}-${m.longitude}`}
              position={[Number(m.latitude), Number(m.longitude)]}
              icon={icon}
              ref={(el) => {
                if (el) markerRefs.current[m.user_id] = el
              }}
            >
              <Popup>
                <div className="text-xs space-y-0.5 min-w-[140px]">
                  <p className="font-semibold">{m.name || "User"}</p>
                  <p className="uppercase">{status}</p>
                  {m.age_minutes != null ? <p>Age: {m.age_minutes} min</p> : null}
                  {m.battery_pct != null ? <p>Battery: {m.battery_pct}%</p> : null}
                  {m.last_sync_at ? (
                    <p>Sync: {fmtTenantTime(m.last_sync_at)}</p>
                  ) : null}
                  <button
                    type="button"
                    className="mt-1 text-[11px] font-medium text-[#1b365d] underline underline-offset-2"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openGoogleMapsPoint(m.latitude, m.longitude)
                    }}
                  >
                    View on Google Maps
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
    </>
  )
}

function pointCrossesGap(prev, next, gaps) {
  if (!prev?.recorded_at || !next?.recorded_at) return false
  const startMs = new Date(prev.recorded_at).getTime()
  const endMs = new Date(next.recorded_at).getTime()
  if (!(endMs > startMs)) return false
  return (gaps || []).some((gap) => {
    const gapStart = new Date(gap.started_at).getTime()
    const gapEnd = gap.ended_at ? new Date(gap.ended_at).getTime() : endMs
    return gapStart < endMs && gapEnd > startMs
  })
}

function TrailLayer({ trail, gaps = [] }) {
  const points = useMemo(
    () => (trail || []).filter((p) => p.latitude != null && p.longitude != null),
    [trail]
  )
  const positions = useMemo(
    () => points.map((p) => [Number(p.latitude), Number(p.longitude)]),
    [points]
  )
  const { routeSegments, gapSegments } = useMemo(() => {
    const route = []
    const dashed = []
    let current = []
    for (let i = 0; i < points.length; i += 1) {
      const pos = [Number(points[i].latitude), Number(points[i].longitude)]
      if (i > 0 && pointCrossesGap(points[i - 1], points[i], gaps)) {
        if (current.length > 1) route.push(current)
        dashed.push([
          [Number(points[i - 1].latitude), Number(points[i - 1].longitude)],
          pos,
        ])
        current = [pos]
      } else {
        current.push(pos)
      }
    }
    if (current.length > 1) route.push(current)
    return { routeSegments: route, gapSegments: dashed }
  }, [points, gaps])

  if (!positions.length) return null

  const start = positions[0]
  const end = positions[positions.length - 1]
  const mid = (trail || []).filter((p) => p.latitude != null && p.longitude != null)
  // Cap intermediate dots for performance (trail API may return up to 2000 pts)
  const midInner = mid.slice(1, -1)
  const step = midInner.length > 150 ? Math.ceil(midInner.length / 150) : 1
  const midSampled = midInner.filter((_, i) => i % step === 0)

  return (
    <>
      {routeSegments.map((segment, i) => (
        <Polyline key={`route-${i}`} positions={segment} color="#1b365d" weight={3} opacity={0.85} />
      ))}
      {gapSegments.map((segment, i) => (
        <Polyline
          key={`gap-${i}`}
          positions={segment}
          color="#c2410c"
          weight={3}
          opacity={0.9}
          dashArray="6 8"
        />
      ))}
      {midSampled.map((p, i) => {
        const mocked = !!p.is_mocked
        const fill = mocked ? "#7c3aed" : "#1b365d"
        return (
          <CircleMarker
            key={`ping-${i}-${p.recorded_at}`}
            center={[Number(p.latitude), Number(p.longitude)]}
            radius={4}
            pathOptions={{
              color: "#fff",
              weight: 1,
              fillColor: fill,
              fillOpacity: 0.75,
            }}
          >
            <Popup>
              <div className="text-xs space-y-0.5">
                <p>{fmtTenantDateTime(p.recorded_at)}</p>
                {p.accuracy_m != null ? <p>Accuracy: {p.accuracy_m}m</p> : null}
                {p.battery_pct != null ? <p>Battery: {p.battery_pct}%</p> : null}
                {mocked ? <p className="text-violet-700">Mocked</p> : null}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
      <Marker position={start} icon={startIcon}>
        <Popup>
          <div className="text-xs font-semibold">Start</div>
        </Popup>
      </Marker>
      {positions.length > 1 ? (
        <Marker position={end} icon={endIcon}>
          <Popup>
            <div className="text-xs font-semibold">End</div>
          </Popup>
        </Marker>
      ) : null}
    </>
  )
}

/**
 * Shared Leaflet map. Must be loaded via next/dynamic({ ssr: false }).
 * Live: pass markers + optional focusUserId.
 * Day-route: pass trail points (polyline + start/end + ping dots).
 */
export default function LocationTrackingMap({
  markers = [],
  trail = [],
  gaps = [],
  focusUserId = null,
  className = "",
  emptyMessage = "No locations to show",
}) {
  const isTrail = (trail || []).length > 0

  const points = useMemo(() => {
    if (isTrail) {
      return (trail || [])
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => [Number(p.latitude), Number(p.longitude)])
    }
    return (markers || [])
      .filter((m) => m.latitude != null && m.longitude != null)
      .map((m) => [Number(m.latitude), Number(m.longitude)])
  }, [markers, trail, isTrail])

  const center = points[0] || [23.0225, 72.5714]
  const hasData = points.length > 0

  return (
    <div
      className={`relative z-0 isolate w-full h-full min-h-[420px] overflow-hidden rounded border border-border bg-muted/20 ${className}`}
    >
      {!hasData ? (
        <div className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none">
          <p className="text-xs text-muted-foreground bg-background/90 border border-border rounded px-2 py-1">
            {emptyMessage}
          </p>
        </div>
      ) : null}
      <MapContainer
        center={center}
        zoom={12}
        className="!z-0"
        style={{ height: "100%", width: "100%", minHeight: 420 }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <InvalidateSize />
        {hasData ? <FitBounds points={points} /> : null}
        {isTrail ? (
          <TrailLayer trail={trail} gaps={gaps} />
        ) : (
          <FocusUser focusUserId={focusUserId} markers={markers} />
        )}
      </MapContainer>
    </div>
  )
}
