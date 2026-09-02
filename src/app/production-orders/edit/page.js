"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import ProductionOrderForm from "../components/ProductionOrderForm";
import productionOrderService from "@/services/productionOrderService";
import { getApiErrorMessage } from "@/utils/toast";

function EditProductionOrderContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [loadingRecord, setLoadingRecord] = useState(true);
    const [serverError, setServerError] = useState(null);
    const [defaultValues, setDefaultValues] = useState({});

    useEffect(() => {
        const id = searchParams.get("id");
        if (!id) {
            setServerError("Production order ID is required");
            setLoadingRecord(false);
            return;
        }
        loadOrder(id);
    }, [searchParams]);

    const loadOrder = async (id) => {
        setLoadingRecord(true);
        setServerError(null);
        try {
            const response = await productionOrderService.getProductionOrderById(id);
            const result = response?.result || response;

            if (!result) {
                setServerError("Production order not found");
                return;
            }
            if (result.status !== "DRAFT") {
                setServerError(`Only DRAFT production orders can be edited. This order is ${result.status}.`);
                return;
            }

            setDefaultValues({
                id: result.id,
                warehouse_id: result.warehouse_id,
                fg_product_id: result.fg_product_id,
                fg_product_name: result.fgProduct?.product_name || "",
                fg_tracking_type: result.fgProduct?.tracking_type || "LOT",
                planned_quantity: result.planned_quantity,
                planned_start_date: result.planned_start_date || "",
                planned_end_date: result.planned_end_date || "",
                priority: result.priority || "NORMAL",
                remarks: result.remarks || "",
            });
        } catch (error) {
            setServerError(getApiErrorMessage(error, "Failed to load production order"));
        } finally {
            setLoadingRecord(false);
        }
    };

    const handleSubmit = async (payload) => {
        setLoading(true);
        setServerError(null);
        try {
            await productionOrderService.updateProductionOrder(searchParams.get("id"), payload);
            toast.success("Production order updated successfully");
            setTimeout(() => router.push("/production-orders"), 800);
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to update production order");
            setServerError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    if (loadingRecord) {
        return (
            <AddEditPageShell
                title="Edit Production Order"
                listHref="/production-orders"
                listLabel="Production Orders"
            >
                <div className="flex min-h-[50vh] items-center justify-center">
                    <Loader />
                </div>
            </AddEditPageShell>
        );
    }

    if (serverError && !defaultValues.id) {
        return (
            <AddEditPageShell
                title="Edit Production Order"
                listHref="/production-orders"
                listLabel="Production Orders"
            >
                <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {serverError}
                </div>
            </AddEditPageShell>
        );
    }

    return (
        <AddEditPageShell
            title="Edit Production Order"
            listHref="/production-orders"
            listLabel="Production Orders"
            className="gap-2"
        >
            <ProductionOrderForm
                defaultValues={defaultValues}
                onSubmit={handleSubmit}
                loading={loading}
                serverError={serverError}
                onClearServerError={() => setServerError(null)}
                onCancel={() => router.push("/production-orders")}
                isEdit
            />
        </AddEditPageShell>
    );
}

export default function EditProductionOrderPage() {
    return (
        <ProtectedRoute>
            <Suspense
                fallback={
                    <div className="flex min-h-[100vh] items-center justify-center">
                        <Loader />
                    </div>
                }
            >
                <EditProductionOrderContent />
            </Suspense>
        </ProtectedRoute>
    );
}
