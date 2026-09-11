"use client"

import { useState, useEffect, useCallback } from "react"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import ListingPageContainer from "@/components/common/ListingPageContainer"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { IconEye, IconPlayerPlay, IconRefresh } from "@tabler/icons-react"
import { toastSuccess, toastError } from "@/utils/toast"
import {
  AGENT,
  BUCKET_LABELS,
  BUCKET_COLORS,
  WA_STATUS_LABELS,
  WA_STATUS_COLORS,
} from "@/utils/whatsappLabels"
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants"
import * as whatsappSetupService from "@/services/whatsappSetupService"
import * as agentMasterService from "@/services/agentMasterService"
import { useAuth } from "@/hooks/useAuth"
import PaginationControls from "@/components/common/PaginationControls"

const DEFAULT_AGENT_KEY = "whatsapp_payment_followup"

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

const fmtJson = (value) => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

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
    <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
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

function ErrorCell({ log, onView }) {
  const hasDetail = Boolean(log?.notes || log?.error_response)
  if (log?.wa_status !== "failed" || !hasDetail) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <div className="flex max-w-[18rem] items-center gap-1.5">
      <span className="min-w-0 flex-1 truncate text-red-700" title={log.notes || ""}>
        {log.notes || "Failed"}
      </span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-6 shrink-0 px-1.5 text-[11px]"
        onClick={() => onView(log)}
        aria-label="View error details"
        title="View error details"
      >
        <IconEye className="mr-0.5 h-3.5 w-3.5" />
        View
      </Button>
    </div>
  )
}

function ErrorDetailDialog({ log, open, onOpenChange }) {
  if (!log) return null

  const response = log.error_response
  const hasResponse = response != null && (typeof response !== "object" || Object.keys(response).length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_FORM_MEDIUM} showCloseButton>
        <DialogHeader>
          <DialogTitle className="text-base">Error details</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-1 text-xs">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Date</p>
              <p className="font-medium">{fmtDate(log.contacted_at)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Customer</p>
              <p className="truncate font-medium">{log.order?.customer?.name || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Mobile</p>
              <p className="font-medium">{log.order?.customer?.mobile_number || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Order #</p>
              <p className="font-mono font-medium">{log.order?.order_number || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Bucket</p>
              <div className="mt-0.5">
                <BucketBadge bucket={log.bucket} />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</p>
              <div className="mt-0.5">
                <StatusBadge status={log.wa_status} />
              </div>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">WA message ID</p>
              <p className="break-all font-mono text-[11px]">{log.wa_message_id || "—"}</p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Error
            </p>
            <pre className="max-h-40 select-text overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 p-2 text-[11px] text-red-800">
              {log.notes || "—"}
            </pre>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Response
            </p>
            {hasResponse ? (
              <pre className="max-h-56 select-text overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-slate-950 p-2 font-mono text-[11px] text-slate-100">
                {fmtJson(response)}
              </pre>
            ) : (
              <p className="rounded-md border border-dashed border-border bg-muted/20 px-2 py-2 text-muted-foreground">
                Structured response was not stored for this log (recorded before response capture).
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function AgentLogsPage() {
  const { modulePermissions, currentModuleId } = useAuth()
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  }

  const [agents, setAgents] = useState([])
  const [agentKey, setAgentKey] = useState(DEFAULT_AGENT_KEY)
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState(null)
  const [kpisLoading, setKpisLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [bucketFilter, setBucketFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [errorDetailLog, setErrorDetailLog] = useState(null)

  const selectedAgent = agents.find((a) => a.agent_key === agentKey) || null

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await agentMasterService.listAgents()
        const rows = response?.data || []
        if (cancelled) return
        setAgents(rows)
        if (!rows.some((a) => a.agent_key === DEFAULT_AGENT_KEY) && rows[0]?.agent_key) {
          setAgentKey(rows[0].agent_key)
        }
      } catch (err) {
        toastError(err?.response?.data?.message || "Failed to load agents")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const fetchKpis = useCallback(async () => {
    if (!agentKey) return
    setKpisLoading(true)
    try {
      const data = await whatsappSetupService.getAgentKpis({ agent_key: agentKey })
      setKpis(data)
    } catch {
      setKpis(null)
    } finally {
      setKpisLoading(false)
    }
  }, [agentKey])

  const fetchLogs = useCallback(async () => {
    if (!agentKey) return
    setLoading(true)
    try {
      const params = { page, limit, agent_key: agentKey }
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
  }, [page, limit, bucketFilter, statusFilter, agentKey])

  useEffect(() => {
    fetchKpis()
  }, [fetchKpis])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleAgentChange = (value) => {
    setAgentKey(value)
    setPage(1)
    setBucketFilter("")
    setStatusFilter("")
  }

  const handleRunNow = async () => {
    if (!selectedAgent?.id) return
    setRunning(true)
    try {
      const result = await agentMasterService.runAgentNow(selectedAgent.id)
      toastSuccess(`Run complete: ${result?.data?.sent ?? 0} sent, ${result?.data?.failed ?? 0} failed`)
      fetchKpis()
      fetchLogs()
    } catch (err) {
      toastError(err?.response?.data?.message || "Run failed")
    } finally {
      setRunning(false)
    }
  }

  const handleViewError = (log) => {
    setErrorDetailLog(log)
  }

  const emptyMessage = AGENT.logs.empty

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title={AGENT.logs.title}
        subtitle={AGENT.logs.subtitle}
        fullWidth
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                fetchKpis()
                fetchLogs()
              }}
              aria-label="Refresh logs"
            >
              <IconRefresh className="mr-1 h-3.5 w-3.5" /> Refresh
            </Button>
            {currentPerm.can_create && (
              <Button
                size="sm"
                disabled={running || !selectedAgent?.is_enabled}
                onClick={handleRunNow}
                aria-label={`Run ${selectedAgent?.name || "agent"} now`}
              >
                <IconPlayerPlay className="mr-1 h-3.5 w-3.5" />
                {running ? AGENT.logs.running : AGENT.logs.runNow}
              </Button>
            )}
          </div>
        }
      >
        {!kpisLoading && <KpiStrip kpis={kpis} />}

        <div className="mb-2 flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="agent-logs-agent" className="text-xs whitespace-nowrap">
              {AGENT.logs.selectAgent}
            </Label>
            <select
              id="agent-logs-agent"
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={agentKey}
              onChange={(e) => handleAgentChange(e.target.value)}
              aria-label={AGENT.logs.selectAgent}
            >
              {agents.length === 0 && (
                <option value={DEFAULT_AGENT_KEY}>WhatsApp Payment Follow-up</option>
              )}
              {agents.map((agent) => (
                <option key={agent.agent_key} value={agent.agent_key}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={bucketFilter}
            onChange={(e) => {
              setBucketFilter(e.target.value)
              setPage(1)
            }}
            aria-label="Filter by overdue bucket"
          >
            <option value="">All Buckets</option>
            {Object.entries(BUCKET_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            aria-label="Filter by delivery status"
          >
            <option value="">All Statuses</option>
            {Object.entries(WA_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Customer</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Mobile</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Order #</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Outstanding</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">Bucket</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">{AGENT.logs.error}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(log.contacted_at)}</td>
                    <td className="px-3 py-2 max-w-[8.75rem] truncate">
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
                    <td className="px-3 py-2">
                      <ErrorCell log={log} onView={handleViewError} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="mt-2 shrink-0">
            <PaginationControls
              page={Math.max(0, page - 1)}
              rowsPerPage={limit}
              totalCount={total}
              onPageChange={(zeroBased) => setPage(zeroBased + 1)}
              onRowsPerPageChange={(n) => {
                setLimit(n)
                setPage(1)
              }}
            />
          </div>
        )}

        <ErrorDetailDialog
          log={errorDetailLog}
          open={Boolean(errorDetailLog)}
          onOpenChange={(next) => {
            if (!next) setErrorDetailLog(null)
          }}
        />
      </ListingPageContainer>
    </ProtectedRoute>
  )
}
