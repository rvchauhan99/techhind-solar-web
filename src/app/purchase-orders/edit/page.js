"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import PurchaseOrderForm from "../components/PurchaseOrderForm";
import purchaseOrderService from "@/services/purchaseOrderService";

function EditPurchaseOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [serverError, setServerError] = useState(null);
  const [defaultValues, setDefaultValues] = useState({});

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      loadPurchaseOrder(id);
    } else {
      setServerError("Purchase Order ID is required");
      setLoadingRecord(false);
    }
  }, [searchParams]);

  const loadPurchaseOrder = async (id) => {
    setLoadingRecord(true);
    setServerError(null);
    try {
      const response = await purchaseOrderService.getPurchaseOrderById(id);
      const result = response.result || response;
      setDefaultValues(result);
    } catch (error) {
      console.error("Error fetching Purchase Order:", error);
      setServerError("Failed to load Purchase Order");
    } finally {
      setLoadingRecord(false);
    }
  };

  const handleSubmit = async (payload, files) => {
    setLoading(true);
    setServerError(null);

    try {
      const id = searchParams.get("id");
      await purchaseOrderService.updatePurchaseOrder(id, payload, files);
      toast.success("Purchase Order updated successfully");
      setTimeout(() => {
        router.push("/purchase-orders");
      }, 1000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to update Purchase Order";
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingRecord) {
    return (
      <AddEditPageShell title="Edit Purchase Order" listHref="/purchase-orders" listLabel="Purchase Orders">
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader />
        </div>
      </AddEditPageShell>
    );
  }

  if (serverError && !defaultValues.id) {
    return (
      <AddEditPageShell title="Edit Purchase Order" listHref="/purchase-orders" listLabel="Purchase Orders">
        <div role="alert" className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
          {serverError}
        </div>
      </AddEditPageShell>
    );
  }

  return (
    <AddEditPageShell title="Edit Purchase Order" listHref="/purchase-orders" listLabel="Purchase Orders">
      <PurchaseOrderForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        loading={loading}
        serverError={serverError}
        onClearServerError={() => setServerError(null)}
        onCancel={() => router.push("/purchase-orders")}
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

export default function EditPurchaseOrder() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <EditPurchaseOrderContent />
      </Suspense>
    </ProtectedRoute>
  );
}
