"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListView from "./ListView";
import { fetchPendingOrderKycEnabled } from "@/utils/pendingOrderKycConfig";

function OrderPageInner() {
  const router = useRouter();
  const [kycEnabled, setKycEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPendingOrderKycEnabled().then((enabled) => {
      if (!cancelled) setKycEnabled(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ListView
      title="Pending Orders"
      defaultStatus="pending"
      exportButtonLabel="Export"
      showHomeButton
      showQueryOrders={kycEnabled}
      onHomeClick={() => router.push("/home")}
    />
  );
}

export default function OrderPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="p-4 text-sm text-slate-500">Loading…</div>}>
        <OrderPageInner />
      </Suspense>
    </ProtectedRoute>
  );
}
