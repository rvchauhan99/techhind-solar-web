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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import GetAppIcon from "@mui/icons-material/GetApp";
import mastersService from "@/services/mastersService";
import productService from "@/services/productService";
import supplierService from "@/services/supplierService";
import companyService from "@/services/companyService";
import purchaseOrderService from "@/services/purchaseOrderService";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import { COMPACT_FORM_SPACING, COMPACT_SECTION_HEADER_STYLE } from "@/utils/formConstants";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PurchaseOrderForm({ defaultValues = {}, onSubmit, loading, serverError = null, onClearServerError = () => { }, onCancel = null }) {
    const [formData, setFormData] = useState({
        po_date: new Date().toISOString().split("T")[0],
        due_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split("T")[0],
        supplier_id: "",
        bill_to_id: "",
        ship_to_id: "",
        payment_terms: "",
        delivery_terms: "",
        dispatch_terms: "",
        jurisdiction: "",
        remarks: "",
        items: [],
    });

    const [errors, setErrors] = useState({});
    const [itemErrors, setItemErrors] = useState({}); // For individual item input fields (not used for validation)
    const [tableItemErrors, setTableItemErrors] = useState({}); // For table row validation errors

    // Current item being added
    const [currentItem, setCurrentItem] = useState({
        product_id: "",
        hsn_code: "",
        rate: "",
        quantity: "",
        gst_percent: "",
    });

    const [options, setOptions] = useState({
        suppliers: [],
        companies: [],
        warehouses: [],
        products: [],
    });
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [deleteAttachmentDialogOpen, setDeleteAttachmentDialogOpen] = useState(false);
    const [attachmentToDelete, setAttachmentToDelete] = useState(null);
    const [deletingAttachment, setDeletingAttachment] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);

    useEffect(() => {
        if (defaultValues && Object.keys(defaultValues).length > 0) {
            const newFormData = {
                po_date: defaultValues.po_date || new Date().toISOString().split("T")[0],
                due_date: defaultValues.due_date || "",
                supplier_id: defaultValues.supplier_id || "",
                bill_to_id: defaultValues.bill_to_id || "",
                ship_to_id: defaultValues.ship_to_id || "",
                payment_terms: defaultValues.payment_terms || "",
                delivery_terms: defaultValues.delivery_terms || "",
                dispatch_terms: defaultValues.dispatch_terms || "",
                jurisdiction: defaultValues.jurisdiction || "",
                remarks: defaultValues.remarks || "",
                items: defaultValues.items || [],
            };
            setFormData(newFormData);
            setAttachments(defaultValues.attachments || []);
            
            // Load warehouses for the bill_to_id if it exists
            if (newFormData.bill_to_id) {
                companyService.listWarehouses(parseInt(newFormData.bill_to_id))
                    .then((warehousesRes) => {
                        const warehouses = warehousesRes?.result || warehousesRes?.data || warehousesRes || [];
                        setOptions((prev) => ({
                            ...prev,
                            warehouses: Array.isArray(warehouses) ? warehouses : [],
                        }));
                    })
                    .catch((err) => {
                        console.error("Failed to load warehouses for default values", err);
                    });
            }
        }
    }, [defaultValues]);

    // Load initial options (suppliers, companies, products)
    useEffect(() => {
        const loadInitialOptions = async () => {
            setLoadingOptions(true);
            try {
                const [suppliersRes, companyProfileRes, productsRes] = await Promise.all([
                    supplierService.getSuppliers(),
                    companyService.getCompanyProfile(),
                    productService.getProducts(),
                ]);

                // Get company profile - there should be only one company
                const companyProfile = companyProfileRes?.result || companyProfileRes?.data || companyProfileRes;
                const companies = companyProfile ? [companyProfile] : [];

                setOptions((prev) => ({
                    ...prev,
                    suppliers: suppliersRes?.result?.data || suppliersRes?.data || [],
                    companies: companies,
                    products: productsRes?.result?.data || productsRes?.data || [],
                }));

                // Auto-select first company if not already set
                if (companies.length > 0) {
                    const currentBillToId = formData.bill_to_id || defaultValues.bill_to_id;
                    if (!currentBillToId) {
                        setFormData((prev) => ({
                            ...prev,
                            bill_to_id: companies[0].id,
                        }));
                    }
                }
            } catch (err) {
                console.error("Failed to load initial options", err);
            } finally {
                setLoadingOptions(false);
            }
        };
        loadInitialOptions();
    }, []);

    // Load warehouses when bill_to_id changes
    useEffect(() => {
        const loadWarehouses = async () => {
            const billToId = formData.bill_to_id;
            if (!billToId) {
                setOptions((prev) => ({
                    ...prev,
                    warehouses: [],
                }));
                return;
            }

            try {
                const warehousesRes = await companyService.listWarehouses(parseInt(billToId));
                const warehouses = warehousesRes?.result || warehousesRes?.data || warehousesRes || [];
                const warehousesArray = Array.isArray(warehouses) ? warehouses : [];
                
                setOptions((prev) => ({
                    ...prev,
                    warehouses: warehousesArray,
                }));

                // Clear ship_to_id if current selection doesn't belong to the new company
                if (formData.ship_to_id) {
                    const currentWarehouse = warehousesArray.find(w => w.id === parseInt(formData.ship_to_id));
                    if (!currentWarehouse) {
                        setFormData((prev) => ({
                            ...prev,
                            ship_to_id: "",
                        }));
                    }
                }
            } catch (err) {
                console.error("Failed to load warehouses", err);
                setOptions((prev) => ({
                    ...prev,
                    warehouses: [],
                }));
            }
        };

        loadWarehouses();
    }, [formData.bill_to_id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // If bill_to_id changes, clear ship_to_id to force re-selection
        if (name === "bill_to_id") {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
                ship_to_id: "", // Clear warehouse selection when company changes
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
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

    const handleItemChange = (e) => {
        const { name, value } = e.target;
        setCurrentItem((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Clear item errors when user starts typing
        if (itemErrors[name]) {
            setItemErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        // Auto-fill HSN and GST from product
        if (name === "product_id" && value) {
            const product = options.products.find((p) => p.id === parseInt(value));
            if (product) {
                setCurrentItem((prev) => ({
                    ...prev,
                    product_id: value,
                    hsn_code: product.hsn_ssn_code || "",
                    gst_percent: product.gst_percent || "",
                }));
            }
        }
    };

    const handleAddItem = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Validate required fields before adding to table
        const validationErrors = {};
        
        // Product validation (mandatory)
        if (!currentItem.product_id) {
            validationErrors.product_id = "Product is required";
        } else {
            // Check for duplicate products
            const productId = parseInt(currentItem.product_id);
            const isDuplicate = formData.items.some(item => item.product_id === productId);
            if (isDuplicate) {
                validationErrors.product_id = "This product is already added. Please remove it first or update the quantity.";
            }
        }
        
        // Rate validation (mandatory)
        if (!currentItem.rate || currentItem.rate === "" || Number(currentItem.rate) <= 0) {
            validationErrors.rate = "Rate is required and must be greater than 0";
        }
        
        // Quantity validation (mandatory)
        if (!currentItem.quantity || currentItem.quantity === "" || Number(currentItem.quantity) <= 0) {
            validationErrors.quantity = "Quantity is required and must be greater than 0";
        }
        
        // GST validation (mandatory)
        if (currentItem.gst_percent === "" || currentItem.gst_percent === null || currentItem.gst_percent === undefined) {
            validationErrors.gst_percent = "GST % is required";
        } else if (Number(currentItem.gst_percent) < 0) {
            validationErrors.gst_percent = "GST % cannot be negative";
        } else if (Number(currentItem.gst_percent) > 100) {
            validationErrors.gst_percent = "GST % cannot exceed 100%";
        }

        // If validation fails, show errors and don't add item
        if (Object.keys(validationErrors).length > 0) {
            setItemErrors(validationErrors);
            return;
        }

        // All validations passed - add item to table
        const product = options.products.find((p) => p.id === parseInt(currentItem.product_id));
        
        const newItem = {
            product_id: parseInt(currentItem.product_id),
            hsn_code: currentItem.hsn_code || (product?.hsn_ssn_code || ""),
            rate: parseFloat(currentItem.rate),
            quantity: parseInt(currentItem.quantity),
            gst_percent: parseFloat(currentItem.gst_percent),
        };

        setFormData((prev) => ({
            ...prev,
            items: [...prev.items, newItem],
        }));

        // Clear the input fields and errors
        setCurrentItem({
            product_id: "",
            hsn_code: "",
            rate: "",
            quantity: "",
            gst_percent: "",
        });
        setItemErrors({});
    };

    const handleRemoveItem = (index) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
        // Clear errors for this row and reindex remaining errors
        setTableItemErrors((prev) => {
            const newErrors = {};
            Object.keys(prev).forEach((key) => {
                const keyIndex = parseInt(key);
                if (keyIndex < index) {
                    newErrors[keyIndex] = prev[keyIndex];
                } else if (keyIndex > index) {
                    newErrors[keyIndex - 1] = prev[keyIndex];
                }
            });
            return newErrors;
        });
    };

    const calculateTotals = () => {
        let totalQuantity = 0;
        let taxableAmount = 0;
        let totalGstAmount = 0;

        formData.items.forEach((item) => {
            totalQuantity += item.quantity;
            const itemTaxable = item.rate * item.quantity;
            const itemGst = (itemTaxable * item.gst_percent) / 100;
            taxableAmount += itemTaxable;
            totalGstAmount += itemGst;
        });

        const grandTotal = taxableAmount + totalGstAmount;

        return {
            total_quantity: totalQuantity,
            taxable_amount: parseFloat(taxableAmount.toFixed(2)),
            total_gst_amount: parseFloat(totalGstAmount.toFixed(2)),
            grand_total: parseFloat(grandTotal.toFixed(2)),
        };
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const validationErrors = {};
        
        // Required field validations
        if (!formData.supplier_id) {
            validationErrors.supplier_id = "Supplier is required";
        }
        if (!formData.bill_to_id) {
            validationErrors.bill_to_id = "Bill To (Company) is required";
        }
        if (!formData.ship_to_id) {
            validationErrors.ship_to_id = "Ship To (Warehouse) is required";
        }
        if (!formData.po_date) {
            validationErrors.po_date = "PO Date is required";
        }
        if (!formData.due_date) {
            validationErrors.due_date = "Due Date is required";
        }
        
        // Date validation: due_date should be after or equal to po_date
        if (formData.po_date && formData.due_date) {
            const poDate = new Date(formData.po_date);
            const dueDate = new Date(formData.due_date);
            if (dueDate < poDate) {
                validationErrors.due_date = "Due Date must be on or after PO Date";
            }
        }
        
        // Items validation - validate all table rows on submit
        const tableErrors = {};
        if (formData.items.length === 0) {
            validationErrors.items = "At least one item is required";
        } else {
            // Validate each item in the table (mandatory: product, quantity, rate, GST)
            formData.items.forEach((item, index) => {
                const itemErrors = {};
                let hasError = false;

                // Product validation (mandatory)
                if (!item.product_id) {
                    itemErrors.product_id = "Product is required";
                    hasError = true;
                }

                // Rate validation (mandatory)
                if (!item.rate || item.rate <= 0) {
                    itemErrors.rate = "Rate is required and must be greater than 0";
                    hasError = true;
                }

                // Quantity validation (mandatory)
                if (!item.quantity || item.quantity <= 0) {
                    itemErrors.quantity = "Quantity is required and must be greater than 0";
                    hasError = true;
                }

                // GST validation (mandatory)
                if (item.gst_percent === null || item.gst_percent === undefined) {
                    itemErrors.gst_percent = "GST % is required";
                    hasError = true;
                } else if (item.gst_percent < 0) {
                    itemErrors.gst_percent = "GST % cannot be negative";
                    hasError = true;
                } else if (item.gst_percent > 100) {
                    itemErrors.gst_percent = "GST % cannot exceed 100%";
                    hasError = true;
                }

                // Check for duplicate products
                const duplicateIndex = formData.items.findIndex((itm, idx) => 
                    idx !== index && itm.product_id === item.product_id && item.product_id
                );
                if (duplicateIndex !== -1) {
                    itemErrors.product_id = "This product is already added in another row";
                    hasError = true;
                }

                if (hasError) {
                    tableErrors[index] = itemErrors;
                }
            });

            if (Object.keys(tableErrors).length > 0) {
                validationErrors.items = "Please fix errors in the items table. All items must have Product, Quantity, Rate, and GST %";
                setTableItemErrors(tableErrors);
            } else {
                setTableItemErrors({});
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            // Scroll to first error or items table if items have errors
            if (validationErrors.items) {
                const itemsSection = document.querySelector('[data-items-section]');
                if (itemsSection) {
                    itemsSection.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            } else {
                const firstErrorField = Object.keys(validationErrors)[0];
                const element = document.querySelector(`[name="${firstErrorField}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }
            return;
        }

        setErrors({});
        setTableItemErrors({});

        const totals = calculateTotals();
        const payload = {
            ...formData,
            supplier_id: parseInt(formData.supplier_id),
            bill_to_id: parseInt(formData.bill_to_id),
            ship_to_id: parseInt(formData.ship_to_id),
            ...totals,
        };

        onSubmit(payload, uploadedFiles);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        setUploadedFiles((prev) => [...prev, ...files]);
        e.target.value = ""; // Reset input
    };

    const handleRemoveUploadedFile = (index) => {
        setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDeleteAttachmentClick = (poId, attachmentIndex) => {
        setAttachmentToDelete({ poId, attachmentIndex });
        setDeleteAttachmentDialogOpen(true);
    };

    const handleDeleteAttachmentConfirm = async () => {
        if (!attachmentToDelete) return;
        setDeletingAttachment(true);
        try {
            await purchaseOrderService.deleteAttachment(attachmentToDelete.poId, attachmentToDelete.attachmentIndex);
            setAttachments((prev) => prev.filter((_, i) => i !== attachmentToDelete.attachmentIndex));
            setDeleteAttachmentDialogOpen(false);
            setAttachmentToDelete(null);
        } catch (error) {
            console.error("Error deleting attachment:", error);
            alert("Failed to delete attachment");
        } finally {
            setDeletingAttachment(false);
        }
    };

    const handleDownloadAttachment = async (poId, attachmentIndex) => {
        try {
            const response = await purchaseOrderService.getAttachmentUrl(poId, attachmentIndex);
            const url = response.result?.url || response.url;
            if (url) {
                // Open signed URL in new tab (token-based access to private file)
                window.open(url, "_blank");
            } else {
                alert("Failed to get download URL");
            }
        } catch (error) {
            console.error("Error downloading attachment:", error);
            alert("Failed to download attachment");
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
    };

    if (loadingOptions) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
                <CircularProgress />
            </Box>
        );
    }

    const totals = calculateTotals();

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <FormContainer>
                <Box sx={{ p: 1.5 }}>
                    {serverError && (
                        <Alert severity="error" sx={{ mb: 1.5 }} onClose={onClearServerError}>
                            {serverError}
                        </Alert>
                    )}

                    <Grid container spacing={COMPACT_FORM_SPACING}>
                        <Grid item size={{ xs: 12, md: 4 }}>
                            <DateField
                                name="po_date"
                                label="PO Date"
                                value={formData.po_date}
                                onChange={handleChange}
                                required
                                error={!!errors.po_date}
                                helperText={errors.po_date}
                            />
                        </Grid>

                        <Grid item size={{ xs: 12, md: 4 }}>
                            <DateField
                                name="due_date"
                                label="Due Date"
                                value={formData.due_date}
                                onChange={handleChange}
                                required
                                error={!!errors.due_date}
                                helperText={errors.due_date}
                                minDate={formData.po_date || undefined}
                            />
                        </Grid>

                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Select
                                name="supplier_id"
                                label="Supplier"
                                value={formData.supplier_id}
                                onChange={handleChange}
                                required
                                error={!!errors.supplier_id}
                                helperText={errors.supplier_id}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.suppliers.map((supplier) => (
                                    <MenuItem key={supplier.id} value={supplier.id}>
                                        {supplier.supplier_name} ({supplier.supplier_code})
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>

                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Select
                                name="bill_to_id"
                                label="Bill To (Company)"
                                value={formData.bill_to_id}
                                onChange={handleChange}
                                required
                                error={!!errors.bill_to_id}
                                helperText={errors.bill_to_id}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.companies.map((company) => (
                                    <MenuItem key={company.id} value={company.id}>
                                        {company.company_name} ({company.company_code})
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>

                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Select
                                name="ship_to_id"
                                label="Ship To (Warehouse)"
                                value={formData.ship_to_id}
                                onChange={handleChange}
                                required
                                error={!!errors.ship_to_id}
                                helperText={errors.ship_to_id}
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {options.warehouses.map((warehouse) => (
                                    <MenuItem key={warehouse.id} value={warehouse.id}>
                                        {warehouse.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Grid>

                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                name="payment_terms"
                                label="Payment Terms"
                                value={formData.payment_terms}
                                onChange={handleChange}
                            />
                        </Grid>

                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                name="delivery_terms"
                                label="Delivery Terms"
                                value={formData.delivery_terms}
                                onChange={handleChange}
                            />
                        </Grid>

                        <Grid item size={{ xs: 12, md: 4 }}>
                            <Input
                                name="dispatch_terms"
                                label="Dispatch Terms"
                                value={formData.dispatch_terms}
                                onChange={handleChange}
                            />
                        </Grid>

                        <Grid item size={12}>
                            <Input
                                name="remarks"
                                label="Remarks"
                                value={formData.remarks}
                                onChange={handleChange}
                                multiline
                                rows={2}
                            />
                        </Grid>

                        <Grid item size={12} data-items-section>
                            <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                                <Typography variant="subtitle1" fontWeight={600}>Items</Typography>
                            </Box>
                            {errors.items && (
                                <Alert severity="error" sx={{ mb: 1.5 }}>
                                    {errors.items}
                                </Alert>
                            )}

                            {/* Add Item Form */}
                            <Paper sx={{ p: 1.5, mb: 1.5 }}>
                                <Grid container spacing={COMPACT_FORM_SPACING} alignItems="center">
                                    <Grid item size={{ xs: 12, md: 3 }}>
                                        <Select
                                            name="product_id"
                                            label="Product"
                                            value={currentItem.product_id}
                                            onChange={handleItemChange}
                                            error={!!itemErrors.product_id}
                                            helperText={itemErrors.product_id}
                                            required
                                        >
                                            <MenuItem value="">-- Select --</MenuItem>
                                            {options.products.map((product) => (
                                                <MenuItem key={product.id} value={product.id}>
                                                    {product.product_name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </Grid>

                                    <Grid item size={{ xs: 12, md: 2 }}>
                                        <Input
                                            name="hsn_code"
                                            label="HSN Code"
                                            value={currentItem.hsn_code}
                                            onChange={handleItemChange}
                                            error={!!itemErrors.hsn_code}
                                            helperText={itemErrors.hsn_code}
                                        />
                                    </Grid>

                                    <Grid item size={{ xs: 12, md: 2 }}>
                                        <Input
                                            name="rate"
                                            label="Rate"
                                            type="number"
                                            value={currentItem.rate}
                                            onChange={handleItemChange}
                                            inputProps={{ min: 0, step: 0.01 }}
                                            error={!!itemErrors.rate}
                                            helperText={itemErrors.rate}
                                            required
                                        />
                                    </Grid>

                                    <Grid item size={{ xs: 12, md: 2 }}>
                                        <Input
                                            name="quantity"
                                            label="Quantity"
                                            type="number"
                                            value={currentItem.quantity}
                                            onChange={handleItemChange}
                                            inputProps={{ min: 1 }}
                                            error={!!itemErrors.quantity}
                                            helperText={itemErrors.quantity}
                                            required
                                        />
                                    </Grid>

                                    <Grid item size={{ xs: 12, md: 2 }}>
                                        <Input
                                            name="gst_percent"
                                            label="GST %"
                                            type="number"
                                            value={currentItem.gst_percent}
                                            onChange={handleItemChange}
                                            inputProps={{ min: 0, step: 0.01, max: 100 }}
                                            error={!!itemErrors.gst_percent}
                                            helperText={itemErrors.gst_percent}
                                            required
                                        />
                                    </Grid>

                                    <Grid item size={{ xs: 12, md: 1 }}>
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

                            {/* Items Table with Price Details */}
                            {formData.items.length > 0 && (
                                <TableContainer component={Paper}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Product</TableCell>
                                                <TableCell>HSN Code</TableCell>
                                                <TableCell align="right">Rate</TableCell>
                                                <TableCell align="right">Quantity</TableCell>
                                                <TableCell align="right">GST %</TableCell>
                                                <TableCell align="right">Taxable Amount</TableCell>
                                                <TableCell align="right">GST Amount</TableCell>
                                                <TableCell align="right">Total Amount</TableCell>
                                                <TableCell>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {formData.items.map((item, index) => {
                                                const product = options.products.find((p) => p.id === item.product_id);
                                                const itemTaxable = item.rate * item.quantity;
                                                const itemGst = (itemTaxable * item.gst_percent) / 100;
                                                const itemTotal = itemTaxable + itemGst;
                                                const rowErrors = tableItemErrors[index] || {};
                                                const hasRowError = Object.keys(rowErrors).length > 0;

                                                return (
                                                    <TableRow 
                                                        key={index}
                                                        sx={{
                                                            bgcolor: hasRowError ? "error.light" : "inherit",
                                                            "&:hover": {
                                                                bgcolor: hasRowError ? "error.light" : "action.hover",
                                                            },
                                                        }}
                                                    >
                                                        <TableCell>
                                                            {product?.product_name || <Typography color="error" variant="caption">- Select Product -</Typography>}
                                                            {rowErrors.product_id && (
                                                                <Typography variant="caption" color="error" display="block">
                                                                    {rowErrors.product_id}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{item.hsn_code || "-"}</TableCell>
                                                        <TableCell align="right">
                                                            {item.rate > 0 ? `₹${parseFloat(item.rate).toFixed(2)}` : <Typography color="error" variant="caption">Invalid</Typography>}
                                                            {rowErrors.rate && (
                                                                <Typography variant="caption" color="error" display="block">
                                                                    {rowErrors.rate}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {item.quantity > 0 ? item.quantity : <Typography color="error" variant="caption">Invalid</Typography>}
                                                            {rowErrors.quantity && (
                                                                <Typography variant="caption" color="error" display="block">
                                                                    {rowErrors.quantity}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {item.gst_percent >= 0 && item.gst_percent <= 100 ? `${item.gst_percent}%` : <Typography color="error" variant="caption">Invalid</Typography>}
                                                            {rowErrors.gst_percent && (
                                                                <Typography variant="caption" color="error" display="block">
                                                                    {rowErrors.gst_percent}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="right">₹{itemTaxable.toFixed(2)}</TableCell>
                                                        <TableCell align="right">₹{itemGst.toFixed(2)}</TableCell>
                                                        <TableCell align="right"><strong>₹{itemTotal.toFixed(2)}</strong></TableCell>
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

                            {/* Totals Summary */}
                            {formData.items.length > 0 && (
                                <Paper sx={{ p: 1.5, mt: 1.5, bgcolor: "#f5f5f5" }}>
                                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                        <Box sx={{ minWidth: 300 }}>
                                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                                                <Typography variant="body1">Total Quantity:</Typography>
                                                <Typography variant="body1" fontWeight="bold">{totals.total_quantity}</Typography>
                                            </Box>
                                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                                                <Typography variant="body1">Taxable Amount:</Typography>
                                                <Typography variant="body1" fontWeight="bold">₹{totals.taxable_amount.toFixed(2)}</Typography>
                                            </Box>
                                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                                                <Typography variant="body1">Total GST Amount:</Typography>
                                                <Typography variant="body1" fontWeight="bold">₹{totals.total_gst_amount.toFixed(2)}</Typography>
                                            </Box>
                                            <Box sx={{ borderTop: "2px solid #000", pt: 1, mt: 1, display: "flex", justifyContent: "space-between" }}>
                                                <Typography variant="h6">Grand Total:</Typography>
                                                <Typography variant="h6" fontWeight="bold">₹{totals.grand_total.toFixed(2)}</Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Paper>
                            )}
                        </Grid>

                        {/* Document Attachments Section */}
                        <Grid item size={12}>
                            <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                                <Typography variant="subtitle1" fontWeight={600}>Attachments</Typography>
                            </Box>
                            <Paper sx={{ p: 1.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
                                    Files are stored privately. Access via time-limited signed URLs (tokens).
                                </Typography>

                                {/* Upload New Files */}
                                <Box sx={{ mb: 1.5 }}>
                                    <Button
                                        variant="outlined"
                                        component="label"
                                        startIcon={<CloudUploadIcon />}
                                        disabled={loading}
                                    >
                                        Upload Documents
                                        <input
                                            type="file"
                                            hidden
                                            multiple
                                            onChange={handleFileUpload}
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                        />
                                    </Button>
                                </Box>

                                {/* New Files to Upload */}
                                {uploadedFiles.length > 0 && (
                                    <Box sx={{ mb: 1.5 }}>
                                        <Typography variant="subtitle2" gutterBottom>New Files to Upload:</Typography>
                                        {uploadedFiles.map((file, index) => (
                                            <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                                <AttachFileIcon fontSize="small" />
                                                <Typography variant="body2" sx={{ flex: 1 }}>
                                                    {file.name} ({formatFileSize(file.size)})
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleRemoveUploadedFile(index)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        ))}
                                    </Box>
                                )}

                                {/* Existing Attachments */}
                                {attachments.length > 0 && (
                                    <Box>
                                        <Typography variant="subtitle2" gutterBottom>Existing Attachments:</Typography>
                                        {attachments.map((attachment, index) => (
                                            <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, p: 1, bgcolor: "#f9f9f9", borderRadius: 1 }}>
                                                <AttachFileIcon fontSize="small" />
                                                <Typography variant="body2" sx={{ flex: 1 }}>
                                                    {attachment.filename} ({formatFileSize(attachment.size || 0)})
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {attachment.uploaded_at ? new Date(attachment.uploaded_at).toLocaleDateString() : ""}
                                                </Typography>
                                                {defaultValues?.id && (
                                                    <>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDownloadAttachment(defaultValues.id, index)}
                                                            title="Download (Signed URL - Valid for 1 hour)"
                                                        >
                                                            <GetAppIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDeleteAttachmentClick(defaultValues.id, index)}
                                                            title="Delete"
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </>
                                                )}
                                            </Box>
                                        ))}
                                    </Box>
                                )}

                                {attachments.length === 0 && uploadedFiles.length === 0 && (
                                    <Typography variant="body2" color="text.secondary">
                                        No attachments. Click "Upload Documents" to add files.
                                    </Typography>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>

                {/* Sticky Action Buttons */}
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
                        {defaultValues?.id ? "Update" : "Create"}
                    </LoadingButton>
                </FormActions>
            </FormContainer>

            <AlertDialog open={deleteAttachmentDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteAttachmentDialogOpen(false); setAttachmentToDelete(null); } }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this attachment? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingAttachment}>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDeleteAttachmentConfirm} disabled={deletingAttachment} loading={deletingAttachment}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Box>
    );
}

