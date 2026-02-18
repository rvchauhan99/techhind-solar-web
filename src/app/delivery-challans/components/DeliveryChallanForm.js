"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import {
    Box,
    Grid,
    Typography,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Card,
    CardContent,
    FormHelperText,
    CircularProgress,
    Collapse,
    TextField,
    IconButton,
    Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import { toastError } from "@/utils/toast";
import { COMPACT_FORM_SPACING, COMPACT_SECTION_HEADER_STYLE, FORM_PADDING } from "@/utils/formConstants";
import orderService from "@/services/orderService";
import stockService from "@/services/stockService";

/**
 * DeliveryChallanForm
 *
 * Reusable form component for creating a delivery challan.
 * Follows the same page + form split pattern as PurchaseOrderForm and POInwardForm.
 *
 * @param {string|null}  orderIdParam       - Pre-selected order ID (from URL query, e.g. Confirm Orders flow)
 * @param {Function}     onSubmit           - Called with the validated payload
 * @param {boolean}      loading            - Whether the parent is processing the submission
 * @param {string|null}  serverError        - Server-side error message to display
 * @param {Function}     onClearServerError - Clears the server error
 * @param {Function}     onCancel           - Cancel handler
 */
export default function DeliveryChallanForm({
    orderIdParam = null,
    onSubmit,
    loading = false,
    serverError = null,
    onClearServerError = () => {},
    onCancel = null,
}) {
    const compactCardContentSx = { p: 1, "&:last-child": { pb: 1 } };
    const compactCellSx = { py: 0.5, px: 1 };

    // ── State ──────────────────────────────────────────────────────────
    const [order, setOrder] = useState(null);
    const [selectedOrderOption, setSelectedOrderOption] = useState(null);
    const [availableOrders, setAvailableOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [formData, setFormData] = useState({
        challan_date: new Date().toISOString().split("T")[0],
        transporter: "",
        remarks: "",
    });

    const [lines, setLines] = useState([]);
    const [errors, setErrors] = useState({});
    const [stockByProductId, setStockByProductId] = useState({});
    const [serialDrafts, setSerialDrafts] = useState({});
    /** Available serials per BOM line index (for serial_required lines). Used to validate scan/add. */
    const [availableSerialsByLineIndex, setAvailableSerialsByLineIndex] = useState({});
    /** Serial drawer (expandable row): which line is expanded, values, errors */
    const [expandedSerialLineIndex, setExpandedSerialLineIndex] = useState(null);
    const [serialDrawerValues, setSerialDrawerValues] = useState([]);
    const [serialDrawerError, setSerialDrawerError] = useState("");
    const [serialDrawerFieldErrors, setSerialDrawerFieldErrors] = useState({});
    const [serialDrawerValidating, setSerialDrawerValidating] = useState(null);
    const serialInputRefs = useRef([]);

    /** Barcode / QR scanner */
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanTargetIndex, setScanTargetIndex] = useState(null);

    // ── Build BOM lines from order data ────────────────────────────────
    const buildLinesFromOrder = (data, stockMap = stockByProductId) => {
        const bom = Array.isArray(data?.bom_snapshot) ? data.bom_snapshot : [];
        const product = (l) => l?.product_snapshot || l;
        return bom.map((line) => {
            const p = product(line);
            const rawQty = Number(line.quantity) || 0;
            const planned = line.planned_qty != null && !Number.isNaN(Number(line.planned_qty))
                ? Number(line.planned_qty)
                : rawQty;
            const shipped = Number(line.shipped_qty) || 0;
            const pending =
                line.pending_qty != null && !Number.isNaN(Number(line.pending_qty))
                    ? Number(line.pending_qty)
                    : Math.max(0, planned - shipped + (Number(line.returned_qty) || 0));
            const stockRow = stockMap && stockMap[line.product_id];
            const available =
                stockRow && stockRow.quantity_available != null && !Number.isNaN(Number(stockRow.quantity_available))
                    ? Number(stockRow.quantity_available)
                    : 0;
            const unitName = p?.measurement_unit_name || line.measurement_unit_name || "";
            return {
                product_id: line.product_id,
                product_name: p?.product_name || "",
                product_type_name: p?.product_type_name || "",
                make_name: p?.product_make_name || "",
                required_qty: planned,
                shipped_qty: shipped,
                pending_qty: pending,
                available_qty: available,
                unit_name: unitName,
                ship_now: "",
                serials: [],
                serial_required: !!p?.serial_required,
            };
        });
    };

    // ── Load a specific order by ID ────────────────────────────────────
    const loadOrderById = async (id) => {
        if (!id) return;
        try {
            setInitialLoading(true);
            const res = await orderService.getOrderById(id);
            const data = res?.result || res;
            // Load stock for planned warehouse (if available) so we can show available quantities
            let stockMap = {};
            if (data?.planned_warehouse_id) {
                try {
                    const stockRes = await stockService.getStocksByWarehouse(data.planned_warehouse_id);
                    const stockData = stockRes?.result || stockRes || [];
                    if (Array.isArray(stockData)) {
                        stockData.forEach((s) => {
                            if (s && s.product_id != null) {
                                stockMap[s.product_id] = s;
                            }
                        });
                    }
                } catch (stockErr) {
                    console.error("Failed to load warehouse stock for challan:", stockErr);
                    // Non-fatal: we can still proceed without stock info
                }
            }
            setStockByProductId(stockMap);
            setOrder(data);
            setSelectedOrderOption(null);
            const newLines = buildLinesFromOrder(data, stockMap);
            setLines(newLines);

            // Load available serials for each serialized BOM line (for strict validation on add)
            const warehouseId = data?.planned_warehouse_id;
            if (warehouseId) {
                const byIndex = {};
                await Promise.all(
                    newLines.map(async (line, index) => {
                        if (!line.serial_required) return;
                        try {
                            const res = await stockService.getAvailableSerials(line.product_id, warehouseId);
                            const list = res?.result ?? res ?? [];
                            byIndex[index] = Array.isArray(list) ? list : [];
                        } catch (e) {
                            console.error("Failed to load available serials for line", index, e);
                            byIndex[index] = [];
                        }
                    })
                );
                setAvailableSerialsByLineIndex(byIndex);
            } else {
                setAvailableSerialsByLineIndex({});
            }

            // Clear order_id error when order is loaded
            setErrors((prev) => {
                const next = { ...prev };
                delete next.order_id;
                return next;
            });
        } catch (err) {
            console.error("Failed to load order for challan:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to load order";
            setOrder(null);
            setLines([]);
            setAvailableSerialsByLineIndex({});
            toastError(msg);
        } finally {
            setInitialLoading(false);
        }
    };

    // ── Initial load ───────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            if (orderIdParam) {
                await loadOrderById(orderIdParam);
                return;
            }

            // No order_id given — load pending-delivery orders for the user to pick
            try {
                setOrdersLoading(true);
                setInitialLoading(false);
                const res = await orderService.getPendingDeliveryOrders();
                const data = res?.result || res || [];
                setAvailableOrders(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to load eligible orders:", err);
                const msg = err?.response?.data?.message || err?.message || "Failed to load eligible orders";
                setAvailableOrders([]);
                toastError(msg);
            } finally {
                setOrdersLoading(false);
            }
        };

        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderIdParam]);

    // ── Handlers ───────────────────────────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
        if (serverError) {
            onClearServerError();
        }
    };

    const handleShipNowChange = (index, value) => {
        let pendingForLine = 0;
        let availableForLine = 0;
        const shipNowNum = Number(value) || 0;
        const line = lines[index];
        const isSerialRequired = line?.serial_required;

        if (expandedSerialLineIndex === index) {
            closeSerialRowExpand();
        }

        setLines((prev) =>
            prev.map((l, i) => {
                if (i !== index) return l;
                const newLine = { ...l, ship_now: value };
                // Reset serials if ship_now changes
                if (l.serial_required && newLine.serials.length > shipNowNum) {
                    newLine.serials = newLine.serials.slice(0, shipNowNum);
                }
                pendingForLine = newLine.pending_qty;
                availableForLine = newLine.available_qty;
                return newLine;
            })
        );

        // Per-field validation immediately when value changes
        setErrors((prev) => {
            const next = { ...prev };
            const key = `line_${index}_ship_now`;

            if (!shipNowNum || shipNowNum <= 0) {
                delete next[key];
                return next;
            }

            if (!Number.isInteger(shipNowNum)) {
                next[key] = "Must be a whole number";
            } else if (shipNowNum > pendingForLine) {
                next[key] = `Cannot exceed remaining (${pendingForLine})`;
            } else if (
                availableForLine != null &&
                !Number.isNaN(Number(availableForLine)) &&
                shipNowNum > availableForLine
            ) {
                next[key] = `Cannot exceed available stock (${availableForLine})`;
            } else {
                delete next[key];
            }

            return next;
        });

        // Auto-open serial drawer when user enters ship qty for a serialized item
        if (isSerialRequired && shipNowNum > 0) {
            setTimeout(() => {
                const existing = (line.serials || []).map((s) => String(s || "").trim()).slice(0, shipNowNum);
                const padded = Array.from({ length: shipNowNum }, (_, i) => existing[i] ?? "");
                setSerialDrawerValues(padded);
                setSerialDrawerError("");
                setSerialDrawerFieldErrors({});
                setSerialDrawerValidating(null);
                setExpandedSerialLineIndex(index);
                serialInputRefs.current = [];
                setTimeout(() => serialInputRefs.current[0]?.focus(), 100);
            }, 0);
        }
    };

    const handleSerialAdd = (lineIndex, serialNumber) => {
        const trimmed = (serialNumber || "").trim();
        if (!trimmed) return;

        const availableList = availableSerialsByLineIndex[lineIndex];
        if (Array.isArray(availableList) && availableList.length > 0) {
            const isAvailable = availableList.some(
                (s) => (s.serial_number || "").trim() === trimmed
            );
            if (!isAvailable) {
                toastError("This serial is not available at this warehouse");
                return;
            }
        }

        setLines((prev) => {
            const currentLine = prev[lineIndex];
            const shipNow = Number(currentLine?.ship_now) || 0;
            if (currentLine && currentLine.serials.length >= shipNow) {
                toastError(`Maximum ${shipNow} serial numbers allowed for ship quantity`);
                return prev;
            }
            if (currentLine && currentLine.serials.includes(trimmed)) {
                toastError("Serial number already added");
                return prev;
            }
            const usedInOtherLine = prev.some(
                (line, i) => i !== lineIndex && (line.serials || []).includes(trimmed)
            );
            if (usedInOtherLine) {
                toastError("This serial is already used in another line");
                return prev;
            }
            return prev.map((line, i) => {
                if (i !== lineIndex) return line;
                return { ...line, serials: [...(line.serials || []), trimmed] };
            });
        });
    };

    const handleSerialRemove = (lineIndex, serialIndex) => {
        setLines((prev) =>
            prev.map((line, i) => {
                if (i !== lineIndex) return line;
                const newSerials = [...line.serials];
                newSerials.splice(serialIndex, 1);
                return { ...line, serials: newSerials };
            })
        );
    };

    const toggleSerialRowExpand = (lineIndex) => {
        const line = lines[lineIndex];
        if (!line?.serial_required) return;
        const shipNow = Number(line.ship_now) || 0;
        if (shipNow <= 0) return;

        if (expandedSerialLineIndex === lineIndex) {
            setExpandedSerialLineIndex(null);
            setSerialDrawerValues([]);
            setSerialDrawerError("");
            setSerialDrawerFieldErrors({});
            setSerialDrawerValidating(null);
            serialInputRefs.current = [];
            return;
        }

        const existing = (line.serials || []).map((s) => String(s || "").trim());
        const padded = Array.from({ length: shipNow }, (_, i) => existing[i] ?? "");
        setSerialDrawerValues(padded);
        setSerialDrawerError("");
        setSerialDrawerFieldErrors({});
        setSerialDrawerValidating(null);
        setExpandedSerialLineIndex(lineIndex);
        serialInputRefs.current = [];
        setTimeout(() => serialInputRefs.current[0]?.focus(), 100);
    };

    const closeSerialRowExpand = () => {
        setExpandedSerialLineIndex(null);
        setSerialDrawerValues([]);
        setSerialDrawerError("");
        setSerialDrawerFieldErrors({});
        setSerialDrawerValidating(null);
        serialInputRefs.current = [];
    };

    /** Open the camera scanner pointing at the first empty serial slot */
    const openScanner = () => {
        const firstEmpty = serialDrawerValues.findIndex((v) => !(v || "").trim());
        setScanTargetIndex(firstEmpty !== -1 ? firstEmpty : 0);
        setScannerOpen(true);
    };

    /**
     * Called by BarcodeScanner each time a code is decoded.
     * Fills the current target slot, validates it, then advances to the next empty slot.
     */
    const handleScanResult = (value) => {
        const trimmed = (value || "").trim();
        if (!trimmed || scanTargetIndex == null) return;

        // Fill the slot and validate
        handleSerialDrawerValueChange(scanTargetIndex, trimmed);
        validateSerialWithBackend(scanTargetIndex, trimmed);

        // Build an updated snapshot to find the next empty index
        const updated = serialDrawerValues.map((v, i) => (i === scanTargetIndex ? trimmed : v));
        const nextEmpty = updated.findIndex((v, i) => i > scanTargetIndex && !(v || "").trim());

        if (nextEmpty === -1) {
            // All slots will be filled — close scanner
            setScannerOpen(false);
            setScanTargetIndex(null);
        } else {
            setScanTargetIndex(nextEmpty);
        }
    };

    const scanHint =
        scanTargetIndex != null && serialDrawerValues.length > 0
            ? `Scanning serial ${scanTargetIndex + 1} of ${serialDrawerValues.length}`
            : "";

    const validateSerialWithBackend = async (drawerValueIndex, value) => {
        const trimmed = (value || "").trim();
        if (!trimmed || expandedSerialLineIndex == null) {
            setSerialDrawerFieldErrors((prev) => {
                const next = { ...prev };
                delete next[drawerValueIndex];
                return next;
            });
            return;
        }

        const line = lines[expandedSerialLineIndex];
        const warehouseId = order?.planned_warehouse_id;
        const productId = line?.product_id;
        if (!warehouseId || !productId) {
            setSerialDrawerFieldErrors((prev) => ({ ...prev, [drawerValueIndex]: "Warehouse or product missing" }));
            return;
        }

        setSerialDrawerValidating(drawerValueIndex);
        try {
            const res = await stockService.validateSerialAvailable(trimmed, productId, warehouseId);
            const result = res?.result ?? res;
            const valid = result?.valid === true;
            setSerialDrawerFieldErrors((prev) => {
                const next = { ...prev };
                if (valid) delete next[drawerValueIndex];
                else next[drawerValueIndex] = result?.message || "Serial is not available at this warehouse";
                return next;
            });
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Validation failed";
            setSerialDrawerFieldErrors((prev) => ({ ...prev, [drawerValueIndex]: msg }));
        } finally {
            setSerialDrawerValidating(null);
        }
    };

    const handleSerialDrawerValueChange = (index, value) => {
        setSerialDrawerValues((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
        setSerialDrawerFieldErrors((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
        setSerialDrawerError("");
    };

    const handleSerialDrawerKeyDown = (index, e) => {
        const shipNow = serialDrawerValues.length;
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            const value = (serialDrawerValues[index] || "").trim();
            if (value) validateSerialWithBackend(index, value);
            if (index < shipNow - 1) {
                serialInputRefs.current[index + 1]?.focus();
            } else {
                handleSerialDrawerDone();
            }
        }
    };

    const handleSerialDrawerDone = () => {
        const trimmed = serialDrawerValues.map((s) => String(s || "").trim());
        const emptyIndex = trimmed.findIndex((s) => !s);
        if (emptyIndex !== -1) {
            setSerialDrawerError("Please fill all serial numbers.");
            serialInputRefs.current[emptyIndex]?.focus();
            return;
        }
        const unique = new Set(trimmed);
        if (unique.size !== trimmed.length) {
            setSerialDrawerError("Duplicate serial numbers are not allowed.");
            return;
        }
        if (expandedSerialLineIndex == null) return;
        setLines((prev) =>
            prev.map((line, i) => {
                if (i !== expandedSerialLineIndex) return line;
                return { ...line, serials: trimmed };
            })
        );
        setErrors((prev) => {
            const next = { ...prev };
            delete next[`line_${expandedSerialLineIndex}_serials`];
            return next;
        });
        closeSerialRowExpand();
    };

    // ── Validation + payload ───────────────────────────────────────────
    const validate = () => {
        const validationErrors = {};

        if (!order?.id) {
            validationErrors.order_id = "Please select an order";
        }
        if (!formData.challan_date) {
            validationErrors.challan_date = "Challan Date is required";
        }

        let hasShipItems = false;

        lines.forEach((line, index) => {
            const shipNow = Number(line.ship_now);
            if (!shipNow || shipNow <= 0) return;

            hasShipItems = true;

            if (!Number.isInteger(shipNow)) {
                validationErrors[`line_${index}_ship_now`] = "Must be a whole number";
            }
            if (shipNow > line.pending_qty) {
                validationErrors[`line_${index}_ship_now`] = `Cannot exceed remaining (${line.pending_qty})`;
            } else if (line.available_qty != null && !Number.isNaN(Number(line.available_qty)) && shipNow > line.available_qty) {
                validationErrors[`line_${index}_ship_now`] = `Cannot exceed available stock (${line.available_qty})`;
            }

            if (line.serial_required) {
                const serialCount = (line.serials || []).length;
                if (serialCount !== shipNow) {
                    validationErrors[`line_${index}_serials`] = `Serial count (${serialCount}) must match quantity (${shipNow})`;
                }
                // Check for duplicates
                const uniqueSerials = new Set(line.serials);
                if (uniqueSerials.size !== line.serials.length) {
                    validationErrors[`line_${index}_serials`] = "Duplicate serial numbers are not allowed";
                }
            }
        });

        if (!hasShipItems && order?.id) {
            validationErrors.items = "Please enter Ship Now quantity for at least one BOM line";
        }

        return validationErrors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const validationErrors = validate();

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            // Scroll to first error
            const firstKey = Object.keys(validationErrors)[0];
            if (firstKey === "items") {
                const section = document.querySelector("[data-bom-section]");
                if (section) section.scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
                const el = document.querySelector(`[name="${firstKey}"]`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return;
        }

        setErrors({});

        // Build payload
        const items = [];
        for (const line of lines) {
            const shipNow = Number(line.ship_now);
            if (!shipNow || shipNow <= 0) continue;

            let serials = [];
            if (line.serial_required) {
                serials = (line.serials || []).map((s) => (s || "").trim()).filter(Boolean);
            }

            items.push({
                product_id: line.product_id,
                quantity: shipNow,
                serials: serials.join(", "),
            });
        }

        const payload = {
            ...formData,
            order_id: Number(order.id),
            items,
        };

        onSubmit(payload);
    };

    // ── Computed values ────────────────────────────────────────────────
    const totalShipNow = lines.reduce((sum, l) => sum + (Number(l.ship_now) || 0), 0);
    const totalRemaining = lines.reduce((sum, l) => sum + (l.pending_qty || 0), 0);
    const itemsToShip = lines.filter((l) => Number(l.ship_now) > 0).length;

    // ── Loading spinner ────────────────────────────────────────────────
    if (initialLoading && !ordersLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
                <CircularProgress />
            </Box>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────
    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <FormContainer>
                <Box sx={{ p: { xs: 1.5, sm: 1 } }}>
                    {serverError && (
                        <Alert severity="error" sx={{ mb: 1 }} onClose={onClearServerError}>
                            {serverError}
                        </Alert>
                    )}

                    {/* ─── Section 1: Challan Information ─────────────────── */}
                    <Card sx={{ mb: 0.75 }}>
                        <CardContent sx={compactCardContentSx}>
                            <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Challan Information
                                </Typography>
                            </Box>
                            <Grid container spacing={COMPACT_FORM_SPACING}>
                                {/* Order selection / display */}
                                <Grid item size={{ xs: 12, md: 4 }}>
                                    {!order ? (
                                        <AutocompleteField
                                            name="order_id"
                                            label="Order"
                                            options={availableOrders}
                                            getOptionLabel={(o) => `${o.order_number || ""} – ${o.customer_name || "N/A"} – ${o.planned_warehouse_name || ""}`}
                                            value={selectedOrderOption}
                                            onChange={(e, newValue) => {
                                                setSelectedOrderOption(newValue);
                                                if (newValue?.id) loadOrderById(newValue.id);
                                            }}
                                            placeholder="Type to search..."
                                            required
                                            error={!!errors.order_id}
                                            helperText={errors.order_id}
                                            disabled={ordersLoading || availableOrders.length === 0}
                                        />
                                    ) : (
                                        <Input
                                            size="small"
                                            name="order_display"
                                            label="Order"
                                            value={`${order.order_number || order.id} – ${order.customer_name || "N/A"} – ${order.planned_warehouse_name || order.branch_name || "N/A"}`}
                                            disabled
                                        />
                                    )}
                                </Grid>

                                <Grid item size={{ xs: 12, md: 4 }}>
                                    <Input
                                        size="small"
                                        name="customer_name"
                                        label="Customer"
                                        value={order?.customer_name || ""}
                                        disabled
                                    />
                                </Grid>

                                <Grid item size={{ xs: 12, md: 4 }}>
                                    <Input
                                        size="small"
                                        name="warehouse_name"
                                        label="Warehouse"
                                        value={order ? (order.planned_warehouse_name || "") : ""}
                                        disabled
                                    />
                                </Grid>

                                <Grid item size={{ xs: 12, md: 4 }}>
                                    <DateField
                                        size="small"
                                        name="challan_date"
                                        label="Challan Date"
                                        value={formData.challan_date}
                                        onChange={handleChange}
                                        required
                                        error={!!errors.challan_date}
                                        helperText={errors.challan_date}
                                        disabled={!order}
                                    />
                                </Grid>

                                <Grid item size={{ xs: 12, md: 4 }}>
                                    <Input
                                        size="small"
                                        name="transporter"
                                        label="Transporter"
                                        value={formData.transporter}
                                        onChange={handleChange}
                                        disabled={!order}
                                    />
                                </Grid>

                                <Grid item size={{ xs: 12, md: 8 }}>
                                    <Input
                                        size="small"
                                        name="remarks"
                                        label="Remarks"
                                        value={formData.remarks}
                                        onChange={handleChange}
                                        fullWidth
                                        multiline
                                        rows={1}
                                        disabled={!order}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* ─── Section 2: BOM Lines ───────────────────────────── */}
                    <Card data-bom-section>
                        <CardContent sx={compactCardContentSx}>
                            <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    BOM Lines
                                </Typography>
                            </Box>
                            {errors.items && (
                                <Alert severity="error" sx={{ mb: 1 }}>
                                    {errors.items}
                                </Alert>
                            )}

                            {lines.length > 0 ? (
                              <Fragment>
                                {/* ── Mobile card list (xs only) ─────────────────── */}
                                <Box sx={{ display: { xs: "block", sm: "none" }, mt: 0.5 }}>
                                    {lines.map((line, index) => {
                                        const shipNow = Number(line.ship_now) || 0;
                                        const serialCount = (line.serials || []).length;
                                        const isSerialLine = line.serial_required && shipNow > 0;
                                        const isExpanded = expandedSerialLineIndex === index;

                                        return (
                                            <Card key={line.product_id || index} sx={{ mb: 1, border: 1, borderColor: "divider" }} variant="outlined">
                                                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                                                    {/* Product header */}
                                                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 0.75 }}>
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="subtitle2" fontWeight={600}>
                                                                {index + 1}. {line.product_name}
                                                            </Typography>
                                                            {(line.product_type_name || line.make_name) && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {[line.product_type_name, line.make_name].filter(Boolean).join(" · ")}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                        {line.serial_required && (
                                                            <Chip label="SERIAL" size="small" color="primary" sx={{ height: 20, fontSize: "0.65rem", flexShrink: 0 }} />
                                                        )}
                                                    </Box>

                                                    {/* Stats row */}
                                                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1.25 }}>
                                                        {[
                                                            { label: "Planned", value: line.required_qty },
                                                            { label: "Avail", value: Number(line.available_qty) || 0 },
                                                            { label: "Shipped", value: line.shipped_qty },
                                                        ].map(({ label, value }) => (
                                                            <Box key={label}>
                                                                <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                                                                <Typography variant="body2">{value}</Typography>
                                                            </Box>
                                                        ))}
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary" display="block">Remaining</Typography>
                                                            <Typography variant="body2" fontWeight="medium" color={line.pending_qty > 0 ? "warning.main" : "success.main"}>
                                                                {line.pending_qty} {line.unit_name || ""}
                                                            </Typography>
                                                        </Box>
                                                    </Box>

                                                    {/* Ship Now input */}
                                                    <Input
                                                        type="number"
                                                        size="small"
                                                        label="Ship Now"
                                                        value={line.ship_now}
                                                        onChange={(e) => handleShipNowChange(index, e.target.value)}
                                                        inputProps={{ min: 0, max: line.pending_qty }}
                                                        error={!!errors[`line_${index}_ship_now`]}
                                                        helperText={errors[`line_${index}_ship_now`]}
                                                        disabled={!order}
                                                        fullWidth
                                                    />

                                                    {/* Serial section (only when serial_required and qty > 0) */}
                                                    {isSerialLine && (
                                                        <Box sx={{ mt: 1.5 }}>
                                                            {/* Tap-to-expand serial header */}
                                                            <Box
                                                                sx={{
                                                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                                                    p: 1.25, borderRadius: 1, border: 1,
                                                                    borderColor: errors[`line_${index}_serials`] ? "error.main" : "divider",
                                                                    bgcolor: "action.hover", cursor: "pointer", minHeight: 44,
                                                                }}
                                                                onClick={() => toggleSerialRowExpand(index)}
                                                            >
                                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                    <QrCodeScannerIcon fontSize="small" color={serialCount === shipNow ? "success" : "action"} />
                                                                    <Typography variant="body2">
                                                                        Serials: {serialCount} / {shipNow}
                                                                    </Typography>
                                                                </Box>
                                                                {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                                            </Box>
                                                            {errors[`line_${index}_serials`] && (
                                                                <FormHelperText error sx={{ mt: 0.5 }}>
                                                                    {errors[`line_${index}_serials`]}
                                                                </FormHelperText>
                                                            )}

                                                            {/* Expanded entry panel */}
                                                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                                <Box sx={{ pt: 1.5 }}>
                                                                    {/* Scan button */}
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="w-full mb-3 min-h-[44px] touch-manipulation flex items-center justify-center gap-1.5"
                                                                        onClick={openScanner}
                                                                    >
                                                                        <QrCodeScannerIcon sx={{ fontSize: 20 }} />
                                                                        Scan Barcode / QR Code
                                                                    </Button>

                                                                    <Divider sx={{ mb: 1.5 }}>
                                                                        <Typography variant="caption" color="text.secondary">or type manually</Typography>
                                                                    </Divider>

                                                                    {serialDrawerError && (
                                                                        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setSerialDrawerError("")}>
                                                                            {serialDrawerError}
                                                                        </Alert>
                                                                    )}

                                                                    {/* Serial text fields */}
                                                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, mb: 1.5 }}>
                                                                        {isExpanded && serialDrawerValues.length === shipNow && serialDrawerValues.map((value, idx) => (
                                                                            <TextField
                                                                                key={idx}
                                                                                size="small"
                                                                                fullWidth
                                                                                label={`Serial ${idx + 1} of ${shipNow}`}
                                                                                value={value}
                                                                                onChange={(e) => handleSerialDrawerValueChange(idx, e.target.value)}
                                                                                onBlur={() => value?.trim() && validateSerialWithBackend(idx, value)}
                                                                                onKeyDown={(e) => handleSerialDrawerKeyDown(idx, e)}
                                                                                inputRef={(el) => { serialInputRefs.current[idx] = el; }}
                                                                                variant="outlined"
                                                                                error={!!serialDrawerFieldErrors[idx]}
                                                                                helperText={serialDrawerFieldErrors[idx]}
                                                                                InputProps={{
                                                                                    endAdornment: serialDrawerValidating === idx ? (
                                                                                        <CircularProgress size={16} sx={{ ml: 0.5 }} />
                                                                                    ) : null,
                                                                                }}
                                                                            />
                                                                        ))}
                                                                    </Box>

                                                                    {/* Done / Cancel */}
                                                                    <Box sx={{ display: "flex", gap: 1 }}>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="flex-1 min-h-[44px] touch-manipulation"
                                                                            onClick={closeSerialRowExpand}
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            className="flex-1 min-h-[44px] touch-manipulation"
                                                                            onClick={handleSerialDrawerDone}
                                                                        >
                                                                            Done
                                                                        </Button>
                                                                    </Box>
                                                                </Box>
                                                            </Collapse>
                                                        </Box>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </Box>

                                {/* ── Desktop table (sm+) ────────────────────────── */}
                                <Box sx={{ display: { xs: "none", sm: "block" } }}>
                                <TableContainer component={Paper} sx={{ mt: 0.5 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell><strong>#</strong></TableCell>
                                                <TableCell sx={{ minWidth: 220 }}><strong>Product</strong></TableCell>
                                                <TableCell><strong>Type</strong></TableCell>
                                                <TableCell><strong>Make</strong></TableCell>
                                                <TableCell align="right"><strong>Planned</strong></TableCell>
                                                <TableCell align="right"><strong>Avail.</strong></TableCell>
                                                <TableCell align="right"><strong>Shipped</strong></TableCell>
                                                <TableCell align="right"><strong>Rem.</strong></TableCell>
                                                <TableCell align="right" sx={{ minWidth: 110 }}><strong>Ship Now</strong></TableCell>
                                                <TableCell sx={{ minWidth: 120 }}><strong>Serials</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {lines.map((line, index) => {
                                                const shipNow = Number(line.ship_now) || 0;
                                                const serialCount = (line.serials || []).length;
                                                const isSerialLine = line.serial_required && shipNow > 0;
                                                const isExpanded = expandedSerialLineIndex === index;

                                                return (
                                                    <Fragment key={line.product_id || index}>
                                                        <TableRow
                                                            sx={{
                                                                "&:nth-of-type(odd)": { backgroundColor: "action.hover" },
                                                                ...(isSerialLine && { cursor: "pointer" }),
                                                            }}
                                                            onClick={(e) => {
                                                                if (!isSerialLine) return;
                                                                if (e.target.closest("[data-no-row-toggle]")) return;
                                                                toggleSerialRowExpand(index);
                                                            }}
                                                        >
                                                            <TableCell sx={compactCellSx}>{index + 1}</TableCell>
                                                            <TableCell sx={compactCellSx}>
                                                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                                    {isSerialLine && (
                                                                        <IconButton size="small" sx={{ p: 0.25 }} aria-label={isExpanded ? "Collapse" : "Expand"}>
                                                                            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                                                        </IconButton>
                                                                    )}
                                                                    <Typography
                                                                        variant="body2"
                                                                        fontWeight="medium"
                                                                        sx={{ whiteSpace: "normal", wordBreak: "break-word" }}
                                                                    >
                                                                        {line.product_name}
                                                                    </Typography>
                                                                    {line.serial_required && (
                                                                        <Chip label="SERIAL" size="small" color="primary" sx={{ mt: 0.25, height: 18, fontSize: "0.65rem" }} />
                                                                    )}
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell sx={compactCellSx}>{line.product_type_name}</TableCell>
                                                            <TableCell sx={compactCellSx}>{line.make_name}</TableCell>
                                                            <TableCell sx={compactCellSx} align="right">{line.required_qty}</TableCell>
                                                            <TableCell sx={compactCellSx} align="right">{Number(line.available_qty) || 0}</TableCell>
                                                            <TableCell sx={compactCellSx} align="right">{line.shipped_qty}</TableCell>
                                                            <TableCell sx={compactCellSx} align="right">
                                                                <Typography
                                                                    variant="body2"
                                                                    fontWeight="medium"
                                                                    color={line.pending_qty > 0 ? "warning.main" : "success.main"}
                                                                >
                                                                    {line.pending_qty} {line.unit_name || ""}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell sx={compactCellSx} data-no-row-toggle>
                                                                <Input
                                                                    type="number"
                                                                    size="small"
                                                                    value={line.ship_now}
                                                                    onChange={(e) => handleShipNowChange(index, e.target.value)}
                                                                    inputProps={{ min: 0, max: line.pending_qty }}
                                                                    error={!!errors[`line_${index}_ship_now`]}
                                                                    helperText={errors[`line_${index}_ship_now`]}
                                                                    disabled={!order}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ ...compactCellSx, minWidth: 120, maxWidth: 140 }}>
                                                                {line.serial_required && shipNow > 0 ? (
                                                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                                                        <Typography variant="caption" color="text.secondary" noWrap title={`${serialCount} / ${shipNow} serials`}>
                                                                            {serialCount} / {shipNow} serials
                                                                        </Typography>
                                                                        {line.serials?.length > 0 && (
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {line.serials.length <= 2
                                                                                    ? line.serials.join(", ")
                                                                                    : `${line.serials.slice(0, 2).join(", ")} and ${line.serials.length - 2} more`}
                                                                            </Typography>
                                                                        )}
                                                                        {errors[`line_${index}_serials`] && (
                                                                            <FormHelperText error sx={{ mt: 0.5 }}>
                                                                                {errors[`line_${index}_serials`]}
                                                                            </FormHelperText>
                                                                        )}
                                                                    </Box>
                                                                ) : (
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {line.serial_required ? "Enter quantity to add serials" : "-"}
                                                                    </Typography>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                        {isSerialLine && (
                                                            <TableRow sx={{ "& > td": { borderBottom: isExpanded ? undefined : "none", py: 0, verticalAlign: "top" } }}>
                                                                <TableCell colSpan={10} sx={{ p: 0, borderBottom: isExpanded ? undefined : "none" }}>
                                                                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                        <Box data-no-row-toggle sx={{ p: 2, bgcolor: "action.hover", borderBottom: 1, borderColor: "divider" }}>
                                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, flexWrap: "wrap", gap: 1 }}>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Enter exactly {shipNow} serial number(s). Use TAB or ENTER to move to the next.
                                                </Typography>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex items-center gap-1.5 min-h-[36px] touch-manipulation"
                                                    onClick={openScanner}
                                                >
                                                    <QrCodeScannerIcon sx={{ fontSize: 18 }} />
                                                    Scan Barcode
                                                </Button>
                                            </Box>
                                            {serialDrawerError && (
                                                <Alert severity="error" sx={{ mb: 1 }} onClose={() => setSerialDrawerError("")}>
                                                    {serialDrawerError}
                                                </Alert>
                                            )}
                                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 1.5 }}>
                                                                                {isExpanded && serialDrawerValues.length === shipNow && serialDrawerValues.map((value, idx) => (
                                                                                    <Box key={idx} sx={{ minWidth: 200 }}>
                                                                                        <TextField
                                                                                            size="small"
                                                                                            fullWidth
                                                                                            sx={{ minWidth: 180 }}
                                                                                            label={`Serial ${idx + 1} of ${shipNow}`}
                                                                                            value={value}
                                                                                            onChange={(e) => handleSerialDrawerValueChange(idx, e.target.value)}
                                                                                            onBlur={() => value?.trim() && validateSerialWithBackend(idx, value)}
                                                                                            onKeyDown={(e) => handleSerialDrawerKeyDown(idx, e)}
                                                                                            inputRef={(el) => { serialInputRefs.current[idx] = el; }}
                                                                                            variant="outlined"
                                                                                            error={!!serialDrawerFieldErrors[idx]}
                                                                                            helperText={serialDrawerFieldErrors[idx]}
                                                                                            InputProps={{
                                                                                                endAdornment: serialDrawerValidating === idx ? (
                                                                                                    <CircularProgress size={16} sx={{ ml: 0.5 }} />
                                                                                                ) : null,
                                                                                            }}
                                                                                        />
                                                                                    </Box>
                                                                                ))}
                                                                            </Box>
                                                                            <Box sx={{ display: "flex", gap: 1 }}>
                                                                                <Button type="button" variant="outline" size="sm" onClick={closeSerialRowExpand}>
                                                                                    Cancel
                                                                                </Button>
                                                                                <Button type="button" size="sm" onClick={handleSerialDrawerDone}>
                                                                                    Done
                                                                                </Button>
                                                                            </Box>
                                                                        </Box>
                                                                    </Collapse>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </Fragment>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                </Box>
                              </Fragment>
                            ) : (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    {order ? "No BOM lines found for this order" : "Select an Order to load BOM lines"}
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    {/* ─── Section 3: Shipping Summary ────────────────────── */}
                    {lines.length > 0 && (
                        <Card sx={{ mt: 0.75 }}>
                            <CardContent sx={compactCardContentSx}>
                                <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        Shipping Summary
                                    </Typography>
                                </Box>
                                <Grid container spacing={COMPACT_FORM_SPACING}>
                                    <Grid item size={{ xs: 12, md: 4 }}>
                                        <Typography variant="caption" color="text.secondary">Items to Ship</Typography>
                                        <Typography variant="subtitle1">{itemsToShip}</Typography>
                                    </Grid>
                                    <Grid item size={{ xs: 12, md: 4 }}>
                                        <Typography variant="caption" color="text.secondary">Total Ship Now Quantity</Typography>
                                        <Typography variant="subtitle1" color="primary.main">{totalShipNow}</Typography>
                                    </Grid>
                                    <Grid item size={{ xs: 12, md: 4 }}>
                                        <Typography variant="caption" color="text.secondary">Total Remaining After Ship</Typography>
                                        <Typography variant="subtitle1" color={totalRemaining - totalShipNow > 0 ? "warning.main" : "success.main"}>
                                            {totalRemaining - totalShipNow}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    )}
                </Box>

                {/* ─── Sticky Action Buttons ──────────────────────────── */}
                <FormActions className="p-2 gap-2">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="min-h-[44px] touch-manipulation">
                            Cancel
                        </Button>
                    )}
                    <LoadingButton
                        type="submit"
                        loading={loading}
                        className="min-w-[120px] min-h-[44px] touch-manipulation"
                        disabled={!order}
                    >
                        Save Challan
                    </LoadingButton>
                </FormActions>
            </FormContainer>

            {/* ─── Barcode / QR Scanner modal ─────────────────────── */}
            <BarcodeScanner
                open={scannerOpen}
                onScan={handleScanResult}
                onClose={() => { setScannerOpen(false); setScanTargetIndex(null); }}
                hint={scanHint}
            />
        </Box>
    );
}
