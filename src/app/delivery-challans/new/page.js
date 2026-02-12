"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import DeliveryChallanForm from "../components/DeliveryChallanForm";
import challanService from "@/services/challanService";

function NewDeliveryChallanContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderIdParam = searchParams.get("order_id");
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState(null);

    const handleSubmit = async (payload) => {
        setLoading(true);
        setServerError(null);

        try {
            await challanService.createChallan(payload);
            toast.success("Delivery challan created successfully");
            // Navigate to delivery challans list after creation
            setTimeout(() => {
                router.push("/delivery-challans");
            }, 1000);
        } catch (err) {
            const errorMessage =
                err.response?.data?.message ||
                err.message ||
                "Failed to create delivery challan";
            setServerError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AddEditPageShell
            title="New Delivery Challan"
            listHref="/delivery-challans"
            listLabel="Delivery Challans"
            className="gap-2"
        >
            <DeliveryChallanForm
                orderIdParam={orderIdParam}
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

export default function NewDeliveryChallanPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
                <NewDeliveryChallanContent />
            </Suspense>
        </ProtectedRoute>
    );
}
