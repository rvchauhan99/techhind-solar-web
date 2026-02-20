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
import FormContainer from "@/components/common/FormContainer";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { MenuItem } from "@mui/material";
import DateField from "@/components/common/DateField";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import AutocompleteField from "@/components/common/AutocompleteField";
import BillToShipToDisplay from "@/components/common/BillToShipToDisplay";
import b2bClientService from "@/services/b2bClientService";
import productService from "@/services/productService";

const emptyCurrentItem = () => ({
    product_id: "",
    product_label: "",
    hsn_code: "",
    quantity: "",
    unit_rate: "",
    discount_percent: "",
    gst_percent: "",
});

export default function B2bSalesQuoteForm({
    defaultValues = {},
    onSubmit,
    loading,
    serverError = null,
    onClearServerError = () => {},
    onCancel = null,
}) {
    const today = new Date().toISOString().split("T")[0];
    const validTill = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [formData, setFormData] = useState({
        quote_date: today,
        valid_till: validTill,
        client_id: "",
        ship_to_id: "",
        payment_terms: "",
        delivery_terms: "",
        remarks: "",
        items: [],
    });

    const [errors, setErrors] = useState({});
    const [itemErrors, setItemErrors] = useState({});
    const [currentItem, setCurrentItem] = useState(emptyCurrentItem());

    const [clients, setClients] = useState([]);
    const [shipTos, setShipTos] = useState([]);
    const [clientDetails, setClientDetails] = useState(null);
    const [loadingOptions, setLoadingOptions] = useState(false);

    const [uploadedFiles, setUploadedFiles] = useState([]);
    const fileInputRef = useRef(null);

    // Load clients on mount
    useEffect(() => {
        setLoadingOptions(true);
        b2bClientService
            .getB2bClients({ limit: 500, is_active: true })
            .then((res) => {
                const r = res?.result ?? res;
                setClients(r?.data ?? []);
            })
            .catch(() => {})
            .finally(() => setLoadingOptions(false));
    }, []);

    // Load existing values for edit mode
    useEffect(() => {
        if (!defaultValues?.id) return;
        const items = defaultValues.items?.length
            ? defaultValues.items.map((it) => ({
                  product_id: it.product_id,
                  product_label: it.product?.product_name || String(it.product_id),
                  hsn_code: it.hsn_code ?? it.product?.hsn_code ?? "",
                  quantity: it.quantity ?? 1,
                  unit_rate: it.unit_rate ?? 0,
                  discount_percent: it.discount_percent ?? 0,
                  gst_percent: it.gst_percent ?? 0,
              }))
            : [];
        setFormData({
            quote_date: defaultValues.quote_date || today,
            valid_till: defaultValues.valid_till || validTill,
            client_id: defaultValues.client_id ?? "",
            ship_to_id: defaultValues.ship_to_id ?? "",
            payment_terms: defaultValues.payment_terms ?? "",
            delivery_terms: defaultValues.delivery_terms ?? "",
            remarks: defaultValues.remarks ?? "",
            items,
        });
    }, [defaultValues?.id]);

    // Load ship-tos when client changes; pre-select default or first
    useEffect(() => {
        if (!formData.client_id) {
            setShipTos([]);
            setClientDetails(null);
            setFormData((p) => ({ ...p, ship_to_id: "" }));
            return;
        }
        b2bClientService
            .getB2bShipTos({ client_id: formData.client_id })
            .then((res) => {
                const r = res?.result ?? res;
                const data = r?.data ?? [];
                setShipTos(data);
                const defaultShipTo = data.find((s) => s.is_default) || data[0];
                setFormData((p) => ({ ...p, ship_to_id: defaultShipTo?.id ?? "" }));
            })
            .catch(() => setShipTos([]));
        b2bClientService
            .getB2bClientById(formData.client_id)
            .then((res) => {
                const r = res?.result ?? res;
                setClientDetails(r ?? null);
            })
            .catch(() => setClientDetails(null));
    }, [formData.client_id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "client_id") {
            setFormData((p) => ({ ...p, client_id: value, ship_to_id: "" }));
        } else {
            setFormData((p) => ({ ...p, [name]: value }));
        }
        if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
        if (serverError) onClearServerError();
    };

    const handleCurrentItemChange = (e) => {
        const { name, value } = e.target;
        setCurrentItem((p) => ({ ...p, [name]: value }));
        if (itemErrors[name]) setItemErrors((p) => { const n = { ...p }; delete n[name]; return n; });
    };

    const handleAddItem = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const errs = {};
        if (!currentItem.product_id) {
            errs.product_id = "Product is required";
        } else {
            const pid = typeof currentItem.product_id === "object"
                ? currentItem.product_id?.id
                : currentItem.product_id;
            const isDuplicate = formData.items.some((it) => {
                const itPid = typeof it.product_id === "object" ? it.product_id?.id : it.product_id;
                return String(itPid) === String(pid);
            });
            if (isDuplicate) errs.product_id = "This product is already added";
        }
        if (!currentItem.unit_rate || Number(currentItem.unit_rate) < 0) errs.unit_rate = "Rate is required";
        if (!currentItem.quantity || Number(currentItem.quantity) <= 0) errs.quantity = "Quantity must be > 0";
        if (currentItem.gst_percent === "" || currentItem.gst_percent === null || currentItem.gst_percent === undefined) {
            errs.gst_percent = "GST % is required";
        }

        if (Object.keys(errs).length > 0) {
            setItemErrors(errs);
            return;
        }

        const pid = typeof currentItem.product_id === "object"
            ? currentItem.product_id?.id
            : currentItem.product_id;

        setFormData((p) => ({
            ...p,
            items: [
                ...p.items,
                {
                    product_id: pid,
                    product_label: currentItem.product_label,
                    hsn_code: currentItem.hsn_code || "",
                    quantity: parseInt(currentItem.quantity, 10),
                    unit_rate: parseFloat(currentItem.unit_rate),
                    discount_percent: parseFloat(currentItem.discount_percent || 0),
                    gst_percent: parseFloat(currentItem.gst_percent),
                },
            ],
        }));
        setCurrentItem(emptyCurrentItem());
        setItemErrors({});
    };

    const handleRemoveItem = (index) => {
        setFormData((p) => ({
            ...p,
            items: p.items.filter((_, i) => i !== index),
        }));
    };

    const calculateTotals = () => {
        let totalQuantity = 0;
        let taxableAmount = 0;
        let totalGstAmount = 0;

        formData.items.forEach((item) => {
            const qty = Number(item.quantity) || 0;
            const rate = Number(item.unit_rate) || 0;
            const disc = Number(item.discount_percent) || 0;
            const gst = Number(item.gst_percent) || 0;

            const lineValue = rate * qty;
            const discountAmt = (lineValue * disc) / 100;
            const taxable = lineValue - discountAmt;
            const gstAmt = (taxable * gst) / 100;

            totalQuantity += qty;
            taxableAmount += taxable;
            totalGstAmount += gstAmt;
        });

        return {
            total_quantity: totalQuantity,
            taxable_amount: parseFloat(taxableAmount.toFixed(2)),
            total_gst_amount: parseFloat(totalGstAmount.toFixed(2)),
            grand_total: parseFloat((taxableAmount + totalGstAmount).toFixed(2)),
        };
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (serverError) onClearServerError();

        const errs = {};
        if (!formData.client_id) errs.client_id = "Client is required";
        if (!formData.quote_date) errs.quote_date = "Quote date is required";
        if (!formData.valid_till) errs.valid_till = "Valid till is required";
        if (formData.quote_date && formData.valid_till && formData.valid_till < formData.quote_date) {
            errs.valid_till = "Valid Till must be on or after Quote Date";
        }
        if (formData.items.length === 0) errs.items = "At least one item is required";

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        setErrors({});
        const totals = calculateTotals();

        const payload = {
            quote_date: formData.quote_date,
            valid_till: formData.valid_till,
            client_id: Number(formData.client_id),
            ship_to_id: formData.ship_to_id ? Number(formData.ship_to_id) : null,
            payment_terms: formData.payment_terms || null,
            delivery_terms: formData.delivery_terms || null,
            remarks: formData.remarks || null,
            items: formData.items.map((it) => ({
                product_id: typeof it.product_id === "object" ? it.product_id?.id : it.product_id,
                quantity: parseInt(it.quantity, 10) || 1,
                unit_rate: parseFloat(it.unit_rate) || 0,
                discount_percent: parseFloat(it.discount_percent) || 0,
                gst_percent: parseFloat(it.gst_percent) || 0,
                hsn_code: it.hsn_code || "",
            })),
            ...totals,
        };

        onSubmit(payload, uploadedFiles);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        setUploadedFiles((p) => [...p, ...files]);
        e.target.value = "";
    };

    const handleRemoveUploadedFile = (index) => {
        setUploadedFiles((p) => p.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
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
                <form id="b2b-sales-quote-form" onSubmit={handleSubmit} className="mx-auto ml-2 pr-1 max-w-full pb-20" noValidate>
                    {serverError && (
                        <Alert severity="error" sx={{ mb: 1 }} onClose={onClearServerError}>
                            {serverError}
                        </Alert>
                    )}

                    {/* ── Header Fields ── */}
                    <div className="w-full">
                        <FormGrid cols={2} className="lg:grid-cols-4">
                            <DateField
                                name="quote_date"
                                label="Quote Date"
                                value={formData.quote_date}
                                onChange={handleChange}
                                required
                                error={!!errors.quote_date}
                                helperText={errors.quote_date}
                            />
                            <DateField
                                name="valid_till"
                                label="Valid Till"
                                value={formData.valid_till}
                                onChange={handleChange}
                                required
                                error={!!errors.valid_till}
                                helperText={errors.valid_till}
                                minDate={formData.quote_date || undefined}
                            />
                            <Select
                                name="client_id"
                                label="Client"
                                value={formData.client_id}
                                onChange={handleChange}
                                required
                                error={!!errors.client_id}
                                helperText={errors.client_id}
                            >
                                <MenuItem value="">-- Select Client --</MenuItem>
                                {clients.map((c) => (
                                    <MenuItem key={c.id} value={c.id}>
                                        {c.client_code} – {c.client_name}
                                    </MenuItem>
                                ))}
                            </Select>
                            <Select
                                name="ship_to_id"
                                label="Ship To"
                                value={formData.ship_to_id}
                                onChange={handleChange}
                                disabled={!formData.client_id}
                            >
                                <MenuItem value="">-- Select Ship-to (Optional) --</MenuItem>
                                {shipTos.map((s) => (
                                    <MenuItem key={s.id} value={s.id}>
                                        {s.ship_to_name || s.address || `Ship-to #${s.id}`}
                                    </MenuItem>
                                ))}
                            </Select>
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
                            <div className="md:col-span-2 lg:col-span-2">
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
                        <BillToShipToDisplay
                            billTo={clientDetails}
                            shipTo={shipTos.find((s) => Number(s.id) === Number(formData.ship_to_id)) || null}
                            className="mt-2"
                        />
                    </div>

                    {/* ── Items Section ── */}
                    <FormSection title="Items" className="mt-2" data-items-section>
                        {errors.items && (
                            <Alert severity="error" sx={{ mb: 1 }}>
                                {errors.items}
                            </Alert>
                        )}

                        {/* Add Item Input Row */}
                        <Paper sx={{ p: 1, mb: 1 }}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 items-end">
                                <div>
                                    <AutocompleteField
                                        asyncLoadOptions={async (q) => {
                                            const res = await productService.getProducts({ q, limit: 20 });
                                            const data = res?.result?.data ?? res?.data ?? [];
                                            return data.map((p) => ({
                                                id: p.id,
                                                label: `${p.product_code || p.id} – ${p.product_name || p.name}`,
                                                hsn_code: p.hsn_ssn_code || p.hsn_code || "",
                                                gst_percent: p.gst_percent ?? "",
                                            }));
                                        }}
                                        value={currentItem.product_id}
                                        onChange={(_, v) => {
                                            setCurrentItem((p) => ({
                                                ...p,
                                                product_id: v?.id ?? v ?? "",
                                                product_label: v?.label ?? "",
                                                hsn_code: v?.hsn_code || p.hsn_code,
                                                gst_percent: v?.gst_percent != null ? String(v.gst_percent) : p.gst_percent,
                                            }));
                                            if (itemErrors.product_id) setItemErrors((e) => { const n = { ...e }; delete n.product_id; return n; });
                                        }}
                                        placeholder="Search product *"
                                        getOptionLabel={(o) => o?.label ?? o?.product_name ?? String(o ?? "")}
                                        error={!!itemErrors.product_id}
                                        helperText={itemErrors.product_id}
                                        label="Product"
                                    />
                                </div>
                                <Input
                                    name="hsn_code"
                                    label="HSN Code"
                                    value={currentItem.hsn_code}
                                    onChange={handleCurrentItemChange}
                                />
                                <Input
                                    name="unit_rate"
                                    label="Rate"
                                    type="number"
                                    value={currentItem.unit_rate}
                                    onChange={handleCurrentItemChange}
                                    inputProps={{ min: 0, step: 0.01 }}
                                    error={!!itemErrors.unit_rate}
                                    helperText={itemErrors.unit_rate}
                                    required
                                />
                                <Input
                                    name="quantity"
                                    label="Quantity"
                                    type="number"
                                    value={currentItem.quantity}
                                    onChange={handleCurrentItemChange}
                                    inputProps={{ min: 1 }}
                                    error={!!itemErrors.quantity}
                                    helperText={itemErrors.quantity}
                                    required
                                />
                                <Input
                                    name="discount_percent"
                                    label="Disc %"
                                    type="number"
                                    value={currentItem.discount_percent}
                                    onChange={handleCurrentItemChange}
                                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                                />
                                <Input
                                    name="gst_percent"
                                    label="GST %"
                                    type="number"
                                    value={currentItem.gst_percent}
                                    onChange={handleCurrentItemChange}
                                    inputProps={{ min: 0, max: 100, step: 0.01 }}
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

                        {/* Items Table */}
                        {formData.items.length > 0 && (
                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>#</TableCell>
                                            <TableCell>Product</TableCell>
                                            <TableCell>HSN Code</TableCell>
                                            <TableCell align="right">Qty</TableCell>
                                            <TableCell align="right">Rate</TableCell>
                                            <TableCell align="right">Disc %</TableCell>
                                            <TableCell align="right">GST %</TableCell>
                                            <TableCell align="right">Taxable Amt</TableCell>
                                            <TableCell align="right">GST Amt</TableCell>
                                            <TableCell align="right">Total</TableCell>
                                            <TableCell>Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {formData.items.map((item, index) => {
                                            const qty = Number(item.quantity) || 0;
                                            const rate = Number(item.unit_rate) || 0;
                                            const disc = Number(item.discount_percent) || 0;
                                            const gst = Number(item.gst_percent) || 0;

                                            const lineValue = rate * qty;
                                            const discountAmt = (lineValue * disc) / 100;
                                            const taxable = lineValue - discountAmt;
                                            const gstAmt = (taxable * gst) / 100;
                                            const total = taxable + gstAmt;

                                            return (
                                                <TableRow key={index}>
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell>{item.product_label || `Product #${item.product_id}`}</TableCell>
                                                    <TableCell>{item.hsn_code || "–"}</TableCell>
                                                    <TableCell align="right">{qty}</TableCell>
                                                    <TableCell align="right">₹{rate.toFixed(2)}</TableCell>
                                                    <TableCell align="right">{disc > 0 ? `${disc}%` : "–"}</TableCell>
                                                    <TableCell align="right">{gst}%</TableCell>
                                                    <TableCell align="right">₹{taxable.toFixed(2)}</TableCell>
                                                    <TableCell align="right">₹{gstAmt.toFixed(2)}</TableCell>
                                                    <TableCell align="right">
                                                        <strong>₹{total.toFixed(2)}</strong>
                                                    </TableCell>
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
                                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                            <Typography variant="body2">Total Quantity:</Typography>
                                            <Typography variant="body2" fontWeight="bold">{totals.total_quantity}</Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                            <Typography variant="body2">Taxable Amount:</Typography>
                                            <Typography variant="body2" fontWeight="bold">₹{totals.taxable_amount.toFixed(2)}</Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                            <Typography variant="body2">Total GST Amount:</Typography>
                                            <Typography variant="body2" fontWeight="bold">₹{totals.total_gst_amount.toFixed(2)}</Typography>
                                        </Box>
                                        <Box sx={{ borderTop: "2px solid #000", pt: 1, mt: 0.5, display: "flex", justifyContent: "space-between" }}>
                                            <Typography variant="subtitle1" fontWeight="bold">Grand Total:</Typography>
                                            <Typography variant="subtitle1" fontWeight="bold">₹{totals.grand_total.toFixed(2)}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Paper>
                        )}
                    </FormSection>

                    {/* ── Attachments Section ── */}
                    <FormSection title="Attachments" className="mt-2">
                        <Paper sx={{ p: 1 }}>
                            <FormGrid cols={2} className="lg:grid-cols-4 mb-1">
                                <div className="md:col-span-2 lg:col-span-3">
                                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                        Attach supporting documents (PDF, Word, Excel, Images). Max file size 10 MB each.
                                    </Typography>
                                </div>
                                <div className="flex items-end md:col-span-2 lg:col-span-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={loading}
                                        startIcon={<CloudUploadIcon />}
                                        type="button"
                                        className="w-full"
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

                            {uploadedFiles.length > 0 ? (
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Files to Upload ({uploadedFiles.length}):
                                    </Typography>
                                    {uploadedFiles.map((file, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                                mb: 0.5,
                                                p: 0.75,
                                                bgcolor: "#f5f5f5",
                                                borderRadius: 1,
                                            }}
                                        >
                                            <AttachFileIcon fontSize="small" color="action" />
                                            <Typography variant="body2" sx={{ flex: 1 }}>
                                                {file.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatFileSize(file.size)}
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
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    No documents attached. Click &quot;Upload Documents&quot; to add files.
                                </Typography>
                            )}
                        </Paper>
                    </FormSection>
                </form>

            </FormContainer>

            {/* ── Sticky Action Bar pinned to viewport bottom ── */}
            <div className="sticky bottom-0 z-20 bg-background border-t shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-4 py-3 flex gap-3 justify-end mt-2">
                {onCancel && (
                    <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                )}
                <LoadingButton
                    type="submit"
                    form="b2b-sales-quote-form"
                    size="sm"
                    loading={loading}
                    className="min-w-[120px]"
                >
                    {defaultValues?.id ? "Update" : "Create"}
                </LoadingButton>
            </div>
        </Box>
    );
}
