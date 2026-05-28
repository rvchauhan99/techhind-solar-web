"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Loader from "@/components/common/Loader";
import { verifyWarrantyCard } from "@/services/publicWarrantyService";
import { IconCircleCheck, IconCircleX, IconSolarElectricity } from "@tabler/icons-react";

function VerifyWarrantyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t") || searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!token.trim()) {
      setError("Invalid verification link. Scan the QR code on your warranty certificate.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      setResult(null);
      try {
        const res = await verifyWarrantyCard(token);
        if (cancelled) return;
        if (res?.status && res?.result?.verified) {
          setResult(res.result);
        } else {
          setError(res?.message || "Verification failed");
        }
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || err?.data?.message || "Verification failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <div className="mb-4 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <IconSolarElectricity className="size-7" />
        </div>
        <h1 className="text-xl font-bold">Warranty Verification</h1>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <div className="mb-1 flex items-center gap-2 font-medium">
            <IconCircleX className="size-4 shrink-0" />
            Not verified
          </div>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-3 rounded-md border border-green-500/40 bg-green-500/5 px-3 py-3 text-sm">
          <div className="flex items-center gap-2 font-semibold text-green-700 dark:text-green-400">
            <IconCircleCheck className="size-5 shrink-0" />
            {result.message || "Warranty certificate verified"}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            {result.company_name && (
              <>
                <dt className="text-muted-foreground">Company</dt>
                <dd className="font-medium">{result.company_name}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Order No.</dt>
            <dd className="font-medium">{result.order_number || "—"}</dd>
            {result.customer_name && (
              <>
                <dt className="text-muted-foreground">Customer</dt>
                <dd>{result.customer_name}</dd>
              </>
            )}
            {result.capacity && (
              <>
                <dt className="text-muted-foreground">Capacity</dt>
                <dd>{result.capacity}</dd>
              </>
            )}
            {result.order_date && (
              <>
                <dt className="text-muted-foreground">Order Date</dt>
                <dd>{result.order_date}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Warranty Start</dt>
            <dd className="font-semibold text-primary">
              {result.warranty_start_date || result.netmeter_installed_on || "—"}
            </dd>
          </dl>
        </div>
      )}
    </div>
  );
}

export default function VerifyWarrantyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader />
        </div>
      }
    >
      <VerifyWarrantyContent />
    </Suspense>
  );
}
