"use client";

import { useState, useEffect, useRef } from "react";
import {
    Box,
    Typography,
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
import { toastError } from "@/utils/toast";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
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
        product_name: "",
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
    const fileInputRef = useRef(null);

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

    // Load initial options (company profile for Bill To; Supplier and Product use async search)
    useEffect(() => {
        const loadInitialOptions = async () => {
            setLoadingOptions(true);
            try {
                const companyProfileRes = await companyService.getCompanyProfile();
                const companyProfile = companyProfileRes?.result || companyProfileRes?.data || companyProfileRes;
                const companies = companyProfile ? [companyProfile] : [];

                setOptions((prev) => ({
                    ...prev,
                    companies,
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

        // Auto-fill HSN and GST from product (product_name set via AutocompleteField onChange)
        if (name === "product_id" && value) {
            const product = options.products.find((p) => p.id === parseInt(value));
            if (product) {
                setCurrentItem((prev) => ({
                    ...prev,
                    product_id: value,
                    product_name: product.product_name || prev.product_name,
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
            product_name: currentItem.product_name || product?.product_name || "",
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
            product_name: "",
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
            toastError(error?.response?.data?.message || "Failed to delete attachment");
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
                toastError("Failed to get download URL");
            }
        } catch (error) {
            console.error("Error downloading attachment:", error);
            toastError(error?.response?.data?.message || "Failed to download attachment");
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
        <Box>
            <FormContainer>
                <form id="purchase-order-form" onSubmit={handleSubmit} className="mx-auto ml-2 pr-1 max-w-full" noValidate>
                    {serverError && (
                        <Alert severity="error" sx={{ mb: 1 }} onClose={onClearServerError}>
                            {serverError}
                        </Alert>
                    )}

                    <div className="w-full">
                        <FormGrid cols={2} className="lg:grid-cols-4">
                            <DateField
                                name="po_date"
                                label="PO Date"
                                value={formData.po_date}
                                onChange={handleChange}
                                required
                                error={!!errors.po_date}
                                helperText={errors.po_date}
                            />
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
                            <AutocompleteField
                                label="Supplier *"
                                placeholder="Type to search..."
                                options={[]}
                                asyncLoadOptions={async (q) => {
                                    const res = await supplierService.getSuppliers({ q: q || undefined, limit: 20 });
                                    const data = res?.result?.data ?? res?.data ?? [];
                                    return Array.isArray(data) ? data : [];
                                }}
                                resolveOptionById={async (id) => {
                                    if (id == null || id === "") return null;
                                    const s = await supplierService.getSupplierById(id);
                                    const row = s?.result ?? s;
                                    return row ? { id: row.id, supplier_name: row.supplier_name, supplier_code: row.supplier_code } : null;
                                }}
                                getOptionLabel={(s) => (s?.supplier_name ? `${s.supplier_name} (${s.supplier_code ?? ""})` : String(s?.id ?? ""))}
                                value={formData.supplier_id ? { id: formData.supplier_id } : null}
                                onChange={(e, newValue) => handleChange({ target: { name: "supplier_id", value: newValue?.id ?? "" } })}
                                required
                                error={!!errors.supplier_id}
                                helperText={errors.supplier_id}
                            />
                            <AutocompleteField
                                label="Bill To (Company) *"
                                placeholder="Type to search..."
                                options={options.companies}
                                getOptionLabel={(c) => (c?.company_name ? `${c.company_name} (${c.company_code ?? ""})` : String(c?.id ?? ""))}
                                value={options.companies.find((c) => c.id === parseInt(formData.bill_to_id)) || (formData.bill_to_id ? { id: formData.bill_to_id } : null)}
                                onChange={(e, newValue) => handleChange({ target: { name: "bill_to_id", value: newValue?.id ?? "" } })}
                                required
                                error={!!errors.bill_to_id}
                                helperText={errors.bill_to_id}
                            />
                            <AutocompleteField
                                label="Ship To (Warehouse) *"
                                placeholder="Type to search..."
                                options={options.warehouses}
                                getOptionLabel={(w) => w?.name ?? String(w?.id ?? "")}
                                value={options.warehouses.find((w) => w.id === parseInt(formData.ship_to_id)) || (formData.ship_to_id ? { id: formData.ship_to_id } : null)}
                                onChange={(e, newValue) => handleChange({ target: { name: "ship_to_id", value: newValue?.id ?? "" } })}
                                required
                                error={!!errors.ship_to_id}
                                helperText={errors.ship_to_id}
                            />
                            <Input
                                name="payment_terms"
                                label="Payment Terms"
                                value={formData.payment_terms}
                                onChange={handleChange}
                            />
                            <Input
                                name="delivery_terms"
                                label="Delivery Terms"
                                value={formData.delivery_terms}
                                onChange={handleChange}
                            />
                            <Input
                                name="dispatch_terms"
                                label="Dispatch Terms"
                                value={formData.dispatch_terms}
                                onChange={handleChange}
                            />
                            <div className="md:col-span-2 lg:col-span-4">
                                <Input
                                    name="remarks"
                                    label="Remarks"
                                    value={formData.remarks}
                                    onChange={handleChange}
                                    multiline
                                    rows={2}
                                />
                            </div>
                        </FormGrid>
                    </div>

                    <FormSection title="Items" className="mt-2" data-items-section>
                        {errors.items && (
                            <Alert severity="error" sx={{ mb: 1 }}>
                                {errors.items}
                            </Alert>
                        )}

                        {/* Add Item Form */}
                        <Paper sx={{ p: 1, mb: 1 }}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 items-end">
                                <AutocompleteField
                                    label="Product *"
                                    placeholder="Type to search..."
                                    options={[]}
                                    asyncLoadOptions={async (q) => {
                                        const res = await productService.getProducts({ q: q || undefined, limit: 20 });
                                        const data = res?.result?.data ?? res?.data ?? [];
                                        return Array.isArray(data) ? data : [];
                                    }}
                                    resolveOptionById={async (id) => {
                                        if (id == null || id === "") return null;
                                        const p = await productService.getProductById(id);
                                        const row = p?.result ?? p;
                                        return row ? { id: row.id, product_name: row.product_name, hsn_ssn_code: row.hsn_ssn_code, gst_percent: row.gst_percent } : null;
                                    }}
                                    getOptionLabel={(p) => p?.product_name ?? String(p?.id ?? "")}
                                    value={currentItem.product_id ? { id: currentItem.product_id } : null}
                                    onChange={(e, newValue) => {
                                        handleItemChange({ target: { name: "product_id", value: newValue?.id ?? "" } });
                                        if (newValue) {
                                            setCurrentItem((prev) => ({
                                                ...prev,
                                                product_id: newValue.id ?? prev.product_id,
                                                product_name: newValue.product_name ?? prev.product_name,
                                                hsn_code: newValue.hsn_ssn_code ?? prev.hsn_code,
                                                gst_percent: newValue.gst_percent ?? prev.gst_percent,
                                            }));
                                        }
                                    }}
                                    error={!!itemErrors.product_id}
                                    helperText={itemErrors.product_id}
                                    required
                                />
                                <Input
                                    name="hsn_code"
                                    label="HSN Code"
                                    value={currentItem.hsn_code}
                                    onChange={handleItemChange}
                                    error={!!itemErrors.hsn_code}
                                    helperText={itemErrors.hsn_code}
                                />
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
                                <div className="flex items-end">
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        startIcon={<AddIcon />}
                                        onClick={handleAddItem}
                                        className="w-full lg:w-auto"
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </Paper>

                        {/* Items Table with Price Details */}
                        {formData.items.length > 0 && (
                            <TableContainer component={Paper}>
                                <Table size="small">
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
                                            const displayLabel = item.product_name ?? item.product?.product_name;
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
                                                        {displayLabel || <Typography color="error" variant="caption">- Select Product -</Typography>}
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
                            <Paper sx={{ p: 1, mt: 1, bgcolor: "grey.100" }}>
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
                    </FormSection>

                    <FormSection title="Attachments" className="mt-2">
                        <Paper sx={{ p: 1 }}>
                            <FormGrid cols={2} className="lg:grid-cols-4 mb-1">
                                <div className="md:col-span-2 lg:col-span-3">
                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                        Files are stored privately. Access via time-limited signed URLs (tokens).
                                    </Typography>
                                </div>

                                {/* Upload New Files */}
                                <div className="flex items-end md:col-span-2 lg:col-span-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={loading}
                                        startIcon={<CloudUploadIcon />}
                                        type="button"
                                        fullWidth
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Upload Documents
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        hidden
                                        multiple
                                        disabled={loading}
                                        onChange={handleFileUpload}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                    />
                                </div>
                            </FormGrid>

                            {/* New Files to Upload */}
                            {uploadedFiles.length > 0 && (
                                <Box sx={{ mb: 1 }}>
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
                    </FormSection>
                </form>

                {/* Sticky Action Buttons */}
                <FormActions>
                    {onCancel && (
                        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
                            Cancel
                        </Button>
                    )}
                    <LoadingButton
                        type="submit"
                        form="purchase-order-form"
                        size="sm"
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

