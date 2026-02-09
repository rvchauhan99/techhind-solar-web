"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import StockTransferForm from "../components/StockTransferForm";
import stockTransferService from "@/services/stockTransferService";

function EditStockTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [serverError, setServerError] = useState(null);
  const [defaultValues, setDefaultValues] = useState({});

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      loadStockTransfer(id);
    } else {
      setServerError("Stock Transfer ID is required");
      setLoadingRecord(false);
    }
  }, [searchParams]);

  const loadStockTransfer = async (id) => {
    setLoadingRecord(true);
    setServerError(null);
    try {
      const response = await stockTransferService.getStockTransferById(id);
      const result = response.result || response;

      const transformedData = {
        ...result,
        items:
          result.items?.map((item) => {
            const serials =
              item.serials?.map((s) => ({
                stock_serial_id: s.stockSerial?.id || s.stock_serial_id,
                serial_number: s.stockSerial?.serial_number || s.serial_number,
              })) || [];

            return {
              product_id: item.product_id,
              transfer_quantity: item.transfer_quantity,
              quantity: item.transfer_quantity,
              serials: serials,
            };
          }) || [],
      };

      setDefaultValues(transformedData);
    } catch (error) {
      console.error("Error fetching stock transfer:", error);
      const msg = error?.response?.data?.message || "Failed to load stock transfer";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoadingRecord(false);
    }
  };

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);

    try {
      const id = searchParams.get("id");
      await stockTransferService.updateStockTransfer(id, payload);
      toast.success("Stock transfer updated successfully");
      setTimeout(() => {
        router.push("/stock-transfers");
      }, 1000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to update stock transfer";
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingRecord) {
    return (
      <AddEditPageShell title="Edit Stock Transfer" listHref="/stock-transfers" listLabel="Stock Transfers">
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader />
        </div>
      </AddEditPageShell>
    );
  }

  if (serverError && !defaultValues.id) {
    return (
      <AddEditPageShell title="Edit Stock Transfer" listHref="/stock-transfers" listLabel="Stock Transfers">
        <div role="alert" className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
          {serverError}
        </div>
      </AddEditPageShell>
    );
  }

  return (
    <AddEditPageShell title="Edit Stock Transfer" listHref="/stock-transfers" listLabel="Stock Transfers">
      <StockTransferForm
        defaultValues={defaultValues}
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

export default function EditStockTransfer() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <EditStockTransferContent />
      </Suspense>
    </ProtectedRoute>
  );
}
