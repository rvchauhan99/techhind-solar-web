"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import ProductionBookingForm from "../components/ProductionBookingForm";
import productionBookingService from "@/services/productionBookingService";
import { getApiErrorMessage } from "@/utils/toast";

function EditProductionBookingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [loadingRecord, setLoadingRecord] = useState(true);
    const [serverError, setServerError] = useState(null);
    const [defaultValues, setDefaultValues] = useState({});

    useEffect(() => {
        const id = searchParams.get("id");
        if (!id) {
            setServerError("Production booking ID is required");
            setLoadingRecord(false);
            return;
        }
        loadBooking(id);
    }, [searchParams]);

    const loadBooking = async (id) => {
        setLoadingRecord(true);
        setServerError(null);
        try {
            const response = await productionBookingService.getProductionBookingById(id);
            const result = response?.result || response;

            if (!result) {
                setServerError("Production booking not found");
                return;
            }
            if (result.status !== "DRAFT") {
                setServerError(
                    `Only DRAFT bookings can be edited. This booking is ${result.status}; cancel it instead.`
                );
                return;
            }

            setDefaultValues({
                id: result.id,
                production_order_id: result.production_order_id,
                productionOrder: result.productionOrder,
                booking_date: result.booking_date || new Date().toISOString().split("T")[0],
                good_quantity: result.good_quantity ?? 0,
                rejected_quantity: result.rejected_quantity ?? 0,
                rejection_warehouse_id: result.rejection_warehouse_id ?? "",
                rejection_reason: result.rejection_reason || "",
                remarks: result.remarks || "",
            });
        } catch (error) {
            setServerError(getApiErrorMessage(error, "Failed to load production booking"));
        } finally {
            setLoadingRecord(false);
        }
    };

    const handleSubmit = async (payload) => {
        setLoading(true);
        setServerError(null);
        try {
            await productionBookingService.updateProductionBooking(searchParams.get("id"), payload);
            toast.success("Production booking updated successfully");
            setTimeout(() => router.push("/production-bookings"), 800);
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to update production booking");
            setServerError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    if (loadingRecord) {
        return (
            <AddEditPageShell
                title="Edit Production Booking"
                listHref="/production-bookings"
                listLabel="Production Bookings"
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
                title="Edit Production Booking"
                listHref="/production-bookings"
                listLabel="Production Bookings"
            >
                <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {serverError}
                </div>
            </AddEditPageShell>
        );
    }

    return (
        <AddEditPageShell
            title="Edit Production Booking"
            listHref="/production-bookings"
            listLabel="Production Bookings"
            className="gap-2"
        >
            <ProductionBookingForm
                defaultValues={defaultValues}
                onSubmit={handleSubmit}
                loading={loading}
                serverError={serverError}
                onClearServerError={() => setServerError(null)}
                onCancel={() => router.push("/production-bookings")}
                isEdit
            />
        </AddEditPageShell>
    );
}

export default function EditProductionBookingPage() {
    return (
        <ProtectedRoute>
            <Suspense
                fallback={
                    <div className="flex min-h-[100vh] items-center justify-center">
                        <Loader />
                    </div>
                }
            >
                <EditProductionBookingContent />
            </Suspense>
        </ProtectedRoute>
    );
}
