"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import OrderForm from "../components/OrderForm";
import orderDocumentsService from "@/services/orderDocumentsService";
import orderService from "@/services/orderService";

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

                // Map documents to the specific keys expected by OrderForm
                const documentMap = {};
                documents.forEach(doc => {
                    if (doc.doc_type) {
                        documentMap[doc.doc_type] = doc.document_path;
                    }
                });

                setOrderData({ ...order, ...documentMap });
                setError(null);
            } catch (err) {
                console.error("Failed to fetch order data:", err);
                setError(err.message || "Failed to load order data");
            } finally {
                setLoading(false);
            }
        };

        fetchOrderData();
    }, [orderId]);

    const handleSubmit = async (formData) => {
        try {
            setSubmitting(true);
            // 1. Separate documents (File objects) from basic order data
            const documentTypes = [
                { key: 'electricity_bill', label: 'Electricity Bill' },
                { key: 'house_tax_bill', label: 'House Tax Bill' },
                { key: 'aadhar_card', label: 'Aadhar Card' },
                { key: 'passport_photo', label: 'Passport Photo' },
                { key: 'pan_card', label: 'PAN Card' },
                { key: 'cancelled_cheque', label: 'Cancelled Cheque' },
                { key: 'customer_sign', label: 'Customer Sign' },
            ];

            const orderUpdates = { ...formData };
            const filesToUpload = [];

            documentTypes.forEach(doc => {
                if (formData[doc.key] instanceof File) {
                    filesToUpload.push({
                        file: formData[doc.key],
                        docType: doc.key,
                        label: doc.label
                    });
                }
                // Remove document keys from the main update payload to avoid sending binary/old paths to updateOrder
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
                }
            }

            router.push("/order");
        } catch (err) {
            console.error("Failed to update order:", err);
            throw err;
        } finally {
            setSubmitting(false);
        }
    };

    const title = orderData?.order_number ? `Edit Order - ${orderData.order_number}` : "Edit Order";

    if (loading) {
        return (
            <AddEditPageShell title="Edit Order" listHref="/order" listLabel="Order">
                <div className="flex justify-center items-center min-h-[60vh]">
                    <Loader />
                </div>
            </AddEditPageShell>
        );
    }

    if (error) {
        return (
            <AddEditPageShell title="Edit Order" listHref="/order" listLabel="Order">
                <div className="p-4 text-destructive text-sm" role="alert">
                    {error}
                </div>
            </AddEditPageShell>
        );
    }

    return (
        <AddEditPageShell title={title} listHref="/order" listLabel="Order">
            <OrderForm
                defaultValues={orderData}
                onSubmit={handleSubmit}
                isEditMode={true}
                loading={submitting}
            />
        </AddEditPageShell>
    );
}
