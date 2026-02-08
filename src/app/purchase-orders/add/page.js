"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import PurchaseOrderForm from "../components/PurchaseOrderForm";
import purchaseOrderService from "@/services/purchaseOrderService";

function AddPurchaseOrderContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (payload, files) => {
    setLoading(true);
    setServerError(null);

    try {
      await purchaseOrderService.createPurchaseOrder(payload, files);
      toast.success("Purchase Order created successfully");
      setTimeout(() => {
        router.push("/purchase-orders");
      }, 1000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to create Purchase Order";
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AddEditPageShell title="Add New Purchase Order" listHref="/purchase-orders" listLabel="Purchase Orders">
      <PurchaseOrderForm
        defaultValues={{}}
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

export default function AddPurchaseOrder() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <AddPurchaseOrderContent />
      </Suspense>
    </ProtectedRoute>
  );
}
