"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import PurchaseReturnForm from "../components/PurchaseReturnForm";
import purchaseReturnService from "@/services/purchaseReturnService";

function AddPurchaseReturnContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      await purchaseReturnService.createPurchaseReturn(payload);
      toast.success("Purchase Return created successfully");
      setTimeout(() => {
        router.push("/purchase-returns");
      }, 1000);
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create Purchase Return";
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AddEditPageShell
      title="Add Purchase Return"
      listHref="/purchase-returns"
      listLabel="Purchase Returns"
    >
      <PurchaseReturnForm
        defaultValues={{}}
        onSubmit={handleSubmit}
        loading={loading}
        serverError={serverError}
        onClearServerError={() => setServerError(null)}
        onCancel={() => router.push("/purchase-returns")}
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

export default function AddPurchaseReturn() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <AddPurchaseReturnContent />
      </Suspense>
    </ProtectedRoute>
  );
}

