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
      <div className="flex min-h-[60vh] flex-col gap-3 p-4" role="status" aria-label="Loading HRMS">
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-3 w-72 animate-pulse rounded bg-muted/70" />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted/40" />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2 rounded-lg border border-border bg-card p-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  return children;
}
