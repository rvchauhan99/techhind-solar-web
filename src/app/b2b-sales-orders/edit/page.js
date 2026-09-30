"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useListReturnNavigation } from "@/hooks/useListReturnNavigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import B2bSalesOrderForm from "../components/B2bSalesOrderForm";
import b2bSalesOrderService from "@/services/b2bSalesOrderService";
import { useB2bSalesOrderLabels } from "@/hooks/useB2bSalesOrderLabels";

function EditB2bSalesOrderContent() {
  const router = useRouter();
  const { goToList } = useListReturnNavigation("/b2b-sales-orders");
  const searchParams = useSearchParams();
  const soLabels = useB2bSalesOrderLabels();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [defaultValues, setDefaultValues] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(true);

  useEffect(() => {
    if (!id) {
      goToList();
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
        goToList();
      })
      .finally(() => setLoadingRecord(false));
  }, [id, router]);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      await b2bSalesOrderService.updateB2bSalesOrder(id, payload);
      toast.success(soLabels.updatedToast);
      setTimeout(() => goToList(), 800);
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
      setTimeout(() => goToList(), 800);
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
      <AddEditPageShell title={soLabels.editTitle} listHref="/b2b-sales-orders" listLabel={soLabels.listTitle}>
        <B2bSalesOrderForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          loading={loading}
          serverError={serverError}
          onClearServerError={() => setServerError(null)}
          onCancel={() => goToList()}
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
