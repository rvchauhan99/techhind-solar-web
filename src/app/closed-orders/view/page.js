"use client";

import ConfirmedOrderViewPage from "@/app/confirm-orders/view/page";

// Closed Orders should be view-only. We reuse the existing view page UI but
// enforce read-only at component level in the confirm-order stage components.
export default function ClosedOrderViewPage() {
  return <ConfirmedOrderViewPage />;
}

