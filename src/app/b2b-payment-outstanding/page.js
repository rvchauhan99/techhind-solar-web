"use client";

import ProtectedRoute from "@/components/common/ProtectedRoute";
import { IconCash } from "@tabler/icons-react";
import B2bPaymentOutstandingPanel from "@/app/payment-outstanding/components/B2bPaymentOutstandingPanel";

export default function B2bPaymentOutstandingPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-[1440px] px-3 py-2 space-y-2">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/10 p-1.5 rounded-lg">
              <IconCash size={16} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">
                B2B Payment Outstanding
              </h1>
              <p className="text-[11px] text-slate-500">Orders with balance due</p>
            </div>
          </div>
          <B2bPaymentOutstandingPanel />
        </div>
      </div>
    </ProtectedRoute>
  );
}
