"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListView from "./ListView";
import { fetchPendingOrderKycEnabled } from "@/utils/pendingOrderKycConfig";

export default function OrderPage() {
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
    <ProtectedRoute>
      <ListView
        title="Pending Orders"
        defaultStatus="pending"
        exportButtonLabel="Export"
        showHomeButton
        showQueryOrders={kycEnabled}
        onHomeClick={() => router.push("/home")}
      />
    </ProtectedRoute>
  );
}
