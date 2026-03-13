"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import PurchaseReturnForm from "../components/PurchaseReturnForm";
import purchaseReturnService from "@/services/purchaseReturnService";

function EditPurchaseReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [serverError, setServerError] = useState(null);
  const [defaultValues, setDefaultValues] = useState({});

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      loadPurchaseReturn(id);
    } else {
      setServerError("Purchase Return ID is required");
      setLoadingRecord(false);
    }
  }, [searchParams]);

  const loadPurchaseReturn = async (id) => {
    setLoadingRecord(true);
    setServerError(null);
    try {
      const response = await purchaseReturnService.getPurchaseReturnById(id);
      const result = response.result || response;
      setDefaultValues(result);
    } catch (error) {
      console.error("Error fetching Purchase Return:", error);
      setServerError("Failed to load Purchase Return");
    } finally {
      setLoadingRecord(false);
    }
  };

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      const id = searchParams.get("id");
      await purchaseReturnService.updatePurchaseReturn(id, payload);
      toast.success("Purchase Return updated successfully");
      setTimeout(() => {
        router.push("/purchase-returns");
      }, 1000);
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update Purchase Return";
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingRecord) {
    return (
      <AddEditPageShell
        title="Edit Purchase Return"
        listHref="/purchase-returns"
        listLabel="Purchase Returns"
      >
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader />
        </div>
      </AddEditPageShell>
    );
  }

  if (serverError && !defaultValues.id) {
    return (
      <AddEditPageShell
        title="Edit Purchase Return"
        listHref="/purchase-returns"
        listLabel="Purchase Returns"
      >
        <div
          role="alert"
          className="rounded-md bg-destructive/10 text-destructive text-sm p-3"
        >
          {serverError}
        </div>
      </AddEditPageShell>
    );
  }

  return (
    <AddEditPageShell
      title="Edit Purchase Return"
      listHref="/purchase-returns"
      listLabel="Purchase Returns"
    >
      <PurchaseReturnForm
        defaultValues={defaultValues}
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

export default function EditPurchaseReturn() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <EditPurchaseReturnContent />
      </Suspense>
    </ProtectedRoute>
  );
}

