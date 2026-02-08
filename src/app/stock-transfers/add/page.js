"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import StockTransferForm from "../components/StockTransferForm";
import stockTransferService from "@/services/stockTransferService";

function AddStockTransferContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);

    try {
      await stockTransferService.createStockTransfer(payload);
      toast.success("Stock transfer created successfully");
      setTimeout(() => {
        router.push("/stock-transfers");
      }, 1000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to create stock transfer";
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AddEditPageShell title="Add New Stock Transfer" listHref="/stock-transfers" listLabel="Stock Transfers">
      <StockTransferForm
        defaultValues={{}}
        onSubmit={handleSubmit}
        loading={loading}
        serverError={serverError}
        onClearServerError={() => setServerError(null)}
        onCancel={() => router.push("/stock-transfers")}
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

export default function AddStockTransfer() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <AddStockTransferContent />
      </Suspense>
    </ProtectedRoute>
  );
}
