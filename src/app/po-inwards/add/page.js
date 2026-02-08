"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import POInwardForm from "../components/POInwardForm";
import poInwardService from "@/services/poInwardService";

function AddPOInwardContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);

    try {
      await poInwardService.createPOInward(payload);
      toast.success("PO Inward (Goods Receipt) created successfully");
      setTimeout(() => {
        router.push("/po-inwards");
      }, 1000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to create PO Inward";
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AddEditPageShell title="Add New PO Inward (Goods Receipt)" listHref="/po-inwards" listLabel="PO Inwards">
      <POInwardForm
        defaultValues={{}}
        onSubmit={handleSubmit}
        loading={loading}
        serverError={serverError}
        onClearServerError={() => setServerError(null)}
        onCancel={() => router.push("/po-inwards")}
      />
    </AddEditPageShell>
  );
}

function LoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[100vh]">
      <Loader />
    </div>
  );
}

export default function AddPOInward() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <AddPOInwardContent />
      </Suspense>
    </ProtectedRoute>
  );
}
