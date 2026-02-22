"use client";

import { useState, useEffect, useRef } from "react";
import {
    Box,
    MenuItem,
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
    FormHelperText,
    Divider,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ClearIcon from "@mui/icons-material/Clear";
import stockService from "@/services/stockService";
import companyService from "@/services/companyService";
import productService from "@/services/productService";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import { splitSerialInput, fillSerialSlots } from "@/utils/serialInput";
import { toastError } from "@/utils/toast";
import { FORM_PADDING } from "@/utils/formConstants";

const ADJUSTMENT_TYPE_OPTIONS = [
    { value: "FOUND", label: "Found" },
    { value: "DAMAGE", label: "Damage" },
    { value: "LOSS", label: "Loss" },
    { value: "AUDIT", label: "Audit" },
];

export default function StockAdjustmentForm({
    defaultValues = {},
    onSubmit,
    loading,
    serverError = null,
    onClearServerError = () => {},
    onCancel = null,
    isEdit = false,
}) {
    const [formData, setFormData] = useState({
        adjustment_date: new Date().toISOString().split("T")[0],
        warehouse_id: "",
        adjustment_type: "LOSS",
        remarks: "",
        items: [],
    });

    const [formErrors, setFormErrors] = useState({});
    const [itemErrors, setItemErrors] = useState({});
    const [options, setOptions] = useState({
        companies: [],
        warehouses: [],
    });
    const [products, setProducts] = useState([]);
    const [availableStocks, setAvailableStocks] = useState({});
    const [loadingOptions, setLoadingOptions] = useState(false);

    const [currentItem, setCurrentItem] = useState({
        product_id: "",
        product_name: "",
        product_serial_required: false,
        product_measurement_unit_name: "",
        adjustment_direction: "OUT",
        quantity: "",
        serials: [],
    });

    const [addRowSerialDrawerOpen, setAddRowSerialDrawerOpen] = useState(false);
    const [serialDrawerValues, setSerialDrawerValues] = useState([]);
    const [serialDrawerError, setSerialDrawerError] = useState("");
    const serialInputRefs = useRef([]);
    const [gunScanValue, setGunScanValue] = useState("");
    const gunScanRef = useRef(null);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [addItemValidating, setAddItemValidating] = useState(false);

    // Load initial options: company profile for warehouse context; products
    useEffect(() => {
        const loadInitialOptions = async () => {
            setLoadingOptions(true);
            try {
                const [companyProfileRes, productsRes] = await Promise.all([
                    companyService.getCompanyProfile(),
                    productService.getProducts(),
                ]);
                const companyProfile = companyProfileRes?.result || companyProfileRes?.data || companyProfileRes;
                const companies = companyProfile ? [companyProfile] : [];
                setProducts(productsRes?.result?.data || productsRes?.data || []);

                setOptions((prev) => ({
                    ...prev,
                    companies,
                }));
            } catch (err) {
                console.error("Failed to load options", err);
            } finally {
                setLoadingOptions(false);
            }
        };
        loadInitialOptions();
    }, []);

    // Load warehouses when company is available (same pattern as PurchaseOrderForm)
    useEffect(() => {
        const loadWarehouses = async () => {
            const companyId = options.companies?.length > 0 ? options.companies[0]?.id : null;
            if (!companyId) {
                setOptions((prev) => ({ ...prev, warehouses: [] }));
                return;
            }
            try {
                const warehousesRes = await companyService.listWarehouses(parseInt(companyId));
                const warehouses = warehousesRes?.result || warehousesRes?.data || warehousesRes || [];
                const warehousesArray = Array.isArray(warehouses) ? warehouses : [];
                setOptions((prev) => ({
                    ...prev,
                    warehouses: warehousesArray,
                }));
            } catch (err) {
                console.error("Failed to load warehouses", err);
                setOptions((prev) => ({ ...prev, warehouses: [] }));
            }
        };
        loadWarehouses();
    }, [options.companies]);

    useEffect(() => {
        if (defaultValues && Object.keys(defaultValues).length > 0) {
            setFormData({
                adjustment_date: defaultValues.adjustment_date || new Date().toISOString().split("T")[0],
                warehouse_id: defaultValues.warehouse_id != null ? String(defaultValues.warehouse_id) : "",
                adjustment_type: defaultValues.adjustment_type || "LOSS",
                remarks: defaultValues.remarks ?? "",
                items: defaultValues.items || [],
            });
        }
    }, [defaultValues]);

    useEffect(() => {
        if (formData.warehouse_id) {
            loadAvailableStocks(formData.warehouse_id);
        } else {
            setAvailableStocks({});
        }
    }, [formData.warehouse_id]);

    const loadAvailableStocks = async (warehouseId) => {
        try {
            const response = await stockService.getStocksByWarehouse(warehouseId);
            const data = response?.result?.data || response?.data || [];
            const stockMap = {};
            data.forEach((stock) => {
                stockMap[stock.product_id] = stock;
            });
            setAvailableStocks(stockMap);
        } catch (err) {
            console.error("Failed to load available stocks", err);
        }
    };

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

    const handleItemChange = (e) => {
        const { name, value } = e.target;
        setCurrentItem((prev) => {
            const next = { ...prev, [name]: value };
            if (name === "quantity" || name === "product_id") {
                const qty = name === "quantity" ? Number(value) || 0 : Number(next.quantity) || 0;
                if (next.serials?.length > qty) {
                    next.serials = next.serials.slice(0, qty);
                }
            }
            return next;
        });
        if (itemErrors[name]) {
            setItemErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
        if (addRowSerialDrawerOpen && (e.target.name === "quantity" || e.target.name === "product_id")) {
            setAddRowSerialDrawerOpen(false);
            setSerialDrawerValues([]);
            setSerialDrawerError("");
        }
    };

    const toggleAddRowSerialDrawer = () => {
        const qty = Math.max(0, Number(currentItem.quantity) || 0);
        if (!currentItem.product_serial_required || qty === 0) return;
        if (addRowSerialDrawerOpen) {
            setAddRowSerialDrawerOpen(false);
            setSerialDrawerValues([]);
            setSerialDrawerError("");
            serialInputRefs.current = [];
            return;
        }
        const existing = (currentItem.serials || []).slice(0, qty);
        const padded = Array.from({ length: qty }, (_, i) => existing[i] ?? "");
        setSerialDrawerValues(padded);
        setSerialDrawerError("");
        setAddRowSerialDrawerOpen(true);
        serialInputRefs.current = [];
        setGunScanValue("");
        setTimeout(() => serialInputRefs.current[0]?.focus(), 100);
    };

    const closeAddRowSerialDrawer = () => {
        setAddRowSerialDrawerOpen(false);
        setSerialDrawerValues([]);
        setSerialDrawerError("");
        setGunScanValue("");
        serialInputRefs.current = [];
    };

    const handleAddRowSerialDrawerValueChange = (index, value) => {
        setSerialDrawerValues((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
        setSerialDrawerError("");
    };

    const handleAddRowSerialDrawerBulkOrSingle = (index, value) => {
        const tokens = splitSerialInput(value);
        if (tokens.length <= 1) {
            handleAddRowSerialDrawerValueChange(index, value);
            return;
        }
        const qty = serialDrawerValues.length;
        if (tokens.length > qty) {
            setSerialDrawerError(`Too many serials (${tokens.length}). Cannot exceed quantity (${qty}).`);
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
    };

    const handleAddRowSerialDrawerKeyDown = (index, e) => {
        const qty = serialDrawerValues.length;
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            if (index < qty - 1) {
                serialInputRefs.current[index + 1]?.focus();
            } else {
                handleAddRowSerialDrawerDone();
            }
        }
    };

    const handleAddRowSerialDrawerDone = () => {
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
        setCurrentItem((prev) => ({ ...prev, serials: trimmed }));
        if (itemErrors.serials) {
            setItemErrors((prev) => {
                const next = { ...prev };
                delete next.serials;
                return next;
            });
        }
        closeAddRowSerialDrawer();
    };

    const handleGunScanKeyDown = (e) => {
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            const firstEmpty = serialDrawerValues.findIndex((v) => !(v || "").trim());
            const idx = firstEmpty !== -1 ? firstEmpty : 0;
            if ((gunScanValue || "").trim()) {
                handleAddRowSerialDrawerBulkOrSingle(idx, gunScanValue);
                setGunScanValue("");
            }
            gunScanRef.current?.focus();
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const errs = {};
        if (!currentItem.product_id) errs.product_id = "Product is required";
        if (!currentItem.adjustment_direction) errs.adjustment_direction = "Direction is required";
        if (!currentItem.quantity || Number(currentItem.quantity) <= 0) errs.quantity = "Quantity must be greater than 0";

        const productId = parseInt(currentItem.product_id);
        const warehouseId = parseInt(formData.warehouse_id);
        const qty = Number(currentItem.quantity);
        const stock = availableStocks[productId];
        const availableQty = stock?.quantity_available ?? 0;

        if (currentItem.adjustment_direction === "OUT") {
            if (availableQty <= 0) {
                errs.quantity = "No stock available for this product at this warehouse";
            } else if (qty > availableQty) {
                errs.quantity = `Available quantity is only ${availableQty}`;
            }
        }

        const product = { serial_required: currentItem.product_serial_required };

        if (product && product.serial_required) {
            const serials = currentItem.serials || [];
            if (serials.length !== qty) {
                errs.serials = `Enter exactly ${qty} serial number(s). Serials: ${serials.length} / ${qty}`;
            }
        }

        if (Object.keys(errs).length > 0) {
            setItemErrors(errs);
            const section = document.querySelector("[data-items-section]");
            if (section) section.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        const serials = (currentItem.serials || []).map((s) => (typeof s === "string" ? s : s?.serial_number ?? "").trim()).filter(Boolean);

        if (product?.serial_required && serials.length > 0) {
            setAddItemValidating(true);
            try {
                if (currentItem.adjustment_direction === "OUT") {
                    for (const serial of serials) {
                        const res = await stockService.validateSerialAvailable(serial, productId, warehouseId);
                        const result = res?.result ?? res?.data ?? res;
                        if (!result?.valid) {
                            setItemErrors({ serials: result?.message ?? `Serial "${serial}" is not available` });
                            setAddItemValidating(false);
                            return;
                        }
                    }
                } else if (currentItem.adjustment_direction === "IN") {
                    for (const serial of serials) {
                        const res = await stockService.validateSerialNotExists(serial, productId, warehouseId);
                        const result = res?.result ?? res?.data ?? res;
                        if (result?.exists) {
                            setItemErrors({ serials: result?.message ?? `Serial "${serial}" already exists` });
                            setAddItemValidating(false);
                            return;
                        }
                    }
                }
            } catch (err) {
                toastError(err?.response?.data?.message ?? err?.message ?? "Serial validation failed");
                setAddItemValidating(false);
                return;
            }
            setAddItemValidating(false);
        }

        const newItem = {
            product_id: productId,
            product_name: currentItem.product_name || "",
            measurement_unit_name: currentItem.product_measurement_unit_name || "",
            adjustment_direction: currentItem.adjustment_direction,
            quantity: qty,
            serials,
        };

        setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
        setCurrentItem({
            product_id: "",
            product_name: "",
            product_serial_required: false,
            product_measurement_unit_name: "",
            adjustment_direction: "OUT",
            quantity: "",
            serials: [],
        });
        setItemErrors({});
        closeAddRowSerialDrawer();
    };

    const handleRemoveItem = (index) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const errs = {};
        if (!formData.warehouse_id) errs.warehouse_id = "Warehouse is required";
        if (!formData.adjustment_date) errs.adjustment_date = "Adjustment Date is required";
        if (!formData.adjustment_type) errs.adjustment_type = "Adjustment type is required";
        if (!formData.remarks || !String(formData.remarks).trim()) errs.remarks = "Reason / Remarks is required";
        if (formData.items.length === 0) errs.items = "At least one item is required";

        if (Object.keys(errs).length > 0) {
            setFormErrors(errs);
            return;
        }

        setFormErrors({});

        const payload = {
            adjustment_date: formData.adjustment_date,
            warehouse_id: parseInt(formData.warehouse_id),
            adjustment_type: formData.adjustment_type,
            remarks: String(formData.remarks).trim(),
            items: formData.items.map((item) => ({
                product_id: item.product_id,
                adjustment_direction: item.adjustment_direction,
                adjustment_quantity: parseInt(item.quantity),
                serials: Array.isArray(item.serials) ? item.serials : [],
            })),
        };

        onSubmit(payload);
    };

    if (loadingOptions) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
                <CircularProgress />
            </Box>
        );
    }

    const warehouseSelected = !!formData.warehouse_id;

    return (
        <FormContainer className="flex-1 min-h-0 flex flex-col">
            <form id="stock-adjustment-form" onSubmit={handleSubmit} className="mx-auto w-full max-w-[1100px] flex flex-col flex-1 min-h-0" noValidate>
                <Box sx={{ p: FORM_PADDING }}>
                {serverError && (
                    <Alert severity="error" sx={{ mb: 1 }} onClose={onClearServerError}>
                        {serverError}
                    </Alert>
                )}

                <div className="w-full">
                    <FormGrid cols={2} className="lg:grid-cols-4">
                        <DateField
                            name="adjustment_date"
                            label="Adjustment Date *"
                            value={formData.adjustment_date}
                            onChange={handleChange}
                            required
                            error={!!formErrors.adjustment_date}
                            helperText={formErrors.adjustment_date}
                        />
                        <AutocompleteField
                            label="Warehouse *"
                            placeholder="Type to search..."
                            options={options.warehouses}
                            getOptionLabel={(w) => w?.name ?? String(w?.id ?? "")}
                            value={
                                options.warehouses.find((w) => w.id === parseInt(formData.warehouse_id)) ||
                                (formData.warehouse_id ? { id: parseInt(formData.warehouse_id), name: "" } : null)
                            }
                            onChange={(e, newValue) => handleChange({ target: { name: "warehouse_id", value: newValue?.id ?? "" } })}
                            required
                            error={!!formErrors.warehouse_id}
                            helperText={formErrors.warehouse_id}
                        />
                        <Select
                            name="adjustment_type"
                            label="Adjustment Type *"
                            value={formData.adjustment_type}
                            onChange={handleChange}
                            required
                            error={!!formErrors.adjustment_type}
                            helperText={formErrors.adjustment_type}
                        >
                            {ADJUSTMENT_TYPE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                        <div className="md:col-span-2 lg:col-span-4">
                            <Input
                                name="remarks"
                                label="Reason / Remarks *"
                                value={formData.remarks}
                                onChange={handleChange}
                                required
                                multiline
                                rows={2}
                                error={!!formErrors.remarks}
                                helperText={formErrors.remarks}
                            />
                        </div>
                    </FormGrid>
                </div>

                <FormSection title="Items" className="mt-1.5 flex-1 min-h-[240px] flex flex-col" data-items-section>
                    {formErrors.items && (
                        <Alert severity="error" sx={{ mb: 1 }}>
                            {formErrors.items}
                        </Alert>
                    )}

                    <Paper sx={{ p: 0.75, mb: 0.75, overflow: "visible" }} className="shrink-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end">
                            <AutocompleteField
                                label="Product *"
                                placeholder={warehouseSelected ? "Type to search..." : "Select warehouse first"}
                                options={[]}
                                disabled={!warehouseSelected}
                                usePortal
                                asyncLoadOptions={async (q) => {
                                    const res = await productService.getProducts({ q: q || undefined, limit: 20 });
                                    const data = res?.result?.data ?? res?.data ?? [];
                                    return Array.isArray(data) ? data : [];
                                }}
                                resolveOptionById={async (id) => {
                                    if (id == null || id === "") return null;
                                    const p = await productService.getProductById(id);
                                    const row = p?.result ?? p;
                                    return row
                                        ? {
                                            id: row.id,
                                            product_name: row.product_name,
                                            serial_required: row.serial_required,
                                            measurement_unit_name: row.measurement_unit_name ?? null,
                                        }
                                        : null;
                                }}
                                getOptionLabel={(p) => p?.product_name ?? String(p?.id ?? "")}
                                value={currentItem.product_id ? { id: currentItem.product_id } : null}
                                onChange={(e, newValue) => {
                                    handleItemChange({ target: { name: "product_id", value: newValue?.id ?? "" } });
                                    setCurrentItem((prev) => ({
                                        ...prev,
                                        product_id: newValue?.id ?? "",
                                        product_name: newValue?.product_name ?? "",
                                        product_serial_required: !!newValue?.serial_required,
                                        product_measurement_unit_name: newValue?.measurement_unit_name ?? "",
                                    }));
                                }}
                                error={!!itemErrors.product_id}
                                helperText={
                                    itemErrors.product_id ||
                                    (!warehouseSelected ? "Select warehouse to choose products" : "")
                                }
                            />
                            <Select
                                name="adjustment_direction"
                                label="Direction *"
                                value={currentItem.adjustment_direction}
                                onChange={handleItemChange}
                                required
                                error={!!itemErrors.adjustment_direction}
                                helperText={itemErrors.adjustment_direction}
                            >
                                <MenuItem value="OUT">OUT (Lost/Damaged)</MenuItem>
                                <MenuItem value="IN">IN (Found)</MenuItem>
                            </Select>
                            <Input
                                name="quantity"
                                label={currentItem.product_measurement_unit_name
                                    ? `Quantity * (${currentItem.product_measurement_unit_name})`
                                    : "Quantity *"}
                                type="number"
                                value={currentItem.quantity}
                                onChange={handleItemChange}
                                inputProps={{ min: 1 }}
                                required
                                error={!!itemErrors.quantity}
                                helperText={itemErrors.quantity}
                            />
                            <div className="flex items-end">
                                <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddItem}
                                    disabled={addItemValidating}
                                    className="w-full lg:w-auto"
                                >
                                    {addItemValidating ? "Validating…" : "Add"}
                                </Button>
                            </div>
                        </div>

                        {currentItem.product_serial_required && (Number(currentItem.quantity) || 0) > 0 && (
                            <Box sx={{ mt: 1 }}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        p: 1,
                                        borderRadius: 1,
                                        border: 1,
                                        borderColor: itemErrors.serials ? "error.main" : "divider",
                                        bgcolor: "action.hover",
                                        cursor: "pointer",
                                        minHeight: 40,
                                    }}
                                    onClick={toggleAddRowSerialDrawer}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <QrCodeScannerIcon
                                            fontSize="small"
                                            color={(currentItem.serials?.length || 0) === Number(currentItem.quantity) ? "success" : "action"}
                                        />
                                        <Typography variant="body2">
                                            Serials: {currentItem.serials?.length || 0} / {currentItem.quantity}
                                        </Typography>
                                    </Box>
                                    {addRowSerialDrawerOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                </Box>
                                {itemErrors.serials && (
                                    <FormHelperText error sx={{ mt: 0.5 }}>
                                        {itemErrors.serials}
                                    </FormHelperText>
                                )}

                                <Collapse in={addRowSerialDrawerOpen} timeout="auto" unmountOnExit>
                                    <Box sx={{ pt: 1 }}>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full mb-2 min-h-[38px] touch-manipulation flex items-center justify-center gap-1.5"
                                            onClick={() => {
                                                setScannerOpen(true);
                                            }}
                                        >
                                            <QrCodeScannerIcon sx={{ fontSize: 20 }} />
                                            Scan Barcode / QR Code
                                        </Button>
                                        <BarcodeScanner
                                            open={scannerOpen}
                                            onScan={(value) => {
                                                const firstEmpty = serialDrawerValues.findIndex((v) => !(v || "").trim());
                                                const idx = firstEmpty !== -1 ? firstEmpty : 0;
                                                if (value?.trim()) {
                                                    handleAddRowSerialDrawerBulkOrSingle(idx, value);
                                                }
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
                                        {serialDrawerError && (
                                            <Alert severity="error" sx={{ mb: 1 }} onClose={() => setSerialDrawerError("")}>
                                                {serialDrawerError}
                                            </Alert>
                                        )}
                                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1, mb: 1 }}>
                                            {addRowSerialDrawerOpen &&
                                                serialDrawerValues.length > 0 &&
                                                serialDrawerValues.map((value, idx) => (
                                                    <TextField
                                                        key={idx}
                                                        size="small"
                                                        fullWidth
                                                        label={`Serial ${idx + 1} of ${serialDrawerValues.length}`}
                                                        value={value}
                                                        onChange={(e) => handleAddRowSerialDrawerBulkOrSingle(idx, e.target.value)}
                                                        onKeyDown={(e) => handleAddRowSerialDrawerKeyDown(idx, e)}
                                                        inputRef={(el) => {
                                                            serialInputRefs.current[idx] = el;
                                                        }}
                                                        variant="outlined"
                                                        InputProps={{
                                                            endAdornment: value?.trim() ? (
                                                                <IconButton
                                                                    size="small"
                                                                    tabIndex={-1}
                                                                    edge="end"
                                                                    onClick={() => handleAddRowSerialDrawerValueChange(idx, "")}
                                                                >
                                                                    <ClearIcon fontSize="small" />
                                                                </IconButton>
                                                            ) : null,
                                                        }}
                                                    />
                                                ))}
                                        </Box>
                                        <Box sx={{ display: "flex", gap: 1 }}>
                                            <Button type="button" variant="outline" size="sm" className="flex-1 min-h-[38px]" onClick={closeAddRowSerialDrawer}>
                                                Cancel
                                            </Button>
                                            <Button type="button" size="sm" className="flex-1 min-h-[38px]" onClick={handleAddRowSerialDrawerDone}>
                                                Done
                                            </Button>
                                        </Box>
                                    </Box>
                                </Collapse>
                            </Box>
                        )}
                    </Paper>

                    <div className="min-h-[180px] flex-1">
                    {formData.items.length > 0 && (
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Product</TableCell>
                                        <TableCell>Direction</TableCell>
                                        <TableCell>Quantity</TableCell>
                                        <TableCell>UOM</TableCell>
                                        <TableCell>Serials</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {formData.items.map((item, index) => {
                                        const product = products.find((p) => p.id === item.product_id) || {};
                                        const productName = item.product_name ?? product?.product_name ?? "-";
                                        const uom = item.measurement_unit_name ?? product?.measurement_unit_name ?? "-";
                                        return (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    {productName}
                                                    {product?.serial_required && (
                                                        <Chip label="Serial" size="small" color="primary" sx={{ ml: 1 }} />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={item.adjustment_direction}
                                                        size="small"
                                                        color={item.adjustment_direction === "IN" ? "success" : "error"}
                                                    />
                                                </TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>{uom}</TableCell>
                                                <TableCell>
                                                    {item.serials?.length > 0 ? (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {item.serials.length <= 2
                                                                ? item.serials.join(", ")
                                                                : `${item.serials.slice(0, 2).join(", ")} and ${item.serials.length - 2} more`}
                                                        </Typography>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)}>
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
                    </div>
                </FormSection>
                </Box>
            </form>

            <FormActions>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                )}
                <LoadingButton type="submit" form="stock-adjustment-form" loading={loading} className="min-w-[120px]">
                    {isEdit ? "Update" : "Create"}
                </LoadingButton>
            </FormActions>
        </FormContainer>
    );
}
