"use client"

import { useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { IconPencil, IconPlayerPlay } from "@tabler/icons-react"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import ListingPageContainer from "@/components/common/ListingPageContainer"
import PaginatedTable from "@/components/common/PaginatedTable"
import { useAuth } from "@/hooks/useAuth"
import { DIALOG_FORM_MEDIUM } from "@/utils/formConstants"
import { AGENT } from "@/utils/whatsappLabels"
import * as agentMasterService from "@/services/agentMasterService"

const fmtDateTime = (d) => {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}

const padHour = (h) => String(h ?? 0).padStart(2, "0") + ":00"

export default function AgentMasterPage() {
  const { modulePermissions, currentModuleId } = useAuth()
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  }

  const [tableKey, setTableKey] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runningId, setRunningId] = useState(null)
  const [form, setForm] = useState(null)

  const fetcher = useMemo(
    () => async () => {
      const response = await agentMasterService.listAgents()
      const rows = response?.data || []
      return {
        data: rows,
        meta: { total: rows.length, page: 1, pages: 1, limit: rows.length || 20 },
      }
    },
    [tableKey]
  )

  const handleToggle = async (row) => {
    if (!currentPerm.can_update) return
    try {
      await agentMasterService.toggleAgent(row.id, !row.is_enabled)
      toast.success(row.is_enabled ? "Agent disabled" : "Agent enabled")
      setTableKey((k) => k + 1)
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update agent")
    }
  }

  const handleOpenEdit = (row) => {
    setForm({
      id: row.id,
      name: row.name,
      is_enabled: row.is_enabled,
      run_hour_start: row.run_hour_start,
      run_hour_end: row.run_hour_end,
      timezone: row.timezone || "Asia/Kolkata",
      quiet_hours_start: row.quiet_hours_start,
      quiet_hours_end: row.quiet_hours_end,
      max_messages_per_day: row.max_messages_per_day,
    })
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    try {
      await agentMasterService.updateAgent(form.id, {
        is_enabled: form.is_enabled,
        run_hour_start: parseInt(form.run_hour_start, 10),
        run_hour_end: parseInt(form.run_hour_end, 10),
        timezone: form.timezone,
        quiet_hours_start: form.quiet_hours_start,
        quiet_hours_end: form.quiet_hours_end,
        max_messages_per_day: parseInt(form.max_messages_per_day, 10),
      })
      toast.success("Agent saved")
      setEditOpen(false)
      setTableKey((k) => k + 1)
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleRunNow = async (row) => {
    if (!currentPerm.can_create) return
    setRunningId(row.id)
    try {
      const result = await agentMasterService.runAgentNow(row.id)
      toast.success(
        `Run complete: ${result?.data?.sent ?? 0} sent, ${result?.data?.failed ?? 0} failed`
      )
      setTableKey((k) => k + 1)
    } catch (err) {
      toast.error(err?.response?.data?.message || "Run failed")
    } finally {
      setRunningId(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        field: "name",
        label: "Agent",
        sortable: false,
        render: (row) => (
          <div className="min-w-0 py-0.5">
            <div className="text-xs font-semibold leading-tight">{row.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{row.agent_key}</div>
          </div>
        ),
      },
      {
        field: "channel",
        label: "Channel",
        sortable: false,
        render: (row) => <span className="text-xs capitalize">{row.channel}</span>,
      },
      {
        field: "channel_connected",
        label: "Connection",
        sortable: false,
        render: (row) => {
          if (row.channel !== "whatsapp") return <span className="text-xs">—</span>
          if (!row.addon_enabled) {
            return <span className="text-[11px] text-amber-700">Add-on off</span>
          }
          if (!row.channel_connected) {
            return (
              <Link href="/whatsapp-setup" className="text-[11px] text-blue-700 underline">
                Connect in Setup
              </Link>
            )
          }
          return (
            <span className="text-[11px] text-green-700">
              {row.display_phone_number || "Connected"}
            </span>
          )
        },
      },
      {
        field: "run_window",
        label: "Run window",
        sortable: false,
        render: (row) => (
          <span className="text-xs">
            {padHour(row.run_hour_start)}–{padHour(row.run_hour_end)} {row.timezone}
          </span>
        ),
      },
      {
        field: "quiet",
        label: "Quiet hours",
        sortable: false,
        render: (row) => (
          <span className="text-xs">
            {row.quiet_hours_start}–{row.quiet_hours_end}
          </span>
        ),
      },
      {
        field: "max_messages_per_day",
        label: "Max/day",
        sortable: false,
        render: (row) => <span className="text-xs">{row.max_messages_per_day}</span>,
      },
      {
        field: "last_run_at",
        label: "Last run",
        sortable: false,
        render: (row) => <span className="text-xs">{fmtDateTime(row.last_run_at)}</span>,
      },
      {
        field: "is_enabled",
        label: "Enabled",
        sortable: false,
        render: (row) => (
          <button
            type="button"
            role="switch"
            aria-checked={row.is_enabled}
            aria-label={`Enable ${row.name}`}
            disabled={!currentPerm.can_update}
            onClick={() => handleToggle(row)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              row.is_enabled ? "bg-green-500" : "bg-input"
            } ${currentPerm.can_update ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
                row.is_enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        ),
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        isActionColumn: true,
        render: (row) => (
          <div className="flex gap-1">
            {currentPerm.can_update && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => handleOpenEdit(row)}
                aria-label={`Edit ${row.name}`}
                title={AGENT.master.edit}
              >
                <IconPencil className="size-4" />
              </Button>
            )}
            {currentPerm.can_create && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 px-2 text-xs"
                disabled={
                  runningId === row.id ||
                  !row.is_enabled ||
                  (row.channel === "whatsapp" && !row.channel_connected)
                }
                onClick={() => handleRunNow(row)}
                aria-label={`Run ${row.name} now`}
              >
                <IconPlayerPlay className="size-3.5" />
                {runningId === row.id ? AGENT.master.running : AGENT.master.runNow}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [currentPerm.can_update, currentPerm.can_create, runningId]
  )

  const handleFormChange = useCallback((key, value) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }, [])

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title={AGENT.master.title}
        subtitle={AGENT.master.subtitle}
        fullWidth
      >
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          showSearch={false}
          showPagination={false}
          height="calc(100vh - 160px)"
        />

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className={DIALOG_FORM_MEDIUM} showCloseButton>
            <DialogHeader>
              <DialogTitle className="text-base">Edit {form?.name || "agent"}</DialogTitle>
            </DialogHeader>
            {form && (
              <div className="grid grid-cols-2 gap-3 py-1">
                <div className="col-span-2 flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.is_enabled}
                    aria-label="Enable agent"
                    onClick={() => handleFormChange("is_enabled", !form.is_enabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent ${
                      form.is_enabled ? "bg-green-500" : "bg-input"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
                        form.is_enabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <Label className="text-xs">{form.is_enabled ? "Enabled" : "Disabled"}</Label>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Run start hour (0–23)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={form.run_hour_start}
                    onChange={(e) => handleFormChange("run_hour_start", e.target.value)}
                    className="h-8 text-sm"
                    aria-label="Run window start hour"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Run end hour (0–23)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={form.run_hour_end}
                    onChange={(e) => handleFormChange("run_hour_end", e.target.value)}
                    className="h-8 text-sm"
                    aria-label="Run window end hour"
                  />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <Label className="text-xs">Timezone</Label>
                  <Input
                    value={form.timezone}
                    onChange={(e) => handleFormChange("timezone", e.target.value)}
                    className="h-8 text-sm"
                    aria-label="Agent timezone"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Quiet hours start</Label>
                  <Input
                    type="time"
                    value={form.quiet_hours_start}
                    onChange={(e) => handleFormChange("quiet_hours_start", e.target.value)}
                    className="h-8 text-sm"
                    aria-label="Quiet hours start"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Quiet hours end</Label>
                  <Input
                    type="time"
                    value={form.quiet_hours_end}
                    onChange={(e) => handleFormChange("quiet_hours_end", e.target.value)}
                    className="h-8 text-sm"
                    aria-label="Quiet hours end"
                  />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <Label className="text-xs">Max messages / day</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={form.max_messages_per_day}
                    onChange={(e) => handleFormChange("max_messages_per_day", e.target.value)}
                    className="h-8 text-sm"
                    aria-label="Max messages per day"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ListingPageContainer>
    </ProtectedRoute>
  )
}
