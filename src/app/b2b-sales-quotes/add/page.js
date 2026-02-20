"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import B2bSalesQuoteForm from "../components/B2bSalesQuoteForm";
import b2bSalesQuoteService from "@/services/b2bSalesQuoteService";

function AddB2bSalesQuoteContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (payload, files = []) => {
    setLoading(true);
    setServerError(null);
    try {
      await b2bSalesQuoteService.createB2bSalesQuote(payload);
      toast.success("B2B Sales Quote created");
      setTimeout(() => router.push("/b2b-sales-quotes"), 800);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to create quote";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add B2B Sales Quote" listHref="/b2b-sales-quotes" listLabel="B2B Sales Quotes">
        <B2bSalesQuoteForm
          defaultValues={{}}
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

export default function AddB2bSalesQuotePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[100vh]"><Loader /></div>}>
      <AddB2bSalesQuoteContent />
    </Suspense>
  );
}
