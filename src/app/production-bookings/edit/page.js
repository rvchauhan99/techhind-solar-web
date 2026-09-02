"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AP } from "@/utils/assemblyProductionLabels";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Loader from "@/components/common/Loader";

function EditProductionBookingRedirect() {
    const router = useRouter();

    useEffect(() => {
        toast.error(`${AP.history.singular}s cannot be edited. Cancel and rebook instead.`);
        router.replace("/production-bookings");
    }, [router]);

    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <Loader />
        </div>
    );
}

export default function EditProductionBookingPage() {
    return (
        <ProtectedRoute>
            <Suspense
                fallback={
                    <div className="flex min-h-screen items-center justify-center">
                        <Loader />
                    </div>
                }
            >
                <EditProductionBookingRedirect />
            </Suspense>
        </ProtectedRoute>
    );
}
