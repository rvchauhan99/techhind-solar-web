"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import OrderForm from "../components/OrderForm";
import orderDocumentsService from "@/services/orderDocumentsService";
import orderService from "@/services/orderService";
import { toastSuccess, toastError } from "@/utils/toast";
import { resolveReturnTo } from "@/utils/listNavigation";
import {
    LEGACY_ORDER_FORM_DOCUMENTS,
    useOrderFormDocumentConfig,
    normalizeDocToken,
} from "../components/orderFormDocuments";

export default function EditOrderPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<Loader />}>
                <EditOrderPageContent />
            </Suspense>
        </ProtectedRoute>
    );
}

function EditOrderPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("id");
    const returnPath = resolveReturnTo(searchParams, "/order");
    const { documents: orderFormDocuments, documentKeys } = useOrderFormDocumentConfig();
    const documentKeysSignature = documentKeys.join("|");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [orderData, setOrderData] = useState(null);

    useEffect(() => {
        if (!orderId) {
            setError("Order ID is required");
            setLoading(false);
            return;
        }

        const fetchOrderData = async () => {
            try {
                setLoading(true);
                // Fetch order details and documents in parallel
                const [orderRes, docsRes] = await Promise.all([
                    orderService.getOrderById(orderId),
                    orderDocumentsService.getOrderDocuments({ order_id: orderId, limit: 100 })
                ]);

                const order = orderRes?.result || orderRes;
                const documents = docsRes?.result?.data || docsRes?.data || [];
                const formDocs = orderFormDocuments?.length
                    ? orderFormDocuments
                    : LEGACY_ORDER_FORM_DOCUMENTS;

                // Map documents onto form keys (code/snake key or master label)
                const documentMap = {};
                const documentIds = {};
                documents.forEach((doc) => {
                    if (!doc.doc_type) return;
                    const dtNorm = normalizeDocToken(doc.doc_type);
                    const matched = formDocs.find(
                        (d) =>
                            normalizeDocToken(d.key) === dtNorm ||
                            normalizeDocToken(d.label) === dtNorm
                    );
                    const formKey = matched?.key || doc.doc_type;
                    documentMap[formKey] = doc.document_path;
                    documentIds[formKey] = doc.id;
                });

                if (order?.current_stage_key === "order_completed") {
                    setError("This order is closed and cannot be edited.");
                    setLoading(false);
                    return;
                }

                setOrderData({ ...order, ...documentMap, documentIds });
                setError(null);
            } catch (err) {
                console.error("Failed to fetch order data:", err);
                const msg = err?.response?.data?.message || err?.message || "Failed to load order data";
                setError(msg);
                toastError(msg);
            } finally {
                setLoading(false);
            }
        };

        fetchOrderData();
        // Remap when orderFormDocuments keys settle (legacy → API config)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- orderFormDocuments identity tracked via documentKeysSignature
    }, [orderId, documentKeysSignature]);

    const handleSubmit = async (formData) => {
        try {
            setSubmitting(true);
            const documentTypes = (orderFormDocuments?.length
                ? orderFormDocuments
                : LEGACY_ORDER_FORM_DOCUMENTS
            ).map((d) => ({ key: d.key, label: d.label }));

            const orderUpdates = { ...formData };
            delete orderUpdates.documentIds; // not sent to API
            const filesToUpload = [];
            const plannerOnlyKeys = [
                "bom_snapshot",
                "cost_adjustments",
                "project_price_id",
                "manual_project_cost_override",
                "planned_delivery_date",
                "planned_priority",
                "planned_remarks",
                "planner_completed_at",
                "planned_has_structure",
                "planned_has_solar_panel",
                "planned_has_inverter",
                "planned_has_acdb",
                "planned_has_dcdb",
                "planned_has_earthing_kit",
                "planned_has_cables",
                "planned_warehouse_id",
            ];
            plannerOnlyKeys.forEach((key) => {
                delete orderUpdates[key];
            });

            documentTypes.forEach((doc) => {
                if (formData[doc.key] instanceof File) {
                    filesToUpload.push({
                        file: formData[doc.key],
                        docType: doc.key,
                        label: doc.label,
                    });
                }
                delete orderUpdates[doc.key];
            });

            // 2. Update basic order info
            await orderService.updateOrder(orderId, orderUpdates);

            // 3. Upload new documents if any
            for (const item of filesToUpload) {
                try {
                    const uploadData = new FormData();
                    uploadData.append('document', item.file);
                    uploadData.append('order_id', orderId);
                    uploadData.append('doc_type', item.docType);
                    uploadData.append('remarks', item.label);

                    await orderDocumentsService.createOrderDocument(uploadData);
                } catch (uploadErr) {
                    console.error(`Failed to upload ${item.label}:`, uploadErr);
                    toastError(uploadErr?.response?.data?.message || `Failed to upload ${item.label}`);
                }
            }

            toastSuccess("Order updated successfully");
            router.push(returnPath);
        } catch (err) {
            console.error("Failed to update order:", err);
            toastError(err?.response?.data?.message || err?.message || "Failed to update order");
            throw err;
        } finally {
            setSubmitting(false);
        }
    };

    const title = orderData?.order_number ? `Edit Order - ${orderData.order_number}` : "Edit Order";

    if (loading) {
        return (
            <AddEditPageShell title="Edit Order" listHref={returnPath} listLabel="Order">
                <div className="flex justify-center items-center min-h-[60vh]">
                    <Loader />
                </div>
            </AddEditPageShell>
        );
    }

    if (error) {
        return (
            <AddEditPageShell title="Edit Order" listHref={returnPath} listLabel="Order">
                <div className="p-4 text-destructive text-sm" role="alert">
                    {error}
                </div>
            </AddEditPageShell>
        );
    }

    return (
        <AddEditPageShell title={title} listHref={returnPath} listLabel="Order">
            <OrderForm
                defaultValues={orderData}
                onSubmit={handleSubmit}
                onCancel={() => router.push(returnPath)}
                isEditMode={true}
                loading={submitting}
            />
        </AddEditPageShell>
    );
}
