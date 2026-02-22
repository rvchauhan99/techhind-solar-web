"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import StockAdjustmentForm from "../components/StockAdjustmentForm";
import stockAdjustmentService from "@/services/stockAdjustmentService";

function NewStockAdjustmentContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState(null);

    const handleSubmit = async (payload) => {
        setLoading(true);
        setServerError(null);

        try {
            await stockAdjustmentService.createStockAdjustment(payload);
            toast.success("Stock adjustment created successfully");
            setTimeout(() => {
                router.push("/stock-adjustments");
            }, 1000);
        } catch (err) {
            const errorMessage =
                err.response?.data?.message ||
                err.message ||
                "Failed to create stock adjustment";
            setServerError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AddEditPageShell
            title="New Stock Adjustment"
            listHref="/stock-adjustments"
            listLabel="Stock Adjustments"
            className="gap-2"
        >
            <StockAdjustmentForm
                onSubmit={handleSubmit}
                loading={loading}
                serverError={serverError}
                onClearServerError={() => setServerError(null)}
                onCancel={() => router.back()}
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

export default function NewStockAdjustmentPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
                <NewStockAdjustmentContent />
            </Suspense>
        </ProtectedRoute>
    );
}
