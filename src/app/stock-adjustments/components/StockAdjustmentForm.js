"use client";

import { useState, useEffect } from "react";
import {
    Box,
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import stockService from "@/services/stockService";
import companyService from "@/services/companyService";
import productService from "@/services/productService";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import { COMPACT_FORM_SPACING, COMPACT_SECTION_HEADER_STYLE, FORM_PADDING } from "@/utils/formConstants";

export default function StockAdjustmentForm({ defaultValues = {}, onSubmit, loading, serverError = null, onClearServerError = () => { }, onCancel = null }) {
    const [formData, setFormData] = useState({
        adjustment_date: new Date().toISOString().split("T")[0],
        warehouse_id: "",
        reason: "",
        items: [],
    });

    const [errors, setErrors] = useState({});
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [availableStocks, setAvailableStocks] = useState({});
    const [loadingOptions, setLoadingOptions] = useState(false);

    // Current item being added
    const [currentItem, setCurrentItem] = useState({
        product_id: "",
        adjustment_direction: "OUT",
        quantity: "",
        serials: [],
    });

    useEffect(() => {
        const loadOptions = async () => {
            setLoadingOptions(true);
            try {
                const [warehousesRes, productsRes] = await Promise.all([
                    companyService.listWarehouses(),
                    productService.getProducts(),
                ]);

                setWarehouses(warehousesRes?.result?.data || warehousesRes?.data || []);
                setProducts(productsRes?.result?.data || productsRes?.data || []);
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
                adjustment_date: defaultValues.adjustment_date || new Date().toISOString().split("T")[0],
                warehouse_id: defaultValues.warehouse_id || "",
                reason: defaultValues.reason || "",
                items: defaultValues.items || [],
            });
        }
    }, [defaultValues]);

    useEffect(() => {
        if (formData.warehouse_id) {
            loadAvailableStocks(formData.warehouse_id);
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
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

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

    const handleItemChange = (e) => {
        const { name, value } = e.target;
        setCurrentItem((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleAddItem = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const validationErrors = {};
        if (!currentItem.product_id) validationErrors.product_id = "Product is required";
        if (!currentItem.adjustment_direction) validationErrors.adjustment_direction = "Direction is required";
        if (!currentItem.quantity || Number(currentItem.quantity) <= 0) validationErrors.quantity = "Quantity must be greater than 0";

        const product = products.find((p) => p.id === parseInt(currentItem.product_id));
        const stock = availableStocks[parseInt(currentItem.product_id)];

        // For OUT adjustments, check available quantity
        if (currentItem.adjustment_direction === "OUT" && stock && Number(currentItem.quantity) > stock.quantity_available) {
            validationErrors.quantity = `Available quantity is only ${stock.quantity_available}`;
        }

        // For serial required products, validate serials
        if (product && product.serial_required) {
            if (currentItem.adjustment_direction === "OUT") {
                if (!currentItem.serials || currentItem.serials.length !== Number(currentItem.quantity)) {
                    validationErrors.serials = `Exactly ${currentItem.quantity} serial numbers required`;
                }
            } else if (currentItem.adjustment_direction === "IN") {
                // For FOUND items, serials are required
                if (!currentItem.serials || currentItem.serials.length !== Number(currentItem.quantity)) {
                    validationErrors.serials = `Exactly ${currentItem.quantity} serial numbers required for FOUND items`;
                }
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const newItem = {
            product_id: parseInt(currentItem.product_id),
            adjustment_direction: currentItem.adjustment_direction,
            quantity: parseInt(currentItem.quantity),
            serials: currentItem.serials || [],
        };

        setFormData((prev) => ({
            ...prev,
            items: [...prev.items, newItem],
        }));

        setCurrentItem({
            product_id: "",
            adjustment_direction: "OUT",
            quantity: "",
            serials: [],
        });
        setErrors({});
    };

    const handleRemoveItem = (index) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const validationErrors = {};
        if (!formData.warehouse_id) validationErrors.warehouse_id = "Warehouse is required";
        if (!formData.adjustment_date) validationErrors.adjustment_date = "Adjustment Date is required";
        if (!formData.reason) validationErrors.reason = "Reason is required";
        if (formData.items.length === 0) validationErrors.items = "At least one item is required";

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors({});

        const payload = {
            ...formData,
            warehouse_id: parseInt(formData.warehouse_id),
            items: formData.items.map((item) => ({
                product_id: item.product_id,
                adjustment_direction: item.adjustment_direction,
                quantity: parseInt(item.quantity),
                serials: item.serials || [],
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

    return (
        <FormContainer>
            <Box component="form" onSubmit={handleSubmit} sx={{ p: FORM_PADDING }}>
                {serverError && (
                    <Alert severity="error" sx={{ mb: 1 }} onClose={onClearServerError}>
                        {serverError}
                    </Alert>
                )}

                <Grid container spacing={COMPACT_FORM_SPACING}>
                    <Grid item size={{ xs: 12, md: 4 }}>
                        <DateField
                            name="adjustment_date"
                            label="Adjustment Date"
                            value={formData.adjustment_date}
                            onChange={handleChange}
                            required
                            error={!!errors.adjustment_date}
                            helperText={errors.adjustment_date}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item size={{ xs: 12, md: 4 }}>
                        <AutocompleteField
                            label="Warehouse *"
                            placeholder="Type to search..."
                            options={warehouses}
                            getOptionLabel={(w) => w?.name ?? String(w?.id ?? "")}
                            value={warehouses.find((w) => w.id === parseInt(formData.warehouse_id)) || (formData.warehouse_id ? { id: parseInt(formData.warehouse_id) } : null)}
                            onChange={(e, newValue) => handleChange({ target: { name: "warehouse_id", value: newValue?.id ?? "" } })}
                            required
                            error={!!errors.warehouse_id}
                            helperText={errors.warehouse_id}
                        />
                    </Grid>

                    <Grid item size={{ xs: 12, md: 4 }}>
                        <Input
                            name="reason"
                            label="Reason"
                            value={formData.reason}
                            onChange={handleChange}
                            required
                            error={!!errors.reason}
                            helperText={errors.reason}
                        />
                    </Grid>

                    <Grid item size={12}>
                        <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                            <Typography variant="subtitle1" fontWeight={600}>Items</Typography>
                        </Box>
                        {errors.items && (
                            <Alert severity="error" sx={{ mb: 1 }}>
                                {errors.items}
                            </Alert>
                        )}

                        {/* Add Item Form */}
                        <Paper sx={{ p: FORM_PADDING, mb: 1 }}>
                            <Grid container spacing={COMPACT_FORM_SPACING} alignItems="center">
                                <Grid item size={{ xs: 12, md: 3 }}>
                                    <AutocompleteField
                                        label="Product"
                                        placeholder="Type to search..."
                                        options={products.filter((p) => {
                                            if (currentItem.adjustment_direction === "OUT") {
                                                const stock = availableStocks[p.id];
                                                return stock && stock.quantity_available > 0;
                                            }
                                            return true;
                                        })}
                                        getOptionLabel={(p) => {
                                            if (!p) return "";
                                            const stock = availableStocks[p.id];
                                            return `${p.product_name ?? ""}${currentItem.adjustment_direction === "OUT" && stock ? ` (Available: ${stock.quantity_available})` : ""}`;
                                        }}
                                        value={products.find((p) => p.id === parseInt(currentItem.product_id)) || (currentItem.product_id ? { id: parseInt(currentItem.product_id) } : null)}
                                        onChange={(e, newValue) => handleItemChange({ target: { name: "product_id", value: newValue?.id ?? "" } })}
                                        error={!!itemErrors.product_id}
                                        helperText={itemErrors.product_id}
                                    />
                                </Grid>

                                <Grid item size={{ xs: 12, md: 2 }}>
                                    <Select
                                        name="adjustment_direction"
                                        label="Direction"
                                        value={currentItem.adjustment_direction}
                                        onChange={handleItemChange}
                                        required
                                        error={!!itemErrors.adjustment_direction}
                                        helperText={itemErrors.adjustment_direction}
                                    >
                                        <MenuItem value="OUT">OUT (Lost/Damaged)</MenuItem>
                                        <MenuItem value="IN">IN (Found)</MenuItem>
                                    </Select>
                                </Grid>

                                <Grid item size={{ xs: 12, md: 2 }}>
                                    <Input
                                        name="quantity"
                                        label="Quantity"
                                        type="number"
                                        value={currentItem.quantity}
                                        onChange={handleItemChange}
                                        inputProps={{ min: 1 }}
                                        required
                                        error={!!errors.quantity}
                                        helperText={errors.quantity}
                                    />
                                </Grid>

                                <Grid item size={{ xs: 12, md: 3 }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={handleAddItem}
                                        fullWidth
                                    >
                                        Add
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Items Table */}
                        {formData.items.length > 0 && (
                            <TableContainer component={Paper}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Product</TableCell>
                                            <TableCell>Direction</TableCell>
                                            <TableCell>Quantity</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {formData.items.map((item, index) => {
                                            const product = products.find((p) => p.id === item.product_id);
                                            return (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        {product?.product_name || "-"}
                                                        {product?.serial_required && (
                                                            <Chip label="Serial Required" size="small" color="primary" sx={{ ml: 1 }} />
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
                    </Grid>

                </Grid>
            </Box>

            <FormActions>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                )}
                <LoadingButton
                    type="submit"
                    loading={loading}
                    className="min-w-[120px]"
                >
                    Create
                </LoadingButton>
            </FormActions>
        </FormContainer>
    );
}

