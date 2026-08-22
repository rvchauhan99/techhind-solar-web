"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { IconButton } from "@mui/material"
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import DetailsSidebar from "./DetailsSidebar"
import BucketImage from "./BucketImage"
import siteVisitService from "@/services/siteVisitService"
import { toastError } from "@/utils/toast"
import { formatDate } from "@/utils/dataTableUtils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { IconExternalLink } from "@tabler/icons-react"

const PHOTO_FIELDS = [
  { key: "visit_photo", label: "Visit Photo" },
  { key: "left_corner_site_image", label: "Left Corner" },
  { key: "right_corner_site_image", label: "Right Corner" },
  { key: "left_top_corner_site_image", label: "Left Top Corner" },
  { key: "right_top_corner_site_image", label: "Right Top Corner" },
  { key: "drawing_image", label: "Drawing" },
  { key: "house_building_outside_photo", label: "House / Outside" },
]

const DetailRow = ({ label, value }) => (
  <div className="py-0.5">
    <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
    <p className="text-xs break-words">{value ?? "-"}</p>
  </div>
)

const SectionTitle = ({ children }) => (
  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mt-2.5 mb-1 pb-0.5 border-b border-border first:mt-0">
    {children}
  </h3>
)

const safeValue = (v) => {
  if (v === null || v === undefined || v === "") return "-"
  return v
}

const formatBool = (v) => {
  if (v === true || v === "true" || v === 1 || v === "1") return "Yes"
  if (v === false || v === "false" || v === 0 || v === "0") return "No"
  return "-"
}

const visitStatusBadgeClass = (status) => {
  const s = String(status ?? "").toLowerCase()
  if (s === "visited") return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
  if (s === "pending") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
  if (s === "rescheduled") return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
  if (s === "cancelled") return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
}

const inquiryStatusBadgeClass = (status) => {
  const s = String(status ?? "").toLowerCase()
  if (s.includes("site visit")) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
  if (s === "quotation" || s === "under discussion") return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
  if (s === "connected") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
}

const parseOtherMedia = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : value.trim() ? [value] : []
    } catch {
      return value.trim() ? [value] : []
    }
  }
  return []
}

/** Normalize list-row (prefixed) or getById (nested) into one shape. */
export const normalizeSiteVisitRecord = (input) => {
  if (!input) return null

  const isListRow = input.site_visit_id != null || input.site_visit_visit_status != null

  if (!isListRow) {
    const other = parseOtherMedia(input.other_images_videos)
    return {
      id: input.id,
      inquiry_id: input.inquiry_id ?? input.inquiry?.id ?? null,
      inquiry_number: input.inquiry?.inquiry_number ?? input.inquiry_number ?? null,
      visit_status: input.visit_status,
      remarks: input.remarks,
      next_reminder_date: input.next_reminder_date,
      site_latitude: input.site_latitude,
      site_longitude: input.site_longitude,
      has_shadow_casting_object: input.has_shadow_casting_object,
      shadow_reduce_suggestion: input.shadow_reduce_suggestion,
      height_of_parapet: input.height_of_parapet,
      roof_type: input.roof_type,
      solar_panel_size_capacity: input.solar_panel_size_capacity,
      approx_roof_area_sqft: input.approx_roof_area_sqft,
      inverter_size_capacity: input.inverter_size_capacity,
      earthing_cable_size_location: input.earthing_cable_size_location,
      visit_photo: input.visit_photo,
      left_corner_site_image: input.left_corner_site_image,
      right_corner_site_image: input.right_corner_site_image,
      left_top_corner_site_image: input.left_top_corner_site_image,
      right_top_corner_site_image: input.right_top_corner_site_image,
      drawing_image: input.drawing_image,
      house_building_outside_photo: input.house_building_outside_photo,
      other_images_videos: other,
      do_not_send_message: input.do_not_send_message,
      visit_date: input.visit_date,
      visited_by: input.visited_by,
      visit_assign_to: input.visit_assign_to,
      schedule_on: input.schedule_on,
      schedule_remarks: input.schedule_remarks,
      status: input.status,
      created_at: input.created_at,
      updated_at: input.updated_at,
      inquiry_status: input.inquiry?.status ?? null,
      inquiry_capacity: input.inquiry?.capacity ?? null,
      inquiry_date: input.inquiry?.date_of_inquiry ?? null,
      customer_name: input.inquiry?.customer?.customer_name ?? null,
      customer_company: input.inquiry?.customer?.company_name ?? null,
      customer_phone: input.inquiry?.customer?.phone_no ?? null,
      customer_email: input.inquiry?.customer?.email_id ?? null,
      customer_address: input.inquiry?.customer?.address ?? null,
      visited_by_name: input.visitedBy?.name ?? null,
      visited_by_email: input.visitedBy?.email ?? null,
      assigned_to_name: input.visitAssignedTo?.name ?? null,
      assigned_to_email: input.visitAssignedTo?.email ?? null,
    }
  }

  return {
    id: input.site_visit_id ?? input.id,
    inquiry_id: input.inquiry_id,
    inquiry_number: input.inquiry_number ?? null,
    visit_status: input.site_visit_visit_status,
    remarks: input.site_visit_remarks,
    next_reminder_date: input.site_visit_next_reminder_date,
    site_latitude: input.site_visit_site_latitude,
    site_longitude: input.site_visit_site_longitude,
    has_shadow_casting_object: input.site_visit_has_shadow_casting_object,
    shadow_reduce_suggestion: input.site_visit_shadow_reduce_suggestion,
    height_of_parapet: input.site_visit_height_of_parapet,
    roof_type: input.site_visit_roof_type,
    solar_panel_size_capacity: input.site_visit_solar_panel_size_capacity,
    approx_roof_area_sqft: input.site_visit_approx_roof_area_sqft,
    inverter_size_capacity: input.site_visit_inverter_size_capacity,
    earthing_cable_size_location: input.site_visit_earthing_cable_size_location,
    visit_photo: input.site_visit_visit_photo,
    left_corner_site_image: input.site_visit_left_corner_site_image,
    right_corner_site_image: input.site_visit_right_corner_site_image,
    left_top_corner_site_image: input.site_visit_left_top_corner_site_image,
    right_top_corner_site_image: input.site_visit_right_top_corner_site_image,
    drawing_image: input.site_visit_drawing_image,
    house_building_outside_photo: input.site_visit_house_building_outside_photo,
    other_images_videos: parseOtherMedia(input.site_visit_other_images_videos),
    do_not_send_message: input.site_visit_do_not_send_message,
    visit_date: input.site_visit_visit_date,
    visited_by: input.site_visit_visited_by,
    visit_assign_to: input.site_visit_visit_assign_to,
    schedule_on: input.site_visit_schedule_on,
    schedule_remarks: input.site_visit_schedule_remarks,
    status: input.site_visit_status,
    created_at: input.site_visit_created_at,
    updated_at: input.site_visit_updated_at,
    inquiry_status: input.inquiry_status,
    inquiry_capacity: input.inquiry_capacity,
    inquiry_date: input.inquiry_date_of_inquiry,
    customer_name: null,
    customer_company: null,
    customer_phone: null,
    customer_email: null,
    customer_address: null,
    visited_by_name: null,
    visited_by_email: null,
    assigned_to_name: null,
    assigned_to_email: null,
  }
}

const buildPhotoSlides = (record) => {
  if (!record) return []
  const slides = []
  PHOTO_FIELDS.forEach(({ key, label }) => {
    if (record[key]) slides.push({ key, label, src: record[key] })
  })
  ;(record.other_images_videos || []).forEach((src, i) => {
    if (src) slides.push({ key: `other_${i}`, label: `Other ${i + 1}`, src })
  })
  return slides
}

const mapsUrl = (lat, lng) => {
  const la = Number(lat)
  const lo = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null
  if (la === 0 && lo === 0) return null
  return `https://www.google.com/maps?q=${la},${lo}`
}

export default function SiteVisitDetailsDrawer({
  open,
  onClose,
  siteVisit,
  initialGalleryKey = null,
}) {
  const [loading, setLoading] = useState(false)
  const [resolved, setResolved] = useState(() => normalizeSiteVisitRecord(siteVisit))
  const [photoGallery, setPhotoGallery] = useState(null)
  const galleryOpenedRef = useRef(false)

  useEffect(() => {
    setResolved(normalizeSiteVisitRecord(siteVisit))
  }, [siteVisit])

  useEffect(() => {
    const fetchDetails = async () => {
      const id = siteVisit?.site_visit_id ?? siteVisit?.id
      if (!open || !id) return
      try {
        setLoading(true)
        const data = await siteVisitService.getById(id)
        const item = data?.result ?? data
        setResolved(normalizeSiteVisitRecord(item || siteVisit))
      } catch (err) {
        const msg =
          err?.response?.data?.message || err?.message || "Failed to load site visit details"
        toastError(msg)
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [open, siteVisit?.site_visit_id, siteVisit?.id])

  const slides = useMemo(() => buildPhotoSlides(resolved), [resolved])

  useEffect(() => {
    if (!open) {
      setPhotoGallery(null)
      galleryOpenedRef.current = false
      return
    }
    if (!initialGalleryKey || galleryOpenedRef.current || slides.length === 0) return
    const idx = slides.findIndex((s) => s.key === initialGalleryKey)
    if (idx >= 0) {
      galleryOpenedRef.current = true
      setPhotoGallery({ slides, index: idx })
    }
  }, [open, initialGalleryKey, slides])

  const handleOpenGallery = (key) => {
    const idx = slides.findIndex((s) => s.key === key)
    if (idx < 0) return
    setPhotoGallery({ slides, index: idx })
  }

  const handleOpenFull = async () => {
    const slide = photoGallery?.slides?.[photoGallery.index]
    if (!slide?.src) return
    try {
      const url = await siteVisitService.getDocumentUrl(slide.src)
      if (url) window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      toastError("Could not open image")
    }
  }

  const capacityLabel =
    resolved?.inquiry_capacity != null && resolved.inquiry_capacity !== ""
      ? `${Number(resolved.inquiry_capacity)} KW`
      : "-"

  const locationLink = mapsUrl(resolved?.site_latitude, resolved?.site_longitude)

  return (
    <>
      <DetailsSidebar open={open} onClose={onClose} title="Site Visit Details">
        {loading && !resolved ? (
          <div className="flex flex-1 justify-center items-center py-12">
            <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-0.5 relative">
            {loading ? (
              <div className="absolute right-0 top-0 z-10">
                <div className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : null}

            <div className="rounded border border-border bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-900/50 dark:to-slate-800/50 p-2.5 border-l-4 border-l-[#00823b] mb-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    Site Visit #{resolved?.id ?? "-"}
                  </p>
                  <p className="text-sm font-semibold text-[#00823b] mt-0.5">
                    {capacityLabel}
                    <span className="text-slate-600 dark:text-slate-400 font-normal ml-1.5">
                      · Inquiry #{resolved?.inquiry_number ?? "-"}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1 shrink-0">
                  {resolved?.visit_status ? (
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${visitStatusBadgeClass(
                        resolved.visit_status
                      )}`}
                    >
                      {String(resolved.visit_status).toUpperCase()}
                    </span>
                  ) : null}
                  {resolved?.inquiry_status ? (
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${inquiryStatusBadgeClass(
                        resolved.inquiry_status
                      )}`}
                    >
                      {resolved.inquiry_status}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <SectionTitle>Visit</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
              <DetailRow label="Visit Date" value={formatDate(resolved?.visit_date) || "-"} />
              <DetailRow label="Schedule On" value={formatDate(resolved?.schedule_on) || "-"} />
              <DetailRow label="Next Reminder" value={formatDate(resolved?.next_reminder_date) || "-"} />
              <DetailRow label="Do Not Send Message" value={formatBool(resolved?.do_not_send_message)} />
              <DetailRow
                label="Visited By"
                value={
                  resolved?.visited_by_name
                    ? `${resolved.visited_by_name}${resolved.visited_by_email ? ` (${resolved.visited_by_email})` : ""}`
                    : safeValue(resolved?.visited_by)
                }
              />
              <DetailRow
                label="Assigned To"
                value={
                  resolved?.assigned_to_name
                    ? `${resolved.assigned_to_name}${resolved.assigned_to_email ? ` (${resolved.assigned_to_email})` : ""}`
                    : safeValue(resolved?.visit_assign_to)
                }
              />
              <DetailRow label="Record Status" value={safeValue(resolved?.status)} />
              <DetailRow label="Created" value={formatDate(resolved?.created_at) || "-"} />
              <div className="sm:col-span-2">
                <DetailRow label="Schedule Remarks" value={safeValue(resolved?.schedule_remarks)} />
              </div>
              <div className="sm:col-span-2">
                <DetailRow label="Remarks" value={safeValue(resolved?.remarks)} />
              </div>
            </div>

            <SectionTitle>Inquiry & Customer</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
              <DetailRow label="Inquiry #" value={safeValue(resolved?.inquiry_number)} />
              <DetailRow label="Inquiry Date" value={formatDate(resolved?.inquiry_date) || "-"} />
              <DetailRow label="Inquiry Status" value={safeValue(resolved?.inquiry_status)} />
              <DetailRow label="Capacity" value={capacityLabel} />
              <DetailRow label="Customer" value={safeValue(resolved?.customer_name)} />
              <DetailRow label="Company" value={safeValue(resolved?.customer_company)} />
              <DetailRow label="Phone" value={safeValue(resolved?.customer_phone)} />
              <DetailRow label="Email" value={safeValue(resolved?.customer_email)} />
              <div className="sm:col-span-2">
                <DetailRow label="Address" value={safeValue(resolved?.customer_address)} />
              </div>
            </div>

            <SectionTitle>Site Technical</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
              <DetailRow label="Roof Type" value={safeValue(resolved?.roof_type)} />
              <DetailRow label="Parapet Height" value={safeValue(resolved?.height_of_parapet)} />
              <DetailRow label="Panel Capacity" value={safeValue(resolved?.solar_panel_size_capacity)} />
              <DetailRow label="Inverter Capacity" value={safeValue(resolved?.inverter_size_capacity)} />
              <DetailRow
                label="Roof Area (sqft)"
                value={
                  resolved?.approx_roof_area_sqft != null && resolved.approx_roof_area_sqft !== ""
                    ? String(resolved.approx_roof_area_sqft)
                    : "-"
                }
              />
              <DetailRow label="Shadow Casting Object" value={formatBool(resolved?.has_shadow_casting_object)} />
              <div className="sm:col-span-2">
                <DetailRow label="Shadow Suggestion" value={safeValue(resolved?.shadow_reduce_suggestion)} />
              </div>
              <div className="sm:col-span-2">
                <DetailRow label="Earthing Cable / Location" value={safeValue(resolved?.earthing_cable_size_location)} />
              </div>
              <DetailRow
                label="Latitude"
                value={
                  resolved?.site_latitude != null && Number(resolved.site_latitude) !== 0
                    ? String(resolved.site_latitude)
                    : "-"
                }
              />
              <DetailRow
                label="Longitude"
                value={
                  resolved?.site_longitude != null && Number(resolved.site_longitude) !== 0
                    ? String(resolved.site_longitude)
                    : "-"
                }
              />
              {locationLink ? (
                <div className="sm:col-span-2 py-0.5">
                  <a
                    href={locationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#00823b] font-medium hover:underline"
                    aria-label="Open location in Google Maps"
                  >
                    Open in Google Maps
                    <IconExternalLink className="size-3.5" />
                  </a>
                </div>
              ) : null}
            </div>

            <SectionTitle>Photos</SectionTitle>
            {slides.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">No photos uploaded</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
                {slides.map((slide) => (
                  <button
                    key={slide.key}
                    type="button"
                    onClick={() => handleOpenGallery(slide.key)}
                    className="group relative text-left rounded border border-border overflow-hidden bg-muted/20 hover:border-[#00823b]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00823b]/40"
                    aria-label={`View ${slide.label}`}
                    tabIndex={0}
                  >
                    <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                      <BucketImage
                        path={slide.src}
                        getUrl={siteVisitService.getDocumentUrl}
                        alt={slide.label}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: 0,
                        }}
                      />
                    </div>
                    <div className="px-1 py-0.5 flex items-center justify-between gap-1">
                      <span className="text-[10px] font-medium text-foreground truncate">{slide.label}</span>
                      <span className="text-[10px] text-[#00823b] font-semibold shrink-0 opacity-80 group-hover:opacity-100">
                        View
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DetailsSidebar>

      <Dialog open={!!photoGallery} onOpenChange={(isOpen) => !isOpen && setPhotoGallery(null)}>
        <DialogContent className="!fixed !inset-0 !left-0 !top-0 !flex !h-[100dvh] !max-h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none border-none bg-black/95 p-0 gap-0 flex-col overflow-hidden text-white ring-0">
          {(() => {
            const slide = photoGallery?.slides?.[photoGallery.index]
            const total = photoGallery?.slides?.length ?? 0
            const idx = photoGallery?.index ?? 0
            const canPrev = total > 0 && idx > 0
            const canNext = total > 0 && idx < total - 1
            return (
              <>
                <DialogHeader className="p-2 sm:p-3 shrink-0 flex-row items-center justify-between gap-2 border-b border-white/10 bg-black/60 space-y-0">
                  <DialogTitle className="text-white text-xs sm:text-sm font-medium pr-2 line-clamp-2">
                    {slide?.label}
                    {total > 0 ? (
                      <span className="text-white/60 font-normal ml-2 whitespace-nowrap">
                        {idx + 1} / {total}
                      </span>
                    ) : null}
                  </DialogTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10 h-7 px-2"
                    onClick={handleOpenFull}
                    aria-label="Open full image"
                  >
                    <IconExternalLink className="size-3.5 mr-1" />
                    Open full
                  </Button>
                </DialogHeader>
                <div className="relative flex-1 min-h-0 w-full flex items-center justify-center px-10 sm:px-14 py-2">
                  {canPrev && (
                    <IconButton
                      type="button"
                      aria-label="Previous photo"
                      onClick={() =>
                        setPhotoGallery((g) => (g && g.index > 0 ? { ...g, index: g.index - 1 } : g))
                      }
                      sx={{
                        position: "absolute",
                        left: 4,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 2,
                        color: "#fff",
                        bgcolor: "rgba(255,255,255,0.12)",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                      }}
                      size="large"
                    >
                      <ChevronLeftIcon sx={{ fontSize: 32 }} />
                    </IconButton>
                  )}
                  {canNext && (
                    <IconButton
                      type="button"
                      aria-label="Next photo"
                      onClick={() =>
                        setPhotoGallery((g) =>
                          g && g.index < g.slides.length - 1 ? { ...g, index: g.index + 1 } : g
                        )
                      }
                      sx={{
                        position: "absolute",
                        right: 4,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 2,
                        color: "#fff",
                        bgcolor: "rgba(255,255,255,0.12)",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                      }}
                      size="large"
                    >
                      <ChevronRightIcon sx={{ fontSize: 32 }} />
                    </IconButton>
                  )}
                  <div className="relative w-full h-full max-h-full flex items-center justify-center">
                    {slide?.src ? (
                      <BucketImage
                        path={slide.src}
                        getUrl={siteVisitService.getDocumentUrl}
                        alt={slide.label}
                        sx={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          width: "auto",
                          height: "auto",
                          objectFit: "contain",
                          borderRadius: 0,
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}
