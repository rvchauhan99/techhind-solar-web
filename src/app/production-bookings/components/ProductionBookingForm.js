"use client";

import { Fragment, useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
    Box,
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
    Chip,
    Collapse,
    TextField,
    Divider,
    Typography,
    FormHelperText,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ClearIcon from "@mui/icons-material/Clear";
import companyService from "@/services/companyService";
import productionOrderService from "@/services/productionOrderService";
import productionBookingService from "@/services/productionBookingService";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import { splitSerialInput, fillSerialSlots } from "@/utils/serialInput";
import { FORM_PADDING } from "@/utils/formConstants";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { getApiErrorMessage } from "@/utils/toast";

const DENSE_TABLE_SX = {
    "& th": { py: 0.5, px: 0.75, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
    "& td": { py: 0.5, px: 0.75, fontSize: 12 },
};

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

    // Backflush suggests component consumption and costs for the chosen output quantity.
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
                            consumed_quantity: String(
                                previous?.consumed_quantity ?? line.suggested_consumed_quantity
                            ),
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

    // A serialized finished good is one unit per booking, so keep the slots in sync.
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

        if (!formData.production_order_id) errs.production_order_id = "Production order is required";
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
            errs.good_quantity = `Only ${backflush.remaining_quantity} unit(s) remain on this order`;
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
        <FormContainer className="flex-1 min-h-0 flex flex-col">
            <form
                id="production-booking-form"
                onSubmit={handleSubmit}
                onKeyDown={preventEnterSubmit}
                className="mx-auto w-full max-w-[1280px] flex flex-col flex-1 min-h-0"
                noValidate
            >
                <Box sx={{ p: FORM_PADDING }}>
                    {serverError && (
                        <Alert severity="error" sx={{ mb: 1 }} onClose={onClearServerError}>
                            {serverError}
                        </Alert>
                    )}

                    <FormGrid cols={2} className="lg:grid-cols-4">
                        <AutocompleteField
                            label="Production Order *"
                            placeholder="Type to search approved orders..."
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
                        <DateField
                            name="booking_date"
                            label="Booking Date *"
                            value={formData.booking_date}
                            onChange={handleChange}
                            required
                            error={!!formErrors.booking_date}
                            helperText={formErrors.booking_date}
                        />
                        <Input
                            name="good_quantity"
                            label="Good Qty *"
                            type="number"
                            value={formData.good_quantity}
                            onChange={handleChange}
                            inputProps={{ min: 0 }}
                            error={!!formErrors.good_quantity}
                            helperText={
                                formErrors.good_quantity ||
                                (backflush ? `Remaining on order: ${backflush.remaining_quantity}` : "")
                            }
                        />
                        <Input
                            name="rejected_quantity"
                            label="Rejected Qty"
                            type="number"
                            value={formData.rejected_quantity}
                            onChange={handleChange}
                            inputProps={{ min: 0 }}
                            helperText={rejectedQty > 0 ? "Rejected units go to the rejection warehouse" : ""}
                        />
                        {rejectedQty > 0 && (
                            <>
                                <AutocompleteField
                                    label="Rejection Warehouse *"
                                    placeholder="Type to search..."
                                    options={warehouses}
                                    getOptionLabel={(w) => w?.name ?? String(w?.id ?? "")}
                                    value={
                                        warehouses.find(
                                            (w) => w.id === parseInt(formData.rejection_warehouse_id, 10)
                                        ) || null
                                    }
                                    onChange={(e, newValue) =>
                                        handleChange({
                                            target: { name: "rejection_warehouse_id", value: newValue?.id ?? "" },
                                        })
                                    }
                                    required
                                    error={!!formErrors.rejection_warehouse_id}
                                    helperText={
                                        formErrors.rejection_warehouse_id ||
                                        "Leave the configured default unless routing elsewhere"
                                    }
                                />
                                <div className="md:col-span-2">
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
                            </>
                        )}
                        <div className="md:col-span-2">
                            <Input
                                name="remarks"
                                label="Remarks"
                                value={formData.remarks}
                                onChange={handleChange}
                            />
                        </div>
                    </FormGrid>

                    {backflushError && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                            {backflushError}
                        </Alert>
                    )}

                    {backflush && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-muted/40 p-1.5 text-xs">
                            <span>
                                <span className="text-muted-foreground">Order </span>
                                <span className="font-semibold">{backflush.order_no}</span>
                            </span>
                            <span>
                                <span className="text-muted-foreground">Finished Good </span>
                                <span className="font-semibold">{backflush.fg_product_name}</span>
                                {isSerializedFg && (
                                    <Chip label="Serial" size="small" color="primary" sx={{ ml: 0.75, height: 18 }} />
                                )}
                            </span>
                            <span>
                                <span className="text-muted-foreground">Planned </span>
                                {backflush.planned_quantity}
                            </span>
                            <span>
                                <span className="text-muted-foreground">Already booked </span>
                                {backflush.already_booked_quantity}
                            </span>
                            <span>
                                <span className="text-muted-foreground">Remaining </span>
                                <span className="font-semibold">{backflush.remaining_quantity}</span>
                            </span>
                        </div>
                    )}

                    <FormSection title="Component Consumption" className="mt-1.5">
                        {formErrors.components && (
                            <Alert severity="error" sx={{ mb: 0.75 }}>
                                {formErrors.components}
                            </Alert>
                        )}

                        {loadingBackflush && (
                            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                                <CircularProgress size={22} />
                            </Box>
                        )}

                        {!loadingBackflush && componentLines.length === 0 && (
                            <p className="py-2 text-xs text-muted-foreground">
                                Select a production order and enter a quantity to backflush the component
                                requirement.
                            </p>
                        )}

                        {!loadingBackflush && componentLines.length > 0 && (
                            <TableContainer component={Paper}>
                                <Table size="small" sx={DENSE_TABLE_SX}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Component</TableCell>
                                            <TableCell align="right">Standard</TableCell>
                                            <TableCell align="right">On Hand</TableCell>
                                            <TableCell align="right" sx={{ width: 96 }}>
                                                Consumed
                                            </TableCell>
                                            <TableCell align="right" sx={{ width: 88 }}>
                                                Scrap
                                            </TableCell>
                                            <TableCell sx={{ width: 160 }}>Scrap Reason</TableCell>
                                            <TableCell align="right">Variance</TableCell>
                                            <TableCell align="right">Rate</TableCell>
                                            <TableCell align="right">Amount</TableCell>
                                            <TableCell>Serials</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {componentLines.map((line, index) => {
                                            const consumed = parseInt(line.consumed_quantity, 10) || 0;
                                            const scrap = parseInt(line.scrap_quantity, 10) || 0;
                                            const issued = consumed + scrap;
                                            const variance = round(issued - toNumber(line.standard_quantity), 4);
                                            const serialCount = (line.serials || []).length;
                                            const serialComplete = serialCount === issued && issued > 0;
                                            return (
                                                <Fragment key={line.component_product_id}>
                                                    <TableRow
                                                        sx={lineErrors[index] ? { bgcolor: "error.light" } : undefined}
                                                    >
                                                        <TableCell>
                                                            {line.product_name}
                                                            {line.serial_required && (
                                                                <Chip
                                                                    label="Serial"
                                                                    size="small"
                                                                    color="primary"
                                                                    sx={{ ml: 0.75, height: 18 }}
                                                                />
                                                            )}
                                                            {line.is_optional && (
                                                                <Chip
                                                                    label="Optional"
                                                                    size="small"
                                                                    sx={{ ml: 0.75, height: 18 }}
                                                                />
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="right">{line.standard_quantity}</TableCell>
                                                        <TableCell align="right">{line.quantity_on_hand}</TableCell>
                                                        <TableCell align="right">
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={line.consumed_quantity}
                                                                onChange={(e) =>
                                                                    updateLine(index, { consumed_quantity: e.target.value })
                                                                }
                                                                inputProps={{ min: 0, style: { textAlign: "right", padding: "4px 6px", fontSize: 12 } }}
                                                                sx={{ width: 80 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={line.scrap_quantity}
                                                                onChange={(e) =>
                                                                    updateLine(index, { scrap_quantity: e.target.value })
                                                                }
                                                                inputProps={{ min: 0, style: { textAlign: "right", padding: "4px 6px", fontSize: 12 } }}
                                                                sx={{ width: 72 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                size="small"
                                                                fullWidth
                                                                placeholder={scrap > 0 ? "Required" : "-"}
                                                                value={line.scrap_reason}
                                                                onChange={(e) =>
                                                                    updateLine(index, { scrap_reason: e.target.value })
                                                                }
                                                                disabled={scrap <= 0}
                                                                inputProps={{ style: { padding: "4px 6px", fontSize: 12 } }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <span
                                                                className={
                                                                    variance > 0
                                                                        ? "font-semibold text-destructive"
                                                                        : variance < 0
                                                                            ? "font-semibold text-green-700"
                                                                            : undefined
                                                                }
                                                            >
                                                                {variance}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell align="right">{toNumber(line.rate).toFixed(2)}</TableCell>
                                                        <TableCell align="right">
                                                            {round(issued * toNumber(line.rate), 2).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {line.serial_required ? (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant={serialComplete ? "outline" : "default"}
                                                                    onClick={() => toggleSerialPanel(index)}
                                                                    disabled={issued <= 0}
                                                                    className="h-7 gap-1 px-2 text-xs"
                                                                >
                                                                    <QrCodeScannerIcon sx={{ fontSize: 16 }} />
                                                                    {serialCount} / {issued}
                                                                    {openSerialLine === index ? (
                                                                        <ExpandLessIcon sx={{ fontSize: 16 }} />
                                                                    ) : (
                                                                        <ExpandMoreIcon sx={{ fontSize: 16 }} />
                                                                    )}
                                                                </Button>
                                                            ) : (
                                                                <span className="text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                    {lineErrors[index] && (
                                                        <TableRow>
                                                            <TableCell colSpan={10} sx={{ py: 0.25 }}>
                                                                <FormHelperText error>{lineErrors[index]}</FormHelperText>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                    <TableRow>
                                                        <TableCell colSpan={10} sx={{ p: 0, border: 0 }}>
                                                            <Collapse in={openSerialLine === index} timeout="auto" unmountOnExit>
                                                                <Box sx={{ p: 1, bgcolor: "action.hover" }}>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="mb-2 flex w-full min-h-[38px] touch-manipulation items-center justify-center gap-1.5"
                                                                        onClick={() => setScannerOpen(true)}
                                                                    >
                                                                        <QrCodeScannerIcon sx={{ fontSize: 20 }} />
                                                                        Scan Barcode / QR Code
                                                                    </Button>
                                                                    <BarcodeScanner
                                                                        open={scannerOpen}
                                                                        hint={`Scanning ${line.product_name}`}
                                                                        onScan={(value) => {
                                                                            const firstEmpty = serialSlots.findIndex(
                                                                                (v) => !(v || "").trim()
                                                                            );
                                                                            const idx = firstEmpty !== -1 ? firstEmpty : 0;
                                                                            if (value?.trim()) handleSlotBulkOrSingle(idx, value);
                                                                            setScannerOpen(false);
                                                                        }}
                                                                        onClose={() => setScannerOpen(false)}
                                                                    />
                                                                    <TextField
                                                                        inputRef={gunScanRef}
                                                                        size="small"
                                                                        fullWidth
                                                                        label="Scan with gun"
                                                                        placeholder="Scanner gun types here, then Enter"
                                                                        value={gunScanValue}
                                                                        onChange={(e) => setGunScanValue(e.target.value)}
                                                                        onKeyDown={handleGunScanKeyDown}
                                                                        variant="outlined"
                                                                        sx={{ mb: 1 }}
                                                                        helperText="Point scanner here; it will type and press Enter."
                                                                    />
                                                                    <Divider sx={{ mb: 1 }}>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            or type manually
                                                                        </Typography>
                                                                    </Divider>
                                                                    {serialSlotError && (
                                                                        <Alert
                                                                            severity="error"
                                                                            sx={{ mb: 1 }}
                                                                            onClose={() => setSerialSlotError("")}
                                                                        >
                                                                            {serialSlotError}
                                                                        </Alert>
                                                                    )}
                                                                    <Box
                                                                        sx={{
                                                                            display: "grid",
                                                                            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
                                                                            gap: 1,
                                                                            mb: 1,
                                                                        }}
                                                                    >
                                                                        {serialSlots.map((value, slotIdx) => (
                                                                            <TextField
                                                                                key={slotIdx}
                                                                                size="small"
                                                                                fullWidth
                                                                                label={`Serial ${slotIdx + 1} of ${serialSlots.length}`}
                                                                                value={value}
                                                                                onChange={(e) =>
                                                                                    handleSlotBulkOrSingle(slotIdx, e.target.value)
                                                                                }
                                                                                onKeyDown={(e) => handleSlotKeyDown(slotIdx, e)}
                                                                                inputRef={(el) => {
                                                                                    serialInputRefs.current[slotIdx] = el;
                                                                                }}
                                                                                variant="outlined"
                                                                                autoComplete="off"
                                                                                InputProps={{
                                                                                    endAdornment: value?.trim() ? (
                                                                                        <IconButton
                                                                                            size="small"
                                                                                            tabIndex={-1}
                                                                                            onClick={() => handleSlotChange(slotIdx, "")}
                                                                                        >
                                                                                            <ClearIcon fontSize="small" />
                                                                                        </IconButton>
                                                                                    ) : null,
                                                                                }}
                                                                            />
                                                                        ))}
                                                                    </Box>
                                                                    <Box sx={{ display: "flex", gap: 1 }}>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="flex-1 min-h-[38px]"
                                                                            onClick={() => toggleSerialPanel(index)}
                                                                            disabled={serialValidating}
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            className="flex-1 min-h-[38px]"
                                                                            onClick={handleSerialPanelDone}
                                                                            disabled={serialValidating}
                                                                        >
                                                                            {serialValidating ? "Validating…" : "Done"}
                                                                        </Button>
                                                                    </Box>
                                                                </Box>
                                                            </Collapse>
                                                        </TableCell>
                                                    </TableRow>
                                                </Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </FormSection>

                    {isSerializedFg && outputQuantity > 0 && (
                        <FormSection title="Finished Good Serial Numbers" className="mt-1.5">
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                    gap: 1,
                                }}
                            >
                                {fgSerials.map((value, index) => (
                                    <TextField
                                        key={index}
                                        size="small"
                                        fullWidth
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
                                        variant="outlined"
                                        autoComplete="off"
                                        error={!!formErrors.fg_serials}
                                        helperText={index === 0 ? formErrors.fg_serials : ""}
                                    />
                                ))}
                            </Box>
                        </FormSection>
                    )}

                    {backflush?.operations?.length > 0 && (
                        <FormSection title="Operation Costs (from BOM standard)" className="mt-1.5">
                            <TableContainer component={Paper}>
                                <Table size="small" sx={DENSE_TABLE_SX}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Seq</TableCell>
                                            <TableCell>Operation</TableCell>
                                            <TableCell>Cost Type</TableCell>
                                            <TableCell align="right">Std Minutes</TableCell>
                                            <TableCell align="right">Rate / Hour</TableCell>
                                            <TableCell align="right">Cost for this Booking</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {backflush.operations.map((op) => (
                                            <TableRow key={`${op.sequence_no}-${op.operation_name}`}>
                                                <TableCell>{op.sequence_no}</TableCell>
                                                <TableCell>{op.operation_name}</TableCell>
                                                <TableCell>{op.cost_type}</TableCell>
                                                <TableCell align="right">{op.std_time_minutes}</TableCell>
                                                <TableCell align="right">{toNumber(op.rate_per_hour).toFixed(2)}</TableCell>
                                                <TableCell align="right">{toNumber(op.cost).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </FormSection>
                    )}

                    {componentLines.length > 0 && (
                        <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-md border border-border bg-muted/40 p-1.5 text-xs sm:grid-cols-4">
                            <div>
                                <span className="block text-muted-foreground">Material Cost</span>
                                <span className="font-semibold">{costPreview.material.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="block text-muted-foreground">Operation Cost</span>
                                <span className="font-semibold">{costPreview.operation.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="block text-muted-foreground">Total Cost</span>
                                <span className="font-semibold">{costPreview.total.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="block text-muted-foreground">FG Unit Cost</span>
                                <span className="font-semibold text-primary">{costPreview.unit.toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </Box>
            </form>

            <FormActions>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                )}
                <LoadingButton
                    type="submit"
                    form="production-booking-form"
                    loading={loading}
                    className="min-w-[140px]"
                >
                    {isEdit ? "Update Draft" : "Save as Draft"}
                </LoadingButton>
            </FormActions>
        </FormContainer>
    );
}
