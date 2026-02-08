"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import QuotationForm from "../components/QuotationForm";
import quotationService from "@/services/quotationService";

export default function EditQuotation() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingState />}>
        <EditQuotationContent />
      </Suspense>
    </ProtectedRoute>
  );
}

function EditQuotationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [defaultValues, setDefaultValues] = useState({});
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (id) {
      loadQuotation();
    }
  }, [id]);

  const loadQuotation = async () => {
    setLoadingData(true);
    try {
      const response = await quotationService.getQuotationById(id);
      const data = response.result || response.data || response;
      setDefaultValues(data);
    } catch (err) {
      console.error("Failed to load quotation", err);
      setServerError("Failed to load quotation");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      await quotationService.updateQuotation(id, payload);
      router.push("/quotation");
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to update quotation";
      setServerError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <AddEditPageShell title="Edit Quotation" listHref="/quotation" listLabel="Quotation">
        <LoadingState />
      </AddEditPageShell>
    );
  }

  return (
    <AddEditPageShell title="Edit Quotation" listHref="/quotation" listLabel="Quotation">
      <QuotationForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        loading={loading}
        serverError={serverError}
        onClearServerError={() => setServerError(null)}
        onCancel={() => router.push("/quotation")}
      />
    </AddEditPageShell>
  );
}

function LoadingState() {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Loader />
    </div>
  );
}
