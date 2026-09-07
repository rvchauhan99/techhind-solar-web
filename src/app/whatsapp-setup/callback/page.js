"use client"

import { useEffect, useRef, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { IconBrandWhatsapp, IconCheck, IconAlertCircle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import * as whatsappSetupService from "@/services/whatsappSetupService"
import { getEffectiveTenantKey } from "@/utils/tenantKey"

const WA_SESSION_KEY = "wa_embedded_signup_session"

function getTenantKeyFromState(stateStr) {
  if (!stateStr) return ""
  try {
    const normalized = stateStr.replace(/-/g, "+").replace(/_/g, "/")
    const padLen = normalized.length % 4
    const padded = padLen ? normalized + "=".repeat(4 - padLen) : normalized
    const decoded = atob(padded)
    const parsed = JSON.parse(decoded)
    return (parsed?.tenant_key && String(parsed.tenant_key).trim()) || ""
  } catch {
    return ""
  }
}

function readSessionAssets() {
  try {
    const raw = sessionStorage.getItem(WA_SESSION_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return {
      waba_id: parsed?.waba_id || parsed?.wabaId || null,
      phone_number_id: parsed?.phone_number_id || parsed?.phone_numberId || null,
    }
  } catch {
    return {}
  }
}

function storeSessionAssets(data) {
  if (!data) return
  const wabaId = data.waba_id || data.wabaId
  const phoneId = data.phone_number_id || data.phone_numberId
  if (!wabaId && !phoneId) return
  try {
    sessionStorage.setItem(
      WA_SESSION_KEY,
      JSON.stringify({
        waba_id: wabaId || null,
        phone_number_id: phoneId || null,
      })
    )
  } catch {
    // ignore quota / private mode
  }
}

function clearSessionAssets() {
  try {
    sessionStorage.removeItem(WA_SESSION_KEY)
  } catch {
    // ignore
  }
}

function OAuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState("loading")
  const [message, setMessage] = useState("")
  const startedRef = useRef(false)

  // Capture Embedded Signup session IDs (Meta postMessage) before/while connecting
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.origin?.endsWith("facebook.com") && !event.origin?.endsWith("facebook.net")) {
        return
      }
      try {
        const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data
        if (payload?.type === "WA_EMBEDDED_SIGNUP" && payload?.data) {
          storeSessionAssets(payload.data)
        }
      } catch {
        // ignore non-JSON messages
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const tenantKeyFromQuery = searchParams.get("tenant_key")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    // Query-param fallbacks if Meta appends asset IDs
    const queryWaba = searchParams.get("waba_id")
    const queryPhone = searchParams.get("phone_number_id")
    if (queryWaba || queryPhone) {
      storeSessionAssets({ waba_id: queryWaba, phone_number_id: queryPhone })
    }

    if (error) {
      setStatus("error")
      setMessage(errorDescription || "WhatsApp authorization was denied.")
      return
    }

    if (!code) {
      setStatus("error")
      setMessage("No authorization code received from Facebook.")
      return
    }

    const tenantKey = (
      tenantKeyFromQuery ||
      getTenantKeyFromState(state) ||
      getEffectiveTenantKey() ||
      ""
    ).trim()

    // Brief wait so late postMessage session events can land in sessionStorage
    const runConnect = async () => {
      await new Promise((r) => setTimeout(r, 400))
      const sessionAssets = readSessionAssets()

      try {
        await whatsappSetupService.connect({
          code,
          ...(tenantKey ? { tenant_key: tenantKey } : {}),
          ...(sessionAssets.waba_id ? { waba_id: sessionAssets.waba_id } : {}),
          ...(sessionAssets.phone_number_id
            ? { phone_number_id: sessionAssets.phone_number_id }
            : {}),
        })
        clearSessionAssets()
        setStatus("success")
        setMessage("WhatsApp Business account connected successfully!")
      } catch (err) {
        const msg = err?.response?.data?.message || err.message || "Connection failed"
        setStatus("error")
        setMessage(msg)
      }
    }

    runConnect()
  }, [searchParams])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366]/10">
          <IconBrandWhatsapp className="h-9 w-9 text-[#25D366]" />
        </div>

        {status === "loading" && (
          <>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full animate-pulse rounded-full bg-[#25D366]" style={{ width: "60%" }} />
            </div>
            <p className="text-sm text-muted-foreground">Connecting your WhatsApp Business account…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <IconCheck className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Connected!</h2>
            <p className="mb-6 text-sm text-muted-foreground">{message}</p>
            <Button className="w-full" onClick={() => router.push("/whatsapp-setup")}>
              Go to WhatsApp Setup
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <IconAlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Connection Failed</h2>
            <p className="mb-6 text-sm text-muted-foreground">{message}</p>
            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={() => router.push("/whatsapp-setup")}>
                Back to WhatsApp Setup
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push("/home")}>
                Go Home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function WhatsAppOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  )
}
