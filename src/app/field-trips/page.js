"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import ListingPageContainer from "@/components/common/ListingPageContainer"
import PaginatedTable from "@/components/common/PaginatedTable"
import EmptyState from "@/components/common/EmptyState"
import { Button } from "@/components/ui/button"
import useModulePermission from "@/hooks/useModulePermission"
import { toastError, toastSuccess } from "@/utils/toast"
import fieldTripsService from "@/services/fieldTripsService"

const MODULE_KEY = "field_trips"

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "running", label: "Running" },
  { value: "ended", label: "Ended" },
]

const EXPENSE_OPTIONS = [
  { value: "", label: "All" },
  { value: "none", label: "None" },
  { value: "pending", label: "Pending RM" },
  { value: "rm_approved", label: "RM approved" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

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

function statusBadge(status) {
  const s = status || ""
  const cls =
    s === "running"
      ? "bg-green-100 text-green-800"
      : s === "ended"
        ? "bg-slate-100 text-slate-700"
        : "bg-muted text-muted-foreground"
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${cls}`}>
      {s || "—"}
    </span>
  )
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

export default function FieldTripsPage() {
  const router = useRouter()
  useModulePermission(MODULE_KEY)
  const [filters, setFilters] = useState({ status: "", expense_status: "" })
  const [tableKey, setTableKey] = useState(0)
  const [running, setRunning] = useState([])
  const [exporting, setExporting] = useState(false)
  const [actingId, setActingId] = useState(null)

  const loadRunning = useCallback(async () => {
    try {
      const data = await fieldTripsService.listRunning()
      setRunning(Array.isArray(data?.data) ? data.data : [])
    } catch (err) {
      toastError(err?.message || "Failed to load running trips")
    }
  }, [])

  useEffect(() => {
    loadRunning()
    const t = setInterval(loadRunning, 60000)
    return () => clearInterval(t)
  }, [loadRunning])

  const fetcher = useMemo(
    () =>
      async ({ page, limit, q }) => {
        const payload = await fieldTripsService.listTrips({
          page,
          limit,
          status: filters.status || undefined,
          expense_status: filters.expense_status || undefined,
          search: q || undefined,
        })
        const rows = payload?.data || []
        const meta = payload?.meta || {
          total: rows.length,
          page: 1,
          pages: 1,
          limit: limit || 20,
        }
        return { data: rows, meta }
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, tableKey]
  )

  const refresh = () => setTableKey((k) => k + 1)

  const handleApprove = async (row) => {
    setActingId(row.id)
    try {
      await fieldTripsService.approveExpense(row.id, {})
      toastSuccess("Expense approved")
      refresh()
    } catch (err) {
      toastError(err?.message || "Approve failed")
    } finally {
      setActingId(null)
    }
  }

  const handleReject = async (row) => {
    const note = window.prompt("Reject reason (required)")
    if (note == null) return
    if (!String(note).trim()) {
      toastError("Reject reason is required")
      return
    }
    setActingId(row.id)
    try {
      await fieldTripsService.rejectExpense(row.id, { note: String(note).trim() })
      toastSuccess("Expense rejected")
      refresh()
    } catch (err) {
      toastError(err?.message || "Reject failed")
    } finally {
      setActingId(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await fieldTripsService.exportTrips({
        status: filters.status || undefined,
        expense_status: filters.expense_status || undefined,
      })
      const url = window.URL.createObjectURL(new Blob([blob]))
      const a = document.createElement("a")
      a.href = url
      a.download = "field-trips.xlsx"
      a.click()
      window.URL.revokeObjectURL(url)
      toastSuccess("Export downloaded")
    } catch (err) {
      toastError(err?.message || "Export failed")
    } finally {
      setExporting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        field: "user_name",
        label: "User",
        sortable: false,
        render: (row) => (
          <button
            type="button"
            className="text-left font-medium text-foreground hover:underline"
            onClick={() => router.push(`/field-trips/${row.id}`)}
          >
            {row.user_name || row.user_email || `User #${row.user_id}`}
          </button>
        ),
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => statusBadge(row.status),
      },
      {
        field: "expense_status",
        label: "Expense",
        sortable: false,
        render: (row) => expenseBadge(row.expense_status),
      },
      {
        field: "expense_amount",
        label: "Amount",
        sortable: false,
        render: (row) =>
          row.expense_amount != null ? Number(row.expense_amount).toFixed(2) : "—",
      },
      {
        field: "started_at",
        label: "Started",
        sortable: false,
        render: (row) => fmtDt(row.started_at),
      },
      {
        field: "ended_at",
        label: "Ended",
        sortable: false,
        render: (row) => fmtDt(row.ended_at),
      },
      {
        field: "vehicle_mode",
        label: "Vehicle",
        sortable: false,
        render: (row) => row.vehicle_mode || "—",
      },
      {
        field: "total_km_km",
        label: "GPS km",
        sortable: false,
        render: (row) =>
          row.total_km_km != null ? Number(row.total_km_km).toFixed(2) : "—",
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.can_approve_expense ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                disabled={actingId === row.id}
                onClick={() => handleApprove(row)}
              >
                Approve
              </Button>
            ) : null}
            {row.can_reject_expense ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                disabled={actingId === row.id}
                onClick={() => handleReject(row)}
              >
                Reject
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, actingId]
  )

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Field Trips"
        subtitle="Travel trips with expense claim and RM/HR approval"
        primaryButtonLabel={exporting ? "Exporting…" : "Export"}
        onPrimaryClick={handleExport}
        filterConfig={[
          { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
          {
            key: "expense_status",
            label: "Expense",
            type: "select",
            options: EXPENSE_OPTIONS,
          },
        ]}
        filterValues={filters}
        showFilterLabels
        onFilterChange={(key, value) => {
          setFilters((f) => ({ ...f, [key]: value }))
          setTableKey((k) => k + 1)
        }}
        onClearFilters={() => {
          setFilters({ status: "", expense_status: "" })
          setTableKey((k) => k + 1)
        }}
      >
        {running.length > 0 && (
          <div className="mb-3 rounded border border-green-200 bg-green-50 px-3 py-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-green-800">
              Trips running now ({running.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {running.map((t) => (
                <Link
                  key={t.id}
                  href={`/field-trips/${t.id}`}
                  className="rounded border border-green-300 bg-white px-2 py-1 text-xs text-green-900 hover:bg-green-100"
                >
                  {t.user_name || `User #${t.user_id}`} · since {fmtDt(t.started_at)}
                </Link>
              ))}
            </div>
          </div>
        )}

        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          showSearch={false}
          height="56vh"
          emptyState={
            <EmptyState
              title="No trips"
              description="Trips started from the mobile app appear here."
            />
          }
        />
      </ListingPageContainer>
    </ProtectedRoute>
  )
}
