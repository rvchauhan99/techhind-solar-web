"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import InquiryForm from "../components/InquiryForm";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import inquiryService from "@/services/inquiryService";
import { useAuth } from "@/hooks/useAuth";

export default function InquiryAddPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (data) => {
    try {
      setSubmitting(true);
      const res = await inquiryService.createInquiry(data);
      const message =
        res?.data?.message ||
        res?.message ||
        "Inquiry created successfully";
      toast.success(message);
      router.push("/inquiry");
    } catch (err) {
      console.error("Failed to create inquiry", err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create inquiry";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const defaultValues = useMemo(
    () =>
      user?.id
        ? {
            inquiry_by: user.id,
            handled_by: user.id,
          }
        : {},
    [user?.id]
  );

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add New Inquiry" listHref="/inquiry" listLabel="Inquiry">
        <InquiryForm defaultValues={defaultValues} onSubmit={handleSubmit} loading={submitting} />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
