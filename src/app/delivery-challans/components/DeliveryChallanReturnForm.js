"use client";

import { useMemo, useState, useRef, useCallback, useEffect, Fragment } from "react";
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
    Card,
    CardContent,
    TextField,
    CircularProgress,
    FormHelperText,
    Chip,
    Divider,
    IconButton,
    Collapse,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ClearIcon from "@mui/icons-material/Clear";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import LoadingButton from "@/components/common/LoadingButton";
import { Button } from "@/components/ui/button";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { splitSerialInput, fillSerialSlots } from "@/utils/serialInput";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { COMPACT_FORM_SPACING, COMPACT_SECTION_HEADER_STYLE } from "@/utils/formConstants";

export default function DeliveryChallanReturnForm({
    challan,
    loading = false,
    serverError = null,
    onClearServerError = () => {},
    onSubmit,
    onCancel,
}) {
    const compactCardContentSx = { p: 1, "&:last-child": { pb: 1 } };
    const compactCellSx = { py: 0.5, px: 1 };

    const [reasonId, setReasonId] = useState("");
    const [reasonText, setReasonText] = useState("");
    const [remarks, setRemarks] = useState("");
    const [errors, setErrors] = useState({});
    
    const [lines, setLines] = useState([]);

    // ── Drawer State ───────────────────────────────────────────────────
    const [expandedSerialLineIndex, setExpandedSerialLineIndex] = useState(null);
    const [serialDrawerValues, setSerialDrawerValues] = useState([]);
    const [serialDrawerError, setSerialDrawerError] = useState("");
    const [serialDrawerFieldErrors, setSerialDrawerFieldErrors] = useState({});
    const serialInputRefs = useRef([]);

    // ── Scanner State ──────────────────────────────────────────────────
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanTargetIndex, setScanTargetIndex] = useState(null);
    const [gunScanValue, setGunScanValue] = useState("");
    const gunScanRef = useRef(null);

    useEffect(() => {
        setLines(
            (challan?.items || []).map((item) => {
                const returnableSerials = Array.isArray(item?.returnable_serials)
                    ? item.returnable_serials
                    : String(item?.serials || "").split(",").map((s) => s.trim()).filter(Boolean);
                return {
                    challan_item_id: item.id,
                    product_id: item.product_id,
                    product_name: item?.product?.product_name || "-",
                    product_type_name: item?.product?.product_type_name || "",
                    make_name: item?.product?.product_make_name || "",
                    delivered_qty: Number(item?.quantity) || 0,
                    returnable_qty: Number(item?.returnable_qty ?? item?.quantity ?? 0),
                    return_qty: "",
                    returnable_serials: returnableSerials,
                    serials: [],
                    serial_required: returnableSerials.length > 0,
                };
            })
        );
        // Reset states when challan changes
        closeSerialRowExpand();
    }, [challan]);

    const setLineField = (idx, patch) => {
        setLines((prev) => prev.map((line, i) => (i === idx ? { ...line, ...patch } : line)));
        setErrors((prev) => {
            const next = { ...prev };
            delete next[`line_${idx}_qty`];
            delete next[`line_${idx}_serials`];
            return next;
        });
    };

    // ── Quantity Change ────────────────────────────────────────────────
    const handleReturnQtyChange = (index, value) => {
        const returnQtyStr = value;
        const returnQtyNum = Number(value) || 0;
        const line = lines[index];
        const isSerialRequired = line?.serial_required;

        if (expandedSerialLineIndex === index) {
            closeSerialRowExpand();
        }

        setLines((prev) =>
            prev.map((l, i) => {
                if (i !== index) return l;
                const newLine = { ...l, return_qty: returnQtyStr };
                if (l.serial_required && newLine.serials.length > returnQtyNum) {
                    newLine.serials = newLine.serials.slice(0, returnQtyNum);
                }
                return newLine;
            })
        );

        setErrors((prev) => {
            const next = { ...prev };
            const key = `line_${index}_qty`;

            if (!returnQtyNum || returnQtyNum <= 0) {
                delete next[key];
                return next;
            }

            if (!Number.isInteger(returnQtyNum)) {
                next[key] = "Must be a whole number";
            } else if (returnQtyNum > Number(line.returnable_qty)) {
                next[key] = `Cannot exceed returnable (${line.returnable_qty})`;
            } else {
                delete next[key];
            }
            return next;
        });

        // Auto-open drawer for serial entry
        if (isSerialRequired && returnQtyNum > 0) {
            setTimeout(() => {
                const existing = (line.serials || []).map((s) => String(s || "").trim()).slice(0, returnQtyNum);
                const padded = Array.from({ length: returnQtyNum }, (_, i) => existing[i] ?? "");
                setSerialDrawerValues(padded);
                setSerialDrawerError("");
                setSerialDrawerFieldErrors({});
                setExpandedSerialLineIndex(index);
                serialInputRefs.current = [];
                setTimeout(() => serialInputRefs.current[0]?.focus(), 100);
            }, 0);
        }
    };

    // ── Drawer Handlers ────────────────────────────────────────────────
    const toggleSerialRowExpand = (lineIndex) => {
        const line = lines[lineIndex];
        if (!line?.serial_required) return;
        const returnQty = Number(line.return_qty) || 0;
        if (returnQty <= 0) return;

        if (expandedSerialLineIndex === lineIndex) {
            closeSerialRowExpand();
            return;
        }

        const existing = (line.serials || []).map((s) => String(s || "").trim());
        const padded = Array.from({ length: returnQty }, (_, i) => existing[i] ?? "");
        setSerialDrawerValues(padded);
        setSerialDrawerError("");
        setSerialDrawerFieldErrors({});
        setExpandedSerialLineIndex(lineIndex);
        setGunScanValue("");
        serialInputRefs.current = [];
        setTimeout(() => gunScanRef.current?.focus(), 100);
    };

    const closeSerialRowExpand = () => {
        setExpandedSerialLineIndex(null);
        setSerialDrawerValues([]);
        setSerialDrawerError("");
        setSerialDrawerFieldErrors({});
        setGunScanValue("");
        serialInputRefs.current = [];
    };

    const validateSerial = (drawerValueIndex, value) => {
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
        const returnableSet = new Set((line.returnable_serials || []).map(s => String(s).trim().toLowerCase()));

        if (!returnableSet.has(trimmed.toLowerCase())) {
            setSerialDrawerFieldErrors((prev) => ({
                ...prev,
                [drawerValueIndex]: "Serial is not returnable for this line"
            }));
        } else {
            setSerialDrawerFieldErrors((prev) => {
                const next = { ...prev };
                delete next[drawerValueIndex];
                return next;
            });
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

    const handleSerialDrawerBulkOrSingle = (index, value) => {
        const tokens = splitSerialInput(value);
        if (tokens.length <= 1) {
            handleSerialDrawerValueChange(index, value);
            return;
        }
        if (expandedSerialLineIndex == null) return;
        const line = lines[expandedSerialLineIndex];
        const returnable = Number(line?.returnable_qty) ?? 0;
        const returnQty = serialDrawerValues.length;

        if (tokens.length > returnable) {
            setSerialDrawerError(`Too many serials (${tokens.length}). Cannot exceed returnable (${returnable}).`);
            return;
        }

        const existingLower = new Set(
            serialDrawerValues.map((v) => (v || "").trim().toLowerCase()).filter(Boolean)
        );
        const uniqueNew = tokens.filter((t) => !existingLower.has(t.trim().toLowerCase()));
        if (uniqueNew.length === 0) {
            setSerialDrawerError("All serials already entered.");
            return;
        }
        const newReturnQty = Math.min(returnQty + uniqueNew.length, returnable);

        if (newReturnQty > returnQty) {
            setLines((prev) =>
                prev.map((l, i) =>
                    i !== expandedSerialLineIndex
                        ? l
                        : { ...l, return_qty: String(newReturnQty), serials: (l.serials || []).slice(0, newReturnQty) }
                )
            );
            setErrors((prev) => {
                const next = { ...prev };
                delete next[`line_${expandedSerialLineIndex}_qty`];
                return next;
            });
            const paddedSlots = [...serialDrawerValues, ...Array(newReturnQty - returnQty).fill("")];
            const { nextSlots, overflow } = fillSerialSlots({
                slots: paddedSlots,
                startIndex: returnQty,
                incoming: uniqueNew,
                caseInsensitive: true,
            });
            if (overflow.length) {
                setSerialDrawerError(`Too many serials. ${overflow.length} not filled (limit ${returnable}).`);
                return;
            }
            setSerialDrawerValues(nextSlots);
            setSerialDrawerFieldErrors({});
            setSerialDrawerError("");
            nextSlots.forEach((val, idx) => {
                if ((val || "").trim()) validateSerial(idx, val);
            });
        } else {
            const { nextSlots, overflow, duplicates } = fillSerialSlots({
                slots: serialDrawerValues,
                startIndex: index,
                incoming: uniqueNew,
                caseInsensitive: true,
            });
            if (duplicates.length) {
                setSerialDrawerError(`Duplicate serial(s) ignored: ${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? "…" : ""}`);
            }
            if (overflow.length) {
                setSerialDrawerError(`Cannot add ${overflow.length} serial(s): quantity limit reached.`);
                return;
            }
            setSerialDrawerValues(nextSlots);
            setSerialDrawerError("");
            nextSlots.forEach((val, idx) => {
                if ((val || "").trim()) validateSerial(idx, val);
            });
        }
    };

    const handleSerialDrawerKeyDown = (index, e) => {
        const returnQty = serialDrawerValues.length;
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            const value = (serialDrawerValues[index] || "").trim();
            if (value) validateSerial(index, value);
            if (index < returnQty - 1) {
                serialInputRefs.current[index + 1]?.focus();
            } else {
                handleSerialDrawerDone();
            }
        }
    };

    const handleGunScanKeyDown = (e) => {
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            const firstEmpty = serialDrawerValues.findIndex((v) => !(v || "").trim());
            const idx = firstEmpty !== -1 ? firstEmpty : 0;
            if ((gunScanValue || "").trim()) {
                handleSerialDrawerBulkOrSingle(idx, gunScanValue);
                setGunScanValue("");
            }
            gunScanRef.current?.focus();
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

        // Check for local validation errors before closing
        const hasErrors = Object.values(serialDrawerFieldErrors).some(err => !!err);
        if (hasErrors) {
            setSerialDrawerError("Please fix serial validation errors.");
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

    const openScanner = () => {
        const firstEmpty = serialDrawerValues.findIndex((v) => !(v || "").trim());
        setScanTargetIndex(firstEmpty !== -1 ? firstEmpty : 0);
        setScannerOpen(true);
    };

    const handleScanResult = (value) => {
        const tokens = splitSerialInput(value || "");
        if (!tokens.length || scanTargetIndex == null || expandedSerialLineIndex == null) return;

        const line = lines[expandedSerialLineIndex];
        const returnable = Number(line?.returnable_qty) ?? 0;
        const returnQty = serialDrawerValues.length;

        if (tokens.length > returnable) {
            setSerialDrawerError(`Too many serials (${tokens.length}). Cannot exceed returnable (${returnable}).`);
            return;
        }

        if (tokens.length === 1) {
            const trimmed = tokens[0];
            const alreadyEntered = serialDrawerValues.some(
                (v) => (v || "").trim().toLowerCase() === trimmed.toLowerCase()
            );
            if (alreadyEntered) {
                setSerialDrawerError("Serial number already entered.");
                return;
            }
            handleSerialDrawerValueChange(scanTargetIndex, trimmed);
            validateSerial(scanTargetIndex, trimmed);
            const updated = serialDrawerValues.map((v, i) => (i === scanTargetIndex ? trimmed : v));
            const nextEmpty = updated.findIndex((v, i) => i > scanTargetIndex && !(v || "").trim());
            if (nextEmpty === -1) {
                setScannerOpen(false);
                setScanTargetIndex(null);
            } else {
                setScanTargetIndex(nextEmpty);
            }
            return;
        }

        // Multi-serial (pallet) barcode
        const existingLower = new Set(
            serialDrawerValues.map((v) => (v || "").trim().toLowerCase()).filter(Boolean)
        );
        const uniqueNew = tokens.filter((t) => !existingLower.has(t.trim().toLowerCase()));
        if (uniqueNew.length === 0) {
            setSerialDrawerError("All serials already entered.");
            return;
        }
        const newReturnQty = Math.min(returnQty + uniqueNew.length, returnable);
        if (newReturnQty > returnable) {
            setSerialDrawerError(`Too many serials. Cannot exceed returnable (${returnable}).`);
            return;
        }

        if (newReturnQty > returnQty) {
            setLines((prev) =>
                prev.map((l, i) =>
                    i !== expandedSerialLineIndex
                        ? l
                        : { ...l, return_qty: String(newReturnQty), serials: (l.serials || []).slice(0, newReturnQty) }
                )
            );
            setErrors((prev) => {
                const next = { ...prev };
                delete next[`line_${expandedSerialLineIndex}_qty`];
                return next;
            });
            const paddedSlots = [...serialDrawerValues, ...Array(newReturnQty - returnQty).fill("")];
            const { nextSlots, overflow } = fillSerialSlots({
                slots: paddedSlots,
                startIndex: returnQty,
                incoming: uniqueNew,
                caseInsensitive: true,
            });
            if (overflow.length) {
                setSerialDrawerError(`Too many serials. ${overflow.length} not filled (limit ${returnable}).`);
                return;
            }
            setSerialDrawerValues(nextSlots);
            setSerialDrawerFieldErrors({});
            nextSlots.forEach((val, idx) => {
                if ((val || "").trim()) validateSerial(idx, val);
            });
        } else {
            const { nextSlots, overflow, duplicates } = fillSerialSlots({
                slots: serialDrawerValues,
                startIndex: scanTargetIndex,
                incoming: uniqueNew,
                caseInsensitive: true,
            });
            if (duplicates.length) {
                setSerialDrawerError(`Duplicate serial(s) ignored.`);
            }
            if (overflow.length) {
                setSerialDrawerError(`Cannot add ${overflow.length} serial(s): quantity limit reached.`);
                return;
            }
            setSerialDrawerValues(nextSlots);
            nextSlots.forEach((val, idx) => {
                if ((val || "").trim()) validateSerial(idx, val);
            });
        }
        setScannerOpen(false);
        setScanTargetIndex(null);
    };

    // ── Submission ─────────────────────────────────────────────────────
    const handleSubmit = (e) => {
        e.preventDefault();
        const nextErrors = {};
        if (!reasonId) nextErrors.reason_id = "Reason is required";
        const payloadItems = [];

        lines.forEach((line, idx) => {
            const qty = Number(line.return_qty) || 0;
            if (!line.return_qty || qty <= 0) return;

            if (qty < 0 || !Number.isInteger(qty)) {
                nextErrors[`line_${idx}_qty`] = "Return qty must be whole number";
                return;
            }
            if (qty > Number(line.returnable_qty || 0)) {
                nextErrors[`line_${idx}_qty`] = `Cannot exceed returnable (${line.returnable_qty})`;
                return;
            }
            
            if (line.serial_required) {
                const serials = (line.serials || []).map((s) => String(s || "").trim()).filter(Boolean);
                if (serials.length !== qty) {
                    nextErrors[`line_${idx}_serials`] = `Enter exactly ${qty} serial(s)`;
                    return;
                }
                const unique = new Set(serials);
                if (unique.size !== serials.length) {
                    nextErrors[`line_${idx}_serials`] = `Duplicate serials are not allowed`;
                    return;
                }
                // Verify all submitted serials are in the returnable set
                const returnableSet = new Set((line.returnable_serials || []).map(s => String(s).trim().toLowerCase()));
                const invalid = serials.filter(s => !returnableSet.has(s.toLowerCase()));
                if (invalid.length > 0) {
                    nextErrors[`line_${idx}_serials`] = `Contains non-returnable serials`;
                    return;
                }
            }
            payloadItems.push({
                challan_item_id: line.challan_item_id,
                return_quantity: qty,
                serials: line.serials || [],
            });
        });

        if (payloadItems.length === 0) {
            nextErrors.items = "At least one line must have return quantity";
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            // Scroll to first error
            const firstKey = Object.keys(nextErrors)[0];
            if (firstKey === "items") {
                const section = document.querySelector("[data-return-lines-section]");
                if (section) section.scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
                const el = document.querySelector(`[name="${firstKey}"]`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return;
        }

        setErrors({});
        onSubmit({
            reason_id: reasonId,
            remarks,
            items: payloadItems,
        });
    };

    return (
        <Box component="form" onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} noValidate>
            <FormContainer>
                <Box sx={{ p: { xs: 1.5, sm: 1 } }}>
                    {serverError ? (
                        <Alert severity="error" sx={{ mb: 1 }} onClose={onClearServerError}>
                            {serverError}
                        </Alert>
                    ) : null}
                    
                    <Card sx={{ mb: 0.75 }}>
                        <CardContent sx={compactCardContentSx}>
                            <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Challan Return Context
                                </Typography>
                            </Box>
                            <Grid container spacing={COMPACT_FORM_SPACING}>
                                <Grid item xs={12} md={3}>
                                    <Input size="small" label="Challan" value={challan?.challan_no || challan?.id || ""} disabled fullWidth />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Input size="small" label="Order" value={challan?.order?.order_number || ""} disabled fullWidth />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Input size="small" label="Customer" value={challan?.order?.customer?.customer_name || ""} disabled fullWidth />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Input size="small" label="Warehouse" value={challan?.warehouse?.name || ""} disabled fullWidth />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    <Card sx={{ mb: 0.75 }}>
                        <CardContent sx={compactCardContentSx}>
                            <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Return Details
                                </Typography>
                            </Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", mb: 0.75, mt: -0.25, lineHeight: 1.35 }}
                            >
                                Submitting this form records the return and updates inventory. No confirmation on the delivery challans list is required afterward.
                            </Typography>
                            <Grid container spacing={COMPACT_FORM_SPACING}>
                                <Grid item xs={12} md={4}>
                                    <AutocompleteField
                                        usePortal
                                        name="reason_id"
                                        label="Reason"
                                        required
                                        asyncLoadOptions={(q) =>
                                            getReferenceOptionsSearch("reason.model", {
                                                q,
                                                limit: 30,
                                                reason_type: "delivery_challan_reverse",
                                                is_active: true,
                                            })
                                        }
                                        getOptionLabel={(o) => (o && (o.reason ?? o.label)) || ""}
                                        value={reasonId ? { id: reasonId, reason: reasonText, label: reasonText } : null}
                                        onChange={(_e, newValue) => {
                                            const id = newValue?.id ?? "";
                                            const text = newValue ? newValue.reason ?? newValue.label ?? "" : "";
                                            setReasonId(id ? String(id) : "");
                                            setReasonText(text ? String(text) : "");
                                            setErrors((prev) => {
                                                const next = { ...prev };
                                                delete next.reason_id;
                                                return next;
                                            });
                                        }}
                                        error={!!errors.reason_id}
                                        helperText={errors.reason_id}
                                        placeholder="Select reason..."
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} md={8}>
                                    <Input
                                        size="small"
                                        name="remarks"
                                        label="Remarks"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        multiline
                                        rows={1}
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    <Card data-return-lines-section>
                        <CardContent sx={compactCardContentSx}>
                            <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Return Lines
                                </Typography>
                            </Box>
                            {errors.items ? (
                                <Alert severity="error" sx={{ mb: 1 }}>
                                    {errors.items}
                                </Alert>
                            ) : null}

                            {lines.length > 0 ? (
                                <Fragment>
                                    {/* ── Mobile card list (xs only) ─────────────────── */}
                                    <Box sx={{ display: { xs: "block", sm: "none" }, mt: 0.5 }}>
                                        {lines.map((line, index) => {
                                            const returnQty = Number(line.return_qty) || 0;
                                            const serialCount = (line.serials || []).length;
                                            const isSerialLine = line.serial_required && returnQty > 0;
                                            const isExpanded = expandedSerialLineIndex === index;

                                            return (
                                                <Card key={line.challan_item_id} sx={{ mb: 1, border: 1, borderColor: "divider" }} variant="outlined">
                                                    <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
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
                                                        
                                                        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1.25 }}>
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary" display="block">Delivered</Typography>
                                                                <Typography variant="body2">{line.delivered_qty}</Typography>
                                                            </Box>
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary" display="block">Returnable</Typography>
                                                                <Typography variant="body2">{line.returnable_qty}</Typography>
                                                            </Box>
                                                        </Box>

                                                        <Input
                                                            type="number"
                                                            size="small"
                                                            label="Return Qty"
                                                            value={line.return_qty}
                                                            onChange={(e) => handleReturnQtyChange(index, e.target.value)}
                                                            inputProps={{ min: 0, max: line.returnable_qty }}
                                                            error={!!errors[`line_${index}_qty`]}
                                                            helperText={errors[`line_${index}_qty`]}
                                                            fullWidth
                                                        />

                                                        {isSerialLine && (
                                                            <Box sx={{ mt: 1.5 }}>
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
                                                                        <QrCodeScannerIcon fontSize="small" color={serialCount === returnQty ? "success" : "action"} />
                                                                        <Typography variant="body2">
                                                                            Serials: {serialCount} / {returnQty}
                                                                        </Typography>
                                                                    </Box>
                                                                    {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                                                </Box>
                                                                {errors[`line_${index}_serials`] && (
                                                                    <FormHelperText error sx={{ mt: 0.5 }}>
                                                                        {errors[`line_${index}_serials`]}
                                                                    </FormHelperText>
                                                                )}

                                                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                                    <Box sx={{ pt: 1.5 }}>
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
                                                                            sx={{ mb: 1.5 }}
                                                                            helperText="Point scanner here; it will type and press Enter."
                                                                        />
                                                                        <Divider sx={{ mb: 1.5 }}>
                                                                            <Typography variant="caption" color="text.secondary">or type manually</Typography>
                                                                        </Divider>

                                                                        {serialDrawerError && (
                                                                            <Alert severity="error" sx={{ mb: 1 }} onClose={() => setSerialDrawerError("")}>
                                                                                {serialDrawerError}
                                                                            </Alert>
                                                                        )}

                                                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, mb: 1.5 }}>
                                                                            {isExpanded && serialDrawerValues.length === returnQty && serialDrawerValues.map((value, idx) => (
                                                                                <TextField
                                                                                    key={idx}
                                                                                    size="small"
                                                                                    fullWidth
                                                                                    label={`Serial ${idx + 1} of ${returnQty}`}
                                                                                    value={value}
                                                                                    onChange={(e) => handleSerialDrawerBulkOrSingle(idx, e.target.value)}
                                                                                    onBlur={() => value?.trim() && validateSerial(idx, value)}
                                                                                    onKeyDown={(e) => handleSerialDrawerKeyDown(idx, e)}
                                                                                    inputRef={(el) => { serialInputRefs.current[idx] = el; }}
                                                                                    variant="outlined"
                                                                                    error={!!serialDrawerFieldErrors[idx]}
                                                                                    helperText={serialDrawerFieldErrors[idx]}
                                                                                    InputProps={{
                                                                                        endAdornment: value?.trim()
                                                                                            ? <IconButton size="small" tabIndex={-1} edge="end" onClick={() => handleSerialDrawerValueChange(idx, "")}>
                                                                                                <ClearIcon fontSize="small" />
                                                                                              </IconButton>
                                                                                            : null,
                                                                                    }}
                                                                                />
                                                                            ))}
                                                                        </Box>

                                                                        <Box sx={{ display: "flex", gap: 1 }}>
                                                                            <Button type="button" variant="outline" size="sm" className="flex-1 min-h-[44px] touch-manipulation" onClick={closeSerialRowExpand}>
                                                                                Cancel
                                                                            </Button>
                                                                            <Button type="button" size="sm" className="flex-1 min-h-[44px] touch-manipulation" onClick={handleSerialDrawerDone}>
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
                                                        <TableCell align="right"><strong>Delivered</strong></TableCell>
                                                        <TableCell align="right"><strong>Returnable</strong></TableCell>
                                                        <TableCell align="right" sx={{ minWidth: 110 }}><strong>Return Qty</strong></TableCell>
                                                        <TableCell sx={{ minWidth: 120 }}><strong>Serials</strong></TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {lines.map((line, index) => {
                                                        const returnQty = Number(line.return_qty) || 0;
                                                        const serialCount = (line.serials || []).length;
                                                        const isSerialLine = line.serial_required && returnQty > 0;
                                                        const isExpanded = expandedSerialLineIndex === index;

                                                        return (
                                                            <Fragment key={line.challan_item_id}>
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
                                                                            <Typography variant="body2" fontWeight="medium" sx={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                                                                                {line.product_name}
                                                                            </Typography>
                                                                            {line.serial_required && (
                                                                                <Chip label="SERIAL" size="small" color="primary" sx={{ mt: 0.25, height: 18, fontSize: "0.65rem" }} />
                                                                            )}
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell sx={compactCellSx} align="right">{line.delivered_qty}</TableCell>
                                                                    <TableCell sx={compactCellSx} align="right">{line.returnable_qty}</TableCell>
                                                                    <TableCell sx={compactCellSx} data-no-row-toggle>
                                                                        <Input
                                                                            type="number"
                                                                            size="small"
                                                                            value={line.return_qty}
                                                                            onChange={(e) => handleReturnQtyChange(index, e.target.value)}
                                                                            inputProps={{ min: 0, max: line.returnable_qty }}
                                                                            error={!!errors[`line_${index}_qty`]}
                                                                            helperText={errors[`line_${index}_qty`]}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell sx={{ ...compactCellSx, minWidth: 120, maxWidth: 140 }}>
                                                                        {line.serial_required && returnQty > 0 ? (
                                                                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                                                                <Typography variant="caption" color="text.secondary" noWrap title={`${serialCount} / ${returnQty} serials`}>
                                                                                    {serialCount} / {returnQty} serials
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
                                                                        <TableCell colSpan={6} sx={{ p: 0, borderBottom: isExpanded ? undefined : "none" }}>
                                                                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                                                <Box data-no-row-toggle sx={{ p: 2, bgcolor: "action.hover", borderBottom: 1, borderColor: "divider" }}>
                                                                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, flexWrap: "wrap", gap: 1 }}>
                                                                                        <Typography variant="subtitle2" color="text.secondary">
                                                                                            Enter exactly {returnQty} serial number(s). Use TAB or ENTER to move to the next.
                                                                                        </Typography>
                                                                                        <Button type="button" variant="outline" size="sm" className="flex items-center gap-1.5 min-h-[36px] touch-manipulation" onClick={openScanner}>
                                                                                            <QrCodeScannerIcon sx={{ fontSize: 18 }} />
                                                                                            Scan Barcode
                                                                                        </Button>
                                                                                    </Box>
                                                                                    <TextField
                                                                                        inputRef={gunScanRef}
                                                                                        size="small"
                                                                                        label="Scan with gun"
                                                                                        placeholder="Scanner gun types here, then Enter"
                                                                                        value={gunScanValue}
                                                                                        onChange={(e) => setGunScanValue(e.target.value)}
                                                                                        onKeyDown={handleGunScanKeyDown}
                                                                                        variant="outlined"
                                                                                        sx={{ mb: 1, minWidth: 280 }}
                                                                                        helperText="Point scanner here; it will type and press Enter."
                                                                                    />
                                                                                    {serialDrawerError && (
                                                                                        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setSerialDrawerError("")}>
                                                                                            {serialDrawerError}
                                                                                        </Alert>
                                                                                    )}
                                                                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 1.5 }}>
                                                                                        {isExpanded && serialDrawerValues.length === returnQty && serialDrawerValues.map((value, idx) => (
                                                                                            <Box key={idx} sx={{ minWidth: 200 }}>
                                                                                                <TextField
                                                                                                    size="small"
                                                                                                    fullWidth
                                                                                                    sx={{ minWidth: 180 }}
                                                                                                    label={`Serial ${idx + 1} of ${returnQty}`}
                                                                                                    value={value}
                                                                                                    onChange={(e) => handleSerialDrawerBulkOrSingle(idx, e.target.value)}
                                                                                                    onBlur={() => value?.trim() && validateSerial(idx, value)}
                                                                                                    onKeyDown={(e) => handleSerialDrawerKeyDown(idx, e)}
                                                                                                    inputRef={(el) => { serialInputRefs.current[idx] = el; }}
                                                                                                    variant="outlined"
                                                                                                    error={!!serialDrawerFieldErrors[idx]}
                                                                                                    helperText={serialDrawerFieldErrors[idx]}
                                                                                                    InputProps={{
                                                                                                        endAdornment: value?.trim()
                                                                                                            ? <IconButton size="small" tabIndex={-1} edge="end" onClick={() => handleSerialDrawerValueChange(idx, "")}>
                                                                                                                <ClearIcon fontSize="small" />
                                                                                                              </IconButton>
                                                                                                            : null,
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
                            ) : null}
                        </CardContent>
                    </Card>
                </Box>
                <FormActions>
                    <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                    <LoadingButton type="submit" size="sm" loading={loading} className="min-w-[160px]">
                        Submit Return
                    </LoadingButton>
                </FormActions>
            </FormContainer>

            <BarcodeScanner
                open={scannerOpen}
                onScan={handleScanResult}
                onClose={() => setScannerOpen(false)}
            />
        </Box>
    );
}
