"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useListReturnNavigation } from "@/hooks/useListReturnNavigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import B2bSalesOrderForm from "../components/B2bSalesOrderForm";
import b2bSalesOrderService from "@/services/b2bSalesOrderService";
import { useB2bSalesOrderLabels } from "@/hooks/useB2bSalesOrderLabels";

function AddB2bSalesOrderContent() {
  const router = useRouter();
  const { goToList } = useListReturnNavigation("/b2b-sales-orders");
  const searchParams = useSearchParams();
  const soLabels = useB2bSalesOrderLabels();
  const quoteId = searchParams.get("fromQuote");
  const salesPlanId = searchParams.get("sales_plan_id");
  const orderType = searchParams.get("order_type");
  const clientId = searchParams.get("client_id");

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      if (quoteId) {
        await b2bSalesOrderService.createB2bSalesOrderFromQuote(quoteId, payload);
        toast.success(soLabels.createdFromQuoteToast);
      } else {
        await b2bSalesOrderService.createB2bSalesOrder(payload);
        toast.success(soLabels.createdToast);
      }
      setTimeout(() => goToList(), 800);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to create order";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isScheduled = String(orderType || "").toUpperCase() === "SCHEDULED" || !!salesPlanId;
  const defaultValues = {};
  if (clientId) defaultValues.client_id = parseInt(clientId, 10);
  if (salesPlanId) defaultValues.sales_plan_id = parseInt(salesPlanId, 10);
  if (isScheduled) defaultValues.order_type = "SCHEDULED";

  return (
    <ProtectedRoute>
      <AddEditPageShell
        title={
          quoteId
            ? "Create Order from Quote"
            : isScheduled
              ? soLabels.addScheduledTitle
              : soLabels.addTitle
        }
        listHref="/b2b-sales-orders"
        listLabel={soLabels.listTitle}
      >
        <B2bSalesOrderForm
          defaultValues={defaultValues}
          fromQuoteId={quoteId ? parseInt(quoteId, 10) : null}
          salesPlanId={salesPlanId ? parseInt(salesPlanId, 10) : null}
          orderType={isScheduled ? "SCHEDULED" : "NORMAL"}
          onSubmit={handleSubmit}
          loading={loading}
          serverError={serverError}
          onClearServerError={() => setServerError(null)}
          onCancel={() =>
            router.push(
              salesPlanId ? `/b2b-sales-planning/${salesPlanId}` : "/b2b-sales-orders"
            )
          }
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}

export default function AddB2bSalesOrderPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[100vh]"><Loader /></div>}>
      <AddB2bSalesOrderContent />
    </Suspense>
  );
}
