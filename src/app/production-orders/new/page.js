"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import ProductionOrderForm from "../components/ProductionOrderForm";
import productionOrderService from "@/services/productionOrderService";
import { getApiErrorMessage } from "@/utils/toast";
import { AP } from "@/utils/assemblyProductionLabels";

function NewProductionOrderContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState(null);

    const handleSubmit = async (payload) => {
        setLoading(true);
        setServerError(null);
        try {
            const response = await productionOrderService.createProductionOrder(payload);
            const created = response?.result || response;
            toast.success(
                `${AP.orders.singular} ${created?.order_no || ""} created as DRAFT. Approve it to start booking.`
            );
            setTimeout(() => router.push("/production-orders"), 800);
        } catch (err) {
            const message = getApiErrorMessage(err, `Failed to create ${AP.orders.singular.toLowerCase()}`);
            setServerError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AddEditPageShell
            title={AP.orders.new}
            listHref="/production-orders"
            listLabel={AP.orders.title}
            className="gap-2"
        >
            <ProductionOrderForm
                onSubmit={handleSubmit}
                loading={loading}
                serverError={serverError}
                onClearServerError={() => setServerError(null)}
                onCancel={() => router.push("/production-orders")}
            />
        </AddEditPageShell>
    );
}

export default function NewProductionOrderPage() {
    return (
        <ProtectedRoute>
            <Suspense
                fallback={
                    <div className="flex min-h-[100vh] items-center justify-center">
                        <Loader />
                    </div>
                }
            >
                <NewProductionOrderContent />
            </Suspense>
        </ProtectedRoute>
    );
}
