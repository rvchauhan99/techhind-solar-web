"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import ProductionBomForm from "../components/ProductionBomForm";
import productionBomService from "@/services/productionBomService";
import { getApiErrorMessage } from "@/utils/toast";
import { AP } from "@/utils/assemblyProductionLabels";

function EditProductionBomContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [loadingRecord, setLoadingRecord] = useState(true);
    const [serverError, setServerError] = useState(null);
    const [defaultValues, setDefaultValues] = useState({});

    useEffect(() => {
        const id = searchParams.get("id");
        if (!id) {
            setServerError(`${AP.bom.singular} ID is required`);
            setLoadingRecord(false);
            return;
        }
        loadBom(id);
    }, [searchParams]);

    const loadBom = async (id) => {
        setLoadingRecord(true);
        setServerError(null);
        try {
            const response = await productionBomService.getProductionBomById(id);
            const result = response?.result || response;

            if (!result) {
                setServerError(`${AP.bom.singular} not found`);
                return;
            }
            if (result.status === "ACTIVE") {
                setServerError(
                    "An ACTIVE BOM cannot be edited. Clone it as a new version from the list instead."
                );
                return;
            }

            setDefaultValues({
                id: result.id,
                bom_name: result.bom_name || "",
                fg_product_id: result.fg_product_id,
                fg_product_name: result.fgProduct?.product_name || "",
                fg_measurement_unit_name: result.measurementUnit?.unit || "",
                output_quantity: result.output_quantity ?? 1,
                effective_from: result.effective_from || "",
                effective_to: result.effective_to || "",
                bom_description: result.bom_description || "",
                components: (result.components || []).map((line) => ({
                    component_product_id: line.component_product_id,
                    product_name: line.product?.product_name || "",
                    tracking_type: line.product?.tracking_type || "LOT",
                    serial_required: !!line.product?.serial_required,
                    measurement_unit_name: line.measurementUnit?.unit || "",
                    quantity_per: Number(line.quantity_per || 0),
                    scrap_percent: Number(line.scrap_percent || 0),
                    std_rate: Number(line.std_rate || 0),
                    is_optional: !!line.is_optional,
                    remarks: line.remarks || "",
                    substitute_product_ids: Array.isArray(line.substitute_product_ids)
                        ? line.substitute_product_ids.map(Number).filter((n) => Number.isFinite(n) && n > 0)
                        : [],
                    substitute_products: Array.isArray(line.substituteProducts)
                        ? line.substituteProducts
                        : [],
                })),
                operations: (result.operations || []).map((line) => ({
                    operation_name: line.operation_name,
                    cost_type: line.cost_type,
                    std_time_minutes: Number(line.std_time_minutes || 0),
                    rate_per_hour: Number(line.rate_per_hour || 0),
                    fixed_cost: Number(line.fixed_cost || 0),
                    remarks: line.remarks || "",
                })),
            });
        } catch (error) {
            setServerError(getApiErrorMessage(error, "Failed to load production BOM"));
        } finally {
            setLoadingRecord(false);
        }
    };

    const handleSubmit = async (payload) => {
        setLoading(true);
        setServerError(null);
        try {
            await productionBomService.updateProductionBom(searchParams.get("id"), payload);
            toast.success(`${AP.bom.singular} updated successfully`);
            setTimeout(() => router.push("/production-bom"), 800);
        } catch (err) {
            const message = getApiErrorMessage(err, "Failed to update production BOM");
            setServerError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    if (loadingRecord) {
        return (
            <AddEditPageShell title={AP.bom.edit} listHref="/production-bom" listLabel={AP.bom.title}>
                <div className="flex min-h-[50vh] items-center justify-center">
                    <Loader />
                </div>
            </AddEditPageShell>
        );
    }

    if (serverError && !defaultValues.id) {
        return (
            <AddEditPageShell title={AP.bom.edit} listHref="/production-bom" listLabel={AP.bom.title}>
                <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {serverError}
                </div>
            </AddEditPageShell>
        );
    }

    return (
        <AddEditPageShell
            title={AP.bom.edit}
            listHref="/production-bom"
            listLabel={AP.bom.title}
            className="gap-2"
        >
            <ProductionBomForm
                defaultValues={defaultValues}
                onSubmit={handleSubmit}
                loading={loading}
                serverError={serverError}
                onClearServerError={() => setServerError(null)}
                onCancel={() => router.push("/production-bom")}
                isEdit
            />
        </AddEditPageShell>
    );
}

export default function EditProductionBomPage() {
    return (
        <ProtectedRoute>
            <Suspense
                fallback={
                    <div className="flex min-h-[100vh] items-center justify-center">
                        <Loader />
                    </div>
                }
            >
                <EditProductionBomContent />
            </Suspense>
        </ProtectedRoute>
    );
}
