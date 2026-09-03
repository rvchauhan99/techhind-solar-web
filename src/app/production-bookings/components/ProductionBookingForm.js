"use client";

import { Fragment, useState, useEffect, useMemo, useRef, useCallback } from "react";
import companyService from "@/services/companyService";
import productionOrderService from "@/services/productionOrderService";
import productionBookingService from "@/services/productionBookingService";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import FormContainer from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import { splitSerialInput, fillSerialSlots } from "@/utils/serialInput";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { getApiErrorMessage } from "@/utils/toast";
import { AP } from "@/utils/assemblyProductionLabels";
import { cn } from "@/lib/utils";
import {
    IconChevronDown,
    IconChevronUp,
    IconScan,
    IconX,
    IconLoader2,
    IconAlertCircle,
    IconCheck
} from "@tabler/icons-react";

const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const round = (value, decimals = 2) => {
    const factor = 10 ** decimals;
    return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
};

const orderLabel = (order) => {
    if (!order) return "";
    const parts = [order.order_no || `#${order.id}`];
    if (order.fgProduct?.product_name) parts.push(order.fgProduct.product_name);
    if (order.planned_quantity != null) {
        parts.push(`planned ${order.planned_quantity}, pending ${order.pending_quantity ?? "-"}`);
    }
    return parts.join(" · ");
};

export default function ProductionBookingForm({
    defaultValues = {},
    initialOrderId = null,
    onSubmit,
    loading,
    serverError = null,
    onClearServerError = () => {},
    onCancel = null,
    isEdit = false,
}) {
    const [formData, setFormData] = useState({
        production_order_id: initialOrderId ? String(initialOrderId) : "",
        booking_date: new Date().toISOString().split("T")[0],
        good_quantity: "1",
        rejected_quantity: "0",
        rejection_warehouse_id: "",
        rejection_reason: "",
        remarks: "",
    });

    const [formErrors, setFormErrors] = useState({});
    const [warehouses, setWarehouses] = useState([]);
    const [orderOption, setOrderOption] = useState(null);
    const [backflush, setBackflush] = useState(null);
    const [backflushError, setBackflushError] = useState(null);
    const [loadingBackflush, setLoadingBackflush] = useState(false);
    const [componentLines, setComponentLines] = useState([]);
    const [fgSerials, setFgSerials] = useState([]);
    const [lineErrors, setLineErrors] = useState({});

    const [openSerialLine, setOpenSerialLine] = useState(null);
    const [serialSlots, setSerialSlots] = useState([]);
    const [serialSlotError, setSerialSlotError] = useState("");
    const [serialValidating, setSerialValidating] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [gunScanValue, setGunScanValue] = useState("");
    const serialInputRefs = useRef([]);
    const gunScanRef = useRef(null);

    const goodQty = Math.max(0, parseInt(formData.good_quantity, 10) || 0);
    const rejectedQty = Math.max(0, parseInt(formData.rejected_quantity, 10) || 0);
    const outputQuantity = goodQty + rejectedQty;
    const isSerializedFg = !!backflush?.fg_serial_required;

    useEffect(() => {
        const loadWarehouses = async () => {
            try {
                const profileRes = await companyService.getCompanyProfile();
                const companyId = (profileRes?.result || profileRes?.data || profileRes)?.id;
                if (!companyId) return;
                const res = await companyService.listWarehouses(parseInt(companyId, 10));
                const list = res?.result || res?.data || res || [];
                setWarehouses(Array.isArray(list) ? list : []);
            } catch (error) {
                console.error("Failed to load warehouses", error);
            }
        };
        loadWarehouses();
    }, []);

    useEffect(() => {
        if (!defaultValues || Object.keys(defaultValues).length === 0) return;
        setFormData({
            production_order_id:
                defaultValues.production_order_id != null ? String(defaultValues.production_order_id) : "",
            booking_date: defaultValues.booking_date ?? new Date().toISOString().split("T")[0],
            good_quantity: String(defaultValues.good_quantity ?? 0),
            rejected_quantity: String(defaultValues.rejected_quantity ?? 0),
            rejection_warehouse_id:
                defaultValues.rejection_warehouse_id != null
                    ? String(defaultValues.rejection_warehouse_id)
                    : "",
            rejection_reason: defaultValues.rejection_reason ?? "",
            remarks: defaultValues.remarks ?? "",
        });
        if (defaultValues.productionOrder) setOrderOption(defaultValues.productionOrder);
    }, [defaultValues]);

    const loadBackflush = useCallback(
        async ({ orderId, good, rejected, preserveEdits }) => {
            if (!orderId || good + rejected <= 0) {
                setBackflush(null);
                setComponentLines([]);
                return;
            }
            setLoadingBackflush(true);
            setBackflushError(null);
            try {
                const response = await productionBookingService.getBackflushPreview({
                    production_order_id: orderId,
                    good_quantity: good,
                    rejected_quantity: rejected,
                });
                const result = response?.result || response;
                setBackflush(result);
                setComponentLines((prev) => {
                    const previousByProduct = new Map(
                        (preserveEdits ? prev : []).map((line) => [line.component_product_id, line])
                    );
                    return (result?.components || []).map((line) => {
                        const previous = previousByProduct.get(line.component_product_id);
                        return {
                            ...line,
                            consumed_quantity: String(line.suggested_consumed_quantity),
                            scrap_quantity: String(previous?.scrap_quantity ?? 0),
                            scrap_reason: previous?.scrap_reason ?? "",
                            serials: previous?.serials ?? [],
                        };
                    });
                });
            } catch (error) {
                setBackflush(null);
                setComponentLines([]);
                setBackflushError(getApiErrorMessage(error, "Failed to backflush the component requirement"));
            } finally {
                setLoadingBackflush(false);
            }
        },
        []
    );

    useEffect(() => {
        const orderId = parseInt(formData.production_order_id, 10);
        if (!orderId) {
            setBackflush(null);
            setComponentLines([]);
            return;
        }
        loadBackflush({ orderId, good: goodQty, rejected: rejectedQty, preserveEdits: true });
    }, [formData.production_order_id, goodQty, rejectedQty, loadBackflush]);

    useEffect(() => {
        if (!isSerializedFg) {
            setFgSerials([]);
            return;
        }
        setFgSerials((prev) =>
            Array.from({ length: outputQuantity }, (_, i) => prev[i] ?? "")
        );
    }, [isSerializedFg, outputQuantity]);

    const costPreview = useMemo(() => {
        const material = componentLines.reduce((sum, line) => {
            const issued = (parseInt(line.consumed_quantity, 10) || 0) + (parseInt(line.scrap_quantity, 10) || 0);
            return sum + issued * toNumber(line.rate);
        }, 0);
        const operation = (backflush?.operations || []).reduce((sum, op) => sum + toNumber(op.cost), 0);
        const total = round(material, 2) + round(operation, 2);
        return {
            material: round(material, 2),
            operation: round(operation, 2),
            total: round(total, 2),
            unit: outputQuantity > 0 ? round(total / outputQuantity, 2) : 0,
        };
    }, [componentLines, backflush, outputQuantity]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
        if (serverError) onClearServerError();
    };

    const updateLine = (index, patch) => {
        setComponentLines((prev) =>
            prev.map((line, i) => {
                if (i !== index) return line;
                const next = { ...line, ...patch };
                const issued =
                    (parseInt(next.consumed_quantity, 10) || 0) + (parseInt(next.scrap_quantity, 10) || 0);
                if ((next.serials || []).length > issued) {
                    next.serials = next.serials.slice(0, issued);
                }
                return next;
            })
        );
        setLineErrors((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    const requiredSerialCount = (line) =>
        (parseInt(line.consumed_quantity, 10) || 0) + (parseInt(line.scrap_quantity, 10) || 0);

    const toggleSerialPanel = (index) => {
        if (openSerialLine === index) {
            setOpenSerialLine(null);
            setSerialSlots([]);
            setSerialSlotError("");
            serialInputRefs.current = [];
            return;
        }
        const line = componentLines[index];
        const count = requiredSerialCount(line);
        if (count <= 0) return;
        const existing = (line.serials || []).slice(0, count);
        setSerialSlots(Array.from({ length: count }, (_, i) => existing[i] ?? ""));
        setSerialSlotError("");
        setOpenSerialLine(index);
        setGunScanValue("");
        serialInputRefs.current = [];
        setTimeout(() => serialInputRefs.current[0]?.focus(), 100);
    };

    const handleSlotChange = (index, value) => {
        setSerialSlots((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
        setSerialSlotError("");
    };

    const handleSlotBulkOrSingle = (index, value) => {
        const tokens = splitSerialInput(value);
        if (tokens.length <= 1) {
            handleSlotChange(index, value);
            return;
        }
        const { nextSlots, overflow, duplicates } = fillSerialSlots({
            slots: serialSlots,
            startIndex: index,
            incoming: tokens,
            caseInsensitive: true,
        });
        if (duplicates.length) {
            setSerialSlotError(
                `Duplicate serial(s) ignored: ${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? "…" : ""}`
            );
        }
        if (overflow.length) {
            setSerialSlotError(`Cannot add ${overflow.length} serial(s): quantity limit reached.`);
            return;
        }
        setSerialSlots(nextSlots);
    };

    const handleSlotKeyDown = (index, e) => {
        if (e.key !== "Enter" && e.key !== "Tab") return;
        e.preventDefault();
        if (index < serialSlots.length - 1) {
            serialInputRefs.current[index + 1]?.focus();
            return;
        }
        handleSerialPanelDone();
    };

    const handleGunScanKeyDown = (e) => {
        if (e.key !== "Enter" && e.key !== "Tab") return;
        e.preventDefault();
        const firstEmpty = serialSlots.findIndex((v) => !(v || "").trim());
        const idx = firstEmpty !== -1 ? firstEmpty : 0;
        if (gunScanValue.trim()) {
            handleSlotBulkOrSingle(idx, gunScanValue);
            setGunScanValue("");
        }
        gunScanRef.current?.focus();
    };

    const handleSerialPanelDone = async () => {
        const index = openSerialLine;
        if (index == null) return;
        const line = componentLines[index];
        const trimmed = serialSlots.map((s) => String(s || "").trim());

        const emptyIndex = trimmed.findIndex((s) => !s);
        if (emptyIndex !== -1) {
            setSerialSlotError("Please fill all serial numbers.");
            serialInputRefs.current[emptyIndex]?.focus();
            return;
        }
        const lowered = trimmed.map((s) => s.toLowerCase());
        if (new Set(lowered).size !== lowered.length) {
            setSerialSlotError("Duplicate serial numbers are not allowed.");
            return;
        }
        const usedElsewhere = componentLines
            .filter((_, i) => i !== index)
            .flatMap((other) => (other.serials || []).map((s) => String(s).trim().toLowerCase()));
        const clash = lowered.find((s) => usedElsewhere.includes(s));
        if (clash) {
            setSerialSlotError(`Serial "${clash}" is already used on another component line.`);
            return;
        }

        setSerialValidating(true);
        try {
            const response = await productionBookingService.validateProductionSerials({
                production_order_id: parseInt(formData.production_order_id, 10),
                product_id: line.component_product_id,
                serial_numbers: trimmed,
                is_fg: false,
            });
            const result = response?.result || response;
            if (!result?.all_valid) {
                const invalid = (result?.serials || []).find((row) => !row.valid);
                setSerialSlotError(
                    invalid
                        ? `Serial "${invalid.serial_number}": ${invalid.message || "not available"}`
                        : "One or more serials are not available at this warehouse"
                );
                return;
            }
        } catch (error) {
            setSerialSlotError(getApiErrorMessage(error, "Serial validation failed"));
            return;
        } finally {
            setSerialValidating(false);
        }

        updateLine(index, { serials: trimmed });
        setOpenSerialLine(null);
        setSerialSlots([]);
        setSerialSlotError("");
        serialInputRefs.current = [];
    };

    const handleValidateFgSerials = async () => {
        const trimmed = fgSerials.map((s) => String(s || "").trim());
        if (trimmed.some((s) => !s)) {
            setFormErrors((prev) => ({ ...prev, fg_serials: "Enter every finished-good serial number" }));
            return false;
        }
        try {
            const response = await productionBookingService.validateProductionSerials({
                production_order_id: parseInt(formData.production_order_id, 10),
                serial_numbers: trimmed,
                is_fg: true,
            });
            const result = response?.result || response;
            if (!result?.all_valid) {
                const invalid = (result?.serials || []).find((row) => !row.valid);
                setFormErrors((prev) => ({
                    ...prev,
                    fg_serials: invalid
                        ? `Serial "${invalid.serial_number}": ${invalid.message || "already in use"}`
                        : "One or more finished-good serials are already in use",
                }));
                return false;
            }
        } catch (error) {
            setFormErrors((prev) => ({
                ...prev,
                fg_serials: getApiErrorMessage(error, "Finished-good serial validation failed"),
            }));
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const errs = {};
        const nextLineErrors = {};

        if (!formData.production_order_id) errs.production_order_id = `${AP.orders.singular} is required`;
        if (!formData.booking_date) errs.booking_date = "Booking date is required";
        if (outputQuantity <= 0) errs.good_quantity = "Book at least one good or rejected unit";
        if (isSerializedFg && outputQuantity !== 1) {
            errs.good_quantity =
                "Finished good is serialized: good + rejected must equal 1 for a single booking";
        }
        if (rejectedQty > 0) {
            if (!formData.rejection_warehouse_id) {
                errs.rejection_warehouse_id = "A rejection warehouse is required when rejecting units";
            }
            if (!formData.rejection_reason.trim()) {
                errs.rejection_reason = "A rejection reason is required when rejecting units";
            }
        }
        if (backflush?.remaining_quantity != null && outputQuantity > backflush.remaining_quantity) {
            errs.good_quantity = `Only ${backflush.remaining_quantity} unit(s) remain on this ${AP.orders.singular.toLowerCase()}`;
        }
        if (componentLines.length === 0) errs.components = "Backflush the component requirement first";

        componentLines.forEach((line, index) => {
            const consumed = parseInt(line.consumed_quantity, 10) || 0;
            const scrap = parseInt(line.scrap_quantity, 10) || 0;
            const issued = consumed + scrap;

            if (!line.is_optional && consumed <= 0) {
                nextLineErrors[index] = `${line.product_name} is mandatory and needs a consumed quantity`;
                return;
            }
            if (scrap > 0 && !String(line.scrap_reason || "").trim()) {
                nextLineErrors[index] = `${line.product_name} has scrap, so a scrap reason is required`;
                return;
            }
            if (issued > toNumber(line.quantity_on_hand)) {
                nextLineErrors[index] = `${line.product_name}: only ${line.quantity_on_hand} on hand, need ${issued}`;
                return;
            }
            if (line.serial_required && issued > 0 && (line.serials || []).length !== issued) {
                nextLineErrors[index] = `${line.product_name} needs exactly ${issued} serial number(s); ${(line.serials || []).length} entered`;
            }
        });

        if (Object.keys(nextLineErrors).length > 0) errs.components = "Fix the component lines highlighted below";

        if (isSerializedFg) {
            if (fgSerials.length !== outputQuantity || fgSerials.some((s) => !String(s || "").trim())) {
                errs.fg_serials = `Enter exactly ${outputQuantity} finished-good serial number(s)`;
            }
        }

        setLineErrors(nextLineErrors);
        if (Object.keys(errs).length > 0) {
            setFormErrors(errs);
            return;
        }

        if (isSerializedFg && !(await handleValidateFgSerials())) return;

        setFormErrors({});

        onSubmit({
            production_order_id: parseInt(formData.production_order_id, 10),
            booking_date: formData.booking_date,
            good_quantity: goodQty,
            rejected_quantity: rejectedQty,
            rejection_warehouse_id: rejectedQty > 0 ? parseInt(formData.rejection_warehouse_id, 10) : null,
            rejection_reason: rejectedQty > 0 ? formData.rejection_reason.trim() : null,
            remarks: formData.remarks || null,
            components: componentLines
                .filter((line) => requiredSerialCount(line) > 0)
                .map((line) => ({
                    component_product_id: line.component_product_id,
                    consumed_quantity: parseInt(line.consumed_quantity, 10) || 0,
                    scrap_quantity: parseInt(line.scrap_quantity, 10) || 0,
                    scrap_reason: String(line.scrap_reason || "").trim() || null,
                    serials: line.serial_required ? line.serials : [],
                })),
            fg_serials: isSerializedFg
                ? fgSerials.map((serial, index) => ({
                    serial_number: String(serial).trim(),
                    outcome: index < goodQty ? "GOOD" : "REJECTED",
                }))
                : [],
            operations: (backflush?.operations || []).map((op) => ({
                operation_name: op.operation_name,
                actual_time_minutes: op.actual_time_minutes ?? null,
            })),
        });
    };

    return (
        <FormContainer className="flex-1 min-h-0 flex flex-col bg-muted/10">
            <form
                id="production-booking-form"
                onSubmit={handleSubmit}
                onKeyDown={preventEnterSubmit}
                className="mx-auto w-full max-w-[1600px] flex flex-col flex-1 min-h-0"
                noValidate
            >
                <div className="p-3 md:p-4 flex flex-col gap-4">
                    {/* Error Alert */}
                    {serverError && (
                        <div className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            <div className="flex items-center gap-2">
                                <IconAlertCircle className="h-4 w-4" />
                                <span>{serverError}</span>
                            </div>
                            <Button variant="ghost" size="icon-sm" onClick={onClearServerError} className="text-destructive hover:bg-destructive/20 hover:text-destructive">
                                <IconX className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* TOP BAR: ORDER DETAILS */}
                    <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
                        <div className="p-3.5 md:p-4 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between border-b border-border/50 bg-gradient-to-br from-card via-card to-muted/20">
                            <div className="w-full xl:w-[350px] shrink-0 relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-primary/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                <AutocompleteField
                                    label={`${AP.orders.singular} *`}
                                    placeholder={`Search approved ${AP.orders.title.toLowerCase()}...`}
                                    options={[]}
                                    usePortal
                                    disabled={isEdit}
                                    asyncLoadOptions={async (search) => {
                                        const res = await productionOrderService.getProductionOrders({
                                            q: search || undefined,
                                            order_no: search || undefined,
                                            open_only: true,
                                            limit: 20,
                                        });
                                        const result = res?.result || res;
                                        return result?.data || [];
                                    }}
                                    resolveOptionById={async (id) => {
                                        if (id == null || id === "") return null;
                                        const res = await productionOrderService.getProductionOrderById(id);
                                        return res?.result || res || null;
                                    }}
                                    getOptionLabel={(order) => orderLabel(order) || String(order?.id ?? "")}
                                    value={orderOption || (formData.production_order_id ? { id: parseInt(formData.production_order_id, 10) } : null)}
                                    onChange={(e, newValue) => {
                                        setOrderOption(newValue);
                                        setComponentLines([]);
                                        setFgSerials([]);
                                        handleChange({
                                            target: { name: "production_order_id", value: newValue?.id ?? "" },
                                        });
                                    }}
                                    required
                                    error={!!formErrors.production_order_id}
                                    helperText={formErrors.production_order_id}
                                />
                            </div>
                            
                            {backflush && (
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order No</span>
                                        <span className="font-bold text-foreground text-sm">{backflush.order_no}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Finished Good</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-foreground text-sm">{backflush.fg_product_name}</span>
                                            {isSerializedFg && (
                                                <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-bold text-primary uppercase">
                                                    Serial
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Planned</span>
                                        <span className="font-semibold text-foreground text-sm">{backflush.planned_quantity}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Booked</span>
                                        <span className="font-semibold text-foreground text-sm">{backflush.already_booked_quantity}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 border-l pl-4 border-border/50">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Remaining</span>
                                        <span className="font-black text-2xl leading-none bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">{backflush.remaining_quantity}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {backflushError && (
                            <div className="p-4 bg-destructive/5 text-destructive text-sm border-t border-destructive/10 flex items-center gap-2">
                                <IconAlertCircle className="h-4 w-4" />
                                {backflushError}
                            </div>
                        )}
                    </div>

                    {/* TWO COLUMN LAYOUT */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                        
                        {/* LEFT SIDE: COMPONENT ISSUE & OPERATIONS */}
                        <div className="xl:col-span-8 flex flex-col gap-4">
                            <FormSection title="Component Issue" className="h-full border-transparent bg-transparent p-0 m-0 shadow-none">
                                {formErrors.components && (
                                    <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                        <IconAlertCircle className="h-4 w-4" />
                                        <span>{formErrors.components}</span>
                                    </div>
                                )}

                                {loadingBackflush && (
                                    <div className="flex items-center justify-center py-12 bg-card rounded-xl border border-border shadow-sm">
                                        <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                )}

                                {!loadingBackflush && componentLines.length === 0 && (
                                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center bg-muted/30">
                                        <p className="text-xs text-muted-foreground">
                                            Select a {AP.orders.singular.toLowerCase()} above to view required components.
                                        </p>
                                    </div>
                                )}

                                {!loadingBackflush && componentLines.length > 0 && (
                                    <div className="rounded-xl border border-border/60 bg-card/90 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                                        <div className="overflow-x-auto thin-scrollbar">
                                            <table className="w-full text-xs">
                                                <thead className="bg-muted/50 border-b border-border">
                                                    <tr>
                                                        <th className="px-2 py-2 text-left font-medium text-muted-foreground">Component</th>
                                                        <th className="px-2 py-2 text-right font-medium text-muted-foreground">Standard</th>
                                                        <th className="px-2 py-2 text-right font-medium text-muted-foreground">On Hand</th>
                                                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-24">Consumed</th>
                                                        <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">Scrap</th>
                                                        <th className="px-2 py-2 text-left font-medium text-muted-foreground w-36">Scrap Reason</th>
                                                        <th className="px-2 py-2 text-right font-medium text-muted-foreground">Variance</th>
                                                        <th className="px-2 py-2 text-right font-medium text-muted-foreground">Rate</th>
                                                        <th className="px-2 py-2 text-right font-medium text-muted-foreground">Amount</th>
                                                        <th className="px-2 py-2 text-left font-medium text-muted-foreground">Serials</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {componentLines.map((line, index) => {
                                                        const consumed = parseInt(line.consumed_quantity, 10) || 0;
                                                        const scrap = parseInt(line.scrap_quantity, 10) || 0;
                                                        const issued = consumed + scrap;
                                                        const variance = round(issued - toNumber(line.standard_quantity), 4);
                                                        const serialCount = (line.serials || []).length;
                                                        const serialComplete = serialCount === issued && issued > 0;
                                                        const isRowError = !!lineErrors[index];
                                                        
                                                        return (
                                                            <Fragment key={line.component_product_id}>
                                                                <tr className={cn(
                                                                    "transition-all duration-200 hover:bg-muted/40 hover:shadow-[inset_3px_0_0_0] hover:shadow-primary/60",
                                                                    isRowError && "bg-destructive/5 hover:bg-destructive/10 hover:shadow-destructive"
                                                                )}>
                                                                    <td className="px-2 py-2 align-middle">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="font-medium">{line.product_name}</span>
                                                                            {line.serial_required && (
                                                                                <span className="inline-flex h-4 items-center rounded-full bg-primary/10 px-1.5 text-[9px] font-bold tracking-wider text-primary uppercase">
                                                                                    Serial
                                                                                </span>
                                                                            )}
                                                                            {line.is_optional && (
                                                                                <span className="inline-flex h-4 items-center rounded-full bg-secondary px-1.5 text-[9px] font-bold tracking-wider text-secondary-foreground uppercase">
                                                                                    Optional
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-2 py-2 text-right align-middle">{line.standard_quantity}</td>
                                                                    <td className="px-2 py-2 text-right align-middle">{line.quantity_on_hand}</td>
                                                                    <td className="px-1.5 py-1 align-middle">
                                                                        <Input
                                                                            type="number"
                                                                            value={line.consumed_quantity}
                                                                            readOnly
                                                                            disabled
                                                                            aria-label={`${line.product_name} consumed quantity (fixed by backflush)`}
                                                                            className="h-7 text-xs text-right bg-muted/40 cursor-not-allowed opacity-100"
                                                                        />
                                                                    </td>
                                                                    <td className="px-1.5 py-1 align-middle">
                                                                        <Input
                                                                            type="number"
                                                                            value={line.scrap_quantity}
                                                                            onChange={(e) => updateLine(index, { scrap_quantity: e.target.value })}
                                                                            min={0}
                                                                            className="h-7 text-xs text-right bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/30 transition-all"
                                                                        />
                                                                    </td>
                                                                    <td className="px-1.5 py-1 align-middle">
                                                                        <Input
                                                                            placeholder={scrap > 0 ? "Required" : "-"}
                                                                            value={line.scrap_reason}
                                                                            onChange={(e) => updateLine(index, { scrap_reason: e.target.value })}
                                                                            disabled={scrap <= 0}
                                                                            className="h-7 text-xs bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/30 transition-all"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2 text-right align-middle">
                                                                        <span className={cn(
                                                                            "font-medium",
                                                                            variance > 0 ? "text-destructive" : variance < 0 ? "text-success" : "text-muted-foreground"
                                                                        )}>
                                                                            {variance > 0 ? "+" : ""}{variance}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-2 py-2 text-right align-middle text-muted-foreground">{toNumber(line.rate).toFixed(2)}</td>
                                                                    <td className="px-2 py-2 text-right align-middle font-medium">
                                                                        {round(issued * toNumber(line.rate), 2).toFixed(2)}
                                                                    </td>
                                                                    <td className="px-2 py-2 align-middle">
                                                                        {line.serial_required ? (
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                variant={serialComplete ? "outline" : "default"}
                                                                                onClick={() => toggleSerialPanel(index)}
                                                                                disabled={issued <= 0}
                                                                                className={cn("h-7 text-xs w-full justify-between gap-1 px-2 shadow-none transition-colors", serialComplete && "border-success text-success hover:bg-success/10 hover:text-success")}
                                                                            >
                                                                                <div className="flex items-center gap-1">
                                                                                    {serialComplete ? <IconCheck className="h-3 w-3" /> : <IconScan className="h-3 w-3" />}
                                                                                    <span>{serialCount} / {issued}</span>
                                                                                </div>
                                                                                {openSerialLine === index ? (
                                                                                    <IconChevronUp className="h-3 w-3 opacity-50" />
                                                                                ) : (
                                                                                    <IconChevronDown className="h-3 w-3 opacity-50" />
                                                                                )}
                                                                            </Button>
                                                                        ) : (
                                                                            <span className="text-muted-foreground/50 px-2">-</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                                {isRowError && (
                                                                    <tr className="bg-destructive/5 border-t-0">
                                                                        <td colSpan={10} className="px-3 pb-2.5 pt-0 text-xs text-destructive">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <IconAlertCircle className="h-3.5 w-3.5" />
                                                                                {lineErrors[index]}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                                
                                                                {/* Serial Panel Dropdown */}
                                                                {openSerialLine === index && (
                                                                    <tr className="bg-muted/30">
                                                                        <td colSpan={10} className="p-0 border-b border-border shadow-inner">
                                                                            <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                                                                                <div className="p-5 space-y-5">
                                                                                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-card rounded-lg border border-border p-4 shadow-sm">
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="outline"
                                                                                            className="w-full md:w-auto h-11 gap-2 font-medium"
                                                                                            onClick={() => setScannerOpen(true)}
                                                                                        >
                                                                                            <IconScan className="h-5 w-5 text-primary" />
                                                                                            Open Camera Scanner
                                                                                        </Button>
                                                                                        <BarcodeScanner
                                                                                            open={scannerOpen}
                                                                                            hint={`Scanning ${line.product_name}`}
                                                                                            onScan={(value) => {
                                                                                                const firstEmpty = serialSlots.findIndex(v => !(v || "").trim());
                                                                                                const idx = firstEmpty !== -1 ? firstEmpty : 0;
                                                                                                if (value?.trim()) handleSlotBulkOrSingle(idx, value);
                                                                                                setScannerOpen(false);
                                                                                            }}
                                                                                            onClose={() => setScannerOpen(false)}
                                                                                        />
                                                                                        <div className="hidden md:block w-px h-11 bg-border"></div>
                                                                                        <div className="flex-1 w-full relative">
                                                                                            <Input
                                                                                                inputRef={gunScanRef}
                                                                                                placeholder="Point scanner gun here, then scan..."
                                                                                                value={gunScanValue}
                                                                                                onChange={(e) => setGunScanValue(e.target.value)}
                                                                                                onKeyDown={handleGunScanKeyDown}
                                                                                                className="pl-10 h-11 bg-background text-base"
                                                                                            />
                                                                                            <IconScan className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                                                                        </div>
                                                                                    </div>

                                                                                    {serialSlotError && (
                                                                                        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20">
                                                                                            <IconAlertCircle className="h-5 w-5 flex-shrink-0" />
                                                                                            <span className="flex-1 font-medium">{serialSlotError}</span>
                                                                                            <button type="button" onClick={() => setSerialSlotError("")} className="hover:opacity-70">
                                                                                                <IconX className="h-5 w-5" />
                                                                                            </button>
                                                                                        </div>
                                                                                    )}

                                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                                                                        {serialSlots.map((value, slotIdx) => (
                                                                                            <div key={slotIdx} className="relative group">
                                                                                                <Input
                                                                                                    label={`Serial ${slotIdx + 1} of ${serialSlots.length}`}
                                                                                                    value={value}
                                                                                                    onChange={(e) => handleSlotBulkOrSingle(slotIdx, e.target.value)}
                                                                                                    onKeyDown={(e) => handleSlotKeyDown(slotIdx, e)}
                                                                                                    inputRef={(el) => { serialInputRefs.current[slotIdx] = el; }}
                                                                                                    autoComplete="off"
                                                                                                    className="pr-10 bg-background font-mono font-semibold"
                                                                                                />
                                                                                                {value?.trim() && (
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        tabIndex={-1}
                                                                                                        onClick={() => handleSlotChange(slotIdx, "")}
                                                                                                        className="absolute right-2.5 top-[34px] rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                                    >
                                                                                                        <IconX className="h-4 w-4" />
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>

                                                                                    <div className="flex justify-end gap-3 pt-2">
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="ghost"
                                                                                            onClick={() => toggleSerialPanel(index)}
                                                                                            disabled={serialValidating}
                                                                                            className="h-10 px-6 font-medium"
                                                                                        >
                                                                                            Cancel
                                                                                        </Button>
                                                                                        <LoadingButton
                                                                                            type="button"
                                                                                            onClick={handleSerialPanelDone}
                                                                                            loading={serialValidating}
                                                                                            className="min-w-[120px] h-10 font-semibold"
                                                                                        >
                                                                                            Done
                                                                                        </LoadingButton>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </Fragment>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </FormSection>

                            {backflush?.operations?.length > 0 && (
                                <FormSection title="Operation Costs (from BOM)" className="border-transparent bg-transparent p-0 m-0 shadow-none">
                                    <div className="rounded-xl border border-border/60 bg-card/90 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
                                        <div className="overflow-x-auto thin-scrollbar">
                                            <table className="w-full text-xs">
                                                <thead className="bg-muted/50 border-b border-border">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground w-12">Seq</th>
                                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Operation</th>
                                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Cost Type</th>
                                                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Std Minutes</th>
                                                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Rate / Hour</th>
                                                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cost</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {backflush.operations.map((op) => (
                                                        <tr key={`${op.sequence_no}-${op.operation_name}`} className="transition-all duration-200 hover:bg-muted/40">
                                                            <td className="px-3 py-2 text-muted-foreground">{op.sequence_no}</td>
                                                            <td className="px-3 py-2 font-medium">{op.operation_name}</td>
                                                            <td className="px-3 py-2 text-muted-foreground">
                                                                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] uppercase font-bold">
                                                                    {op.cost_type}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-right">{op.std_time_minutes}</td>
                                                            <td className="px-3 py-2 text-right text-muted-foreground">{toNumber(op.rate_per_hour).toFixed(2)}</td>
                                                            <td className="px-3 py-2 text-right font-medium">{toNumber(op.cost).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </FormSection>
                            )}
                        </div>

                        {/* RIGHT SIDE: PRODUCTION BOOKING */}
                        <div className="xl:col-span-4 flex flex-col gap-4 xl:sticky xl:top-4">
                            
                            <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-md overflow-hidden flex flex-col relative transition-all duration-300 hover:shadow-lg">
                                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-primary/50"></div>
                                <div className="border-b border-border/50 bg-muted/10 px-4 py-3">
                                    <h3 className="text-base font-bold text-foreground drop-shadow-sm">{AP.book.title}</h3>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Enter execution details for this run.</p>
                                </div>
                                <div className="p-4 flex flex-col gap-3.5">
                                    <DateField
                                        name="booking_date"
                                        label="Booking Date *"
                                        value={formData.booking_date}
                                        onChange={handleChange}
                                        required
                                        error={!!formErrors.booking_date}
                                        helperText={formErrors.booking_date}
                                    />
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            name="good_quantity"
                                            label="Good Qty *"
                                            type="number"
                                            value={formData.good_quantity}
                                            onChange={handleChange}
                                            min={0}
                                            error={!!formErrors.good_quantity}
                                            helperText={formErrors.good_quantity}
                                        />
                                        <Input
                                            name="rejected_quantity"
                                            label="Rejected Qty"
                                            type="number"
                                            value={formData.rejected_quantity}
                                            onChange={handleChange}
                                            min={0}
                                            helperText={rejectedQty > 0 ? "Rejection routing applies" : ""}
                                        />
                                    </div>

                                    {rejectedQty > 0 && (
                                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 p-4 bg-muted/30 rounded-lg border border-border/50">
                                            <AutocompleteField
                                                label="Rejection Warehouse *"
                                                placeholder="Type to search..."
                                                options={warehouses}
                                                getOptionLabel={(w) => w?.name ?? String(w?.id ?? "")}
                                                value={warehouses.find((w) => w.id === parseInt(formData.rejection_warehouse_id, 10)) || null}
                                                onChange={(e, newValue) => handleChange({ target: { name: "rejection_warehouse_id", value: newValue?.id ?? "" } })}
                                                required
                                                error={!!formErrors.rejection_warehouse_id}
                                                helperText={formErrors.rejection_warehouse_id}
                                            />
                                            <Input
                                                name="rejection_reason"
                                                label="Rejection Reason *"
                                                value={formData.rejection_reason}
                                                onChange={handleChange}
                                                required
                                                error={!!formErrors.rejection_reason}
                                                helperText={formErrors.rejection_reason}
                                            />
                                        </div>
                                    )}

                                    <Input
                                        name="remarks"
                                        label="Remarks"
                                        value={formData.remarks}
                                        onChange={handleChange}
                                        placeholder="Add any additional notes here..."
                                    />
                                </div>
                            </div>

                            {isSerializedFg && outputQuantity > 0 && (
                                <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-md overflow-hidden flex flex-col transition-all duration-300 hover:shadow-lg">
                                    <div className="border-b border-border/50 bg-muted/10 px-4 py-3 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground">Finished Good Serials</h3>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">Required for output units.</p>
                                        </div>
                                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                            {fgSerials.length}
                                        </span>
                                    </div>
                                    <div className="p-4 flex flex-col gap-3.5">
                                        {fgSerials.map((value, index) => (
                                            <Input
                                                key={index}
                                                label={`FG Serial ${index + 1} (${index < goodQty ? "GOOD" : "REJECTED"})`}
                                                value={value}
                                                onChange={(e) => {
                                                    const nextValue = e.target.value;
                                                    setFgSerials((prev) => {
                                                        const next = [...prev];
                                                        next[index] = nextValue;
                                                        return next;
                                                    });
                                                    setFormErrors((prev) => {
                                                        const next = { ...prev };
                                                        delete next.fg_serials;
                                                        return next;
                                                    });
                                                }}
                                                autoComplete="off"
                                                error={!!formErrors.fg_serials}
                                                helperText={index === 0 ? formErrors.fg_serials : ""}
                                                className="font-mono text-sm bg-background font-semibold h-8"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ACTIONS WITH COST SUMMARY */}
                            <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-lg p-3.5 flex flex-col gap-3 mt-auto relative overflow-hidden group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-lg pointer-events-none"></div>
                                {componentLines.length > 0 && (
                                    <div className="flex justify-between items-center px-1 pb-2 border-b border-border/40 relative">
                                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">FG Unit Cost</span>
                                        <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70 drop-shadow-sm">
                                            ₹{costPreview.unit.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                <p className="text-[10px] text-muted-foreground leading-snug relative">
                                    Submitting posts inventory immediately. This cannot be undone except by cancelling the booking from the register.
                                </p>
                                <div className="flex gap-2.5 relative">
                                    {onCancel && (
                                        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="w-1/3 h-10 font-medium hover:bg-muted/50 transition-colors">
                                            Cancel
                                        </Button>
                                    )}
                                    <LoadingButton
                                        type="submit"
                                        form="production-booking-form"
                                        loading={loading}
                                        className={cn("h-10 text-sm font-bold tracking-wide shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-300 bg-gradient-to-r from-primary to-primary/90", onCancel ? "w-2/3" : "w-full")}
                                    >
                                        {AP.book.action}
                                    </LoadingButton>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </form>
        </FormContainer>
    );
}
