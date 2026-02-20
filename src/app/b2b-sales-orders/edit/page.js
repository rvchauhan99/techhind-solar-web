"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import B2bSalesOrderEditForm from "../components/B2bSalesOrderEditForm";
import b2bSalesOrderService from "@/services/b2bSalesOrderService";

function EditB2bSalesOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [defaultValues, setDefaultValues] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(true);

  useEffect(() => {
    if (!id) {
      router.push("/b2b-sales-orders");
      return;
    }
    b2bSalesOrderService
      .getB2bSalesOrderById(id)
      .then((res) => {
        const r = res?.result ?? res;
        setDefaultValues(r);
      })
      .catch(() => {
        toast.error("Failed to load order");
        router.push("/b2b-sales-orders");
      })
      .finally(() => setLoadingRecord(false));
  }, [id, router]);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      await b2bSalesOrderService.updateB2bSalesOrder(id, payload);
      toast.success("B2B Sales Order updated");
      setTimeout(() => router.push("/b2b-sales-orders"), 800);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update order";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setServerError(null);
    try {
      await b2bSalesOrderService.confirmB2bSalesOrder(id);
      toast.success("Order confirmed");
      setDefaultValues((p) => (p ? { ...p, status: "CONFIRMED" } : null));
      setTimeout(() => router.push("/b2b-sales-orders"), 800);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to confirm order";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingRecord || !defaultValues) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Edit B2B Sales Order" listHref="/b2b-sales-orders" listLabel="B2B Sales Orders">
        <B2bSalesOrderEditForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onConfirm={handleConfirm}
          loading={loading}
          serverError={serverError}
          onClearServerError={() => setServerError(null)}
          onCancel={() => router.push("/b2b-sales-orders")}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}

export default function EditB2bSalesOrderPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[100vh]"><Loader /></div>}>
      <EditB2bSalesOrderContent />
    </Suspense>
  );
}
