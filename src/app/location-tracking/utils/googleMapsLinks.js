/**
 * Google Maps URL deep-links (no Maps JS SDK / API key).
 * Open in a new tab via window.open(..., "noopener,noreferrer").
 */

function toNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Normalize [{latitude,longitude}|[lat,lng]|{lat,lng}] → [{lat,lng}, ...] */
export function normalizePoints(points = []) {
  const out = []
  for (const p of points) {
    if (!p) continue
    let lat = null
    let lng = null
    if (Array.isArray(p) && p.length >= 2) {
      lat = toNum(p[0])
      lng = toNum(p[1])
    } else {
      lat = toNum(p.latitude ?? p.lat)
      lng = toNum(p.longitude ?? p.lng)
    }
    if (lat == null || lng == null) continue
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue
    out.push({ lat, lng })
  }
  return out
}

export function googleMapsPointUrl(lat, lng, zoom = 15) {
  const a = toNum(lat)
  const b = toNum(lng)
  if (a == null || b == null) return null
  return `https://www.google.com/maps?q=${a},${b}&z=${zoom}`
}

/**
 * Evenly sample midpoints so Google Maps dir URL stays under practical limits (~25 waypoints).
 */
export function sampleWaypoints(mids, maxWaypoints = 23) {
  if (!mids.length) return []
  if (mids.length <= maxWaypoints) return mids
  const out = []
  const last = mids.length - 1
  for (let i = 0; i < maxWaypoints; i += 1) {
    const idx = Math.round((i / (maxWaypoints - 1)) * last)
    out.push(mids[idx])
  }
  // Deduplicate consecutive duplicates from rounding
  return out.filter((p, i, arr) => i === 0 || p.lat !== arr[i - 1].lat || p.lng !== arr[i - 1].lng)
}

export function googleMapsRouteUrl(points = []) {
  const pts = normalizePoints(points)
  if (!pts.length) return null
  if (pts.length === 1) {
    return googleMapsPointUrl(pts[0].lat, pts[0].lng)
  }
  const origin = pts[0]
  const destination = pts[pts.length - 1]
  const mids = pts.slice(1, -1)
  const waypoints = sampleWaypoints(mids, 23)
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
  })
  if (waypoints.length) {
    params.set(
      "waypoints",
      waypoints.map((p) => `${p.lat},${p.lng}`).join("|")
    )
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function openGoogleMapsPoint(lat, lng, zoom = 15) {
  const url = googleMapsPointUrl(lat, lng, zoom)
  if (!url || typeof window === "undefined") return false
  window.open(url, "_blank", "noopener,noreferrer")
  return true
}

export function openGoogleMapsRoute(points = []) {
  const url = googleMapsRouteUrl(points)
  if (!url || typeof window === "undefined") return false
  window.open(url, "_blank", "noopener,noreferrer")
  return true
}
