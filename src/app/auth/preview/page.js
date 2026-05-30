"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/services/apiClient";
import { setTokens, setStoredProfile } from "@/lib/authStorage";
import { normalizeEmail } from "@/utils/validators";
import { getEffectiveTenantKey } from "@/utils/tenantKey";
import Loader from "@/components/common/Loader";
import { IconSolarElectricity } from "@tabler/icons-react";

export default function PreviewLoginPage() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const startedRef = useRef(false);
  const [message, setMessage] = useState("Setting up your preview…");

  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user, router]);

  useEffect(() => {
    if (startedRef.current || user) return;
    startedRef.current = true;

    const email = (process.env.NEXT_PUBLIC_PREVIEW_EMAIL || "").trim();
    const password = process.env.NEXT_PUBLIC_PREVIEW_PASSWORD || "";

    if (!email || !password) {
      router.replace("/auth/login");
      return;
    }

    let cancelled = false;

    async function runPreviewLogin() {
      try {
        const loginBody = {
          email: normalizeEmail(email),
          password,
        };
        const effectiveTenantKey = getEffectiveTenantKey();
        if (effectiveTenantKey) {
          loginBody.tenant_key = effectiveTenantKey;
        }

        const loginRes = await apiClient.post("/auth/login", loginBody);

        if (cancelled) return;

        if (loginRes.data?.status === false) {
          router.replace("/auth/login");
          return;
        }

        if (loginRes.data.result?.require_2fa) {
          router.replace("/auth/login");
          return;
        }

        const { accessToken, refreshToken, first_login } = loginRes.data.result || {};

        if (!accessToken || !refreshToken) {
          router.replace("/auth/login");
          return;
        }

        setTokens(accessToken, refreshToken);

        if (first_login === false) {
          router.replace("/auth/login");
          return;
        }

        setMessage("Loading your dashboard…");
        const profileRes = await apiClient.get("/auth/profile");
        if (cancelled) return;

        const profile = profileRes.data?.result;
        if (!profile) {
          router.replace("/auth/login");
          return;
        }

        setUser(profile);
        setStoredProfile(profile);
        router.replace("/home");
      } catch {
        if (!cancelled) {
          router.replace("/auth/login");
        }
      }
    }

    runPreviewLogin();

    return () => {
      cancelled = true;
    };
  }, [router, setUser, user]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
        <IconSolarElectricity className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
        Live Preview
      </h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Loader />
    </div>
  );
}
