"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import ProductionBookingForm from "../components/ProductionBookingForm";
import productionBookingService from "@/services/productionBookingService";
import { getApiErrorMessage } from "@/utils/toast";

function NewProductionBookingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState(null);

    const handleSubmit = async (payload) => {
        setLoading(true);
        setServerError(null);
        try {
            const response = await productionBookingService.createProductionBooking(payload);
            const created = response?.result || response;
            toast.success(
                `Booking ${created?.booking_no || ""} saved as DRAFT. Post it to move stock and the ledger.`
            );
            setTimeout(() => router.push("/production-bookings"), 800);
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to create production booking");
            setServerError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AddEditPageShell
            title="New Production Booking"
            listHref="/production-bookings"
            listLabel="Production Bookings"
            className="gap-2"
        >
            <ProductionBookingForm
                initialOrderId={searchParams.get("production_order_id")}
                onSubmit={handleSubmit}
                loading={loading}
                serverError={serverError}
                onClearServerError={() => setServerError(null)}
                onCancel={() => router.push("/production-bookings")}
            />
        </AddEditPageShell>
    );
}

export default function NewProductionBookingPage() {
    return (
        <ProtectedRoute>
            <Suspense
                fallback={
                    <div className="flex min-h-[100vh] items-center justify-center">
                        <Loader />
                    </div>
                }
            >
                <NewProductionBookingContent />
            </Suspense>
        </ProtectedRoute>
    );
}
