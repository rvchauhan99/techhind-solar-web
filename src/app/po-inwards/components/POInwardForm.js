"use client";

import { useState, useEffect, useRef, useCallback, memo, Fragment } from "react";
import {
    Box,
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
    FormHelperText,
    CircularProgress,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Collapse,
    IconButton,
    Card,
    CardContent,
    Divider,
    LinearProgress,
    Tooltip,
    Skeleton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ClearIcon from "@mui/icons-material/Clear";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InventoryIcon from "@mui/icons-material/Inventory";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import mastersService from "@/services/mastersService";
import poInwardService from "@/services/poInwardService";
import companyService from "@/services/companyService";
import { toastError } from "@/utils/toast";
import { splitSerialInput, fillSerialSlots } from "@/utils/serialInput";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import DateField from "@/components/common/DateField";
import FormGrid from "@/components/common/FormGrid";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";


// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
const isSerialItem = (item) => {
    if (!item) return false;
    const t = item.tracking_type ? item.tracking_type.toUpperCase() : "LOT";
    return t === "SERIAL" || item.serial_required === true;
};

// ---------------------------------------------------------------------------
// SerialEntryDialog — ISOLATED component so parent form NEVER re-renders
// during scanning. All serial state lives here.
// ---------------------------------------------------------------------------
const SerialEntryDialog = memo(function SerialEntryDialog({
    open,
    item,
    initialSerials = [],
    onDone,
    onClose,
    onValidateSerials,
    poInwardId = null,
}) {
    const acceptedQty = item ? (parseInt(item.accepted_quantity) || 0) : 0;
    const productName = item?.product_name || "Item";
    const orderedQty = parseInt(item?.ordered_quantity, 10) || 0;
    const alreadyReceived = parseInt(item?.already_received_quantity, 10) || 0;
    const pending = Math.max(0, orderedQty - alreadyReceived);

    const [slots, setSlots] = useState([]);
    const [error, setError] = useState("");
    const [slotErrors, setSlotErrors] = useState({});
    const [validating, setValidating] = useState(false);
    const [gunValue, setGunValue] = useState("");
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanTargetIndex, setScanTargetIndex] = useState(null);
    const [processing, setProcessing] = useState(false);
    const gunRef = useRef(null);
    const inputRefs = useRef([]);

    // Init / reset when dialog opens or acceptedQty changes
    useEffect(() => {
        if (!open) return;
        const existing = (initialSerials || []).map((s) =>
            (typeof s === "string" ? s : s?.serial_number ?? "").trim()
        );
        const padded = Array.from({ length: acceptedQty }, (_, i) => existing[i] ?? "");
        setSlots(padded);
        setError("");
        setSlotErrors({});
        setGunValue("");
        inputRefs.current = [];
        setTimeout(() => gunRef.current?.focus(), 150);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, acceptedQty]);

    const handleValueChange = useCallback((index, value) => {
        setSlots((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
        setError("");
        setSlotErrors((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    }, []);

    const handleBulkOrSingle = useCallback((index, value) => {
        const tokens = splitSerialInput(value);
        if (tokens.length <= 1) {
            handleValueChange(index, value);
            return;
        }
        setSlotErrors({});
        if (tokens.length > pending) {
            setError(`Too many serials (${tokens.length}). Cannot exceed pending quantity (${pending}).`);
            return;
        }
        setSlots((prev) => {
            const existingLower = new Set(prev.map((v) => (v || "").trim().toLowerCase()).filter(Boolean));
            const uniqueNew = tokens.filter((t) => !existingLower.has(t.trim().toLowerCase()));
            if (uniqueNew.length === 0) {
                setError("All serials already entered.");
                return prev;
            }
            const { nextSlots, overflow, duplicates } = fillSerialSlots({
                slots: prev,
                startIndex: index,
                incoming: uniqueNew,
                caseInsensitive: true,
            });
            if (duplicates.length) {
                setError(`Duplicate serial(s) ignored: ${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? "…" : ""}`);
            }
            if (overflow.length) {
                setError(`Cannot add ${overflow.length} serial(s): quantity limit reached.`);
                return prev;
            }
            return nextSlots;
        });
    }, [pending]);

    const handleKeyDown = useCallback((index, e) => {
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            if (index < slots.length - 1) {
                inputRefs.current[index + 1]?.focus();
            } else {
                handleDone();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slots.length]);

    const handleGunKeyDown = useCallback((e) => {
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            const trimmed = (gunValue || "").trim();
            if (!trimmed) return;
            const firstEmpty = slots.findIndex((v) => !(v || "").trim());
            const idx = firstEmpty !== -1 ? firstEmpty : 0;
            handleBulkOrSingle(idx, trimmed);
            setGunValue("");
            gunRef.current?.focus();
        }
    }, [gunValue, slots, handleBulkOrSingle]);

    const handleScanResult = useCallback((value) => {
        const tokens = splitSerialInput(value || "");
        if (!tokens.length) return;

        setProcessing(true);
        // Small timeout so the UI can paint the loader before the heavy slot-fill
        setTimeout(() => {
            try {
                if (tokens.length === 1) {
                    const trimmed = tokens[0];
                    setSlots((prev) => {
                        const alreadyIn = prev.some(
                            (v) => (v || "").trim().toLowerCase() === trimmed.toLowerCase()
                        );
                        if (alreadyIn) {
                            toastError("Serial number already entered.");
                            return prev;
                        }
                        const firstEmpty = prev.findIndex((v) => !(v || "").trim());
                        const idx = firstEmpty !== -1 ? firstEmpty : (scanTargetIndex ?? 0);
                        const next = [...prev];
                        next[idx] = trimmed;
                        // Advance scanTargetIndex
                        const nextEmpty = next.findIndex((v, i) => i > idx && !(v || "").trim());
                        setScanTargetIndex(nextEmpty !== -1 ? nextEmpty : null);
                        if (nextEmpty === -1) setScannerOpen(false);
                        return next;
                    });
                } else {
                    if (tokens.length > pending) {
                        toastError(`Too many serials (${tokens.length}). Max pending: ${pending}.`);
                        return;
                    }
                    setSlots((prev) => {
                        const existingLower = new Set(prev.map((v) => (v || "").trim().toLowerCase()).filter(Boolean));
                        const uniqueNew = tokens.filter((t) => !existingLower.has(t.trim().toLowerCase()));
                        if (!uniqueNew.length) {
                            toastError("All serials already entered.");
                            return prev;
                        }
                        const startIdx = prev.findIndex((v) => !(v || "").trim());
                        const { nextSlots, overflow } = fillSerialSlots({
                            slots: prev,
                            startIndex: startIdx !== -1 ? startIdx : 0,
                            incoming: uniqueNew,
                            caseInsensitive: true,
                        });
                        if (overflow.length) {
                            toastError(`${overflow.length} serial(s) exceed quantity limit.`);
                        }
                        setScannerOpen(false);
                        return nextSlots;
                    });
                }
            } finally {
                setProcessing(false);
            }
        }, 120);
    }, [pending, scanTargetIndex]);

    const handleDone = async () => {
        const trimmed = slots.map((s) => String(s || "").trim());
        const emptyIdx = trimmed.findIndex((s) => !s);
        if (emptyIdx !== -1) {
            setError("Please fill all serial numbers.");
            inputRefs.current[emptyIdx]?.focus();
            return;
        }
        const unique = new Set(trimmed);
        if (unique.size !== trimmed.length) {
            setError("Duplicate serial numbers are not allowed.");
            return;
        }

        if (!onValidateSerials || !item?.product_id) {
            onDone(trimmed);
            return;
        }

        setValidating(true);
        setError("");
        setSlotErrors({});
        try {
            const result = await onValidateSerials({
                product_id: item.product_id,
                serial_numbers: trimmed,
                po_inward_id: poInwardId ?? undefined,
            });
            if (result?.valid === true) {
                onDone(trimmed);
                return;
            }
            if (result?.invalid_serials?.length) {
                const invalidSet = new Set(result.invalid_serials.map((x) => (x.serial_number || "").trim()));
                const message = result.invalid_serials[0]?.message || "Duplicate serial number for this product type.";
                const nextSlotErrors = {};
                trimmed.forEach((sn, idx) => {
                    if (invalidSet.has(sn)) nextSlotErrors[idx] = message;
                });
                setSlotErrors(nextSlotErrors);
                setError("Some serials are already used for this product type.");
                return;
            }
            onDone(trimmed);
        } catch (err) {
            setError(err?.response?.data?.message || "Validation failed. Please try again.");
        } finally {
            setValidating(false);
        }
    };

    const openScanner = () => {
        const firstEmpty = slots.findIndex((v) => !(v || "").trim());
        setScanTargetIndex(firstEmpty !== -1 ? firstEmpty : 0);
        setScannerOpen(true);
    };

    const filledCount = slots.filter((v) => (v || "").trim()).length;
    const isComplete = filledCount === acceptedQty && acceptedQty > 0;

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <QrCodeScannerIcon color="primary" sx={{ fontSize: 22 }} />
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                                Serial Number Entry
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {productName}
                            </Typography>
                        </Box>
                        <Chip
                            label={`${filledCount} / ${acceptedQty}`}
                            size="small"
                            color={isComplete ? "success" : "default"}
                            icon={isComplete ? <CheckCircleIcon /> : undefined}
                        />
                    </Box>
                    {/* Progress bar */}
                    <LinearProgress
                        variant="determinate"
                        value={acceptedQty > 0 ? (filledCount / acceptedQty) * 100 : 0}
                        sx={{ mt: 1.5, borderRadius: 1, height: 4 }}
                        color={isComplete ? "success" : "primary"}
                    />
                </DialogTitle>

                <DialogContent sx={{ pt: 1, pb: 1 }}>
                    {/* Processing overlay */}
                    {processing && (
                        <Box sx={{
                            display: "flex", alignItems: "center", gap: 1.5,
                            p: 1.5, mb: 1.5, borderRadius: 1,
                            bgcolor: "primary.50", border: 1, borderColor: "primary.200"
                        }}>
                            <CircularProgress size={18} />
                            <Typography variant="body2" color="primary.main" fontWeight={500}>
                                Processing scan, settling serial numbers…
                            </Typography>
                        </Box>
                    )}

                    {/* Gun scan input */}
                    <Box sx={{ mb: 1.5, p: 1.5, bgcolor: "action.hover", borderRadius: 1.5, border: 1, borderColor: "divider" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block", fontWeight: 600 }}>
                            🔫 SCANNER GUN INPUT
                        </Typography>
                        <TextField
                            inputRef={gunRef}
                            size="small"
                            fullWidth
                            placeholder="Point scanner gun here, then scan…"
                            value={gunValue}
                            onChange={(e) => setGunValue(e.target.value)}
                            onKeyDown={handleGunKeyDown}
                            variant="outlined"
                            autoComplete="off"
                            helperText="Scanner types here, then auto-submits on Enter."
                        />
                    </Box>

                    {/* Camera scan button */}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full mb-3 flex items-center justify-center gap-2"
                        onClick={openScanner}
                    >
                        <QrCodeScannerIcon sx={{ fontSize: 18 }} />
                        Scan with Camera
                    </Button>

                    <Divider sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">or type manually</Typography>
                    </Divider>

                    {error && (
                        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError("")}>
                            {error}
                        </Alert>
                    )}

                    {/* Serial input grid */}
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, mb: 1 }}>
                        {slots.map((value, idx) => (
                            <TextField
                                key={idx}
                                size="small"
                                sx={{ minWidth: 180, flex: "1 1 180px" }}
                                label={`Serial ${idx + 1} of ${acceptedQty}`}
                                value={value}
                                onChange={(e) => handleBulkOrSingle(idx, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(idx, e)}
                                inputRef={(el) => { inputRefs.current[idx] = el; }}
                                variant="outlined"
                                autoComplete="off"
                                error={!!slotErrors[idx]}
                                helperText={slotErrors[idx] || ""}
                                color={slotErrors[idx] ? undefined : (value || "").trim() ? "success" : "primary"}
                                InputProps={{
                                    endAdornment: (value || "").trim()
                                        ? (
                                            <IconButton size="small" tabIndex={-1} edge="end"
                                                onClick={() => handleValueChange(idx, "")}>
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        )
                                        : null,
                                }}
                            />
                        ))}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
                    <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1" disabled={validating}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleDone}
                        disabled={processing || validating}
                        className={`flex-1 ${isComplete ? "bg-green-600 hover:bg-green-700" : ""}`}
                    >
                        {validating ? (
                            <><CircularProgress size={16} sx={{ mr: 0.5 }} />Validating…</>
                        ) : isComplete ? (
                            <><CheckCircleIcon sx={{ fontSize: 16, mr: 0.5 }} />Save Serials</>
                        ) : (
                            "Save Serials"
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            <BarcodeScanner
                open={scannerOpen}
                onScan={handleScanResult}
                onClose={() => { setScannerOpen(false); setScanTargetIndex(null); }}
                hint={scanTargetIndex != null && slots.length > 0
                    ? `Scanning serial ${scanTargetIndex + 1} of ${slots.length}` : ""}
            />
        </>
    );
});

// ---------------------------------------------------------------------------
// Main Form Component
// ---------------------------------------------------------------------------
export default function POInwardForm({
    defaultValues = {},
    onSubmit,
    loading,
    serverError = null,
    onClearServerError = () => { },
    onCancel = null,
}) {
    const [formData, setFormData] = useState({
        purchase_order_id: "",
        warehouse_id: "",
        supplier_invoice_number: "",
        supplier_invoice_date: "",
        received_at: new Date().toISOString().split("T")[0],
        inspection_required: false,
        remarks: "",
        items: [],
    });

    const [errors, setErrors] = useState({});
    const [warehouses, setWarehouses] = useState([]);
    const [selectedPO, setSelectedPO] = useState(null);
    const [poLoading, setPoLoading] = useState(false);
    const [collapsedCardItems, setCollapsedCardItems] = useState(new Set());

    // Serial dialog state — only index stored here; all serial state lives in dialog
    const [serialDialogIndex, setSerialDialogIndex] = useState(null);

    // Guard duplicate loadPurchaseOrder calls
    const loadingPORef = useRef(false);

    const toggleCardCollapse = (index) => {
        setCollapsedCardItems((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index); else next.add(index);
            return next;
        });
    };

    useEffect(() => {
        if (defaultValues && Object.keys(defaultValues).length > 0) {
            setFormData({
                purchase_order_id: defaultValues.purchase_order_id || "",
                warehouse_id: defaultValues.warehouse_id || "",
                supplier_invoice_number: defaultValues.supplier_invoice_number || "",
                supplier_invoice_date: defaultValues.supplier_invoice_date || "",
                received_at: defaultValues.received_at || new Date().toISOString().split("T")[0],
                inspection_required: defaultValues.inspection_required || false,
                remarks: defaultValues.remarks || "",
                items: defaultValues.items || [],
            });
            if (defaultValues.purchase_order_id) {
                loadPurchaseOrder(defaultValues.purchase_order_id, defaultValues?.id ? defaultValues.items : null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultValues]);

    const loadPurchaseOrder = async (poId, existingItems = null) => {
        if (loadingPORef.current) return;
        loadingPORef.current = true;
        setPoLoading(true);
        try {
            const response = await poInwardService.getPODetailsForInward(poId);
            const result = response.result || response;
            setSelectedPO(result);

            if (result.bill_to_id) {
                try {
                    const warehousesRes = await companyService.listWarehouses(parseInt(result.bill_to_id));
                    const wh = warehousesRes?.result || warehousesRes?.data || warehousesRes || [];
                    const whArr = Array.isArray(wh) ? wh : [];
                    setWarehouses(whArr);
                    if (result.ship_to_id) {
                        const found = whArr.find((w) => w.id === parseInt(result.ship_to_id));
                        if (found) {
                            setFormData((prev) => ({ ...prev, warehouse_id: result.ship_to_id.toString() }));
                        }
                    }
                } catch (err) {
                    console.error("Failed to load warehouses", err);
                    setWarehouses([]);
                }
            }

            if (result.items && result.items.length > 0) {
                const poItems = result.items.map((item) => {
                    const productTrackingType = item.product?.tracking_type
                        ? item.product.tracking_type.toUpperCase()
                        : "LOT";
                    const productSerialRequired = item.product?.serial_required || false;
                    const shouldBeSerial = productTrackingType === "SERIAL" || productSerialRequired === true;
                    const trackingType = shouldBeSerial ? "SERIAL" : productTrackingType;
                    const alreadyReceived = item.received_quantity ?? item.received_qty ?? 0;
                    const existing = existingItems?.find((e) => e.purchase_order_item_id === item.id);
                    return {
                        purchase_order_item_id: item.id,
                        product_id: item.product_id,
                        product_name: item.product?.product_name || "",
                        tracking_type: trackingType,
                        serial_required: shouldBeSerial,
                        ordered_quantity: item.quantity,
                        already_received_quantity: alreadyReceived,
                        received_quantity: existing != null ? (existing.received_quantity ?? 0) : 0,
                        accepted_quantity: existing != null ? (existing.accepted_quantity ?? 0) : 0,
                        rejected_quantity: existing != null ? (existing.rejected_quantity ?? 0) : 0,
                        rate: item.rate,
                        gst_percent: item.gst_percent,
                        serials: existing?.serials ?? [],
                        lot_number: existing?.lot_number ?? "",
                    };
                });
                setFormData((prev) => ({ ...prev, items: poItems }));
            }
        } catch (err) {
            console.error("Failed to load purchase order", err);
        } finally {
            setPoLoading(false);
            loadingPORef.current = false;
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === "purchase_order_id") {
            setFormData((prev) => ({ ...prev, [name]: value, warehouse_id: "", items: [] }));
            setSelectedPO(null);
            setWarehouses([]);
            if (value) loadPurchaseOrder(value);
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: type === "checkbox" ? checked : value,
            }));
        }
        if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
        if (serverError) onClearServerError();
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        if (field === "received_quantity") {
            const received = parseInt(value) || 0;
            // Accepted = received (no rejected qty input)
            newItems[index].accepted_quantity = received;
            newItems[index].rejected_quantity = 0;
            if (isSerialItem(newItems[index])) {
                const acc = newItems[index].accepted_quantity;
                if (newItems[index].serials?.length > acc) newItems[index].serials = newItems[index].serials.slice(0, acc);
            }
        }
        setFormData((prev) => ({ ...prev, items: newItems }));
    };

    // Fires on Tab/blur from received qty field
    const handleReceivedQtyBlur = useCallback((index) => {
        const item = formData.items[index];
        if (!item) return;
        const received = parseInt(item.received_quantity) || 0;
        const pendingQty = Math.max(
            0,
            (parseInt(item.ordered_quantity) || 0) - (parseInt(item.already_received_quantity) || 0)
        );
        if (received > pendingQty) {
            setErrors((prev) => ({
                ...prev,
                [`item_${index}_received`]: `Exceeds pending qty (${pendingQty})`,
            }));
            return;
        }
        // Clear any prior error for this field
        setErrors((prev) => { const n = { ...prev }; delete n[`item_${index}_received`]; return n; });
        // Auto-open serial dialog for serialized items when accepted qty > 0
        if (isSerialItem(item) && received > 0) {
            // Small timeout so state update from handleItemChange settles first
            setTimeout(() => setSerialDialogIndex(index), 80);
        }
    }, [formData.items]);

    // Called when SerialEntryDialog calls onDone(serials)
    const handleSerialDialogDone = useCallback((serials) => {
        if (serialDialogIndex == null) return;
        setFormData((prev) => {
            const newItems = [...prev.items];
            newItems[serialDialogIndex].serials = serials;
            return { ...prev, items: newItems };
        });
        if (errors[`item_${serialDialogIndex}_serials`]) {
            setErrors((prev) => { const n = { ...prev }; delete n[`item_${serialDialogIndex}_serials`]; return n; });
        }
        setSerialDialogIndex(null);
    }, [serialDialogIndex, errors]);

    const openSerialDialog = (index) => {
        const item = formData.items[index];
        if (!item || !isSerialItem(item)) return;
        const acceptedQty = Math.max(0, parseInt(item.accepted_quantity) || 0);
        if (acceptedQty === 0) return;
        setSerialDialogIndex(index);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const isEdit = !!defaultValues?.id;
        const actionLabel = isEdit ? "update receipt" : "create receipt";
        const validationErrors = {};

        if (!formData.purchase_order_id) validationErrors.purchase_order_id = `Purchase Order is required to ${actionLabel}`;
        if (!formData.warehouse_id) validationErrors.warehouse_id = `Warehouse is required to ${actionLabel}`;
        if (!formData.received_at) {
            validationErrors.received_at = "Received Date is required";
        } else {
            const receivedDate = new Date(formData.received_at);
            const today = new Date(); today.setHours(23, 59, 59, 999);
            if (receivedDate > today) validationErrors.received_at = "Received Date cannot be in the future";
        }

        if (formData.items.length === 0) {
            validationErrors.items = `At least one item is required to ${actionLabel}`;
        } else {
            formData.items.forEach((item, index) => {
                const receivedQty = parseInt(item.received_quantity) || 0;
                const rejectedQty = parseInt(item.rejected_quantity) || 0;
                const orderedQty = parseInt(item.ordered_quantity) || 0;
                const alreadyReceivedQty = parseInt(item.already_received_quantity) || 0;
                const pendingQty = Math.max(0, orderedQty - alreadyReceivedQty);
                const acceptedQty = item.accepted_quantity || 0;
                const productName = item.product_name || `Item ${index + 1}`;

                if (!item.received_quantity || receivedQty <= 0) {
                    validationErrors[`item_${index}_received`] = `Received qty must be ≥ 1 for ${productName}`;
                } else if (receivedQty > pendingQty) {
                    validationErrors[`item_${index}_received`] = `Received (${receivedQty}) exceeds pending (${pendingQty}) for ${productName}`;
                }
                const calculatedAccepted = receivedQty;
                if (acceptedQty !== calculatedAccepted) {
                    validationErrors[`item_${index}_accepted`] = `Accepted qty should be ${calculatedAccepted} for ${productName}`;
                }
                if (isSerialItem(item)) {
                    const serialCount = (item.serials || []).length;
                    if (serialCount !== acceptedQty) {
                        validationErrors[`item_${index}_serials`] = `Enter exactly ${acceptedQty} serial(s) for ${productName}`;
                    } else {
                        const sns = (item.serials || []).map((s) => (typeof s === "string" ? s.trim() : s.serial_number?.trim())).filter(Boolean);
                        if (sns.length !== new Set(sns).size) {
                            validationErrors[`item_${index}_serials`] = `Duplicate serials found for ${productName}`;
                        }
                    }
                }
            });
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            const firstKey = Object.keys(validationErrors)[0];
            const el = firstKey === "items"
                ? document.querySelector("[data-items-section]")
                : document.querySelector(`[name="${firstKey}"]`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        setErrors({});
        const totals = formData.items.reduce(
            (acc, item) => {
                acc.total_received += parseInt(item.received_quantity) || 0;
                acc.total_accepted += parseInt(item.accepted_quantity) || 0;
                acc.total_rejected += parseInt(item.rejected_quantity) || 0;
                return acc;
            },
            { total_received: 0, total_accepted: 0, total_rejected: 0 }
        );

        const payload = {
            ...formData,
            purchase_order_id: parseInt(formData.purchase_order_id),
            warehouse_id: parseInt(formData.warehouse_id),
            supplier_id: selectedPO?.supplier_id || null,
            total_received_quantity: totals.total_received,
            total_accepted_quantity: totals.total_accepted,
            total_rejected_quantity: 0,
            items: formData.items.map((item) => {
                const acceptedQty = parseInt(item.accepted_quantity) || 0;
                const taxableAmount = (parseFloat(item.rate) || 0) * acceptedQty;
                const gstAmount = (taxableAmount * (parseFloat(item.gst_percent) || 0)) / 100;
                return {
                    purchase_order_item_id: item.purchase_order_item_id,
                    product_id: item.product_id,
                    tracking_type: item.tracking_type,
                    serial_required: item.serial_required,
                    ordered_quantity: parseInt(item.ordered_quantity),
                    received_quantity: parseInt(item.received_quantity),
                    accepted_quantity: acceptedQty,
                    rejected_quantity: 0,
                    rate: parseFloat(item.rate),
                    gst_percent: parseFloat(item.gst_percent),
                    taxable_amount: parseFloat(taxableAmount.toFixed(2)),
                    gst_amount: parseFloat(gstAmount.toFixed(2)),
                    total_amount: parseFloat((taxableAmount + gstAmount).toFixed(2)),
                    serials: isSerialItem(item)
                        ? (item.serials || []).map((serial) => ({ serial_number: serial }))
                        : [],
                    remarks: item.tracking_type === "LOT" && item.lot_number
                        ? `Lot: ${item.lot_number}${item.remarks ? ` | ${item.remarks}` : ""}`
                        : item.remarks || "",
                };
            }),
        };
        onSubmit(payload);
    };

    // Totals for summary bar
    const totals = formData.items.reduce(
        (acc, item) => {
            acc.ordered += parseInt(item.ordered_quantity) || 0;
            acc.pending += Math.max(0, (parseInt(item.ordered_quantity) || 0) - (parseInt(item.already_received_quantity) || 0));
            acc.received += parseInt(item.received_quantity) || 0;
            acc.accepted += parseInt(item.accepted_quantity) || 0;
            return acc;
        },
        { ordered: 0, pending: 0, received: 0, accepted: 0 }
    );

    const activeSerialItem = serialDialogIndex != null ? formData.items[serialDialogIndex] : null;
    const activeSerialInitial = activeSerialItem?.serials || [];

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <FormContainer>
                <Box sx={{ p: 1 }}>
                    {serverError && (
                        <Alert severity="error" sx={{ mb: 1 }} onClose={onClearServerError}>
                            {serverError}
                        </Alert>
                    )}

                    {/* ── Receipt Fields ─────────────────────────────────────── */}
                    <div className="w-full">
                        <FormGrid cols={2} className="lg:grid-cols-4">
                            <AutocompleteField
                                name="purchase_order_id"
                                label="Purchase Order"
                                asyncLoadOptions={(q) =>
                                    getReferenceOptionsSearch("purchaseOrder.model", {
                                        q, limit: 20, status_in: "APPROVED,PARTIAL_RECEIVED",
                                    })
                                }
                                referenceModel="purchaseOrder.model"
                                getOptionLabel={(po) =>
                                    po?.label ?? `${po?.po_number ?? po?.id ?? ""} - ${po?.supplier?.supplier_name ?? ""}`
                                }
                                value={selectedPO || (formData.purchase_order_id ? { id: formData.purchase_order_id } : null)}
                                onChange={(e, newValue) => {
                                    handleChange({ target: { name: "purchase_order_id", value: newValue?.id ?? "" } });
                                }}
                                placeholder="Type to search PO…"
                                disabled={!!(defaultValues && defaultValues.id)}
                                required
                                error={!!errors.purchase_order_id}
                                helperText={errors.purchase_order_id}
                            />

                            <AutocompleteField
                                name="warehouse_id"
                                label="Warehouse"
                                options={warehouses}
                                getOptionLabel={(w) => w?.name ?? w?.label ?? ""}
                                value={warehouses.find((w) => w.id === formData.warehouse_id) || (formData.warehouse_id ? { id: formData.warehouse_id } : null)}
                                onChange={(e, newValue) =>
                                    handleChange({ target: { name: "warehouse_id", value: newValue?.id ?? "" } })
                                }
                                placeholder="Select warehouse…"
                                required
                                error={!!errors.warehouse_id}
                                helperText={errors.warehouse_id}
                            />

                            <DateField
                                name="received_at"
                                label="Received Date"
                                value={formData.received_at}
                                onChange={handleChange}
                                required
                                error={!!errors.received_at}
                                helperText={errors.received_at}
                                maxDate={new Date().toISOString().split("T")[0]}
                            />

                            <Input
                                fullWidth
                                name="supplier_invoice_number"
                                label="Supplier Invoice No."
                                value={formData.supplier_invoice_number}
                                onChange={handleChange}
                            />

                            <DateField
                                name="supplier_invoice_date"
                                label="Supplier Invoice Date"
                                value={formData.supplier_invoice_date}
                                onChange={handleChange}
                                error={!!errors.supplier_invoice_date}
                                helperText={errors.supplier_invoice_date}
                            />


                            <div className="md:col-span-2">
                                <Input
                                    fullWidth
                                    name="remarks"
                                    label="Remarks"
                                    value={formData.remarks}
                                    onChange={handleChange}
                                    multiline
                                    rows={1}
                                />
                            </div>
                        </FormGrid>
                    </div>

                    {/* ── PO Info Banner ──────────────────────────────────────── */}
                    {selectedPO && (
                        <div className="mt-1.5 mb-1 rounded-md border border-border bg-card px-3 py-2 flex flex-wrap gap-3 items-start">
                            <div className="flex items-center gap-2 min-w-0">
                                <LocalShippingIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium">Purchase Order</p>
                                    <p className="text-sm font-semibold">{selectedPO.po_number || `PO #${selectedPO.id}`}</p>
                                </div>
                            </div>
                            {selectedPO.supplier?.supplier_name && (
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground font-medium">Supplier</p>
                                    <p className="text-sm font-semibold">{selectedPO.supplier.supplier_name}</p>
                                </div>
                            )}
                            {selectedPO.status && (
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground font-medium">PO Status</p>
                                    <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                                        {selectedPO.status}
                                    </span>
                                </div>
                            )}
                            {selectedPO.items?.length > 0 && (
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground font-medium">Line Items</p>
                                    <p className="text-sm font-semibold">{selectedPO.items.length}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Items ──────────────────────────────────────────────── */}
                    <div className="w-full mt-1">
                        <div data-items-section>
                            {errors.items && (
                                <Alert severity="error" sx={{ mb: 1 }}>{errors.items}</Alert>
                            )}

                            {/* PO loading skeleton */}
                            {poLoading && (
                                <Box sx={{ mt: 0.5 }}>
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
                                    ))}
                                </Box>
                            )}

                            {!poLoading && formData.items.length > 0 ? (
                                <>
                                    {/* ── Mobile cards (xs only) ────────────── */}
                                    <Box sx={{ display: { xs: "block", sm: "none" }, mt: 0.5 }}>
                                        {formData.items.map((item, index) => {
                                            const isSerial = isSerialItem(item);
                                            const isLot = item.tracking_type === "LOT" && !isSerial;
                                            const serialCount = (item.serials || []).length;
                                            const acceptedQty = item.accepted_quantity || 0;
                                            const isCardCollapsed = collapsedCardItems.has(index);
                                            const hasError = !!(
                                                errors[`item_${index}_received`] ||
                                                errors[`item_${index}_rejected`] ||
                                                errors[`item_${index}_serials`]
                                            );
                                            const serialComplete = isSerial && acceptedQty > 0 && serialCount === acceptedQty;

                                            return (
                                                <Card
                                                    key={index}
                                                    sx={{ mb: 1.5, border: 1, borderColor: hasError ? "error.main" : "divider" }}
                                                    variant="outlined"
                                                >
                                                    <Box
                                                        sx={{
                                                            display: "flex", alignItems: "center", gap: 1,
                                                            px: 1.5, py: 1.25, cursor: "pointer",
                                                            borderBottom: isCardCollapsed ? "none" : 1,
                                                            borderColor: "divider", minHeight: 48,
                                                        }}
                                                        onClick={() => toggleCardCollapse(index)}
                                                    >
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography variant="subtitle2" fontWeight={600} noWrap>
                                                                {index + 1}. {item.product_name}
                                                            </Typography>
                                                            {isCardCollapsed && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Ordered {item.ordered_quantity}
                                                                    {acceptedQty > 0 && ` · Accepted ${acceptedQty}`}
                                                                    {isSerial && acceptedQty > 0 && ` · Serials ${serialCount}/${acceptedQty}`}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                                                            {isSerial && <Chip label="SERIAL" size="small" color="primary" sx={{ height: 18, fontSize: "0.6rem" }} />}
                                                            {isLot && <Chip label="LOT" size="small" color="secondary" sx={{ height: 18, fontSize: "0.6rem" }} />}
                                                            {hasError && <Chip label="!" size="small" color="error" sx={{ height: 18, fontSize: "0.6rem", minWidth: 18 }} />}
                                                            {isCardCollapsed ? <ExpandMoreIcon fontSize="small" color="action" /> : <ExpandLessIcon fontSize="small" color="action" />}
                                                        </Box>
                                                    </Box>

                                                    <Collapse in={!isCardCollapsed} timeout="auto" unmountOnExit>
                                                        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                                                            {(() => {
                                                                const pendingQty = Math.max(0,
                                                                    (parseInt(item.ordered_quantity) || 0) - (parseInt(item.already_received_quantity) || 0)
                                                                );
                                                                return (
                                                                    <Box sx={{ display: "flex", gap: 3, mb: 1.5, flexWrap: "wrap" }}>
                                                                        {[
                                                                            { label: "Ordered", val: item.ordered_quantity },
                                                                            { label: "Pending", val: pendingQty },
                                                                            { label: "Accepted", val: acceptedQty, color: acceptedQty > 0 ? "success.main" : undefined },
                                                                        ].map(({ label, val, color }) => (
                                                                            <Box key={label}>
                                                                                <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                                                                                <Typography variant="body2" fontWeight="medium" color={color}>{val}</Typography>
                                                                            </Box>
                                                                        ))}
                                                                    </Box>
                                                                );
                                                            })()}

                                                            <Input
                                                                type="number"
                                                                size="small"
                                                                label="Received Qty"
                                                                fullWidth
                                                                value={item.received_quantity}
                                                                onChange={(e) => handleItemChange(index, "received_quantity", e.target.value)}
                                                                onBlur={() => handleReceivedQtyBlur(index)}
                                                                inputProps={{ min: 0 }}
                                                                error={!!errors[`item_${index}_received`]}
                                                                helperText={errors[`item_${index}_received`]}
                                                                sx={{ mb: 1 }}
                                                            />

                                                            {isLot && (
                                                                <Input
                                                                    size="small"
                                                                    fullWidth
                                                                    label="Lot/Batch Number (Optional)"
                                                                    value={item.lot_number || ""}
                                                                    onChange={(e) => handleItemChange(index, "lot_number", e.target.value)}
                                                                />
                                                            )}

                                                            {isSerial && acceptedQty > 0 && (
                                                                <Box sx={{ mt: 1.25 }}>
                                                                    <Box
                                                                        sx={{
                                                                            display: "flex", alignItems: "center",
                                                                            justifyContent: "space-between",
                                                                            p: 1.25, borderRadius: 1.5, border: 1,
                                                                            borderColor: errors[`item_${index}_serials`]
                                                                                ? "error.main"
                                                                                : serialComplete ? "success.main" : "divider",
                                                                            bgcolor: serialComplete ? "success.50" : "action.hover",
                                                                            cursor: "pointer", minHeight: 44,
                                                                        }}
                                                                        onClick={() => openSerialDialog(index)}
                                                                    >
                                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                            {serialComplete
                                                                                ? <CheckCircleIcon fontSize="small" color="success" />
                                                                                : <QrCodeScannerIcon fontSize="small" color="action" />
                                                                            }
                                                                            <Typography variant="body2">
                                                                                Serials: {serialCount} / {acceptedQty}
                                                                            </Typography>
                                                                        </Box>
                                                                        <Typography variant="caption" color="primary.main" fontWeight={600}>
                                                                            {serialComplete ? "✓ Done — Tap to edit" : "Tap to enter →"}
                                                                        </Typography>
                                                                    </Box>
                                                                    {errors[`item_${index}_serials`] && (
                                                                        <FormHelperText error sx={{ mt: 0.5 }}>
                                                                            {errors[`item_${index}_serials`]}
                                                                        </FormHelperText>
                                                                    )}
                                                                </Box>
                                                            )}
                                                        </CardContent>
                                                    </Collapse>
                                                </Card>
                                            );
                                        })}
                                    </Box>

                                    {/* ── Desktop table (sm+) ─────────────────── */}
                                    <Box sx={{ display: { xs: "none", sm: "block" } }}>
                                        <TableContainer component={Paper} variant="outlined" sx={{ mt: 0.5 }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ bgcolor: "action.hover" }}>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.75 }}>#</TableCell>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.75 }}>Product</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.75 }}>Ordered</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.75 }}>Pending</TableCell>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.75, minWidth: 100 }}>Received</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.75 }}>Accepted</TableCell>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.75 }}>Tracking / Serials</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {formData.items.map((item, index) => {
                                                        const isSerial = isSerialItem(item);
                                                        const isLot = item.tracking_type === "LOT" && !isSerial;
                                                        const serialCount = (item.serials || []).length;
                                                        const acceptedQty = item.accepted_quantity || 0;
                                                        const serialComplete = isSerial && acceptedQty > 0 && serialCount === acceptedQty;
                                                        const pendingQty = Math.max(0,
                                                            (parseInt(item.ordered_quantity) || 0) - (parseInt(item.already_received_quantity) || 0)
                                                        );

                                                        return (
                                                            <TableRow
                                                                key={index}
                                                                sx={{ "&:nth-of-type(odd)": { bgcolor: "action.hover" } }}
                                                            >
                                                                <TableCell sx={{ color: "text.secondary", fontSize: "0.78rem", py: 0.5 }}>
                                                                    {index + 1}
                                                                </TableCell>
                                                                <TableCell sx={{ py: 0.5 }}>
                                                                    <Typography variant="body2" fontWeight={500}>
                                                                        {item.product_name}
                                                                    </Typography>
                                                                    <Box sx={{ display: "flex", gap: 0.5, mt: 0.25, flexWrap: "wrap" }}>
                                                                        {isSerial && <Chip label="SERIAL" size="small" color="primary" sx={{ height: 16, fontSize: "0.6rem" }} />}
                                                                        {isLot && <Chip label="LOT" size="small" color="secondary" sx={{ height: 16, fontSize: "0.6rem" }} />}
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ fontSize: "0.82rem", py: 0.5 }}>{item.ordered_quantity}</TableCell>
                                                                <TableCell align="right" sx={{ fontSize: "0.82rem", fontWeight: 600, py: 0.5 }}>{pendingQty}</TableCell>
                                                                <TableCell sx={{ py: 0.5 }}>
                                                                    <Input
                                                                        type="number"
                                                                        size="small"
                                                                        fullWidth
                                                                        value={item.received_quantity}
                                                                        onChange={(e) => handleItemChange(index, "received_quantity", e.target.value)}
                                                                        onBlur={() => handleReceivedQtyBlur(index)}
                                                                        inputProps={{ min: 0, max: pendingQty }}
                                                                        error={!!errors[`item_${index}_received`]}
                                                                        helperText={errors[`item_${index}_received`]}
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ py: 0.5 }}>
                                                                    <Typography
                                                                        variant="body2"
                                                                        fontWeight={700}
                                                                        color={acceptedQty > 0 ? "success.main" : "text.secondary"}
                                                                    >
                                                                        {acceptedQty}
                                                                    </Typography>
                                                                    {errors[`item_${index}_accepted`] && (
                                                                        <FormHelperText error>{errors[`item_${index}_accepted`]}</FormHelperText>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell sx={{ py: 0.5 }}>
                                                                    {isSerial ? (
                                                                        <Box>
                                                                            <Tooltip title={serialComplete ? "All serials entered — click to edit" : "Click to enter serial numbers"}>
                                                                                <Box
                                                                                    sx={{
                                                                                        display: "inline-flex", alignItems: "center", gap: 0.75,
                                                                                        px: 1.25, py: 0.5, borderRadius: 1.5,
                                                                                        border: 1,
                                                                                        borderColor: errors[`item_${index}_serials`]
                                                                                            ? "error.main"
                                                                                            : serialComplete ? "success.main" : acceptedQty > 0 ? "primary.main" : "divider",
                                                                                        bgcolor: serialComplete ? "success.50" : acceptedQty > 0 ? "primary.50" : "transparent",
                                                                                        cursor: acceptedQty > 0 ? "pointer" : "default",
                                                                                        transition: "all 0.15s",
                                                                                        "&:hover": acceptedQty > 0 ? { opacity: 0.8 } : {},
                                                                                    }}
                                                                                    onClick={() => acceptedQty > 0 && openSerialDialog(index)}
                                                                                >
                                                                                    {serialComplete
                                                                                        ? <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
                                                                                        : <QrCodeScannerIcon sx={{ fontSize: 14, color: acceptedQty > 0 ? "primary.main" : "text.disabled" }} />
                                                                                    }
                                                                                    <Typography
                                                                                        variant="caption"
                                                                                        fontWeight={600}
                                                                                        color={serialComplete ? "success.main" : acceptedQty > 0 ? "primary.main" : "text.disabled"}
                                                                                    >
                                                                                        {serialCount}/{acceptedQty}
                                                                                    </Typography>
                                                                                </Box>
                                                                            </Tooltip>
                                                                            {errors[`item_${index}_serials`] && (
                                                                                <FormHelperText error sx={{ mt: 0.25 }}>
                                                                                    {errors[`item_${index}_serials`]}
                                                                                </FormHelperText>
                                                                            )}
                                                                        </Box>
                                                                    ) : isLot ? (
                                                                        <Input
                                                                            size="small"
                                                                            fullWidth
                                                                            placeholder="Lot/Batch No. (Optional)"
                                                                            value={item.lot_number || ""}
                                                                            onChange={(e) => handleItemChange(index, "lot_number", e.target.value)}
                                                                        />
                                                                    ) : (
                                                                        <Typography variant="caption" color="text.disabled">N/A</Typography>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                </>
                            ) : !poLoading && formData.items.length === 0 ? (
                                <Alert severity="info" sx={{ mt: 1 }} icon={<InventoryIcon />}>
                                    Select a Purchase Order above to load items for this receipt.
                                </Alert>
                            ) : null}
                        </div>
                    </div>

                    {/* ── Summary Stats Bar ───────────────────────────────────── */}
                    {formData.items.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                            {[
                                { label: "Line Items", value: formData.items.length, color: "#6366f1" },
                                { label: "Total Ordered", value: totals.ordered, color: "#64748b" },
                                { label: "This Receipt", value: totals.received, color: "#0ea5e9" },
                                { label: "Accepted", value: totals.accepted, color: "#22c55e" },
                                { label: "Balance Pending", value: Math.max(0, totals.pending - totals.received), color: totals.pending - totals.received > 0 ? "#f59e0b" : "#22c55e" },
                            ].map(({ label, value, color }) => (
                                <div
                                    key={label}
                                    className="relative overflow-hidden rounded-md border border-border bg-card px-2.5 py-2 pl-3"
                                    style={{ borderLeft: `3px solid ${color}` }}
                                >
                                    <p className="text-[10px] text-muted-foreground font-medium leading-none mb-0.5">{label}</p>
                                    <p className="text-lg font-bold leading-none" style={{ color }}>{value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </Box>

                <FormActions>
                    {onCancel && (
                        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
                            Cancel
                        </Button>
                    )}
                    <LoadingButton type="submit" size="sm" loading={loading} className="min-w-[140px]">
                        {defaultValues?.id ? "Update Receipt" : "Create Receipt"}
                    </LoadingButton>
                </FormActions>
            </FormContainer>

            {/* Serial Entry Dialog — isolated, parent never re-renders during scan */}
            <SerialEntryDialog
                open={serialDialogIndex != null}
                item={activeSerialItem}
                initialSerials={activeSerialInitial}
                onDone={handleSerialDialogDone}
                onClose={() => setSerialDialogIndex(null)}
                onValidateSerials={poInwardService.validateSerials}
                poInwardId={defaultValues?.id ?? null}
            />
        </Box>
    );
}
