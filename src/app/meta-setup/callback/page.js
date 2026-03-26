"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { IconBrandFacebook, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/services/apiClient";
import { getEffectiveTenantKey } from "@/utils/tenantKey";

function getTenantKeyFromState(stateStr) {
  if (!stateStr) return "";
  try {
    const normalized = stateStr.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = normalized.length % 4;
    const padded = padLen ? normalized + "=".repeat(4 - padLen) : normalized;
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded);
    return (parsed?.tenant_key && String(parsed.tenant_key).trim()) || "";
  } catch {
    return "";
  }
}

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const tenantKeyFromQuery = searchParams.get("tenant_key");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      setStatus("error");
      setMessage(errorDescription || "Facebook authorization was denied.");
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code received from Facebook.");
      return;
    }

    // The backend handles token exchange — we just need to hit the callback endpoint
    // with the code. The backend already receives this if META_REDIRECT_URI points to
    // the backend. But if REDIRECT_URI points to THIS frontend page, we forward the code.
    const tenantKey = (
      tenantKeyFromQuery ||
      getTenantKeyFromState(state) ||
      getEffectiveTenantKey() ||
      ""
    ).trim();
    const params = new URLSearchParams();
    params.set("code", code);
    if (tenantKey) {
      params.set("tenant_key", tenantKey);
    }

    apiClient
      .get(`/meta/oauth/callback?${params.toString()}`)
      .then((res) => {
        const name = res?.data?.data?.display_name || "Facebook account";
        setStatus("success");
        setMessage(`${name} connected successfully!`);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || err.message || "Connection failed";
        setStatus("error");
        setMessage(msg);
      });
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#1877F2]/10">
          <IconBrandFacebook className="h-9 w-9 text-[#1877F2]" />
        </div>

        {status === "loading" && (
          <>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full animate-pulse rounded-full bg-[#1877F2]" style={{ width: "60%" }} />
            </div>
            <p className="text-sm text-muted-foreground">Connecting your Facebook account…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <IconCheck className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Connected!</h2>
            <p className="mb-6 text-sm text-muted-foreground">{message}</p>
            <Button className="w-full" onClick={() => router.push("/meta-setup")}>
              Go to Meta Lead Ads Setup
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
              <Button className="w-full" onClick={() => router.push("/meta-setup")}>
                Back to Meta Setup
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push("/home")}>
                Go Home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MetaOAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
