"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import QuotationForm from "../components/QuotationForm";
import quotationService from "@/services/quotationService";

function AddQuotationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [defaultValue, setDefaultValue] = useState({});

  useEffect(() => {
    const inquiryParam = searchParams.get("inquiry");
    if (inquiryParam) {
      try {
        const datas = JSON.parse(inquiryParam);
        setDefaultValue({
          customer_name: datas.customer_name,
          mobile_number: datas.mobile_number,
          company_name: datas.company_name,
          email: datas.email_id,
          state_id: datas.state_id,
          branch_id: datas.city_id,
          order_type_id: datas.order_type_id,
          inquiry_id: datas.id,
          project_scheme_id: datas.project_scheme_id,
          inquiry_number: datas.inquiry_number,
        });
      } catch (e) {
        console.error("Failed to parse inquiry", e);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      await quotationService.createQuotation(payload);
      router.push("/quotation");
    } catch (err) {
      setServerError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create quotation"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add New Quotation" listHref="/quotation" listLabel="Quotation">
        <QuotationForm
          defaultValues={defaultValue}
          onSubmit={handleSubmit}
          loading={loading}
          serverError={serverError}
          onClearServerError={() => setServerError(null)}
          onCancel={() => router.push("/quotation")}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}

function LoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[100vh]">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function AddQuotation() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <AddQuotationContent />
      </Suspense>
    </ProtectedRoute>
  );
}
