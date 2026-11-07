"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * HRMS shell — deep links are blocked when dual gate is off (profile.hrms_enabled).
 */
export default function HrmsLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (user.hrms_enabled !== true) {
      router.replace("/access-denied");
    }
  }, [user, loading, router]);

  if (loading || !user || user.hrms_enabled !== true) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading HRMS…
      </div>
    );
  }

  return children;
}
