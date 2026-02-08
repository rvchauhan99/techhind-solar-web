"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Button,
    Grid,
    Typography,
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
    Divider,
    Card,
    CardContent,
    FormControlLabel,
    Checkbox,
    FormHelperText,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import purchaseOrderService from "@/services/purchaseOrderService";
import companyService from "@/services/companyService";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { COMPACT_FORM_SPACING, COMPACT_SECTION_HEADER_STYLE, FORM_PADDING } from "@/utils/formConstants";

// Helper function to check if an item requires serial tracking
const isSerialItem = (item) => {
    if (!item) return false;
    const normalizedTrackingType = item.tracking_type ? item.tracking_type.toUpperCase() : "LOT";
    return normalizedTrackingType === "SERIAL" || item.serial_required === true;
};

export default function POInwardForm({ defaultValues = {}, onSubmit, loading, serverError = null, onClearServerError = () => { }, onCancel = null }) {
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
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [selectedPO, setSelectedPO] = useState(null);
    const [loadingOptions, setLoadingOptions] = useState(false);

    useEffect(() => {
        const loadOptions = async () => {
            setLoadingOptions(true);
            try {
                const poRes = await purchaseOrderService.getPurchaseOrders({ status: "APPROVED" });
                setPurchaseOrders(poRes?.result?.data || poRes?.data || []);
                // Don't load warehouses here - will load when PO is selected
                setWarehouses([]);
            } catch (err) {
                console.error("Failed to load options", err);
            } finally {
                setLoadingOptions(false);
            }
        };
        loadOptions();
    }, []);

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
                loadPurchaseOrder(defaultValues.purchase_order_id);
            }
        }
    }, [defaultValues]);

    const loadPurchaseOrder = async (poId) => {
        try {
            const response = await purchaseOrderService.getPurchaseOrderById(poId);
            const result = response.result || response;
            setSelectedPO(result);

            // Load warehouses for the PO's company (bill_to_id)
            if (result.bill_to_id) {
                try {
                    const warehousesRes = await companyService.listWarehouses(parseInt(result.bill_to_id));
                    const warehouses = warehousesRes?.result || warehousesRes?.data || warehousesRes || [];
                    const warehousesArray = Array.isArray(warehouses) ? warehouses : [];
                    setWarehouses(warehousesArray);

                    // Auto-select warehouse from PO's ship_to_id
                    if (result.ship_to_id) {
                        const poWarehouse = warehousesArray.find(w => w.id === parseInt(result.ship_to_id));
                        if (poWarehouse) {
                            setFormData((prev) => ({
                                ...prev,
                                warehouse_id: result.ship_to_id.toString(),
                            }));
                        }
                    }
                } catch (err) {
                    console.error("Failed to load warehouses for PO company", err);
                    setWarehouses([]);
                }
            }

            // Pre-populate items from PO with tracking info
            if (result.items && result.items.length > 0) {
                const poItems = result.items.map((item) => {
                    // Normalize tracking_type from product master (runtime lookup)
                    const productTrackingType = item.product?.tracking_type 
                        ? item.product.tracking_type.toUpperCase() 
                        : "LOT";
                    const productSerialRequired = item.product?.serial_required || false;
                    
                    // If tracking_type is SERIAL OR serial_required is true, treat as SERIAL
                    const shouldBeSerial = productTrackingType === "SERIAL" || productSerialRequired === true;
                    const trackingType = shouldBeSerial ? "SERIAL" : productTrackingType;
                    
                    return {
                        purchase_order_item_id: item.id,
                        product_id: item.product_id,
                        product_name: item.product?.product_name || "",
                        tracking_type: trackingType,
                        serial_required: shouldBeSerial,
                        ordered_quantity: item.quantity,
                        received_quantity: 0,
                        accepted_quantity: 0,
                        rejected_quantity: 0,
                        rate: item.rate,
                        gst_percent: item.gst_percent,
                        // For SERIAL items: array of serial numbers (0 to received_quantity)
                        serials: [],
                        // For LOT items: optional lot/batch number
                        lot_number: "",
                    };
                });
                setFormData((prev) => ({
                    ...prev,
                    items: poItems,
                }));
            }
        } catch (err) {
            console.error("Failed to load purchase order", err);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        // If purchase_order_id changes, clear warehouse and items
        if (name === "purchase_order_id") {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
                warehouse_id: "", // Clear warehouse when PO changes
                items: [], // Clear items when PO changes
            }));
            setSelectedPO(null);
            setWarehouses([]);
            
            if (value) {
                loadPurchaseOrder(value);
            }
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: type === "checkbox" ? checked : value,
            }));
        }

        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
        if (serverError) {
            onClearServerError();
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        // Auto-calculate accepted quantity
        if (field === "received_quantity") {
            const received = parseInt(value) || 0;
            const rejected = parseInt(newItems[index].rejected_quantity) || 0;
            newItems[index].accepted_quantity = Math.max(0, received - rejected);

            // For SERIAL items: Limit serials to accepted_quantity
            if (isSerialItem(newItems[index])) {
                const accepted = newItems[index].accepted_quantity;
                if (newItems[index].serials && newItems[index].serials.length > accepted) {
                    newItems[index].serials = newItems[index].serials.slice(0, accepted);
                }
            }
        } else if (field === "rejected_quantity") {
            const received = parseInt(newItems[index].received_quantity) || 0;
            const rejected = parseInt(value) || 0;
            newItems[index].accepted_quantity = Math.max(0, received - rejected);

            // For SERIAL items: Limit serials to accepted_quantity
            if (isSerialItem(newItems[index])) {
                const accepted = newItems[index].accepted_quantity;
                if (newItems[index].serials && newItems[index].serials.length > accepted) {
                    newItems[index].serials = newItems[index].serials.slice(0, accepted);
                }
            }
        }

        setFormData((prev) => ({
            ...prev,
            items: newItems,
        }));
    };

    const handleSerialAdd = (itemIndex, serialNumber) => {
        if (!serialNumber || !serialNumber.trim()) return;

        const newItems = [...formData.items];
        const item = newItems[itemIndex];

        if (!item.serials) {
            item.serials = [];
        }

        // Check if we've reached the maximum (accepted_quantity)
        if (item.serials.length >= item.accepted_quantity) {
            alert(`Maximum ${item.accepted_quantity} serial numbers allowed for accepted quantity`);
            return;
        }

        // Check for duplicate serial
        if (item.serials.includes(serialNumber.trim())) {
            alert("Serial number already added");
            return;
        }

        item.serials.push(serialNumber.trim());
        setFormData((prev) => ({
            ...prev,
            items: newItems,
        }));
    };

    const handleSerialRemove = (itemIndex, serialIndex) => {
        const newItems = [...formData.items];
        newItems[itemIndex].serials.splice(serialIndex, 1);
        setFormData((prev) => ({
            ...prev,
            items: newItems,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const validationErrors = {};
        
        // Required field validations
        if (!formData.purchase_order_id) {
            validationErrors.purchase_order_id = "Purchase Order is required";
        }
        if (!formData.warehouse_id) {
            validationErrors.warehouse_id = "Warehouse is required";
        }
        if (!formData.received_at) {
            validationErrors.received_at = "Received Date is required";
        } else {
            // Validate date is not in future
            const receivedDate = new Date(formData.received_at);
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            if (receivedDate > today) {
                validationErrors.received_at = "Received Date cannot be in the future";
            }
        }

        // Items validation
        if (formData.items.length === 0) {
            validationErrors.items = "At least one item is required";
        } else {
            // Validate each item
            formData.items.forEach((item, index) => {
                const receivedQty = parseInt(item.received_quantity) || 0;
                const rejectedQty = parseInt(item.rejected_quantity) || 0;
                const orderedQty = parseInt(item.ordered_quantity) || 0;
                const acceptedQty = item.accepted_quantity || 0;

                // Received quantity validation
                if (!item.received_quantity || receivedQty <= 0) {
                    validationErrors[`item_${index}_received`] = "Received quantity must be greater than 0";
                } else if (receivedQty > orderedQty) {
                    validationErrors[`item_${index}_received`] = `Received quantity (${receivedQty}) cannot exceed ordered quantity (${orderedQty})`;
                }

                // Rejected quantity validation
                if (rejectedQty < 0) {
                    validationErrors[`item_${index}_rejected`] = "Rejected quantity cannot be negative";
                } else if (rejectedQty > receivedQty) {
                    validationErrors[`item_${index}_rejected`] = `Rejected quantity (${rejectedQty}) cannot exceed received quantity (${receivedQty})`;
                }

                // Accepted quantity should match (received - rejected)
                const calculatedAccepted = receivedQty - rejectedQty;
                if (acceptedQty !== calculatedAccepted) {
                    validationErrors[`item_${index}_accepted`] = `Accepted quantity should be ${calculatedAccepted} (Received: ${receivedQty} - Rejected: ${rejectedQty})`;
                }

                // For SERIAL items: Validate serial numbers
                if (isSerialItem(item)) {
                    const serialCount = (item.serials || []).length;
                    
                    // Serial numbers are optional, but if provided, cannot exceed accepted_quantity
                    if (serialCount > acceptedQty) {
                        validationErrors[`item_${index}_serials`] = `Cannot have more than ${acceptedQty} serial numbers for accepted quantity`;
                    }

                    // Check for duplicate serial numbers
                    const serialNumbers = (item.serials || []).map(s => typeof s === "string" ? s.trim() : s.serial_number?.trim()).filter(Boolean);
                    const uniqueSerials = new Set(serialNumbers);
                    if (serialNumbers.length !== uniqueSerials.size) {
                        validationErrors[`item_${index}_serials`] = "Duplicate serial numbers are not allowed";
                    }
                }
            });
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            // Scroll to first error
            const firstErrorField = Object.keys(validationErrors)[0];
            if (firstErrorField === "items") {
                const itemsSection = document.querySelector('[data-items-section]');
                if (itemsSection) {
                    itemsSection.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            } else {
                const element = document.querySelector(`[name="${firstErrorField}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }
            return;
        }

        setErrors({});

        // Calculate totals
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
            total_rejected_quantity: totals.total_rejected,
            items: formData.items.map((item) => {
                const acceptedQty = parseInt(item.accepted_quantity) || 0;
                const taxableAmount = (parseFloat(item.rate) || 0) * acceptedQty;
                const gstAmount = (taxableAmount * (parseFloat(item.gst_percent) || 0)) / 100;
                const totalAmount = taxableAmount + gstAmount;

                return {
                    purchase_order_item_id: item.purchase_order_item_id,
                    product_id: item.product_id,
                    tracking_type: item.tracking_type,
                    serial_required: item.serial_required,
                    ordered_quantity: parseInt(item.ordered_quantity),
                    received_quantity: parseInt(item.received_quantity),
                    accepted_quantity: acceptedQty,
                    rejected_quantity: parseInt(item.rejected_quantity) || 0,
                    rate: parseFloat(item.rate),
                    gst_percent: parseFloat(item.gst_percent),
                    taxable_amount: parseFloat(taxableAmount.toFixed(2)),
                    gst_amount: parseFloat(gstAmount.toFixed(2)),
                    total_amount: parseFloat(totalAmount.toFixed(2)),
                    // For SERIAL: array of objects with serial_number (0 to accepted_quantity, optional)
                    serials: isSerialItem(item)
                        ? (item.serials || []).map(serial => ({ serial_number: serial }))
                        : [],
                    // For LOT: optional lot number (stored in remarks for now, can be added to model later)
                    remarks: item.tracking_type === "LOT" && item.lot_number
                        ? `Lot: ${item.lot_number}${item.remarks ? ` | ${item.remarks}` : ""}`
                        : item.remarks || "",
                };
            }),
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

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <FormContainer>
                <Box sx={{ p: FORM_PADDING }}>
                {serverError && (
                    <Alert severity="error" sx={{ mb: 1 }} onClose={onClearServerError}>
                        {serverError}
                    </Alert>
                )}

                {/* Header Section */}
                <Card sx={{ mb: 1 }}>
                    <CardContent>
                        <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                            <Typography variant="subtitle1" fontWeight={600}>Receipt Information</Typography>
                        </Box>
                        <Grid container spacing={COMPACT_FORM_SPACING}>
                            <Grid item size={{ xs: 12, md: 4 }}>
                                <Select
                                    name="purchase_order_id"
                                    label="Purchase Order"
                                    value={formData.purchase_order_id}
                                    onChange={handleChange}
                                    disabled={!!(defaultValues && defaultValues.id)}
                                    required
                                    error={!!errors.purchase_order_id}
                                    helperText={errors.purchase_order_id}
                                >
                                    <MenuItem value="">-- Select --</MenuItem>
                                    {purchaseOrders.map((po) => (
                                        <MenuItem key={po.id} value={po.id}>
                                            {po.po_number} - {po.supplier?.supplier_name || ""}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Grid>

                            <Grid item size={{ xs: 12, md: 4 }}>
                                <Select
                                    name="warehouse_id"
                                    label="Warehouse"
                                    value={formData.warehouse_id}
                                    onChange={handleChange}
                                    required
                                    error={!!errors.warehouse_id}
                                    helperText={errors.warehouse_id}
                                >
                                    <MenuItem value="">-- Select --</MenuItem>
                                    {warehouses.map((warehouse) => (
                                        <MenuItem key={warehouse.id} value={warehouse.id}>
                                            {warehouse.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Grid>

                            <Grid item size={{ xs: 12, md: 4 }}>
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
                            </Grid>

                            <Grid item size={{ xs: 12, md: 4 }}>
                                <Input
                                    fullWidth
                                    name="supplier_invoice_number"
                                    label="Supplier Invoice Number"
                                    value={formData.supplier_invoice_number}
                                    onChange={handleChange}
                                />
                            </Grid>

                            <Grid item size={{ xs: 12, md: 4 }}>
                                <DateField
                                    name="supplier_invoice_date"
                                    label="Supplier Invoice Date"
                                    value={formData.supplier_invoice_date}
                                    onChange={handleChange}
                                    error={!!errors.supplier_invoice_date}
                                    helperText={errors.supplier_invoice_date}
                                />
                            </Grid>

                            <Grid item size={{ xs: 12, md: 4 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="inspection_required"
                                            checked={formData.inspection_required}
                                            onChange={handleChange}
                                        />
                                    }
                                    label="Inspection Required"
                                />
                            </Grid>

                            <Grid item size={12}>
                                <Input
                                    fullWidth
                                    name="remarks"
                                    label="Remarks"
                                    value={formData.remarks}
                                    onChange={handleChange}
                                    multiline
                                    rows={2}
                                />
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* Items Section */}
                <Card data-items-section>
                    <CardContent>
                        <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                            <Typography variant="subtitle1" fontWeight={600}>Receipt Items</Typography>
                        </Box>
                        {errors.items && (
                            <Alert severity="error" sx={{ mb: 1 }}>
                                {errors.items}
                            </Alert>
                        )}

                        {formData.items.length > 0 ? (
                            <TableContainer component={Paper} sx={{ mt: 1 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell><strong>Product</strong></TableCell>
                                            <TableCell align="right"><strong>Ordered</strong></TableCell>
                                            <TableCell align="right"><strong>Received</strong></TableCell>
                                            <TableCell align="right"><strong>Rejected</strong></TableCell>
                                            <TableCell align="right"><strong>Accepted</strong></TableCell>
                                            <TableCell><strong>Tracking</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {formData.items.map((item, index) => {
                                            const isSerial = isSerialItem(item);
                                            const isLot = item.tracking_type === "LOT" && !isSerial;
                                            const serialCount = (item.serials || []).length;
                                            const acceptedQty = item.accepted_quantity || 0;

                                            return (
                                                <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: 'action.hover' } }}>
                                                    <TableCell>
                                                        <Box>
                                                            <Typography variant="body2" fontWeight="medium">
                                                                {item.product_name}
                                                            </Typography>
                                                            {isSerial && (
                                                                <Chip
                                                                    label="SERIAL"
                                                                    size="small"
                                                                    color="primary"
                                                                    sx={{ mt: 0.5, mr: 0.5 }}
                                                                />
                                                            )}
                                                            {isLot && (
                                                                <Chip
                                                                    label="LOT"
                                                                    size="small"
                                                                    color="secondary"
                                                                    sx={{ mt: 0.5 }}
                                                                />
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell align="right">{item.ordered_quantity}</TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            size="small"
                                                            fullWidth
                                                            value={item.received_quantity}
                                                            onChange={(e) => handleItemChange(index, "received_quantity", e.target.value)}
                                                            inputProps={{ min: 0, max: item.ordered_quantity }}
                                                            error={!!errors[`item_${index}_received`]}
                                                            helperText={errors[`item_${index}_received`]}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            size="small"
                                                            fullWidth
                                                            value={item.rejected_quantity}
                                                            onChange={(e) => handleItemChange(index, "rejected_quantity", e.target.value)}
                                                            inputProps={{ min: 0, max: item.received_quantity }}
                                                            error={!!errors[`item_${index}_rejected`]}
                                                            helperText={errors[`item_${index}_rejected`]}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2" fontWeight="medium" color="success.main">
                                                            {item.accepted_quantity}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        {isSerial ? (
                                                            <Box>
                                                                <Box sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                                                                    <Input
                                                                        size="small"
                                                                        placeholder="Enter serial number"
                                                                        sx={{ flex: 1 }}
                                                                        onKeyPress={(e) => {
                                                                            if (e.key === "Enter") {
                                                                                e.preventDefault();
                                                                                handleSerialAdd(index, e.target.value);
                                                                                e.target.value = "";
                                                                            }
                                                                        }}
                                                                    />
                                                                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
                                                                        {serialCount} / {acceptedQty} (Optional)
                                                                    </Typography>
                                                                </Box>
                                                                {item.serials && item.serials.length > 0 && (
                                                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                                                        {item.serials.map((serial, serialIndex) => (
                                                                            <Chip
                                                                                key={serialIndex}
                                                                                label={serial}
                                                                                size="small"
                                                                                onDelete={() => handleSerialRemove(index, serialIndex)}
                                                                                color="primary"
                                                                                variant="outlined"
                                                                            />
                                                                        ))}
                                                                    </Box>
                                                                )}
                                                                {errors[`item_${index}_serials`] && (
                                                                    <FormHelperText error sx={{ mt: 0.5 }}>
                                                                        {errors[`item_${index}_serials`]}
                                                                    </FormHelperText>
                                                                )}
                                                                {serialCount < acceptedQty && (
                                                                    <FormHelperText sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                                                                        You can add up to {acceptedQty - serialCount} more serial numbers (optional)
                                                                    </FormHelperText>
                                                                )}
                                                            </Box>
                                                        ) : isLot ? (
                                                            <Input
                                                                size="small"
                                                                fullWidth
                                                                placeholder="Lot/Batch Number (Optional)"
                                                                value={item.lot_number || ""}
                                                                onChange={(e) => handleItemChange(index, "lot_number", e.target.value)}
                                                            />
                                                        ) : (
                                                            <Typography variant="body2" color="text.secondary">N/A</Typography>
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
                                Select a Purchase Order to load items
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* Summary Section */}
                {formData.items.length > 0 && (
                    <Card sx={{ mt: 1 }}>
                        <CardContent>
                            <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                                <Typography variant="subtitle1" fontWeight={600}>Receipt Summary</Typography>
                            </Box>
                            <Grid container spacing={COMPACT_FORM_SPACING}>
                                <Grid item size={{ xs: 12, md: 4 }}>
                                    <Typography variant="body2" color="text.secondary">Total Received Quantity</Typography>
                                    <Typography variant="h6">
                                        {formData.items.reduce((sum, item) => sum + (parseInt(item.received_quantity) || 0), 0)}
                                    </Typography>
                                </Grid>
                                <Grid item size={{ xs: 12, md: 4 }}>
                                    <Typography variant="body2" color="text.secondary">Total Accepted Quantity</Typography>
                                    <Typography variant="h6" color="success.main">
                                        {formData.items.reduce((sum, item) => sum + (parseInt(item.accepted_quantity) || 0), 0)}
                                    </Typography>
                                </Grid>
                                <Grid item size={{ xs: 12, md: 4 }}>
                                    <Typography variant="body2" color="text.secondary">Total Rejected Quantity</Typography>
                                    <Typography variant="h6" color="error.main">
                                        {formData.items.reduce((sum, item) => sum + (parseInt(item.rejected_quantity) || 0), 0)}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                )}
                </Box>

                <FormActions>
                    {onCancel && (
                        <Button type="button" variant="outlined" onClick={onCancel} disabled={loading}>
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={loading}
                        sx={{ minWidth: 120 }}
                    >
                        {loading ? <CircularProgress size={23} /> : defaultValues?.id ? "Update" : "Create Receipt"}
                    </Button>
                </FormActions>
            </FormContainer>
        </Box>
    );
}
