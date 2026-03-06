"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getAccessToken } from "@/lib/authStorage";
import Loader from "@/components/common/Loader";

// When the app renders at "/" (e.g. direct load when middleware did not redirect),
// redirect to /home if user has a valid session, else to /auth/login.
export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const hasToken = typeof window !== "undefined" && !!getAccessToken();
    if (user || hasToken) {
      router.replace("/home");
    } else {
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  return null;
}
