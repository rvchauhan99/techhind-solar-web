"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Box,
    Grid,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    TextField
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import challanService from "@/services/challanService";
import companyService from "@/services/companyService";
import moment from "moment";

export default function NewChallanForm({ orderId, orderData, onChallanCreated }) {
    const [formData, setFormData] = useState({
        challan_date: moment().format("YYYY-MM-DD"),
        transporter: "",
        warehouse_id: "",
        remarks: "",
    });

    const [productForm, setProductForm] = useState({
        product_id: "",
        product_name: "",
        quantity: "",
        serial_scan: "",
        serials: "",
        remarks: "",
    });

    const [items, setItems] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [quotationProducts, setQuotationProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(null);
    const hasFetchedRef = useRef(false);

    const fetchInitialData = useCallback(async () => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        try {
            // Fetch warehouses from company master (CompanyWarehouse / company_warehouses)
            const warehousesRes = await companyService.listWarehouses();
            const data = warehousesRes?.result ?? warehousesRes?.data ?? warehousesRes ?? [];
            setWarehouses(Array.isArray(data) ? data : []);

            // Fetch quotation products by order_id
            if (orderId) {
                try {
                    const productsRes = await challanService.getQuotationProducts(orderId);
                    setQuotationProducts(productsRes?.result?.products || []);
                } catch (quotationErr) {
                    console.error("Failed to fetch quotation products:", quotationErr);
                    setQuotationProducts([]);
                }
            } else {
                setQuotationProducts([]);
            }
        } catch (err) {
            console.error("Failed to fetch initial data:", err);
            setError(err.message || "Failed to load data");
        }
    }, [orderId]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleProductFormChange = (e) => {
        const { name, value } = e.target;
        setProductForm(prev => ({ ...prev, [name]: value }));
    };

    const handleProductSelect = (name, value) => {
        setProductForm(prev => ({ ...prev, product_id: value?.id || "" }));
        setSelectedProduct(value);
    };

    const handleWarehouseSelect = (name, value) => {
        setFormData(prev => ({ ...prev, warehouse_id: value?.id || "" }));
    };

    const handleSerialScan = (e) => {
        const scannedSerial = e.target.value.trim();
        if (scannedSerial && productForm.quantity > 0 && selectedProduct?.serial_required) {
            // Append to serials
            setProductForm(prev => ({
                ...prev,
                serials: prev.serials ? `${prev.serials}, ${scannedSerial}` : scannedSerial,
                serial_scan: "", // Clear scan input
            }));
        }
        e.target.value = "";
        e.target.focus();
    };

    const validateSerialCount = () => {
        if (!selectedProduct?.serial_required) return true;

        const serialArray = productForm.serials
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        const quantity = parseInt(productForm.quantity) || 0;

        if (serialArray.length !== quantity) {
            setError(`Serial count (${serialArray.length}) must match quantity (${quantity})`);
            return false;
        }

        return true;
    };

    const handleAddProduct = () => {
        setError(null);

        // Validation
        if (!productForm.product_id || !productForm.quantity) {
            setError("Product and quantity are required");
            return;
        }

        // Check for duplicate
        if (items.some(item => item.product_id === productForm.product_id)) {
            setError("This product is already added");
            return;
        }

        // Validate serial count
        if (!validateSerialCount()) {
            return;
        }

        // Add to items
        const newItem = {
            product_id: productForm.product_id,
            product_name: selectedProduct?.product_name || "",
            product_type: selectedProduct?.productType?.name || "",
            quantity: parseFloat(productForm.quantity),
            serials: productForm.serials,
            remarks: productForm.remarks,
        };

        setItems(prev => [...prev, newItem]);

        // Reset product form
        setProductForm({
            product_id: "",
            product_name: "",
            quantity: "",
            serial_scan: "",
            serials: "",
            remarks: "",
        });
        setSelectedProduct(null);
    };

    const handleDeleteItem = (index) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            // Clear previous errors
            setErrors({});

            // Validation
            const validationErrors = {};

            if (items.length === 0) {
                setError("At least one item is required");
                setLoading(false);
                return;
            }

            if (!formData.warehouse_id) {
                validationErrors.warehouse_id = "Warehouse is required";
            }

            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                setLoading(false);
                return;
            }

            // Prepare payload
            const payload = {
                ...formData,
                order_id: orderId,
                items: items.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    serials: item.serials,
                    remarks: item.remarks,
                })),
            };

            if (orderData?.stages?.["new_challan"] === "completed") {
                delete payload.stages;
                delete payload.current_stage_key;
            }
            await challanService.createChallan(payload);
            setSuccess("Challan created successfully!");

            // Reset form
            setFormData({
                challan_date: moment().format("YYYY-MM-DD"),
                transporter: "",
                warehouse_id: "",
                remarks: "",
            });
            setItems([]);

            if (onChallanCreated) onChallanCreated();
        } catch (err) {
            console.error("Failed to create challan:", err);
            setError(err?.response?.data?.message || "Failed to create challan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ height: "calc(100vh - 380px)", overflowY: "auto" }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            {/* Header Section */}
            {/* <Paper sx={{ p: 2, mb: 3 }}> */}
            {/* <Typography variant="h6" gutterBottom borderBottom={2} mb={2}>Challan Details</Typography> */}
            <Grid container spacing={2} mt={1}>
                <Grid size={4}>
                    <DateField
                        name="challan_date"
                        label="Challan Date"
                        value={formData.challan_date}
                        onChange={handleInputChange}
                        required
                        fullWidth
                    />
                </Grid>
                <Grid size={4}>
                    <Input
                        name="transporter"
                        label="Transporter"
                        value={formData.transporter}
                        onChange={handleInputChange}
                        fullWidth
                    />
                </Grid>
                <Grid size={4}>
                    <AutocompleteField
                        name="warehouse_id"
                        label="Warehouse"
                        options={warehouses}
                        getOptionLabel={(option) => option.name || ""}
                        onChange={handleWarehouseSelect}
                        required
                        fullWidth
                        error={!!errors.warehouse_id}
                        helperText={errors.warehouse_id}
                    />
                </Grid>
                <Grid size={12}>
                    <Input
                        name="remarks"
                        label="Remarks"
                        multiline
                        rows={2}
                        value={formData.remarks}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                    />
                    {/* <Input
                            name="remarks"
                            label="Remarks"
                            value={formData.remarks}
                            onChange={handleInputChange}
                            rows={1}
                            fullWidth
                        /> */}
                </Grid>
            </Grid>
            {/* </Paper> */}

            {/* Product Section */}
            {/* <Paper sx={{ p: 2, mb: 3 }}> */}
            <Typography variant="h6" gutterBottom borderBottom={2} mb={2} mt={1}>Add Products</Typography>
            <Grid container spacing={2}>
                <Grid size={4}>
                    <AutocompleteField
                        name="product_id"
                        label="Product"
                        options={quotationProducts}
                        getOptionLabel={(option) => `${option.product_name} (${option.productType?.name || ""})`}
                        onChange={handleProductSelect}
                        value={selectedProduct}
                        fullWidth
                    />
                </Grid>
                <Grid size={2}>
                    <Input
                        name="quantity"
                        label="Quantity"
                        type="number"
                        value={productForm.quantity}
                        onChange={handleProductFormChange}
                        fullWidth
                    />
                </Grid>
                <Grid size={6}>
                    <Input
                        name="remarks"
                        label="Remarks"
                        value={productForm.remarks}
                        onChange={handleProductFormChange}
                        fullWidth
                    />
                </Grid>
                <Grid size={4}>
                    <Input
                        name="serial_scan"
                        label="Scan Serial"
                        value={productForm.serial_scan}
                        onChange={handleProductFormChange}
                        onBlur={handleSerialScan}
                        fullWidth
                        placeholder="Scan and press Enter"
                        disabled={!selectedProduct?.serial_required || productForm.quantity <= 0}
                    />
                </Grid>
                <Grid size={6}>
                    <Input
                        name="serials"
                        label="Serials (comma-separated)"
                        value={productForm.serials}
                        onChange={handleProductFormChange}
                        multiline
                        rows={1}
                        fullWidth
                        disabled
                    />
                </Grid>
                <Grid size={2}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddProduct}
                    >
                        Add Product
                    </Button>
                </Grid>
            </Grid>
            {/* </Paper> */}

            {/* Items Table */}
            {items.length > 0 && (
                // <Paper sx={{ mb: 3 }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Product Type</TableCell>
                                <TableCell>Product Name</TableCell>
                                <TableCell>Quantity</TableCell>
                                <TableCell>Serials</TableCell>
                                <TableCell>Remarks</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.product_type}</TableCell>
                                    <TableCell>{item.product_name}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{item.serials || "-"}</TableCell>
                                    <TableCell>{item.remarks || "-"}</TableCell>
                                    <TableCell>
                                        <IconButton
                                            color="error"
                                            onClick={() => handleDeleteItem(index)}
                                            size="small"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                // </Paper>
            )}

            {/* Submit Button */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                    disabled={loading || items.length === 0}
                >
                    {loading ? "Saving..." : "Save Challan"}
                </Button>
            </Box>
        </Box>
    );
}
