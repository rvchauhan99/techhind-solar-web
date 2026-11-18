"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams } from "next/navigation"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import ListingPageContainer from "@/components/common/ListingPageContainer"
import { Button } from "@/components/ui/button"
import { toastError, toastSuccess } from "@/utils/toast"
import fieldTripsService from "@/services/fieldTripsService"

const LocationTrackingMap = dynamic(
  () => import("@/app/location-tracking/components/LocationTrackingMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[420px] rounded border border-border bg-muted/30 animate-pulse" />
    ),
  }
)

function fmtDt(v) {
  if (!v) return "—"
  try {
    return new Date(v).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return String(v)
  }
}

function expenseBadge(status) {
  const s = status || "none"
  const cls =
    s === "approved"
      ? "bg-green-100 text-green-800"
      : s === "pending"
        ? "bg-amber-100 text-amber-900"
        : s === "rm_approved"
          ? "bg-blue-100 text-blue-800"
          : s === "rejected"
            ? "bg-red-100 text-red-800"
            : "bg-slate-100 text-slate-600"
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${cls}`}>
      {s}
    </span>
  )
}

function OdoPhoto({ tripId, which, path }) {
  const [url, setUrl] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!path || !tripId) return undefined
    ;(async () => {
      try {
        const res = await fieldTripsService.getOdometerPhotoUrl(tripId, which)
        if (!cancelled) setUrl(res?.url || null)
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Unavailable")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tripId, which, path])

  if (!path) {
    return <span className="text-xs text-muted-foreground">No photo</span>
  }
  if (err) {
    return <span className="text-xs text-amber-700">{err}</span>
  }
  if (!url) {
    return <div className="h-28 w-40 animate-pulse rounded border border-border bg-muted/40" />
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img
        src={url}
        alt={`${which} photo`}
        className="h-28 w-40 rounded border border-border object-cover"
      />
    </a>
  )
}

export default function FieldTripDetailPage() {
  const params = useParams()
  const id = params?.id
  const [trip, setTrip] = useState(null)
  const [pings, setPings] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [t, p] = await Promise.all([
        fieldTripsService.getTrip(id),
        fieldTripsService.getTripPings(id, { limit: 500 }),
      ])
      setTrip(t)
      setPings(Array.isArray(p?.data) ? p.data : [])
    } catch (err) {
      toastError(err?.message || "Failed to load trip")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const mapPoints = useMemo(() => {
    const pts = []
    if (trip?.start_latitude != null && trip?.start_longitude != null) {
      pts.push({
        id: "start",
        latitude: Number(trip.start_latitude),
        longitude: Number(trip.start_longitude),
        recorded_at: trip.started_at,
        source: "start",
      })
    }
    for (const p of pings) {
      if (p.latitude == null || p.longitude == null) continue
      pts.push({
        id: p.id,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        recorded_at: p.recorded_at,
        accuracy_m: p.accuracy_m,
        source: p.source || "trip",
      })
    }
    if (trip?.end_latitude != null && trip?.end_longitude != null) {
      pts.push({
        id: "end",
        latitude: Number(trip.end_latitude),
        longitude: Number(trip.end_longitude),
        recorded_at: trip.ended_at,
        source: "end",
      })
    }
    return pts
  }, [trip, pings])

  const handleApprove = async () => {
    setActing(true)
    try {
      const updated = await fieldTripsService.approveExpense(id, {})
      setTrip(updated)
      toastSuccess("Expense approved")
    } catch (err) {
      toastError(err?.message || "Approve failed")
    } finally {
      setActing(false)
    }
  }

  const handleReject = async () => {
    const note = window.prompt("Reject reason (required)")
    if (note == null) return
    if (!String(note).trim()) {
      toastError("Reject reason is required")
      return
    }
    setActing(true)
    try {
      const updated = await fieldTripsService.rejectExpense(id, {
        note: String(note).trim(),
      })
      setTrip(updated)
      toastSuccess("Expense rejected")
    } catch (err) {
      toastError(err?.message || "Reject failed")
    } finally {
      setActing(false)
    }
  }

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title={trip ? `Trip #${trip.id}` : "Trip detail"}
        subtitle={
          trip
            ? `${trip.user_name || "User"} · ${trip.status} · GPS ${
                trip.total_km_km != null ? `${Number(trip.total_km_km).toFixed(2)} km` : "—"
              } · Expense ${trip.expense_status || "none"}`
            : "Loading…"
        }
        secondaryButtonLabel="Back to list"
        onSecondaryClick={() => {
          window.location.href = "/field-trips"
        }}
      >
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Start: {fmtDt(trip?.started_at)}</span>
          <span>End: {fmtDt(trip?.ended_at)}</span>
          <span>Vehicle: {trip?.vehicle_mode || "—"}</span>
          <span className="inline-flex items-center gap-1">
            Expense: {expenseBadge(trip?.expense_status)}
          </span>
          {trip?.expense_amount != null ? (
            <span>Amount: ₹{Number(trip.expense_amount).toFixed(2)}</span>
          ) : null}
          {trip?.description ? <span>Purpose: {trip.description}</span> : null}
          <Button asChild variant="outline" size="sm" className="h-7">
            <Link href="/field-trips">List</Link>
          </Button>
          {trip?.can_approve_expense ? (
            <Button
              type="button"
              size="sm"
              className="h-7"
              disabled={acting}
              onClick={handleApprove}
            >
              Approve expense
            </Button>
          ) : null}
          {trip?.can_reject_expense ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7"
              disabled={acting}
              onClick={handleReject}
            >
              Reject
            </Button>
          ) : null}
        </div>

        {(trip?.expense_status && trip.expense_status !== "none") ||
        trip?.expense_receipt_path ? (
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-border p-2 text-xs">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Expense audit
              </div>
              <div>RM: {fmtDt(trip?.rm_approved_at)} {trip?.rm_approved_by ? `(#${trip.rm_approved_by})` : ""}</div>
              <div>HR: {fmtDt(trip?.hr_approved_at)} {trip?.hr_approved_by ? `(#${trip.hr_approved_by})` : ""}</div>
              <div>Rejected: {fmtDt(trip?.rejected_at)} {trip?.rejected_by ? `(#${trip.rejected_by})` : ""}</div>
              {trip?.expense_note ? <div className="mt-1">Note: {trip.expense_note}</div> : null}
            </div>
            <div className="rounded border border-border p-2">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Receipt
              </div>
              <OdoPhoto
                tripId={trip?.id}
                which="receipt"
                path={trip?.expense_receipt_path}
              />
            </div>
          </div>
        ) : null}

        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-border p-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Start odometer
              {trip?.start_odometer_km != null
                ? ` · ${Number(trip.start_odometer_km).toFixed(2)} km`
                : ""}
            </div>
            <OdoPhoto
              tripId={trip?.id}
              which="start"
              path={trip?.start_odometer_photo_path}
            />
          </div>
          <div className="rounded border border-border p-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              End odometer
              {trip?.end_odometer_km != null
                ? ` · ${Number(trip.end_odometer_km).toFixed(2)} km`
                : ""}
            </div>
            <OdoPhoto
              tripId={trip?.id}
              which="end"
              path={trip?.end_odometer_photo_path}
            />
          </div>
        </div>

        <div className="h-[min(70vh,560px)] min-h-[420px] overflow-hidden rounded border border-border">
          {loading ? (
            <div className="h-full animate-pulse bg-muted/30" />
          ) : (
            <LocationTrackingMap trail={mapPoints} />
          )}
        </div>
      </ListingPageContainer>
    </ProtectedRoute>
  )
}
