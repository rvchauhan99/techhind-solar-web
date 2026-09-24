"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import ListingPageContainer from "@/components/common/ListingPageContainer"
import { Button } from "@/components/ui/button"
import { toastError } from "@/utils/toast"
import locationTrackingService from "@/services/locationTrackingService"
import { openGoogleMapsPoint, openGoogleMapsRoute } from "../../utils/googleMapsLinks"

const LocationTrackingMap = dynamic(
  () => import("../../components/LocationTrackingMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[480px] rounded border border-border bg-muted/30 animate-pulse" />
    ),
  }
)

function MapContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const from = searchParams.get("from") || ""
  const to = searchParams.get("to") || ""
  const userIds = searchParams.get("user_ids") || ""
  const userId = searchParams.get("user_id") || ""
  const date = searchParams.get("date") || ""
  const ids = searchParams.get("ids") || ""
  const isMocked = searchParams.get("is_mocked") || ""
  const withinHours = searchParams.get("is_within_working_hours") || ""
  const source = searchParams.get("source") || ""
  const minAcc = searchParams.get("min_accuracy_m") || ""
  const maxAcc = searchParams.get("max_accuracy_m") || ""

  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState({ truncated: false, total: 0, userName: null })

  const backHref = useMemo(() => {
    const qs = new URLSearchParams()
    qs.set("mode", "pings")
    if (from) qs.set("from", from)
    if (to) qs.set("to", to)
    if (userIds) qs.set("user_ids", userIds)
    if (isMocked) qs.set("is_mocked", isMocked)
    if (withinHours) qs.set("is_within_working_hours", withinHours)
    if (source) qs.set("source", source)
    if (minAcc) qs.set("min_accuracy_m", minAcc)
    if (maxAcc) qs.set("max_accuracy_m", maxAcc)
    return `/location-tracking/logs?${qs.toString()}`
  }, [from, to, userIds, isMocked, withinHours, source, minAcc, maxAcc])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Prefer single-user day trail when user_id + date provided (dense day route)
      if (userId && date && !ids) {
        const trail = await locationTrackingService.getUserTrail(userId, { date })
        const pts = Array.isArray(trail?.points) ? trail.points : []
        setPoints(
          pts.map((p, i) => ({
            ...p,
            id: p.id || i,
            user_id: Number(userId),
          }))
        )
        setMeta({
          truncated: pts.length >= 2000,
          total: pts.length,
          userName: null,
        })
        return
      }

      const rangeFrom = from || date || new Date().toISOString().slice(0, 10)
      const rangeTo = to || date || rangeFrom
      const params = {
        from: rangeFrom,
        to: rangeTo,
        user_ids: userId || userIds || undefined,
        ids: ids || undefined,
        is_mocked: isMocked || undefined,
        is_within_working_hours: withinHours || undefined,
        source: source || undefined,
        min_accuracy_m: minAcc || undefined,
        max_accuracy_m: maxAcc || undefined,
        map_limit: 2000,
      }
      const data = await locationTrackingService.getPingMapPoints(params)
      const pts = Array.isArray(data?.points) ? data.points : []
      setPoints(pts)
      setMeta({
        truncated: Boolean(data?.truncated),
        total: data?.total ?? pts.length,
        userName: pts[0]?.user_name || null,
      })
    } catch (err) {
      setPoints([])
      toastError(err?.response?.data?.message || err.message || "Failed to load map points")
    } finally {
      setLoading(false)
    }
  }, [
    userId,
    date,
    ids,
    from,
    to,
    userIds,
    isMocked,
    withinHours,
    source,
    minAcc,
    maxAcc,
  ])

  useEffect(() => {
    load()
  }, [load])

  const titleBits = []
  if (userId) titleBits.push(`User #${userId}`)
  if (date) titleBits.push(date)
  else if (from || to) titleBits.push(`${from || "…"} → ${to || "…"}`)
  if (ids) titleBits.push(`${ids.split(",").filter(Boolean).length} selected`)

  return (
    <ListingPageContainer
      title="Tracking Logs — Map"
      subtitle={
        titleBits.length
          ? titleBits.join(" · ")
          : "Filtered GPS points (Leaflet). Open Google Maps for external view."
      }
      fullWidth
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" asChild>
            <Link href={backHref}>Back to logs</Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={!points.length}
            onClick={() => openGoogleMapsRoute(points)}
          >
            Open route in Google Maps
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={!points.length}
            onClick={() =>
              openGoogleMapsPoint(points[0].latitude, points[0].longitude)
            }
          >
            First point
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            onClick={() => load()}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      }
    >
      <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span>
          Points: <strong className="text-foreground tabular-nums">{points.length}</strong>
          {meta.total > points.length || meta.truncated
            ? ` (showing up to 2000 of ${meta.total})`
            : null}
        </span>
        {meta.userName ? <span>User: {meta.userName}</span> : null}
        <button
          type="button"
          className="text-[#1b365d] underline underline-offset-2"
          onClick={() => router.push(backHref)}
        >
          Edit filters on logs
        </button>
      </div>

      <div className="h-[min(70vh,640px)] min-h-[420px] rounded border border-border overflow-hidden">
        {loading ? (
          <div className="h-full animate-pulse bg-muted/30" />
        ) : points.length ? (
          <LocationTrackingMap trail={points} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No points for this filter set (check date range / retention).
          </div>
        )}
      </div>
    </ListingPageContainer>
  )
}

export default function TrackingLogsMapPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading map…</div>}>
        <MapContent />
      </Suspense>
    </ProtectedRoute>
  )
}
