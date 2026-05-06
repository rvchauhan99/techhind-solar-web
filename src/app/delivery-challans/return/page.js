"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import challanService from "@/services/challanService";
import DeliveryChallanReturnForm from "../components/DeliveryChallanReturnForm";

function DeliveryChallanReturnContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const challanId = searchParams.get("challan_id");
    const returnToRaw = searchParams.get("returnTo");

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [serverError, setServerError] = useState(null);
    const [challan, setChallan] = useState(null);

    const getSafeReturnPath = (value) => {
        if (!value) return "/delivery-challans";
        const decoded = decodeURIComponent(value);
        if (!decoded.startsWith("/")) return "/delivery-challans";
        if (decoded.startsWith("//")) return "/delivery-challans";
        if (decoded.includes("://")) return "/delivery-challans";
        return decoded;
    };
    const returnPath = getSafeReturnPath(returnToRaw);
    const challanIdNum = Number(challanId);
    const hasValidChallanId = Number.isInteger(challanIdNum) && challanIdNum > 0;

    useEffect(() => {
        const load = async () => {
            if (!challanId) {
                setServerError("challan_id is required in URL");
                setInitialLoading(false);
                return;
            }
            if (!hasValidChallanId) {
                setServerError("Invalid or missing challan id. Use a valid link that includes challan_id.");
                setInitialLoading(false);
                return;
            }
            try {
                setInitialLoading(true);
                const response = await challanService.getChallanById(challanIdNum);
                const result = response?.result ?? response;
                setChallan(result || null);
            } catch (err) {
                setServerError(err?.response?.data?.message || "Failed to load challan");
            } finally {
                setInitialLoading(false);
            }
        };
        load();
    }, [challanId, hasValidChallanId, challanIdNum]);

    const handleSubmit = async (payload) => {
        if (!hasValidChallanId || !challan?.id) {
            setServerError("Unable to submit without a valid challan context.");
            return;
        }
        setLoading(true);
        setServerError(null);
        try {
            const response = await challanService.partialReturnChallan(challanIdNum, payload);
            const result = response?.result ?? response;
            const returnId = result?.challan_return_id;
            const idNote =
                returnId != null && returnId !== ""
                    ? ` Return #${returnId}.`
                    : "";
            toast.success(
                `Return complete. Stock and ledger are updated; no further steps required.${idNote}`
            );
            router.push(returnPath);
            setTimeout(() => router.refresh(), 300);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Failed to create partial return";
            setServerError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Loader />
            </div>
        );
    }

    return (
        <AddEditPageShell
            title="Delivery Challan Return"
            listHref={returnPath}
            listLabel="Delivery Challans"
            className="gap-2"
        >
            <DeliveryChallanReturnForm
                challan={challan}
                loading={loading}
                serverError={serverError}
                onClearServerError={() => setServerError(null)}
                onSubmit={handleSubmit}
                onCancel={() => router.push(returnPath)}
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

export default function DeliveryChallanReturnPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
                <DeliveryChallanReturnContent />
            </Suspense>
        </ProtectedRoute>
    );
}
