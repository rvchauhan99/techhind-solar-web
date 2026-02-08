"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, Suspense } from "react";
import { toast } from "sonner";
import OrderForm from "../components/OrderForm";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import quotationService from "@/services/quotationService";
import inquiryService from "@/services/inquiryService";
import { useAuth } from "@/hooks/useAuth";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate, formatCurrency } from "@/utils/dataTableUtils";

export default function AddOrder() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<Loader />}>
                <AddOrderContent />
            </Suspense>
        </ProtectedRoute>
    );
}

function AddOrderContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const inquiryId = searchParams.get("inquiryId");
    const { user } = useAuth();
    const [serverError, setServerError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [quotationData, setQuotationData] = useState(null);
    const [inquiryData, setInquiryData] = useState(null); // New state for inquiryData
    const [fetchingData, setFetchingData] = useState(!!inquiryId); // Initialize based on inquiryId
    const [inquiryNumber, setInquiryNumber] = useState('');
    const [confirmNoApprovedOpen, setConfirmNoApprovedOpen] = useState(false);
    const [fullQuotationDetails, setFullQuotationDetails] = useState(null);
    const [fullQuotationDetailsLoading, setFullQuotationDetailsLoading] = useState(false);

    // Get inquiry ID from URL params
    // Fetch inquiry and quotation data
    useEffect(() => {
        const fetchInquiryAndQuotation = async () => {
            if (!inquiryId) return;

            setFetchingData(true);
            try {
                // Fetch inquiry details
                const inquiryResponse = await inquiryService.getInquiryById(inquiryId);
                const inquiry = inquiryResponse?.result;

                if (inquiry) {
                    setInquiryData(inquiry);
                    setInquiryNumber(inquiry?.inquiry_number);
                    // Fetch quotations for this inquiry
                    const quotationResponse = await quotationService.getQuotations({
                        inquiry_id: inquiryId,
                    });

                    const quotations = quotationResponse?.result?.data || [];

                    if (quotations.length > 0) {
                        // Priority 1: Find quotation with is_approved = true
                        let selectedQuotation = quotations.find(q => q.is_approved === true);

                        // Priority 2: If no approved quotation, get the latest by created_at and show confirmation
                        if (!selectedQuotation) {
                            const sorted = [...quotations].sort((a, b) =>
                                new Date(b.created_at) - new Date(a.created_at)
                            );
                            selectedQuotation = sorted[0];
                            setQuotationData(selectedQuotation);
                            setConfirmNoApprovedOpen(true);
                        } else {
                            setQuotationData(selectedQuotation);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch inquiry/quotation data", err);
                const errorMessage = err.response?.data?.message || err.message || "Failed to load data";
                setServerError(errorMessage);
            } finally {
                setFetchingData(false);
            }
        };

        fetchInquiryAndQuotation();
    }, [inquiryId]);

    // Fetch full quotation details when confirmation dialog is open (non-approved case)
    useEffect(() => {
        if (!confirmNoApprovedOpen || !quotationData?.id) {
            setFullQuotationDetails(null);
            return;
        }
        let cancelled = false;
        setFullQuotationDetailsLoading(true);
        setFullQuotationDetails(null);
        quotationService
            .getQuotationById(quotationData.id)
            .then((response) => {
                if (!cancelled) {
                    setFullQuotationDetails(response?.result ?? response?.data ?? response);
                }
            })
            .catch(() => {
                if (!cancelled) setFullQuotationDetails(null);
            })
            .finally(() => {
                if (!cancelled) setFullQuotationDetailsLoading(false);
            });
        return () => { cancelled = true; };
    }, [confirmNoApprovedOpen, quotationData?.id]);

    const handleSubmit = async (data) => {
        setLoading(true);
        setServerError(null);

        try {
            // Extract documents from data
            const documents = {
                electricity_bill: data.electricity_bill,
                house_tax_bill: data.house_tax_bill,
                aadhar_card: data.aadhar_card,
                passport_photo: data.passport_photo,
                pan_card: data.pan_card,
                cancelled_cheque: data.cancelled_cheque,
                customer_sign: data.customer_sign,
            };

            // Remove document fields from order data
            const orderData = { ...data };
            delete orderData.electricity_bill;
            delete orderData.house_tax_bill;
            delete orderData.aadhar_card;
            delete orderData.passport_photo;
            delete orderData.pan_card;
            delete orderData.cancelled_cheque;
            delete orderData.customer_sign;

            // Create order first
            const res = await orderService.createOrder(orderData);
            const orderId = res?.result?.id || res?.id;
            console.log("✅ New Order Created:", res);

            // Upload documents if any
            if (orderId) {
                const documentTypes = [
                    { key: 'electricity_bill', label: 'Electricity Bill' },
                    { key: 'house_tax_bill', label: 'House Tax Bill' },
                    { key: 'aadhar_card', label: 'Aadhar Card' },
                    { key: 'passport_photo', label: 'Passport Photo' },
                    { key: 'pan_card', label: 'PAN Card' },
                    { key: 'cancelled_cheque', label: 'Cancelled Cheque' },
                    { key: 'customer_sign', label: 'Customer Sign' },
                ];

                for (const docType of documentTypes) {
                    const file = documents[docType.key];
                    if (file && file instanceof File) {
                        try {
                            const formData = new FormData();
                            formData.append('document', file);
                            formData.append('order_id', orderId);
                            formData.append('doc_type', docType.key);
                            formData.append('remarks', docType.label);

                            await orderDocumentsService.createOrderDocument(formData);
                            console.log(`✅ Uploaded ${docType.label}`);
                        } catch (docErr) {
                            console.error(`❌ Failed to upload ${docType.label}:`, docErr);
                        }
                    }
                }
            }

            router.push("/order"); // Redirect to order list
        } catch (err) {
            console.error("❌ Failed to create order", err);
            const errorMessage = err.response?.data?.message || err.message || "Failed to create order";
            setServerError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Prepare default values from inquiry and quotation data
    const defaultValues = useMemo(() => {
        const defaults = {};

        // Set current date as default order date
        defaults.order_date = new Date().toISOString().split("T")[0];

        if (inquiryData) {
            // From inquiry - base data
            defaults.inquiry_id = inquiryData.id;
            defaults.customer_id = inquiryData.customer_id;
            defaults.customer_name = inquiryData.customer_name;
            defaults.mobile_number = inquiryData.mobile_number;
            defaults.company_name = inquiryData.company_name;
            defaults.address = inquiryData.address;
            defaults.inquiry_source_id = inquiryData.inquiry_source_id;
            defaults.reference_from = inquiryData.reference_from;
            defaults.project_scheme_id = inquiryData.project_scheme_id;
            defaults.capacity = inquiryData.capacity;
            defaults.order_type_id = inquiryData.order_type; // order_type in inquiry maps to order_type_id in order
            defaults.consumer_no = inquiryData.consumer_no;
            defaults.division_id = inquiryData.division_id;
            defaults.sub_division_id = inquiryData.sub_division_id;

            // Customer details from inquiry
            defaults.phone_no = inquiryData.phone_no;
            defaults.email = inquiryData.email;
            defaults.pin_code = inquiryData.pin_code;
            defaults.state_id = inquiryData.state_name || inquiryData.state_id;
            defaults.city_id = inquiryData.city_name || inquiryData.city_id;
            defaults.landmark_area = inquiryData.landmark_area;
            defaults.district = inquiryData.district;

            // Assignment fields from inquiry
            defaults.inquiry_by = inquiryData.inquiry_by_id || inquiryData.inquiry_by;
            defaults.handled_by = inquiryData.handled_by_id || inquiryData.handled_by;
            defaults.branch_id = inquiryData.branch_id;
            defaults.channel_partner_id = inquiryData.channel_partner_id;
            defaults.discom_id = inquiryData.discom_id;
            defaults.payment_type = inquiryData.payment_type; // payment_type is a string from constants
        } else if (user?.id) {
            // If no inquiry data, set logged-in user as default
            defaults.inquiry_by = user.id;
            defaults.handled_by = user.id;
        }

        // From quotation (latest fetched quotation) - OVERRIDE inquiry data if available
        if (quotationData) {
            defaults.quotation_id = quotationData.id;
            defaults.project_cost = quotationData.total_project_value || quotationData.project_cost || 0;
            defaults.discount = quotationData.discount || 0;

            // Override assignment fields from quotation if available
            if (quotationData.inquiry_by_id || quotationData.inquiry_by) {
                defaults.inquiry_by = quotationData.inquiry_by_id || quotationData.inquiry_by;
            }
            if (quotationData.handled_by_id || quotationData.handled_by) {
                defaults.handled_by = quotationData.handled_by_id || quotationData.handled_by;
            }
            if (quotationData.branch_id) {
                defaults.branch_id = quotationData.branch_id;
            }
            if (quotationData.channel_partner_id) {
                defaults.channel_partner_id = quotationData.channel_partner_id;
            }

            // Override customer details from quotation if available
            if (quotationData.phone_no) defaults.phone_no = quotationData.phone_no;
            if (quotationData.email) defaults.email = quotationData.email;
            if (quotationData.pin_code) defaults.pin_code = quotationData.pin_code;
            if (quotationData.state_name || quotationData.state_id) {
                defaults.state_id = quotationData.state_name || quotationData.state_id;
            }
            if (quotationData.city_name || quotationData.city_id) {
                defaults.city_id = quotationData.city_name || quotationData.city_id;
            }
            if (quotationData.landmark_area) defaults.landmark_area = quotationData.landmark_area;
            if (quotationData.district) defaults.district = quotationData.district;

            // Override other fields from quotation if available
            if (quotationData.order_type_id) defaults.order_type_id = Number(quotationData.order_type_id);
            if (quotationData.project_scheme_id) defaults.project_scheme_id = Number(quotationData.project_scheme_id);
            if (quotationData.project_capacity) defaults.capacity = Number(quotationData.project_capacity);
            if (quotationData.project_cost) defaults.project_cost = Number(quotationData.project_cost);
            if (quotationData.panel_product) defaults.solar_panel_id = Number(quotationData.panel_product);
            if (quotationData.inverter_product) defaults.inverter_id = Number(quotationData.inverter_product);

            // Override discom and payment from quotation if available
            if (quotationData.discom_id) defaults.discom_id = Number(quotationData.discom_id);
            if (quotationData.payment_type) defaults.payment_type = quotationData.payment_type;
        }

        return defaults;
    }, [inquiryData, quotationData, user?.id]);

    const title = inquiryId ? `Create Order from Inquiry #${inquiryNumber}` : "Add New Order";

    return (
        <AddEditPageShell title={title} listHref="/order" listLabel="Order">
            {fetchingData ? (
                <div className="flex justify-center items-center min-h-[400px]">
                    <Loader />
                </div>
            ) : (
                <OrderForm
                    defaultValues={defaultValues}
                    quotationData={quotationData}
                    onSubmit={handleSubmit}
                    onCancel={() => router.push("/order")}
                    loading={loading}
                    serverError={serverError}
                    onClearServerError={() => setServerError(null)}
                />
            )}
            <AlertDialog
                open={confirmNoApprovedOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setFullQuotationDetails(null);
                    }
                    setConfirmNoApprovedOpen(open);
                }}
            >
                <AlertDialogContent size="lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle>No approved quotation</AlertDialogTitle>
                        <AlertDialogDescription>
                            No approved quotation for this inquiry. Use the latest quotation below?
                            You can approve a quotation from the Quotations list first.
                        </AlertDialogDescription>
                        <div className="space-y-3 text-sm">
                            {fullQuotationDetailsLoading ? (
                                <p className="text-muted-foreground">Loading quotation details…</p>
                            ) : fullQuotationDetails ? (
                                <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-2">
                                    <div className="font-medium">
                                        #{fullQuotationDetails.quotation_number ?? fullQuotationDetails.id}
                                        {fullQuotationDetails.orderType?.name && (
                                            <span className="text-muted-foreground font-normal ml-2">
                                                · {fullQuotationDetails.orderType.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                                        <span>Date</span>
                                        <span>{formatDate(fullQuotationDetails.quotation_date) ?? "-"}</span>
                                        <span>Valid till</span>
                                        <span>{formatDate(fullQuotationDetails.valid_till) ?? "-"}</span>
                                        <span>Customer</span>
                                        <span>{fullQuotationDetails.customer_name ?? fullQuotationDetails.customer?.customer_name ?? "-"}</span>
                                        <span>Mobile</span>
                                        <span>{fullQuotationDetails.mobile_number ?? fullQuotationDetails.customer?.mobile_number ?? "-"}</span>
                                        <span>Inquiry</span>
                                        <span>{fullQuotationDetails.inquiry?.inquiry_number ?? fullQuotationDetails.inquiry_number ?? "-"}</span>
                                        <span>Capacity</span>
                                        <span>{fullQuotationDetails.project_capacity != null ? `${fullQuotationDetails.project_capacity} KW` : "-"}</span>
                                        <span>Total value</span>
                                        <span>{fullQuotationDetails.total_project_value != null ? formatCurrency(fullQuotationDetails.total_project_value) : "-"}</span>
                                        {fullQuotationDetails.discount != null && Number(fullQuotationDetails.discount) !== 0 && (
                                            <>
                                                <span>Discount</span>
                                                <span>{formatCurrency(fullQuotationDetails.discount)}</span>
                                            </>
                                        )}
                                        <span>Scheme</span>
                                        <span>{fullQuotationDetails.projectScheme?.name ?? "-"}</span>
                                        <span>Created</span>
                                        <span>{formatDate(fullQuotationDetails.created_at) ?? "-"}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">
                                    Quotation: {quotationData?.quotation_number || `#${quotationData?.id}`}
                                </p>
                            )}
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => {
                                setQuotationData(null);
                                setFullQuotationDetails(null);
                                setConfirmNoApprovedOpen(false);
                                toast.info("Please approve a quotation from the Quotations list, then try again.");
                            }}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setFullQuotationDetails(null);
                                setConfirmNoApprovedOpen(false);
                            }}
                        >
                            Use this quotation
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AddEditPageShell>
    );
}
