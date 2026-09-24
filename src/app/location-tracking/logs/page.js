"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  IconCalendar,
  IconDownload,
  IconFilter,
  IconMap,
  IconRefresh,
  IconX,
} from "@tabler/icons-react"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import ListingPageContainer from "@/components/common/ListingPageContainer"
import PaginatedTable from "@/components/common/PaginatedTable"
import TrackingLogsFilterPanel from "@/components/common/TrackingLogsFilterPanel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useListingQueryState } from "@/hooks/useListingQueryState"
import { toastError, toastSuccess } from "@/utils/toast"
import locationTrackingService from "@/services/locationTrackingService"
import { openGoogleMapsPoint } from "../utils/googleMapsLinks"

const FILTER_KEYS = [
  "mode",
  "from",
  "to",
  "user_ids",
  "is_mocked",
  "is_within_working_hours",
  "source",
  "min_accuracy_m",
  "max_accuracy_m",
  "event_type",
  "device_id",
]

const toLocalYmd = (d) => {
  const dt = d instanceof Date ? d : new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

const todayIso = () => toLocalYmd(new Date())

const daysAgoIso = (days) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toLocalYmd(d)
}

/** Max API window is 31 days — presets stay within that. */
const DATE_PRESETS = [
  {
    label: "Today",
    fn: () => {
      const d = todayIso()
      return { from: d, to: d }
    },
  },
  {
    label: "Yesterday",
    fn: () => {
      const d = daysAgoIso(1)
      return { from: d, to: d }
    },
  },
  {
    label: "This Week",
    fn: () => {
      const n = new Date()
      const dy = n.getDay()
      const m = new Date(n)
      m.setDate(n.getDate() - (dy === 0 ? 6 : dy - 1))
      return { from: toLocalYmd(m), to: todayIso() }
    },
  },
  {
    label: "Last 7D",
    fn: () => ({ from: daysAgoIso(7), to: todayIso() }),
  },
  {
    label: "Last 14D",
    fn: () => ({ from: daysAgoIso(14), to: todayIso() }),
  },
  {
    label: "Last 30D",
    fn: () => ({ from: daysAgoIso(30), to: todayIso() }),
  },
  {
    label: "This Month",
    fn: () => {
      const n = new Date()
      const start = toLocalYmd(new Date(n.getFullYear(), n.getMonth(), 1))
      const end = todayIso()
      const span =
        (new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000
      if (span > 30) return { from: daysAgoIso(30), to: end }
      return { from: start, to: end }
    },
  },
]

const DEFAULT_DATE_PRESET = "Last 7D"

const PING_QUICK_TABS = [
  {
    value: "all",
    label: "All",
    cls: "text-slate-600 border-slate-200 hover:border-slate-400",
    activeCls: "bg-slate-100 border-slate-400 text-slate-800",
  },
  {
    value: "mocked",
    label: "Mocked",
    cls: "text-amber-700 border-amber-200 hover:border-amber-400",
    activeCls: "bg-amber-50 border-amber-400 text-amber-800",
  },
  {
    value: "outside_hours",
    label: "Outside hours",
    cls: "text-rose-600 border-rose-200 hover:border-rose-400",
    activeCls: "bg-rose-50 border-rose-400 text-rose-700",
  },
  {
    value: "within_hours",
    label: "Within hours",
    cls: "text-emerald-600 border-emerald-200 hover:border-emerald-400",
    activeCls: "bg-emerald-50 border-emerald-400 text-emerald-700",
  },
]

const DUTY_QUICK_TABS = [
  {
    value: "all",
    label: "All",
    cls: "text-slate-600 border-slate-200 hover:border-slate-400",
    activeCls: "bg-slate-100 border-slate-400 text-slate-800",
  },
  {
    value: "duty_session",
    label: "Sessions",
    cls: "text-sky-600 border-sky-200 hover:border-sky-400",
    activeCls: "bg-sky-50 border-sky-400 text-sky-700",
  },
  {
    value: "device_event",
    label: "Device events",
    cls: "text-violet-600 border-violet-200 hover:border-violet-400",
    activeCls: "bg-violet-50 border-violet-400 text-violet-700",
  },
]

function fmtDateTime(v) {
  if (!v) return "—"
  try {
    return new Date(v).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  } catch {
    return "—"
  }
}

function BoolChip({ value, yesLabel = "Yes", noLabel = "No" }) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
        value ? "bg-amber-100 text-amber-900" : "bg-muted text-muted-foreground"
      }`}
    >
      {value ? yesLabel : noLabel}
    </span>
  )
}

function ModeToggle({ mode, onChange }) {
  const options = [
    { key: "pings", label: "GPS Pings" },
    { key: "duty", label: "Duty & Device" },
  ]
  return (
    <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs bg-white">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          aria-label={opt.label}
          className={`px-3 py-1.5 font-semibold transition-colors ${
            mode === opt.key
              ? "bg-[#1b365d] text-white"
              : "text-slate-500 hover:bg-slate-50"
          }`}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function resolvePingQuickTab(filters) {
  if (filters.is_mocked === "true") return "mocked"
  if (filters.is_within_working_hours === "false") return "outside_hours"
  if (filters.is_within_working_hours === "true") return "within_hours"
  return "all"
}

function resolveDutyQuickTab(filters) {
  if (filters.event_type === "duty_session" || filters.event_type === "device_event") {
    return filters.event_type
  }
  return "all"
}

function matchDatePreset(from, to) {
  for (const p of DATE_PRESETS) {
    const dates = p.fn()
    if (dates.from === from && dates.to === to) return p.label
  }
  return null
}

function getFilterChipLabel(key) {
  const labels = {
    from: "From",
    to: "To",
    user_ids: "Users",
    is_mocked: "Mocked",
    is_within_working_hours: "Working hours",
    source: "Source",
    min_accuracy_m: "Min acc",
    max_accuracy_m: "Max acc",
    event_type: "Event type",
    device_id: "Device",
  }
  return labels[key] || key
}

function formatChipValue(key, value, userOptions) {
  if (key === "user_ids") {
    const ids = String(value)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (!ids.length) return ""
    const names = ids.map(
      (id) => userOptions.find((u) => String(u.value) === id)?.label || id
    )
    return names.length > 2
      ? `${names.slice(0, 2).join(", ")} +${names.length - 2}`
      : names.join(", ")
  }
  if (key === "is_mocked") return value === "true" ? "Yes" : "No"
  if (key === "is_within_working_hours") {
    return value === "true" ? "Within" : "Outside"
  }
  if (key === "event_type") {
    if (value === "duty_session") return "Sessions"
    if (value === "device_event") return "Device events"
    return value
  }
  return String(value)
}

function getChips(filters, mode, userOptions) {
  const skip = new Set(["mode"])
  const preset = matchDatePreset(filters.from, filters.to)
  if (preset) {
    skip.add("from")
    skip.add("to")
  }
  return Object.entries(filters || {})
    .filter(([k, v]) => {
      if (skip.has(k)) return false
      if (v == null || v === "") return false
      if (k === "event_type" && (v === "all" || mode === "pings")) return false
      if (mode === "pings" && (k === "device_id" || k === "event_type")) return false
      if (
        mode === "duty" &&
        [
          "is_mocked",
          "is_within_working_hours",
          "source",
          "min_accuracy_m",
          "max_accuracy_m",
        ].includes(k)
      ) {
        return false
      }
      return true
    })
    .map(([key, value]) => ({
      key,
      label: getFilterChipLabel(key),
      value: formatChipValue(key, value, userOptions),
    }))
}

function countAdvancedFilters(filters, mode) {
  let n = 0
  if (filters.user_ids) n += 1
  if (mode === "pings") {
    if (filters.source) n += 1
    if (filters.min_accuracy_m || filters.max_accuracy_m) n += 1
    if (filters.is_mocked) n += 1
    if (filters.is_within_working_hours) n += 1
  } else {
    if (filters.event_type && filters.event_type !== "all") n += 1
    if (filters.device_id) n += 1
  }
  return n
}

function LogsContent() {
  const router = useRouter()
  const listingState = useListingQueryState({
    defaultLimit: 50,
    filterKeys: FILTER_KEYS,
  })
  const {
    page,
    limit,
    q,
    sortBy,
    sortOrder,
    filters,
    setPage,
    setLimit,
    setQ,
    setSort,
    setFilters,
  } = listingState

  const mode = filters.mode === "duty" ? "duty" : "pings"
  const from = filters.from || daysAgoIso(7)
  const to = filters.to || todayIso()

  const [userOptions, setUserOptions] = useState([])
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [tableKey, setTableKey] = useState(0)
  const [selectedIds, setSelectedIds] = useState([])
  const [activePreset, setActivePreset] = useState(
    () =>
      matchDatePreset(filters.from || daysAgoIso(7), filters.to || todayIso()) ||
      DEFAULT_DATE_PRESET
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await locationTrackingService.getLiveLocations()
        if (cancelled) return
        setUserOptions(
          (Array.isArray(data?.users) ? data.users : []).map((u) => ({
            value: String(u.user_id),
            label: u.name || u.email || String(u.user_id),
          }))
        )
      } catch {
        // optional filter source
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setActivePreset(matchDatePreset(from, to))
  }, [from, to])

  const pingQuickTab = resolvePingQuickTab(filters)
  const dutyQuickTab = resolveDutyQuickTab(filters)
  const chips = useMemo(
    () => getChips({ ...filters, from, to }, mode, userOptions),
    [filters, from, to, mode, userOptions]
  )
  const advancedCount = useMemo(
    () => countAdvancedFilters(filters, mode),
    [filters, mode]
  )

  const bumpTable = () => {
    setSelectedIds([])
    setTableKey((k) => k + 1)
  }

  const handleModeChange = (nextMode) => {
    setFilters(
      {
        ...filters,
        mode: nextMode === "duty" ? "duty" : "pings",
        is_mocked: "",
        is_within_working_hours: "",
        source: "",
        min_accuracy_m: "",
        max_accuracy_m: "",
        event_type: "all",
        device_id: "",
      },
      true
    )
    bumpTable()
  }

  const handlePreset = (preset) => {
    const dates = preset.fn()
    setFilters({ ...filters, mode, from: dates.from, to: dates.to }, true)
    setActivePreset(preset.label)
    bumpTable()
  }

  const handlePingQuickTab = (value) => {
    const next = {
      ...filters,
      mode: "pings",
      is_mocked: "",
      is_within_working_hours: "",
    }
    if (value === "mocked") next.is_mocked = "true"
    if (value === "outside_hours") next.is_within_working_hours = "false"
    if (value === "within_hours") next.is_within_working_hours = "true"
    setFilters(next, true)
    bumpTable()
  }

  const handleDutyQuickTab = (value) => {
    setFilters(
      {
        ...filters,
        mode: "duty",
        event_type: value === "all" ? "all" : value,
      },
      true
    )
    bumpTable()
  }

  const handleAdvancedApply = (next) => {
    setFilters(
      {
        ...filters,
        mode,
        from: next.from || daysAgoIso(7),
        to: next.to || todayIso(),
        user_ids: next.user_ids || "",
        is_mocked: next.is_mocked || "",
        is_within_working_hours: next.is_within_working_hours || "",
        source: next.source || "",
        min_accuracy_m: next.min_accuracy_m || "",
        max_accuracy_m: next.max_accuracy_m || "",
        event_type: next.event_type || "all",
        device_id: next.device_id || "",
      },
      true
    )
    setActivePreset(matchDatePreset(next.from, next.to))
    setFilterPanelOpen(false)
    bumpTable()
  }

  const clearFilters = () => {
    const dates = DATE_PRESETS.find((p) => p.label === DEFAULT_DATE_PRESET).fn()
    const next = {
      mode,
      from: dates.from,
      to: dates.to,
      user_ids: "",
      is_mocked: "",
      is_within_working_hours: "",
      source: "",
      min_accuracy_m: "",
      max_accuracy_m: "",
      event_type: "all",
      device_id: "",
    }
    setFilters(next, true)
    setActivePreset(DEFAULT_DATE_PRESET)
    setFilterPanelOpen(false)
    bumpTable()
  }

  const panelValues = useMemo(
    () => ({
      from,
      to,
      user_ids: filters.user_ids || "",
      is_mocked: filters.is_mocked || "",
      is_within_working_hours: filters.is_within_working_hours || "",
      source: filters.source || "",
      min_accuracy_m: filters.min_accuracy_m || "",
      max_accuracy_m: filters.max_accuracy_m || "",
      event_type: filters.event_type || "all",
      device_id: filters.device_id || "",
    }),
    [from, to, filters]
  )

  const removeChip = (key) => {
    const next = {
      ...filters,
      mode,
      from,
      to,
      [key]: key === "event_type" ? "all" : "",
    }
    if (key === "from" || key === "to") {
      const dates = DATE_PRESETS.find((p) => p.label === DEFAULT_DATE_PRESET).fn()
      next.from = dates.from
      next.to = dates.to
      setActivePreset(DEFAULT_DATE_PRESET)
    }
    setFilters(next, true)
    bumpTable()
  }

  const buildApiParams = useCallback(
    (p = {}) => {
      const params = {
        from,
        to,
        q: p.q ?? q,
        page: p.page ?? page,
        limit: p.limit ?? limit,
        sort_by: p.sortBy || sortBy || (mode === "pings" ? "recorded_at" : "event_at"),
        sort_dir: p.sortOrder || sortOrder || "desc",
        user_ids: filters.user_ids || undefined,
      }
      if (mode === "pings") {
        if (filters.is_mocked) params.is_mocked = filters.is_mocked
        if (filters.is_within_working_hours) {
          params.is_within_working_hours = filters.is_within_working_hours
        }
        if (filters.source) params.source = filters.source
        if (filters.min_accuracy_m) params.min_accuracy_m = filters.min_accuracy_m
        if (filters.max_accuracy_m) params.max_accuracy_m = filters.max_accuracy_m
      } else {
        if (filters.event_type && filters.event_type !== "all") {
          params.event_type = filters.event_type
        }
        if (filters.device_id) params.device_id = filters.device_id
      }
      return params
    },
    [from, to, q, page, limit, sortBy, sortOrder, filters, mode]
  )

  const fetcher = useCallback(
    async (p) => {
      const params = buildApiParams(p)
      const result =
        mode === "duty"
          ? await locationTrackingService.getDutyEventLogs(params)
          : await locationTrackingService.getPingLogs(params)
      return {
        data: Array.isArray(result?.rows) ? result.rows : [],
        meta: {
          total: result?.meta?.total || 0,
          page: result?.meta?.page || params.page || 1,
          pages: result?.meta?.totalPages || 0,
          limit: result?.meta?.limit || params.limit || 50,
        },
      }
    },
    [buildApiParams, mode, tableKey]
  )

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = buildApiParams({ page: 1, limit: 10000 })
      const blob =
        mode === "duty"
          ? await locationTrackingService.exportDutyEventLogs(params)
          : await locationTrackingService.exportPingLogs(params)
      downloadBlob(
        blob,
        mode === "duty"
          ? `tracking-duty-logs-${from}-to-${to}.csv`
          : `tracking-ping-logs-${from}-to-${to}.csv`
      )
      toastSuccess("Export downloaded")
    } catch (err) {
      toastError(err?.response?.data?.message || err.message || "Export failed")
    } finally {
      setExporting(false)
    }
  }

  const buildMapQuery = (extra = {}) => {
    const qs = new URLSearchParams()
    qs.set("from", from)
    qs.set("to", to)
    if (filters.user_ids) qs.set("user_ids", filters.user_ids)
    if (filters.is_mocked) qs.set("is_mocked", filters.is_mocked)
    if (filters.is_within_working_hours) {
      qs.set("is_within_working_hours", filters.is_within_working_hours)
    }
    if (filters.source) qs.set("source", filters.source)
    if (filters.min_accuracy_m) qs.set("min_accuracy_m", filters.min_accuracy_m)
    if (filters.max_accuracy_m) qs.set("max_accuracy_m", filters.max_accuracy_m)
    Object.entries(extra).forEach(([k, v]) => {
      if (v != null && v !== "") qs.set(k, String(v))
    })
    return qs.toString()
  }

  const openMapForFilters = () => {
    router.push(`/location-tracking/logs/map?${buildMapQuery()}`)
  }

  const openMapForRow = (row) => {
    if (mode === "pings") {
      const day = row.recorded_at ? String(row.recorded_at).slice(0, 10) : to
      router.push(
        `/location-tracking/logs/map?${buildMapQuery({
          user_id: row.user_id,
          date: day,
          ids: row.id,
        })}`
      )
      return
    }
    const lat = row.start_latitude ?? row.end_latitude
    const lng = row.start_longitude ?? row.end_longitude
    if (lat != null && lng != null) {
      openGoogleMapsPoint(lat, lng)
      return
    }
    toastError("No coordinates on this event")
  }

  const openMapForSelection = () => {
    if (!selectedIds.length) {
      toastError("Select one or more ping rows first")
      return
    }
    router.push(`/location-tracking/logs/map?${buildMapQuery({ ids: selectedIds.join(",") })}`)
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const pingColumns = useMemo(
    () => [
      {
        field: "_select",
        label: "",
        sortable: false,
        width: 36,
        render: (row) => (
          <input
            type="checkbox"
            aria-label={`Select ping ${row.id}`}
            checked={selectedIds.includes(row.id)}
            onChange={() => toggleSelect(row.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5"
          />
        ),
      },
      {
        field: "recorded_at",
        label: "Recorded",
        sortable: true,
        render: (row) => (
          <span className="tabular-nums whitespace-nowrap">{fmtDateTime(row.recorded_at)}</span>
        ),
      },
      {
        field: "user_name",
        label: "User",
        sortable: true,
        render: (row) => (
          <div className="min-w-0">
            <div className="font-medium truncate">{row.user_name || "—"}</div>
            <div className="text-[10px] text-muted-foreground truncate">{row.role_name || ""}</div>
          </div>
        ),
      },
      {
        field: "coords",
        label: "Lat / Lng",
        sortable: false,
        render: (row) => (
          <button
            type="button"
            className="text-left tabular-nums text-[#1b365d] underline-offset-2 hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              openGoogleMapsPoint(row.latitude, row.longitude)
            }}
          >
            {Number(row.latitude).toFixed(5)}, {Number(row.longitude).toFixed(5)}
          </button>
        ),
      },
      {
        field: "accuracy_m",
        label: "Acc (m)",
        sortable: true,
        render: (row) => (
          <span className="tabular-nums">
            {row.accuracy_m != null ? row.accuracy_m.toFixed(0) : "—"}
          </span>
        ),
      },
      {
        field: "battery_pct",
        label: "Batt",
        sortable: true,
        render: (row) => (
          <span className="tabular-nums">
            {row.battery_pct != null ? `${row.battery_pct}%` : "—"}
          </span>
        ),
      },
      {
        field: "is_mocked",
        label: "Mock",
        sortable: false,
        render: (row) => <BoolChip value={row.is_mocked} yesLabel="Mock" noLabel="OK" />,
      },
      {
        field: "is_within_working_hours",
        label: "Hours",
        sortable: false,
        render: (row) => (
          <BoolChip value={row.is_within_working_hours} yesLabel="In" noLabel="Out" />
        ),
      },
      {
        field: "source",
        label: "Source",
        sortable: false,
        render: (row) => <span className="text-[11px]">{row.source || "—"}</span>,
      },
      {
        field: "actions",
        label: "",
        sortable: false,
        width: 88,
        render: (row) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px]"
            onClick={(e) => {
              e.stopPropagation()
              openMapForRow(row)
            }}
          >
            Map
          </Button>
        ),
      },
    ],
    [selectedIds, mode, from, to, filters]
  )

  const dutyColumns = useMemo(
    () => [
      {
        field: "event_at",
        label: "When",
        sortable: true,
        render: (row) => (
          <span className="tabular-nums whitespace-nowrap">{fmtDateTime(row.event_at)}</span>
        ),
      },
      {
        field: "type",
        label: "Type",
        sortable: false,
        render: (row) => (
          <span
            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
              row.type === "duty_session"
                ? "bg-blue-100 text-blue-900"
                : "bg-violet-100 text-violet-900"
            }`}
          >
            {row.type === "duty_session" ? "Session" : "Device"}
          </span>
        ),
      },
      {
        field: "event",
        label: "Event",
        sortable: false,
        render: (row) => (
          <span className="text-[11px] font-medium">{row.event || row.label || "—"}</span>
        ),
      },
      {
        field: "user_name",
        label: "User",
        sortable: false,
        render: (row) => (
          <div className="min-w-0">
            <div className="font-medium truncate">{row.user_name || "—"}</div>
            <div className="text-[10px] text-muted-foreground truncate">{row.role_name || ""}</div>
          </div>
        ),
      },
      {
        field: "duration_minutes",
        label: "Mins",
        sortable: false,
        render: (row) => (
          <span className="tabular-nums">
            {row.duration_minutes != null ? row.duration_minutes : "—"}
          </span>
        ),
      },
      {
        field: "device_id",
        label: "Device",
        sortable: false,
        render: (row) => (
          <span
            className="text-[10px] font-mono truncate max-w-[120px] block"
            title={row.device_id || ""}
          >
            {row.device_id || "—"}
          </span>
        ),
      },
      {
        field: "coords",
        label: "Start / End",
        sortable: false,
        render: (row) => {
          const hasStart = row.start_latitude != null && row.start_longitude != null
          const hasEnd = row.end_latitude != null && row.end_longitude != null
          if (!hasStart && !hasEnd) return <span className="text-muted-foreground">—</span>
          return (
            <div className="flex flex-col gap-0.5 text-[10px]">
              {hasStart ? (
                <button
                  type="button"
                  className="text-left text-[#1b365d] hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    openGoogleMapsPoint(row.start_latitude, row.start_longitude)
                  }}
                >
                  S {Number(row.start_latitude).toFixed(4)}, {Number(row.start_longitude).toFixed(4)}
                </button>
              ) : null}
              {hasEnd ? (
                <button
                  type="button"
                  className="text-left text-[#1b365d] hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    openGoogleMapsPoint(row.end_latitude, row.end_longitude)
                  }}
                >
                  E {Number(row.end_latitude).toFixed(4)}, {Number(row.end_longitude).toFixed(4)}
                </button>
              ) : null}
            </div>
          )
        },
      },
      {
        field: "actions",
        label: "",
        sortable: false,
        width: 72,
        render: (row) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px]"
            onClick={(e) => {
              e.stopPropagation()
              openMapForRow(row)
            }}
          >
            Maps
          </Button>
        ),
      },
    ],
    [mode, from, to, filters]
  )

  const quickTabs = mode === "pings" ? PING_QUICK_TABS : DUTY_QUICK_TABS
  const activeQuickTab = mode === "pings" ? pingQuickTab : dutyQuickTab

  return (
    <ListingPageContainer
      title="Tracking Logs"
      subtitle="Raw GPS pings and duty / device events. Map opens in a separate page."
      fullWidth
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          <ModeToggle mode={mode} onChange={handleModeChange} />
          {mode === "pings" ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 px-2"
                onClick={openMapForFilters}
              >
                <IconMap size={12} /> Open map
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 px-2"
                onClick={openMapForSelection}
                disabled={!selectedIds.length}
              >
                Map selected ({selectedIds.length})
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 px-2"
            onClick={handleExport}
            disabled={exporting}
          >
            <IconDownload size={12} /> {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <IconCalendar size={11} /> Quick:
          </span>
          {DATE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => handlePreset(p)}
              className={[
                "text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all",
                activePreset === p.label
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white border-slate-200 text-slate-500 hover:border-primary hover:text-primary",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
          {advancedCount > 0 ? (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {advancedCount} active
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={clearFilters}
            className="h-7 text-xs gap-1 px-2"
          >
            <IconRefresh size={11} /> Reset
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setFilterPanelOpen((o) => !o)}
            className="h-7 text-xs gap-1 px-2"
          >
            <IconFilter size={11} /> {filterPanelOpen ? "Hide" : "Filters"}
            {advancedCount > 0 && !filterPanelOpen ? ` (${advancedCount})` : ""}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {quickTabs.map((tab) => {
            const isActive = activeQuickTab === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() =>
                  mode === "pings"
                    ? handlePingQuickTab(tab.value)
                    : handleDutyQuickTab(tab.value)
                }
                className={[
                  "flex items-center gap-1 text-[11px] font-semibold px-3 py-1 rounded-full border transition-all",
                  isActive
                    ? tab.activeCls ||
                      "bg-primary text-primary-foreground border-primary"
                    : `bg-white ${tab.cls}`,
                ].join(" ")}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {chips.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Filters:
            </span>
            {chips.map(({ key, label, value }) => (
              <button
                key={key}
                type="button"
                onClick={() => removeChip(key)}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/8 border border-primary/20 text-primary/80 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
              >
                {label}: <span className="font-semibold">{value}</span>
                <IconX size={9} />
              </button>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      {filterPanelOpen ? (
        <TrackingLogsFilterPanel
          open
          mode={mode}
          values={panelValues}
          userOptions={userOptions}
          onApply={handleAdvancedApply}
          onClear={clearFilters}
        />
      ) : null}

      <PaginatedTable
        key={`${mode}-${tableKey}`}
        columns={mode === "pings" ? pingColumns : dutyColumns}
        fetcher={fetcher}
        page={page}
        limit={limit}
        q={q}
        sortBy={sortBy || (mode === "pings" ? "recorded_at" : "event_at")}
        sortOrder={sortOrder || "desc"}
        onPageChange={(zeroBased) => setPage(zeroBased + 1)}
        onRowsPerPageChange={(l) => setLimit(l)}
        onQChange={setQ}
        onSortChange={(by, order) => setSort(by, order)}
        compactDensity
      />
    </ListingPageContainer>
  )
}

export default function TrackingLogsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
        <LogsContent />
      </Suspense>
    </ProtectedRoute>
  )
}
