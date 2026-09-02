"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import ProductionBomForm from "../components/ProductionBomForm";
import productionBomService from "@/services/productionBomService";
import { getApiErrorMessage } from "@/utils/toast";
import { AP } from "@/utils/assemblyProductionLabels";

function NewProductionBomContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState(null);

    const handleSubmit = async (payload) => {
        setLoading(true);
        setServerError(null);
        try {
            await productionBomService.createProductionBom(payload);
            toast.success(`${AP.bom.singular} created as DRAFT. Activate it to use in work orders.`);
            setTimeout(() => router.push("/production-bom"), 800);
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to create production BOM");
            setServerError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AddEditPageShell
            title={AP.bom.new}
            listHref="/production-bom"
            listLabel={AP.bom.title}
            className="gap-2"
        >
            <ProductionBomForm
                onSubmit={handleSubmit}
                loading={loading}
                serverError={serverError}
                onClearServerError={() => setServerError(null)}
                onCancel={() => router.push("/production-bom")}
            />
        </AddEditPageShell>
    );
}

export default function NewProductionBomPage() {
    return (
        <ProtectedRoute>
            <Suspense
                fallback={
                    <div className="flex min-h-[100vh] items-center justify-center">
                        <Loader />
                    </div>
                }
            >
                <NewProductionBomContent />
            </Suspense>
        </ProtectedRoute>
    );
}
