"use client";

import ProtectedRoute from "@/components/common/ProtectedRoute";

export default function CommissionSettlementsIndexPage() {
  return (
    <ProtectedRoute>
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-center text-sm text-muted-foreground">
          Open a Commission item from the sidebar: Unsettled, Pending approval, Settlement report, or Settled
          history.
        </p>
      </div>
    </ProtectedRoute>
  );
}
