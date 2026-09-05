"use client"

import { useState, useEffect, useCallback } from "react"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import { Button } from "@/components/ui/button"
import {
  IconBrandWhatsapp,
  IconPlayerPlay,
  IconRefresh,
} from "@tabler/icons-react"
import { toastSuccess, toastError } from "@/utils/toast"
import { WA, BUCKET_LABELS, BUCKET_COLORS, WA_STATUS_LABELS, WA_STATUS_COLORS } from "@/utils/whatsappLabels"
import * as whatsappSetupService from "@/services/whatsappSetupService"
import { useAuth } from "@/hooks/useAuth"
import PaginationControls from "@/components/common/PaginationControls"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

const fmtCurrency = (v) => {
  if (v == null) return "—"
  return `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────

function KpiStrip({ kpis }) {
  if (!kpis) return null

  const items = [
    { label: "Total Today", value: kpis.total_today ?? 0, color: "text-foreground" },
    { label: "Sent", value: kpis.sent ?? 0, color: "text-blue-600" },
    { label: "Delivered", value: kpis.delivered ?? 0, color: "text-green-600" },
    { label: "Read", value: kpis.read ?? 0, color: "text-emerald-600" },
    { label: "Failed", value: kpis.failed ?? 0, color: "text-red-600" },
    { label: "Pending", value: kpis.pending ?? 0, color: "text-gray-500" },
  ]

  return (
    <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border bg-card px-3 py-2 text-center"
        >
          <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const label = WA_STATUS_LABELS[status] || status || "Pending"
  const color = WA_STATUS_COLORS[status] || WA_STATUS_COLORS.pending
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}>
      {label}
    </span>
  )
}

function BucketBadge({ bucket }) {
  if (!bucket) return <span className="text-xs text-muted-foreground">—</span>
  const color = BUCKET_COLORS[bucket] || "bg-gray-100 text-gray-600"
  const label = BUCKET_LABELS[bucket] || bucket
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}>
      {label}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WhatsAppAgentLogsPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin"

  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState(null)
  const [kpisLoading, setKpisLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [bucketFilter, setBucketFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const fetchKpis = useCallback(async () => {
    setKpisLoading(true)
    try {
      const data = await whatsappSetupService.getAgentKpis()
      setKpis(data)
    } catch {
      setKpis(null)
    } finally {
      setKpisLoading(false)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit }
      if (bucketFilter) params.bucket = bucketFilter
      if (statusFilter) params.wa_status = statusFilter
      const data = await whatsappSetupService.getAgentLogs(params)
      setLogs(Array.isArray(data?.data) ? data.data : [])
      setTotal(data?.total ?? 0)
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to load agent logs")
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [page, limit, bucketFilter, statusFilter])

  useEffect(() => {
    fetchKpis()
  }, [fetchKpis])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleRunNow = async () => {
    setRunning(true)
    try {
      const result = await whatsappSetupService.runNow()
      toastSuccess(`Agent run complete: ${result?.data?.sent ?? 0} sent, ${result?.data?.failed ?? 0} failed`)
      fetchKpis()
      fetchLogs()
    } catch (err) {
      toastError(err?.response?.data?.message || "Run failed")
    } finally {
      setRunning(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <ProtectedRoute>
      <div className="flex h-full flex-col overflow-y-auto">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3 shrink-0">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <IconBrandWhatsapp className="h-5 w-5 text-[#25D366]" />
              {WA.logs.title}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Track every auto-sent payment follow-up message — today&apos;s run, delivery status, bucket breakdown.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { fetchKpis(); fetchLogs() }}>
              <IconRefresh className="mr-1 h-3.5 w-3.5" /> Refresh
            </Button>
            {isSuperAdmin && (
              <Button
                size="sm"
                disabled={running}
                onClick={handleRunNow}
                style={{ backgroundColor: "#25D366" }}
                className="text-white hover:opacity-90"
              >
                <IconPlayerPlay className="mr-1 h-3.5 w-3.5" />
                {running ? WA.logs.running : WA.logs.runNow}
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        {!kpisLoading && <KpiStrip kpis={kpis} />}

        {/* Filters */}
        <div className="mb-3 flex flex-wrap items-center gap-2 shrink-0">
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={bucketFilter}
            onChange={(e) => { setBucketFilter(e.target.value); setPage(1) }}
            aria-label="Filter by overdue bucket"
          >
            <option value="">All Buckets</option>
            {Object.entries(BUCKET_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            aria-label="Filter by delivery status"
          >
            <option value="">All Statuses</option>
            {Object.entries(WA_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-180 text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Mobile</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Order #</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Outstanding</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">Bucket</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No agent-sent messages yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(log.contacted_at)}</td>
                    <td className="px-3 py-2 max-w-35 truncate">
                      {log.order?.customer?.name || "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {log.order?.customer?.mobile_number || "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px]">
                      {log.order?.order_number || "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {fmtCurrency(log.order?.project_cost)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <BucketBadge bucket={log.bucket} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <StatusBadge status={log.wa_status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-3 shrink-0">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
