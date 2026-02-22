"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import StockAdjustmentForm from "../components/StockAdjustmentForm";
import stockAdjustmentService from "@/services/stockAdjustmentService";

function EditStockAdjustmentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [loadingRecord, setLoadingRecord] = useState(true);
    const [serverError, setServerError] = useState(null);
    const [defaultValues, setDefaultValues] = useState({});

    useEffect(() => {
        const id = searchParams.get("id");
        if (id) {
            loadAdjustment(id);
        } else {
            setServerError("Stock adjustment ID is required");
            setLoadingRecord(false);
        }
    }, [searchParams]);

    const loadAdjustment = async (id) => {
        setLoadingRecord(true);
        setServerError(null);
        try {
            const response = await stockAdjustmentService.getStockAdjustmentById(id);
            const result = response?.result || response;

            if (!result) {
                setServerError("Stock adjustment not found");
                setLoadingRecord(false);
                return;
            }

            if (result.status !== "DRAFT") {
                setServerError("Only DRAFT stock adjustments can be edited");
                setLoadingRecord(false);
                return;
            }

            const transformed = {
                id: result.id,
                adjustment_date: result.adjustment_date || new Date().toISOString().split("T")[0],
                warehouse_id: String(result.warehouse_id || ""),
                adjustment_type: result.adjustment_type || "LOSS",
                remarks: result.remarks || "",
                items:
                    result.items?.map((item) => ({
                        product_id: item.product_id,
                        adjustment_direction: item.adjustment_direction || "OUT",
                        quantity: item.adjustment_quantity ?? item.quantity ?? 0,
                        serials:
                            item.serials?.map((s) =>
                                typeof s === "string"
                                    ? s
                                    : s.stockSerial?.serial_number ?? s.serial_number ?? ""
                            ).filter(Boolean) || [],
                    })) || [],
            };

            setDefaultValues(transformed);
        } catch (error) {
            console.error("Error fetching stock adjustment:", error);
            setServerError("Failed to load stock adjustment");
        } finally {
            setLoadingRecord(false);
        }
    };

    const handleSubmit = async (payload) => {
        setLoading(true);
        setServerError(null);

        try {
            const id = searchParams.get("id");
            await stockAdjustmentService.updateStockAdjustment(id, payload);
            toast.success("Stock adjustment updated successfully");
            setTimeout(() => {
                router.push("/stock-adjustments");
            }, 1000);
        } catch (err) {
            const errorMessage =
                err.response?.data?.message ||
                err.message ||
                "Failed to update stock adjustment";
            setServerError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (loadingRecord) {
        return (
            <AddEditPageShell title="Edit Stock Adjustment" listHref="/stock-adjustments" listLabel="Stock Adjustments">
                <div className="flex justify-center items-center min-h-[50vh]">
                    <Loader />
                </div>
            </AddEditPageShell>
        );
    }

    if (serverError && !defaultValues.id) {
        return (
            <AddEditPageShell title="Edit Stock Adjustment" listHref="/stock-adjustments" listLabel="Stock Adjustments">
                <div role="alert" className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
                    {serverError}
                </div>
            </AddEditPageShell>
        );
    }

    return (
        <AddEditPageShell title="Edit Stock Adjustment" listHref="/stock-adjustments" listLabel="Stock Adjustments">
            <StockAdjustmentForm
                defaultValues={defaultValues}
                onSubmit={handleSubmit}
                loading={loading}
                serverError={serverError}
                onClearServerError={() => setServerError(null)}
                onCancel={() => router.push("/stock-adjustments")}
                isEdit
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

export default function EditStockAdjustmentPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
                <EditStockAdjustmentContent />
            </Suspense>
        </ProtectedRoute>
    );
}
