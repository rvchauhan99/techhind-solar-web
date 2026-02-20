"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import B2bSalesQuoteForm from "../components/B2bSalesQuoteForm";
import b2bSalesQuoteService from "@/services/b2bSalesQuoteService";

function EditB2bSalesQuoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [defaultValues, setDefaultValues] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(true);

  useEffect(() => {
    if (!id) {
      router.push("/b2b-sales-quotes");
      return;
    }
    b2bSalesQuoteService
      .getB2bSalesQuoteById(id)
      .then((res) => {
        const r = res?.result ?? res;
        setDefaultValues(r);
      })
      .catch(() => {
        toast.error("Failed to load quote");
        router.push("/b2b-sales-quotes");
      })
      .finally(() => setLoadingRecord(false));
  }, [id, router]);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      await b2bSalesQuoteService.updateB2bSalesQuote(id, payload);
      toast.success("B2B Sales Quote updated");
      setTimeout(() => router.push("/b2b-sales-quotes"), 800);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update quote";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingRecord || !defaultValues) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Edit B2B Sales Quote" listHref="/b2b-sales-quotes" listLabel="B2B Sales Quotes">
        <B2bSalesQuoteForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          loading={loading}
          serverError={serverError}
          onClearServerError={() => setServerError(null)}
          onCancel={() => router.push("/b2b-sales-quotes")}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}

export default function EditB2bSalesQuotePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[100vh]"><Loader /></div>}>
      <EditB2bSalesQuoteContent />
    </Suspense>
  );
}
