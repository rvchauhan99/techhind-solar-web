"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { toast } from "sonner";
import InquiryForm from "../components/InquiryForm";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import inquiryService from "@/services/inquiryService";

export default function InquiryEditPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingState />}>
        <InquiryEditContent />
      </Suspense>
    </ProtectedRoute>
  );
}

function InquiryEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await inquiryService.getInquiryById(id);
        const payload = res?.result || res?.data || res || null;
        setFormData(payload || {});
      } catch (e) {
        console.error("Failed to load inquiry", e);
        const message =
          e?.response?.data?.message ||
          e?.message ||
          "Failed to load inquiry";
        toast.error(message);
        setFormData({});
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      const res = await inquiryService.updateInquiry(id, data);
      const message =
        res?.data?.message ||
        res?.message ||
        "Inquiry updated successfully";
      toast.success(message);
      router.push("/inquiry");
    } catch (e) {
      console.error("Failed to update inquiry", e);
      const message =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to update inquiry";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || formData === null) return <LoadingState />;

  return (
    <AddEditPageShell title="Edit Inquiry" listHref="/inquiry" listLabel="Inquiry">
      <InquiryForm
        defaultValues={formData}
        onSubmit={handleSubmit}
        loading={submitting}
      />
    </AddEditPageShell>
  );
}

function LoadingState() {
  return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <Loader />
    </div>
  );
}
