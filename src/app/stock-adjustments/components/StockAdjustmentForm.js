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
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [availableStocks, setAvailableStocks] = useState({});
    const [loadingOptions, setLoadingOptions] = useState(false);

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
        setCurrentItem((prev) => ({ ...prev, [name]: value }));
        if (itemErrors[name]) {
            setItemErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const getProductOptions = () => {
        if (!formData.warehouse_id) {
            return products;
        }
        if (currentItem.adjustment_direction === "OUT") {
            return products.filter((p) => {
                const stock = availableStocks[p.id];
                return stock && stock.quantity_available > 0;
            });
        }
        return products;
    };

    const handleAddItem = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const errs = {};
        if (!currentItem.product_id) errs.product_id = "Product is required";
        if (!currentItem.adjustment_direction) errs.adjustment_direction = "Direction is required";
        if (!currentItem.quantity || Number(currentItem.quantity) <= 0) errs.quantity = "Quantity must be greater than 0";

        const product = products.find((p) => p.id === parseInt(currentItem.product_id));
        const stock = availableStocks[parseInt(currentItem.product_id)];

        if (currentItem.adjustment_direction === "OUT" && stock && Number(currentItem.quantity) > stock.quantity_available) {
            errs.quantity = `Available quantity is only ${stock.quantity_available}`;
        }

        if (product && product.serial_required) {
            if (currentItem.adjustment_direction === "OUT") {
                if (!currentItem.serials || currentItem.serials.length !== Number(currentItem.quantity)) {
                    errs.serials = `Exactly ${currentItem.quantity} serial numbers required`;
                }
            } else if (currentItem.adjustment_direction === "IN") {
                if (!currentItem.serials || currentItem.serials.length !== Number(currentItem.quantity)) {
                    errs.serials = `Exactly ${currentItem.quantity} serial numbers required for FOUND items`;
                }
            }
        }

        if (Object.keys(errs).length > 0) {
            setItemErrors(errs);
            return;
        }

        const newItem = {
            product_id: parseInt(currentItem.product_id),
            adjustment_direction: currentItem.adjustment_direction,
            quantity: parseInt(currentItem.quantity),
            serials: currentItem.serials || [],
        };

        setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
        setCurrentItem({ product_id: "", adjustment_direction: "OUT", quantity: "", serials: [] });
        setItemErrors({});
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

    const productOptions = getProductOptions();
    const warehouseSelected = !!formData.warehouse_id;

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
                            label="Adjustment Date *"
                            value={formData.adjustment_date}
                            onChange={handleChange}
                            required
                            error={!!formErrors.adjustment_date}
                            helperText={formErrors.adjustment_date}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item size={{ xs: 12, md: 4 }}>
                        <AutocompleteField
                            label="Warehouse *"
                            placeholder="Type to search..."
                            options={warehouses}
                            getOptionLabel={(w) => w?.name ?? String(w?.id ?? "")}
                            value={
                                warehouses.find((w) => w.id === parseInt(formData.warehouse_id)) ||
                                (formData.warehouse_id ? { id: parseInt(formData.warehouse_id), name: "" } : null)
                            }
                            onChange={(e, newValue) => handleChange({ target: { name: "warehouse_id", value: newValue?.id ?? "" } })}
                            required
                            error={!!formErrors.warehouse_id}
                            helperText={formErrors.warehouse_id}
                        />
                    </Grid>

                    <Grid item size={{ xs: 12, md: 4 }}>
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
                    </Grid>

                    <Grid item size={{ xs: 12, md: 6 }}>
                        <Input
                            name="remarks"
                            label="Reason / Remarks *"
                            value={formData.remarks}
                            onChange={handleChange}
                            required
                            error={!!formErrors.remarks}
                            helperText={formErrors.remarks}
                        />
                    </Grid>

                    <Grid item size={12}>
                        <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                            <Typography variant="subtitle1" fontWeight={600}>
                                Items
                            </Typography>
                        </Box>
                        {formErrors.items && (
                            <Alert severity="error" sx={{ mb: 1 }}>
                                {formErrors.items}
                            </Alert>
                        )}

                        <Paper sx={{ p: FORM_PADDING, mb: 1 }}>
                            <Grid container spacing={COMPACT_FORM_SPACING} alignItems="center">
                                <Grid item size={{ xs: 12, md: 3 }}>
                                    <AutocompleteField
                                        label="Product"
                                        placeholder={warehouseSelected ? "Type to search..." : "Select warehouse first"}
                                        options={productOptions}
                                        disabled={!warehouseSelected}
                                        getOptionLabel={(p) => {
                                            if (!p) return "";
                                            const stock = availableStocks[p.id];
                                            return `${p.product_name ?? ""}${
                                                currentItem.adjustment_direction === "OUT" && stock
                                                    ? ` (Available: ${stock.quantity_available})`
                                                    : ""
                                            }`;
                                        }}
                                        value={
                                            products.find((p) => p.id === parseInt(currentItem.product_id)) ||
                                            (currentItem.product_id ? { id: parseInt(currentItem.product_id), product_name: "" } : null)
                                        }
                                        onChange={(e, newValue) => handleItemChange({ target: { name: "product_id", value: newValue?.id ?? "" } })}
                                        error={!!itemErrors.product_id}
                                        helperText={
                                            itemErrors.product_id ||
                                            (!warehouseSelected ? "Select warehouse to choose products" : "")
                                        }
                                    />
                                </Grid>

                                <Grid item size={{ xs: 12, md: 2 }}>
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
                                </Grid>

                                <Grid item size={{ xs: 12, md: 2 }}>
                                    <Input
                                        name="quantity"
                                        label="Quantity *"
                                        type="number"
                                        value={currentItem.quantity}
                                        onChange={handleItemChange}
                                        inputProps={{ min: 1 }}
                                        required
                                        error={!!itemErrors.quantity}
                                        helperText={itemErrors.quantity}
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
                    </Grid>
                </Grid>
            </Box>

            <FormActions>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                )}
                <LoadingButton type="submit" loading={loading} className="min-w-[120px]">
                    {isEdit ? "Update" : "Create"}
                </LoadingButton>
            </FormActions>
        </FormContainer>
    );
}
