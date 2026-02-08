"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import InquiryForm from "../components/InquiryForm";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import inquiryService from "@/services/inquiryService";
import { useAuth } from "@/hooks/useAuth";

export default function InquiryAddPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (data) => {
    try {
      await inquiryService.createInquiry(data);
      router.push("/inquiry");
    } catch (err) {
      console.error("Failed to create inquiry", err);
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
        <InquiryForm defaultValues={defaultValues} onSubmit={handleSubmit} loading={false} />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
