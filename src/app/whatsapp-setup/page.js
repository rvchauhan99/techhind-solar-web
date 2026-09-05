"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import ProtectedRoute from "@/components/common/ProtectedRoute"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  IconBrandWhatsapp,
  IconPlugConnected,
  IconPlugConnectedX,
  IconAlertCircle,
  IconCheck,
  IconHome,
  IconInfoCircle,
} from "@tabler/icons-react"
import { toastSuccess, toastError } from "@/utils/toast"
import { WA, BUCKET_LABELS, TEMPLATE_DESCRIPTIONS } from "@/utils/whatsappLabels"
import * as whatsappSetupService from "@/services/whatsappSetupService"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function ConnectionBadge({ connected }) {
  if (connected)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <IconCheck className="h-3 w-3" /> {WA.setup.connected}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
      <IconAlertCircle className="h-3 w-3" /> {WA.setup.notConnected}
    </span>
  )
}

function AddonGateBanner() {
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <p className="font-semibold">WhatsApp Agent add-on not enabled</p>
      <p className="mt-0.5 text-xs">
        Contact techHind to activate the WhatsApp Payment Follow-up Agent for your account.
      </p>
    </div>
  )
}

// ─── Connection Card ──────────────────────────────────────────────────────────

function ConnectionCard({ config, connected, onConnect, onDisconnect, connecting, disconnectDialog, setDisconnectDialog, disconnecting, onDisconnectConfirm }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10">
            <IconBrandWhatsapp className="h-5 w-5 text-[#25D366]" />
          </div>
          <div>
            <p className="font-semibold text-sm">WhatsApp Business Account</p>
            {connected ? (
              <p className="text-xs text-muted-foreground">
                {config?.display_phone_number || "—"} · Connected {fmtDate(config?.connected_at)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No WhatsApp account connected</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionBadge connected={connected} />
          {connected ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDisconnectDialog({ open: true })}
            >
              <IconPlugConnectedX className="mr-1 h-3.5 w-3.5" />
              {WA.setup.disconnect}
            </Button>
          ) : (
            <Button
              size="sm"
              style={{ backgroundColor: "#25D366" }}
              className="text-white hover:opacity-90"
              disabled={connecting}
              onClick={onConnect}
            >
              <IconPlugConnected className="mr-1 h-3.5 w-3.5" />
              {connecting ? "Connecting…" : WA.setup.connect}
            </Button>
          )}
        </div>
      </div>

      {/* Embedded Signup info */}
      {!connected && (
        <div className="mt-3 rounded-lg border border-dashed border-[#25D366]/30 bg-[#25D366]/5 p-3 text-xs text-[#128c5d]">
          <p className="font-medium">How Embedded Signup works</p>
          <ol className="mt-1 space-y-0.5 list-decimal list-inside">
            <li>Click "Connect WhatsApp" — a Meta popup opens</li>
            <li>Log in to your Facebook account &amp; select your WhatsApp Business number</li>
            <li>techHind securely stores your credentials to send follow-up messages</li>
          </ol>
        </div>
      )}

      {/* Disconnect dialog */}
      <AlertDialog
        open={disconnectDialog.open}
        onOpenChange={(open) => !open && setDisconnectDialog({ open: false })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your WhatsApp Business credentials. The agent will stop sending messages.
              Messages already sent will remain in history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={disconnecting}
              onClick={onDisconnectConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Agent Settings ───────────────────────────────────────────────────────────

function AgentSettingsCard({ config, onSaved }) {
  const [agentEnabled, setAgentEnabled] = useState(config?.agent_enabled ?? false)
  const [quietStart, setQuietStart] = useState(config?.quiet_hours_start ?? "21:00")
  const [quietEnd, setQuietEnd] = useState(config?.quiet_hours_end ?? "09:00")
  const [maxPerDay, setMaxPerDay] = useState(config?.max_messages_per_day ?? 50)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setAgentEnabled(config?.agent_enabled ?? false)
    setQuietStart(config?.quiet_hours_start ?? "21:00")
    setQuietEnd(config?.quiet_hours_end ?? "09:00")
    setMaxPerDay(config?.max_messages_per_day ?? 50)
  }, [config])

  const handleSave = async () => {
    setSaving(true)
    try {
      await whatsappSetupService.updateSettings({
        agent_enabled: agentEnabled,
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
        max_messages_per_day: Number(maxPerDay),
      })
      toastSuccess("Agent settings saved")
      onSaved?.()
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold">Agent Settings</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Enable agent */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">Enable Agent</Label>
          <div className="flex items-center gap-2 pt-1">
            <Switch
              checked={agentEnabled}
              onCheckedChange={setAgentEnabled}
              id="agent-enabled-switch"
              aria-label="Enable WhatsApp payment follow-up agent"
            />
            <label htmlFor="agent-enabled-switch" className="text-xs text-muted-foreground cursor-pointer">
              {agentEnabled ? "Active" : "Inactive"}
            </label>
          </div>
        </div>

        {/* Quiet hours */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">Quiet Hours Start</Label>
          <Input
            type="time"
            value={quietStart}
            onChange={(e) => setQuietStart(e.target.value)}
            className="h-8 text-sm"
            aria-label="Quiet hours start time"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">Quiet Hours End</Label>
          <Input
            type="time"
            value={quietEnd}
            onChange={(e) => setQuietEnd(e.target.value)}
            className="h-8 text-sm"
            aria-label="Quiet hours end time"
          />
        </div>

        {/* Max messages */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">Max Messages / Day</Label>
          <Input
            type="number"
            min={1}
            max={500}
            value={maxPerDay}
            onChange={(e) => setMaxPerDay(e.target.value)}
            className="h-8 text-sm"
            aria-label="Maximum WhatsApp messages per day"
          />
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Agent runs daily between 09:00–11:00. Messages outside quiet hours only. Scheduler checks every 60 seconds.
      </p>

      <div className="mt-3 flex justify-end">
        <Button size="sm" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  )
}

// ─── Templates Card ───────────────────────────────────────────────────────────

function TemplatesCard({ templates, loading }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold">Message Templates</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
          <IconInfoCircle className="h-3 w-3" /> Register in Meta Business Manager first
        </span>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading templates…</p>
      ) : templates.length === 0 ? (
        <p className="text-xs text-muted-foreground">No templates found. Run migrations to seed defaults.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="flex items-start justify-between rounded-lg border border-border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium">{tpl.whatsapp_key}</p>
                <p className="text-[11px] text-muted-foreground">
                  {tpl.agent_bucket ? TEMPLATE_DESCRIPTIONS[tpl.agent_bucket] || tpl.agent_bucket : "Manual use only"}
                </p>
              </div>
              <div className="ml-3 shrink-0 flex items-center gap-2">
                {tpl.agent_bucket && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {BUCKET_LABELS[tpl.agent_bucket] || tpl.agent_bucket}
                  </span>
                )}
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    tpl.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {tpl.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 rounded-lg border border-dashed border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
        <p className="font-medium">Meta Business Manager setup required</p>
        <p className="mt-0.5">
          These templates must be registered in Meta Business Manager (Category: UTILITY, Language: en) before the
          agent can send messages. Template names must match exactly.
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WhatsAppSetupPage() {
  const [status, setStatus] = useState(null)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectDialog, setDisconnectDialog] = useState({ open: false })

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const data = await whatsappSetupService.getStatus()
      setStatus(data)
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to load WhatsApp status")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    try {
      const data = await whatsappSetupService.getTemplates()
      setTemplates(Array.isArray(data) ? data : [])
    } catch {
      setTemplates([])
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchTemplates()
  }, [fetchStatus, fetchTemplates])

  const handleConnect = () => {
    const configId = process.env.NEXT_PUBLIC_WA_CONFIG_ID
    if (!configId) {
      toastError("NEXT_PUBLIC_WA_CONFIG_ID is not set. Contact your administrator.")
      return
    }

    if (!window.FB) {
      toastError("Facebook SDK not loaded. Please refresh the page and try again.")
      return
    }

    setConnecting(true)
    window.FB.login(
      async (response) => {
        const code = response?.authResponse?.code
        if (!code) {
          setConnecting(false)
          if (response?.status !== "connected") {
            toastError("WhatsApp signup was cancelled or failed")
          }
          return
        }

        try {
          await whatsappSetupService.connect({ code })
          toastSuccess("WhatsApp connected successfully")
          fetchStatus()
          fetchTemplates()
        } catch (err) {
          toastError(err?.response?.data?.message || "Failed to connect WhatsApp")
        } finally {
          setConnecting(false)
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      }
    )
  }

  const handleDisconnectConfirm = async () => {
    setDisconnecting(true)
    try {
      await whatsappSetupService.disconnect()
      toastSuccess("WhatsApp disconnected")
      setDisconnectDialog({ open: false })
      fetchStatus()
    } catch (err) {
      toastError(err?.response?.data?.message || "Disconnect failed")
    } finally {
      setDisconnecting(false)
    }
  }

  const connected = !!(status?.connected)
  const config = status?.config
  const addonEnabled = !!(status?.addon_enabled)

  return (
    <ProtectedRoute>
      {/* Facebook SDK (Embedded Signup) */}
      <script
        async
        defer
        crossOrigin="anonymous"
        src="https://connect.facebook.net/en_US/sdk.js"
        onLoad={() => {
          window.FB?.init({
            appId: process.env.NEXT_PUBLIC_WA_CONFIG_ID,
            autoLogAppEvents: true,
            xfbml: true,
            version: "v19.0",
          })
        }}
      />

      <div className="flex h-full flex-col overflow-y-auto">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4 shrink-0">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <IconBrandWhatsapp className="h-5 w-5 text-[#25D366]" />
              {WA.setup.title}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Connect your WhatsApp Business number and configure the payment follow-up agent.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground text-sm">
            Loading…
          </div>
        ) : (
          <div className="flex-1 space-y-4 pb-6">
            {/* Pricing gate banner */}
            {!addonEnabled && <AddonGateBanner />}

            {/* Connection card */}
            <ConnectionCard
              config={config}
              connected={connected}
              onConnect={handleConnect}
              onDisconnect={() => setDisconnectDialog({ open: true })}
              connecting={connecting}
              disconnectDialog={disconnectDialog}
              setDisconnectDialog={setDisconnectDialog}
              disconnecting={disconnecting}
              onDisconnectConfirm={handleDisconnectConfirm}
            />

            {/* Agent settings — only show when connected */}
            {connected && addonEnabled && (
              <AgentSettingsCard config={config} onSaved={fetchStatus} />
            )}

            {/* Templates */}
            <TemplatesCard templates={templates} loading={templatesLoading} />
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
