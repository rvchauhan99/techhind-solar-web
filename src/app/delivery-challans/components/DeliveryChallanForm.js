"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Grid,
    Typography,
    MenuItem,
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
} from "@mui/material";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
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
            setLines(buildLinesFromOrder(data, stockMap));
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

        setLines((prev) =>
            prev.map((line, i) => {
                if (i !== index) return line;
                const newLine = { ...line, ship_now: value };
                // Reset serials if ship_now changes
                if (line.serial_required && newLine.serials.length > shipNowNum) {
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
    };

    const handleSerialAdd = (lineIndex, serialNumber) => {
        if (!serialNumber || !serialNumber.trim()) return;

        setLines((prev) =>
            prev.map((line, i) => {
                if (i !== lineIndex) return line;
                const shipNow = Number(line.ship_now) || 0;
                if (line.serials.length >= shipNow) {
                    toastError(`Maximum ${shipNow} serial numbers allowed for ship quantity`);
                    return line;
                }
                if (line.serials.includes(serialNumber.trim())) {
                    toastError("Serial number already added");
                    return line;
                }
                return { ...line, serials: [...line.serials, serialNumber.trim()] };
            })
        );
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
                <Box sx={{ p: 1 }}>
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
                                        <Select
                                            size="small"
                                            name="order_id"
                                            label="Order"
                                            value=""
                                            onChange={(e) => loadOrderById(e.target.value)}
                                            required
                                            error={!!errors.order_id}
                                            helperText={errors.order_id}
                                            disabled={ordersLoading || availableOrders.length === 0}
                                        >
                                            <MenuItem value="">-- Select Order --</MenuItem>
                                            {availableOrders.map((o) => (
                                                <MenuItem key={o.id} value={o.id}>
                                                    {o.order_number} – {o.customer_name || "N/A"} – {o.planned_warehouse_name || ""}
                                                </MenuItem>
                                            ))}
                                        </Select>
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
                                <TableContainer component={Paper} sx={{ mt: 0.5 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell><strong>#</strong></TableCell>
                                                <TableCell><strong>Product</strong></TableCell>
                                                <TableCell><strong>Type</strong></TableCell>
                                                <TableCell><strong>Make</strong></TableCell>
                                                <TableCell align="right"><strong>Planned</strong></TableCell>
                                                <TableCell align="right"><strong>Avail.</strong></TableCell>
                                                <TableCell align="right"><strong>Shipped</strong></TableCell>
                                                <TableCell align="right"><strong>Rem.</strong></TableCell>
                                                <TableCell align="right" sx={{ minWidth: 110 }}><strong>Ship Now</strong></TableCell>
                                                <TableCell sx={{ minWidth: 210 }}><strong>Serials</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {lines.map((line, index) => {
                                                const shipNow = Number(line.ship_now) || 0;
                                                const serialCount = (line.serials || []).length;

                                                return (
                                                    <TableRow
                                                        key={line.product_id || index}
                                                        sx={{ "&:nth-of-type(odd)": { backgroundColor: "action.hover" } }}
                                                    >
                                                        <TableCell sx={compactCellSx}>{index + 1}</TableCell>
                                                        <TableCell sx={compactCellSx}>
                                                            <Typography
                                                                variant="body2"
                                                                fontWeight="medium"
                                                                noWrap
                                                                sx={{ maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis" }}
                                                            >
                                                                {line.product_name}
                                                            </Typography>
                                                            {line.serial_required && (
                                                                <Chip label="SERIAL" size="small" color="primary" sx={{ mt: 0.25, height: 18, fontSize: "0.65rem" }} />
                                                            )}
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
                                                        <TableCell sx={compactCellSx}>
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
                                                        <TableCell sx={compactCellSx}>
                                                            {line.serial_required && shipNow > 0 ? (
                                                                <Box>
                                                                    <Box sx={{ display: "flex", gap: 0.5, mb: 0.5, alignItems: "center" }}>
                                                                        <Input
                                                                            size="small"
                                                                            placeholder="Enter serial & press Enter"
                                                                            value={serialDrafts[index] || ""}
                                                                            onChange={(e) =>
                                                                                setSerialDrafts((prev) => ({
                                                                                    ...prev,
                                                                                    [index]: e.target.value,
                                                                                }))
                                                                            }
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === "Enter") {
                                                                                    e.preventDefault();
                                                                                    const draft = (serialDrafts[index] || "").trim();
                                                                                    handleSerialAdd(index, draft);
                                                                                    setSerialDrafts((prev) => ({
                                                                                        ...prev,
                                                                                        [index]: "",
                                                                                    }));
                                                                                }
                                                                            }}
                                                                            disabled={!order}
                                                                        />
                                                                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50, whiteSpace: "nowrap" }}>
                                                                            {serialCount}/{shipNow}
                                                                        </Typography>
                                                                    </Box>
                                                                    {line.serials.length > 0 && (
                                                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.35 }}>
                                                                            {line.serials.map((serial, si) => (
                                                                                <Chip
                                                                                    key={si}
                                                                                    label={serial}
                                                                                    size="small"
                                                                                    onDelete={() => handleSerialRemove(index, si)}
                                                                                    color="primary"
                                                                                    variant="outlined"
                                                                                    sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem" } }}
                                                                                />
                                                                            ))}
                                                                        </Box>
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
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
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
                        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                            Cancel
                        </Button>
                    )}
                    <LoadingButton
                        type="submit"
                        loading={loading}
                        className="min-w-[120px]"
                        disabled={!order}
                    >
                        Save Challan
                    </LoadingButton>
                </FormActions>
            </FormContainer>
        </Box>
    );
}
