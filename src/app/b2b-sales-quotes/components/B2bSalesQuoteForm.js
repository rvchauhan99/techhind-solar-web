"use client";

import { useState, useEffect, useRef } from "react";
import {
    Box,
    Typography,
    Alert,
    CircularProgress,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import FormContainer from "@/components/common/FormContainer";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import AutocompleteField from "@/components/common/AutocompleteField";
import BillToShipToDisplay from "@/components/common/BillToShipToDisplay";
import b2bClientService from "@/services/b2bClientService";
import productService from "@/services/productService";
import companyService from "@/services/companyService";
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";

const emptyCurrentItem = () => ({
    product_id: "",
    product_label: "",
    hsn_code: "",
    quantity: "",
    per_watt_rate: "",
    unit_rate: "",
    discount_percent: "",
    gst_percent: "",
    measurement_unit: "",
    product_capacity: "",
    product_type_name: "",
});

export default function B2bSalesQuoteForm({
    defaultValues = {},
    onSubmit,
    loading,
    serverError = null,
    onClearServerError = () => { },
    onCancel = null,
}) {
    const today = new Date().toISOString().split("T")[0];
    const validTill = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [formData, setFormData] = useState({
        quote_date: today,
        valid_till: validTill,
        client_id: "",
        ship_to_id: "",
        payment_terms: "",
        delivery_terms: "",
        order_remarks: "",
        terms_remarks: "Loading will be in buyer's scope.",
        freight_terms_id: "",
        payment_terms_id: "",
        delivery_schedule_id: "",
        items: [],
    });

    const [errors, setErrors] = useState({});
    const [itemErrors, setItemErrors] = useState({});
    const [currentItem, setCurrentItem] = useState(emptyCurrentItem());

    const [clients, setClients] = useState([]);
    const [shipTos, setShipTos] = useState([]);
    const [clientDetails, setClientDetails] = useState(null);
    const [companyState, setCompanyState] = useState("");
    const [companyGstin, setCompanyGstin] = useState("");
    const [loadingOptions, setLoadingOptions] = useState(false);

    const [uploadedFiles, setUploadedFiles] = useState([]);
    const fileInputRef = useRef(null);

    // Load clients on mount
    useEffect(() => {
        setLoadingOptions(true);
        Promise.all([
            b2bClientService
                .getB2bClients({ limit: 500, is_active: true })
                .then((res) => {
                    const r = res?.result ?? res;
                    setClients(r?.data ?? []);
                })
                .catch(() => { }),
            companyService
                .getCompanyProfile()
                .then((res) => {
                    const c = res?.result ?? res;
                    setCompanyState(String(c?.state || "").trim());
                    setCompanyGstin(String(c?.gstin || "").trim());
                })
                .catch(() => {
                    setCompanyState("");
                    setCompanyGstin("");
                }),
        ]).finally(() => setLoadingOptions(false));
    }, []);

    // Load default Terms & Conditions masters for new quotes (not editing)
    useEffect(() => {
        if (defaultValues?.id) return;
        let cancelled = false;
        const loadDefaults = async () => {
            try {
                const [freightList, paymentList, deliveryList] = await Promise.all([
                    getReferenceOptionsSearch("termsAndConditions.model", {
                        limit: 1,
                        type: "freight",
                        is_active: "true",
                        is_default: "true",
                    }),
                    getReferenceOptionsSearch("termsAndConditions.model", {
                        limit: 1,
                        type: "payment_terms",
                        is_active: "true",
                        is_default: "true",
                    }),
                    getReferenceOptionsSearch("termsAndConditions.model", {
                        limit: 1,
                        type: "delivery_schedule",
                        is_active: "true",
                        is_default: "true",
                    }),
                ]);
                if (cancelled) return;
                const freight = Array.isArray(freightList) ? freightList[0] : null;
                const payment = Array.isArray(paymentList) ? paymentList[0] : null;
                const delivery = Array.isArray(deliveryList) ? deliveryList[0] : null;
                setFormData((prev) => ({
                    ...prev,
                    freight_terms_id: prev.freight_terms_id || (freight?.id ?? ""),
                    payment_terms_id: prev.payment_terms_id || (payment?.id ?? ""),
                    delivery_schedule_id: prev.delivery_schedule_id || (delivery?.id ?? ""),
                }));
            } catch {
                // Ignore defaults loading error; user can still select manually
            }
        };
        loadDefaults();
        return () => {
            cancelled = true;
        };
    }, [defaultValues?.id]);

    // Load existing values for edit mode
    useEffect(() => {
        if (!defaultValues?.id) return;
        const items = defaultValues.items?.length
            ? defaultValues.items.map((it) => ({
                product_id: it.product_id,
                product_label: it.product?.product_name || String(it.product_id),
                hsn_code: it.hsn_code ?? it.product?.hsn_code ?? "",
                quantity: it.quantity ?? 1,
                per_watt_rate: it.per_watt_rate ?? null,
                unit_rate: it.unit_rate ?? 0,
                discount_percent: it.discount_percent ?? 0,
                gst_percent: it.gst_percent ?? 0,
                measurement_unit: it.measurement_unit || it.product?.measurement_unit_name || "",
                product_capacity: it.product_capacity ?? it.product?.capacity ?? "",
                product_type_name: it.product_type_name || it.product?.productType?.name || "",
            }))
            : [];
        setFormData({
            quote_date: defaultValues.quote_date || today,
            valid_till: defaultValues.valid_till || validTill,
            client_id: defaultValues.client_id ?? "",
            ship_to_id: defaultValues.ship_to_id ?? "",
            payment_terms: defaultValues.payment_terms ?? "",
            delivery_terms: defaultValues.delivery_terms ?? "",
            order_remarks: defaultValues.remarks ?? "",
            terms_remarks: defaultValues.terms_remarks ?? "Loading will be in buyer's scope.",
            freight_terms_id: defaultValues.freight_terms_id ?? "",
            payment_terms_id: defaultValues.payment_terms_id ?? "",
            delivery_schedule_id: defaultValues.delivery_schedule_id ?? "",
            items,
        });
    }, [defaultValues?.id]);

    // Load ship-tos when client changes; pre-select default or first
    useEffect(() => {
        if (!formData.client_id) {
            setShipTos([]);
            setClientDetails(null);
            // setFormData((p) => ({ ...p, ship_to_id: "" })); // Removed to avoid infinite loops or clearing on initial load
            return;
        }
        b2bClientService
            .getB2bShipTos({ client_id: formData.client_id })
            .then((res) => {
                const r = res?.result ?? res;
                const data = r?.data ?? [];
                setShipTos(data);
                // Only auto-select if not in edit mode OR if client has changed from initial
                const isInitialEditClient = defaultValues?.client_id && Number(formData.client_id) === Number(defaultValues.client_id);
                if (!isInitialEditClient) {
                    const defaultShipTo = data.find((s) => s.is_default) || data[0];
                    setFormData((p) => ({ ...p, ship_to_id: defaultShipTo?.id ?? "" }));
                }
            })
            .catch(() => setShipTos([]));
        b2bClientService
            .getB2bClientById(formData.client_id)
            .then((res) => {
                const r = res?.result ?? res;
                setClientDetails(r ?? null);
            })
            .catch(() => setClientDetails(null));
    }, [formData.client_id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "client_id") {
            setFormData((p) => ({ ...p, client_id: value, ship_to_id: "" }));
        } else {
            setFormData((p) => ({ ...p, [name]: value }));
        }
        if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
        if (serverError) onClearServerError();
    };

    const handleCurrentItemChange = (e) => {
        const { name, value } = e.target;
        setCurrentItem((p) => {
            const next = { ...p, [name]: value };
            const isPanel = String(p.product_type_name || "").trim().toLowerCase() === "panel";
            const capacity = Number(p.product_capacity);
            const hasCapacity = Number.isFinite(capacity) && capacity > 0;

            if (isPanel && hasCapacity && name === "per_watt_rate") {
                const perWatt = Number(value);
                next.unit_rate = Number.isFinite(perWatt) && perWatt > 0 ? (perWatt * capacity).toFixed(2) : "";
            }
            if (isPanel && hasCapacity && name === "unit_rate") {
                const unitRate = Number(value);
                next.per_watt_rate = Number.isFinite(unitRate) && unitRate > 0 ? (unitRate / capacity).toFixed(4) : "";
            }
            return next;
        });
        if (itemErrors[name]) setItemErrors((p) => { const n = { ...p }; delete n[name]; return n; });
    };

    const handleAddItem = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const errs = {};
        if (!currentItem.product_id) {
            errs.product_id = "Product is required";
        } else {
            const pid = typeof currentItem.product_id === "object"
                ? currentItem.product_id?.id
                : currentItem.product_id;
            const isDuplicate = formData.items.some((it) => {
                const itPid = typeof it.product_id === "object" ? it.product_id?.id : it.product_id;
                return String(itPid) === String(pid);
            });
            if (isDuplicate) errs.product_id = "This product is already added";
        }
        if (!currentItem.unit_rate || Number(currentItem.unit_rate) < 0) errs.unit_rate = "Rate is required";
        if (!currentItem.quantity || Number(currentItem.quantity) <= 0) errs.quantity = "Quantity must be > 0";
        if (currentItem.gst_percent === "" || currentItem.gst_percent === null || currentItem.gst_percent === undefined) {
            errs.gst_percent = "GST % is required";
        }

        if (Object.keys(errs).length > 0) {
            setItemErrors(errs);
            return;
        }

        const pid = typeof currentItem.product_id === "object"
            ? currentItem.product_id?.id
            : currentItem.product_id;

        setFormData((p) => ({
            ...p,
            items: [
                ...p.items,
                {
                    product_id: pid,
                    product_label: currentItem.product_label,
                    hsn_code: currentItem.hsn_code || "",
                    quantity: parseInt(currentItem.quantity, 10),
                    per_watt_rate: currentItem.per_watt_rate ? parseFloat(currentItem.per_watt_rate) : null,
                    unit_rate: parseFloat(currentItem.unit_rate),
                    discount_percent: parseFloat(currentItem.discount_percent || 0),
                    gst_percent: parseFloat(currentItem.gst_percent),
                    measurement_unit: currentItem.measurement_unit || "",
                    product_capacity: currentItem.product_capacity || "",
                    product_type_name: currentItem.product_type_name || "",
                },
            ],
        }));
        setCurrentItem(emptyCurrentItem());
        setItemErrors({});
    };

    const handleRemoveItem = (index) => {
        setFormData((p) => ({
            ...p,
            items: p.items.filter((_, i) => i !== index),
        }));
    };

    const calculateTotals = () => {
        let totalQuantity = 0;
        let taxableAmount = 0;
        let totalGstAmount = 0;

        formData.items.forEach((item) => {
            const qty = Number(item.quantity) || 0;
            const rate = Number(item.unit_rate) || 0;
            const disc = Number(item.discount_percent) || 0;
            const gst = Number(item.gst_percent) || 0;

            const lineValue = rate * qty;
            const discountAmt = (lineValue * disc) / 100;
            const taxable = lineValue - discountAmt;
            const gstAmt = (taxable * gst) / 100;

            totalQuantity += qty;
            taxableAmount += taxable;
            totalGstAmount += gstAmt;
        });

        const grandTotal = taxableAmount + totalGstAmount;
        const finalAmount = Math.round(grandTotal);
        const roundOffAmount = finalAmount - grandTotal;

        return {
            total_quantity: totalQuantity,
            taxable_amount: parseFloat(taxableAmount.toFixed(2)),
            total_gst_amount: parseFloat(totalGstAmount.toFixed(2)),
            grand_total: parseFloat(grandTotal.toFixed(2)),
            final_amount: parseFloat(finalAmount.toFixed(2)),
            round_off_amount: parseFloat(roundOffAmount.toFixed(2)),
        };
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (serverError) onClearServerError();

        const errs = {};
        if (!formData.client_id) errs.client_id = "Client is required";
        if (!formData.quote_date) errs.quote_date = "Quote date is required";
        if (!formData.valid_till) errs.valid_till = "Valid till is required";
        if (formData.quote_date && formData.valid_till && formData.valid_till < formData.quote_date) {
            errs.valid_till = "Valid Till must be on or after Quote Date";
        }
        if (formData.items.length === 0) errs.items = "At least one item is required";

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        setErrors({});
        const totals = calculateTotals();

        const payload = {
            quote_date: formData.quote_date,
            valid_till: formData.valid_till,
            client_id: Number(formData.client_id),
            ship_to_id: formData.ship_to_id ? Number(formData.ship_to_id) : null,
            payment_terms: formData.payment_terms || null,
            delivery_terms: formData.delivery_terms || null,
            remarks: formData.order_remarks || null,
            terms_remarks: formData.terms_remarks || null,
            freight_terms_id: formData.freight_terms_id || null,
            payment_terms_master_id: formData.payment_terms_id || null,
            delivery_schedule_id: formData.delivery_schedule_id || null,
            items: formData.items.map((it) => ({
                product_id: typeof it.product_id === "object" ? it.product_id?.id : it.product_id,
                quantity: parseInt(it.quantity, 10) || 1,
                unit_rate: parseFloat(it.unit_rate) || 0,
                per_watt_rate: it.per_watt_rate != null && it.per_watt_rate !== "" ? parseFloat(it.per_watt_rate) : null,
                discount_percent: parseFloat(it.discount_percent) || 0,
                gst_percent: parseFloat(it.gst_percent) || 0,
                hsn_code: it.hsn_code || "",
            })),
            ...totals,
        };

        onSubmit(payload, uploadedFiles);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        setUploadedFiles((p) => [...p, ...files]);
        e.target.value = "";
    };

    const handleRemoveUploadedFile = (index) => {
        setUploadedFiles((p) => p.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
    };

    if (loadingOptions) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
                <CircularProgress />
            </Box>
        );
    }

    const totals = calculateTotals();
    const selectedShipTo = shipTos.find((s) => Number(s.id) === Number(formData.ship_to_id)) || null;
    const buyerState = String(selectedShipTo?.state || clientDetails?.billing_state || "").trim();
    const buyerGstin = String(clientDetails?.gstin || "").trim();
    const sellerGstinStateCode = companyGstin && companyGstin.length >= 2 ? companyGstin.slice(0, 2) : "";
    const buyerGstinStateCode = buyerGstin && buyerGstin.length >= 2 ? buyerGstin.slice(0, 2) : "";
    const hasBothGstCodes = /^\d{2}$/.test(sellerGstinStateCode) && /^\d{2}$/.test(buyerGstinStateCode);
    const isIgst = hasBothGstCodes
        ? sellerGstinStateCode !== buyerGstinStateCode
        : (companyState && buyerState
            ? String(companyState).trim().toLowerCase() !== String(buyerState).trim().toLowerCase()
            : false);
    const applicableGstLabel = isIgst ? "IGST" : "CGST / SGST";
    const applicableGstValue = isIgst
        ? `₹${totals.total_gst_amount.toFixed(2)}`
        : `₹${(totals.total_gst_amount / 2).toFixed(2)} / ₹${(totals.total_gst_amount / 2).toFixed(2)}`;
    const signedRoundOff = (val) => {
        const n = Number(val) || 0;
        const sign = n > 0 ? "+" : n < 0 ? "-" : "";
        return `${sign}₹${Math.abs(n).toFixed(2)}`;
    };

    return (
        <Box>
            <FormContainer>
                <form id="b2b-sales-quote-form" onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} className="mx-auto ml-2 pr-1 max-w-full pb-20" noValidate>
                    {serverError && (
                        <Alert severity="error" sx={{ mb: 1 }} onClose={onClearServerError}>
                            {serverError}
                        </Alert>
                    )}

                    {/* ── Header Fields ── */}
                    <div className="w-full">
                        <Paper sx={{ p: 0.75, mb: 1, bgcolor: "#fafafa" }}>
                            <FormGrid cols={6}>
                                <DateField
                                    name="quote_date"
                                    label="Quote Date"
                                    value={formData.quote_date}
                                    onChange={handleChange}
                                    required
                                    error={!!errors.quote_date}
                                    helperText={errors.quote_date}
                                    className="lg:col-span-1"
                                />
                                <DateField
                                    name="valid_till"
                                    label="Valid Till"
                                    value={formData.valid_till}
                                    onChange={handleChange}
                                    required
                                    error={!!errors.valid_till}
                                    helperText={errors.valid_till}
                                    minDate={formData.quote_date || undefined}
                                    className="lg:col-span-1"
                                />
                                <div className="lg:col-span-2">
                                    <AutocompleteField
                                        label="Client *"
                                        options={clients}
                                        getOptionLabel={(c) => (c ? `${c.client_code ?? ""} – ${c.client_name ?? ""}`.trim() || String(c?.id ?? "") : "")}
                                        value={clients.find((c) => c.id === parseInt(formData.client_id)) || (formData.client_id ? { id: formData.client_id } : null)}
                                        onChange={(e, newValue) => handleChange({ target: { name: "client_id", value: newValue?.id ?? "" } })}
                                        required
                                        error={!!errors.client_id}
                                        helperText={errors.client_id}
                                    />
                                </div>
                                <div className="lg:col-span-2">
                                    <AutocompleteField
                                        label="Ship To"
                                        options={shipTos}
                                        getOptionLabel={(s) => s?.ship_to_name || s?.address || (s?.id ? `Ship-to #${s.id}` : "")}
                                        value={shipTos.find((s) => s.id === parseInt(formData.ship_to_id)) || (formData.ship_to_id ? { id: formData.ship_to_id } : null)}
                                        onChange={(e, newValue) => handleChange({ target: { name: "ship_to_id", value: newValue?.id ?? "" } })}
                                        disabled={!formData.client_id}
                                    />
                                </div>

                                {/* Second row of grid: Terms */}
                                <div className="lg:col-span-2">
                                    <AutocompleteField
                                        name="freight_terms_id"
                                        label="Freight"
                                        asyncLoadOptions={(q) =>
                                            getReferenceOptionsSearch("termsAndConditions.model", {
                                                q,
                                                limit: 20,
                                                type: "freight",
                                                is_active: "true",
                                            })
                                        }
                                        referenceModel="termsAndConditions.model"
                                        getOptionLabel={(o) => o?.title ?? o?.label ?? ""}
                                        value={formData.freight_terms_id ? { id: formData.freight_terms_id } : null}
                                        onChange={(_e, v) =>
                                            handleChange({
                                                target: { name: "freight_terms_id", value: v?.id ?? "" },
                                            })
                                        }
                                    />
                                </div>
                                <div className="lg:col-span-2">
                                    <AutocompleteField
                                        name="payment_terms_id"
                                        label="Payment terms"
                                        asyncLoadOptions={(q) =>
                                            getReferenceOptionsSearch("termsAndConditions.model", {
                                                q,
                                                limit: 20,
                                                type: "payment_terms",
                                                is_active: "true",
                                            })
                                        }
                                        referenceModel="termsAndConditions.model"
                                        getOptionLabel={(o) => o?.title ?? o?.label ?? ""}
                                        value={formData.payment_terms_id ? { id: formData.payment_terms_id } : null}
                                        onChange={(_e, v) =>
                                            handleChange({
                                                target: { name: "payment_terms_id", value: v?.id ?? "" },
                                            })
                                        }
                                    />
                                </div>
                                <div className="lg:col-span-2">
                                    <AutocompleteField
                                        name="delivery_schedule_id"
                                        label="Delivery Schedule"
                                        asyncLoadOptions={(q) =>
                                            getReferenceOptionsSearch("termsAndConditions.model", {
                                                q,
                                                limit: 20,
                                                type: "delivery_schedule",
                                                is_active: "true",
                                            })
                                        }
                                        referenceModel="termsAndConditions.model"
                                        getOptionLabel={(o) => o?.title ?? o?.label ?? ""}
                                        value={formData.delivery_schedule_id ? { id: formData.delivery_schedule_id } : null}
                                        onChange={(_e, v) =>
                                            handleChange({
                                                target: { name: "delivery_schedule_id", value: v?.id ?? "" },
                                            })
                                        }
                                    />
                                </div>

                                {/* Third row of grid: Remarks */}
                                <div className="lg:col-span-3">
                                    <Input
                                        name="terms_remarks"
                                        label="T&C Remarks"
                                        placeholder="Extra terms..."
                                        value={formData.terms_remarks}
                                        onChange={handleChange}
                                        multiline
                                        rows={2}
                                    />
                                </div>
                                <div className="lg:col-span-3">
                                    <Input
                                        name="order_remarks"
                                        label="Order Remarks"
                                        placeholder="Internal notes/remarks"
                                        value={formData.order_remarks}
                                        onChange={handleChange}
                                        multiline
                                        rows={2}
                                    />
                                </div>
                            </FormGrid>
                        </Paper>

                        {clientDetails && (
                            <BillToShipToDisplay
                                billTo={clientDetails}
                                shipTo={shipTos.find((s) => Number(s.id) === Number(formData.ship_to_id)) || null}
                                className="mt-0.5 mb-1"
                            />
                        )}
                    </div>

                    {/* ── Items Section ── */}
                    <FormSection title="Items" className="mt-1" data-items-section>
                        {errors.items && (
                            <Alert severity="error" sx={{ mb: 1, py: 0 }}>
                                {errors.items}
                            </Alert>
                        )}

                        {/* Add Item Input Row */}
                        <Paper sx={{ p: 0.75, mb: 1 }}>
                            <div className="grid grid-cols-[minmax(160px,2fr)_minmax(90px,1fr)_minmax(90px,1fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)_auto] gap-2 items-end">
                                <div>
                                    <AutocompleteField
                                        asyncLoadOptions={async (q) => {
                                            const res = await productService.getProducts({
                                                q,
                                                limit: 20,
                                                visibility: "active",
                                                allow_b2b_sales_only: true,
                                            });
                                            const data = res?.result?.data ?? res?.data ?? [];
                                            return data.map((p) => ({
                                                id: p.id,
                                                label: `${p.product_code || p.id} – ${formatProductAutocompleteLabel(p)}`,
                                                hsn_code: p.hsn_ssn_code || p.hsn_code || "",
                                                gst_percent: p.gst_percent ?? "",
                                                measurement_unit: p.measurement_unit_name || "",
                                                product_capacity: p.capacity ?? "",
                                                product_type_name: p.product_type_name || "",
                                            }));
                                        }}
                                        value={currentItem.product_id}
                                        onChange={(_, v) => {
                                            setCurrentItem((p) => ({
                                                ...p,
                                                product_id: v?.id ?? v ?? "",
                                                product_label: v?.label ?? "",
                                                hsn_code: v?.hsn_code || p.hsn_code,
                                                gst_percent: v?.gst_percent != null ? String(v.gst_percent) : p.gst_percent,
                                                measurement_unit: v?.measurement_unit || p.measurement_unit || "",
                                                product_capacity: v?.product_capacity ?? p.product_capacity ?? "",
                                                product_type_name: v?.product_type_name ?? p.product_type_name ?? "",
                                            }));
                                            if (itemErrors.product_id) setItemErrors((e) => { const n = { ...e }; delete n.product_id; return n; });
                                        }}
                                        placeholder="Search and select product"
                                        getOptionLabel={(o) => o?.label ?? o?.product_name ?? String(o ?? "")}
                                        error={!!itemErrors.product_id}
                                        helperText={itemErrors.product_id}
                                        label="Product"
                                    />
                                </div>
                                <Input
                                    name="hsn_code"
                                    label="HSN Code"
                                    placeholder="Enter HSN code"
                                    value={currentItem.hsn_code}
                                    onChange={handleCurrentItemChange}
                                />
                                <Input
                                    name="quantity"
                                    label={
                                        currentItem.measurement_unit
                                            ? `Quantity (${currentItem.measurement_unit})`
                                            : "Quantity"
                                    }
                                    placeholder="Enter quantity"
                                    type="number"
                                    value={currentItem.quantity}
                                    onChange={handleCurrentItemChange}
                                    inputProps={{ min: 1 }}
                                    error={!!itemErrors.quantity}
                                    helperText={itemErrors.quantity}
                                    required
                                />
                                {String(currentItem.product_type_name || "").trim().toLowerCase() === "panel" && (
                                    <Input
                                        name="per_watt_rate"
                                        label="Per Watt (₹/W)"
                                        placeholder="Enter per watt"
                                        type="number"
                                        value={currentItem.per_watt_rate}
                                        onChange={handleCurrentItemChange}
                                        inputProps={{ min: 0, step: 0.0001 }}
                                    />
                                )}
                                <Input
                                    name="unit_rate"
                                    label="Rate (₹)"
                                    placeholder="Enter rate"
                                    type="number"
                                    value={currentItem.unit_rate}
                                    onChange={handleCurrentItemChange}
                                    inputProps={{ min: 0, step: 0.01 }}
                                    error={!!itemErrors.unit_rate}
                                    helperText={itemErrors.unit_rate}
                                    required
                                />
                                <Input
                                    name="discount_percent"
                                    label="Disc %"
                                    type="number"
                                    value={currentItem.discount_percent}
                                    onChange={handleCurrentItemChange}
                                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                                />
                                <Input
                                    name="gst_percent"
                                    label="GST %"
                                    type="number"
                                    value={currentItem.gst_percent}
                                    onChange={handleCurrentItemChange}
                                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                                    error={!!itemErrors.gst_percent}
                                    helperText={itemErrors.gst_percent}
                                    required
                                />
                                <div className="flex items-end">
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        startIcon={<AddIcon />}
                                        onClick={handleAddItem}
                                        className="w-full lg:w-auto"
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </Paper>

                        {/* Items Table */}
                        {formData.items.length > 0 && (
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>#</TableCell>
                                            <TableCell>Product</TableCell>
                                            <TableCell>HSN Code</TableCell>
                                            <TableCell align="right">Qty</TableCell>
                                            <TableCell align="right">Per Watt (₹/W)</TableCell>
                                            <TableCell align="right">Rate (₹)</TableCell>
                                            <TableCell align="right">Disc %</TableCell>
                                            <TableCell align="right">GST %</TableCell>
                                            <TableCell align="right">Taxable Amt</TableCell>
                                            <TableCell align="right">GST Amt</TableCell>
                                            <TableCell align="right">Total</TableCell>
                                            <TableCell>Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {formData.items.map((item, index) => {
                                            const qty = Number(item.quantity) || 0;
                                            const rate = Number(item.unit_rate) || 0;
                                            const disc = Number(item.discount_percent) || 0;
                                            const gst = Number(item.gst_percent) || 0;

                                            const lineValue = rate * qty;
                                            const discountAmt = (lineValue * disc) / 100;
                                            const taxable = lineValue - discountAmt;
                                            const gstAmt = (taxable * gst) / 100;
                                            const total = taxable + gstAmt;
                                            const productTypeName = String(item.product_type_name || item.product?.productType?.name || "").trim().toLowerCase();
                                            const capacity = Number(item.product_capacity ?? item.product?.capacity);
                                            const isPanelWithCapacity = productTypeName === "panel" && Number.isFinite(capacity) && capacity > 0;
                                            const derivedPerWatt = isPanelWithCapacity
                                                ? (item.per_watt_rate ?? (rate > 0 ? rate / capacity : null))
                                                : null;

                                            return (
                                                <TableRow key={index}>
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell>{item.product_label || `Product #${item.product_id}`}</TableCell>
                                                    <TableCell>{item.hsn_code || "–"}</TableCell>
                                                    <TableCell align="right">{qty} {item.measurement_unit ? `(${item.measurement_unit})` : ""}</TableCell>
                                                    <TableCell align="right">
                                                        {derivedPerWatt && Number(derivedPerWatt) > 0 ? `₹${Number(derivedPerWatt).toFixed(2)}` : "–"}
                                                    </TableCell>
                                                    <TableCell align="right">₹{rate.toFixed(2)}</TableCell>
                                                    <TableCell align="right">{disc > 0 ? `${disc}%` : "–"}</TableCell>
                                                    <TableCell align="right">{gst}%</TableCell>
                                                    <TableCell align="right">₹{taxable.toFixed(2)}</TableCell>
                                                    <TableCell align="right">₹{gstAmt.toFixed(2)}</TableCell>
                                                    <TableCell align="right">
                                                        <strong>₹{total.toFixed(2)}</strong>
                                                    </TableCell>
                                                    <TableCell>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleRemoveItem(index)}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {/* Totals Summary */}
                        {formData.items.length > 0 && (
                            <Paper sx={{ p: 1, mt: 1, bgcolor: "grey.100" }}>
                                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                    <Box sx={{ minWidth: 300 }}>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                            <Typography variant="body2">Total Quantity:</Typography>
                                            <Typography variant="body2" fontWeight="bold">{totals.total_quantity}</Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                            <Typography variant="body2">Taxable Amount:</Typography>
                                            <Typography variant="body2" fontWeight="bold">₹{totals.taxable_amount.toFixed(2)}</Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                            <Typography variant="body2">{applicableGstLabel}:</Typography>
                                            <Typography variant="body2" fontWeight="bold">{applicableGstValue}</Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                            <Typography variant="body2">Total GST Amount:</Typography>
                                            <Typography variant="body2" fontWeight="bold">₹{totals.total_gst_amount.toFixed(2)}</Typography>
                                        </Box>
                                        <Box sx={{ borderTop: "2px solid #000", pt: 1, mt: 0.5 }}>
                                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                                <Typography variant="body2">Round Off:</Typography>
                                                <Typography variant="body2" fontWeight="bold">{signedRoundOff(totals.round_off_amount)}</Typography>
                                            </Box>
                                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                                <Typography variant="subtitle1" fontWeight="bold">Final Amount:</Typography>
                                                <Typography variant="subtitle1" fontWeight="bold">₹{Number(totals.final_amount).toFixed(2)}</Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Paper>
                        )}
                    </FormSection>

                    {/* ── Attachments Section ── */}
                    <FormSection title="Attachments" className="mt-1">
                        <Paper sx={{ p: 0.75 }}>
                            <FormGrid cols={2} className="lg:grid-cols-4 mb-1">
                                <div className="md:col-span-2 lg:col-span-3">
                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                        Attach supporting documents (PDF, Word, Excel, Images). Max file size 10 MB each.
                                    </Typography>
                                </div>
                                <div className="flex items-end md:col-span-2 lg:col-span-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={loading}
                                        startIcon={<CloudUploadIcon />}
                                        type="button"
                                        className="w-full"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Upload Documents
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        hidden
                                        multiple
                                        disabled={loading}
                                        onChange={handleFileUpload}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                    />
                                </div>
                            </FormGrid>

                            {uploadedFiles.length > 0 ? (
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Files to Upload ({uploadedFiles.length}):
                                    </Typography>
                                    {uploadedFiles.map((file, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                                mb: 0.5,
                                                p: 0.75,
                                                bgcolor: "#f5f5f5",
                                                borderRadius: 1,
                                            }}
                                        >
                                            <AttachFileIcon fontSize="small" color="action" />
                                            <Typography variant="body2" sx={{ flex: 1 }}>
                                                {file.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatFileSize(file.size)}
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleRemoveUploadedFile(index)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    No documents attached. Click &quot;Upload Documents&quot; to add files.
                                </Typography>
                            )}
                        </Paper>
                    </FormSection>
                </form>

            </FormContainer>

            {/* ── Sticky Action Bar pinned to viewport bottom ── */}
            <div className="sticky bottom-0 z-20 bg-background border-t shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-4 py-3 flex gap-3 justify-end mt-2">
                {onCancel && (
                    <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                )}
                <LoadingButton
                    type="submit"
                    form="b2b-sales-quote-form"
                    size="sm"
                    loading={loading}
                    className="min-w-[120px]"
                >
                    {defaultValues?.id ? "Update" : "Create"}
                </LoadingButton>
            </div>
        </Box>
    );
}
