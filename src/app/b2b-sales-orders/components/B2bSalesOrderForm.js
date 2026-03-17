"use client";

import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import AutocompleteField from "@/components/common/AutocompleteField";
import BillToShipToDisplay from "@/components/common/BillToShipToDisplay";
import LoadingButton from "@/components/common/LoadingButton";
import companyService from "@/services/companyService";
import b2bClientService from "@/services/b2bClientService";
import productService from "@/services/productService";
import { getReferenceOptionsSearch } from "@/services/mastersService";

const emptyCurrentItem = () => ({
  product_id: "",
  product_label: "",
  hsn_code: "",
  quantity: "",
  unit_rate: "",
  discount_percent: "",
  gst_percent: "",
  measurement_unit: "",
});

export default function B2bSalesOrderForm({
  defaultValues = {},
  fromQuoteId = null,
  onSubmit,
  loading,
  serverError = null,
  onClearServerError = () => { },
  onCancel = null,
}) {
  const today = new Date().toISOString().split("T")[0];

  const [plannedWarehouseId, setPlannedWarehouseId] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [errors, setErrors] = useState({});

  // Direct order form state
  const [formData, setFormData] = useState({
    order_date: today,
    client_id: "",
    ship_to_id: "",
    payment_terms: "",
    delivery_terms: "",
    order_remarks: "",
    terms_remarks: "Loading will be in buyer's scope.",
    freight_terms_id: "",
    payment_terms_id: "",
    delivery_schedule_id: "",
    items: [],
  });
  const [itemErrors, setItemErrors] = useState({});
  const [currentItem, setCurrentItem] = useState(emptyCurrentItem());
  const [clients, setClients] = useState([]);
  const [shipTos, setShipTos] = useState([]);
  const [clientDetails, setClientDetails] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    companyService
      .listWarehouses()
      .then((res) => {
        const r = res?.result ?? res;
        const data = r?.data ?? r ?? [];
        setWarehouses(Array.isArray(data) ? data : []);
      })
      .catch(() => setWarehouses([]));
  }, []);

  useEffect(() => {
    if (defaultValues?.planned_warehouse_id) {
      setPlannedWarehouseId(String(defaultValues.planned_warehouse_id));
    }
  }, [defaultValues?.planned_warehouse_id]);

  // Populate form for editing
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0 && !fromQuoteId) {
      setFormData({
        order_date: defaultValues.order_date || today,
        client_id: defaultValues.client_id || "",
        ship_to_id: defaultValues.ship_to_id || "",
        payment_terms: defaultValues.payment_terms || "",
        delivery_terms: defaultValues.delivery_terms || "",
        order_remarks: defaultValues.remarks || "",
        terms_remarks: defaultValues.terms_remarks ?? "Loading will be in buyer's scope.",
        freight_terms_id: defaultValues.freight_terms_id ?? "",
        payment_terms_id: defaultValues.payment_terms_id ?? "",
        delivery_schedule_id: defaultValues.delivery_schedule_id ?? "",
        items: (defaultValues.items || []).map(it => ({
          ...it,
          product_id: it.product_id,
          product_label: it.product?.product_name || it.product_label || `Product #${it.product_id}`,
          measurement_unit: it.measurement_unit || it.product?.measurement_unit_name || ""
        })),
        planned_warehouse_id: defaultValues.planned_warehouse_id || "",
      });

      if (defaultValues.planned_warehouse_id) {
        setPlannedWarehouseId(String(defaultValues.planned_warehouse_id));
      }

      if (defaultValues.client_id) {
        setLoadingOptions(true);
        b2bClientService
          .getB2bClientById(defaultValues.client_id)
          .then((res) => {
            const r = res?.result ?? res;
            setClientDetails(r ?? null);
          })
          .catch(() => setClientDetails(null))
          .finally(() => setLoadingOptions(false));

        b2bClientService
          .getB2bShipTos({ client_id: defaultValues.client_id })
          .then((res) => {
            const r = res?.result ?? res;
            setShipTos(r?.data ?? []);
          })
          .catch(() => setShipTos([]));
      }
    }
  }, [defaultValues, fromQuoteId]);

  // Load clients for direct order form
  useEffect(() => {
    if (fromQuoteId) return;
    b2bClientService
      .getB2bClients({ limit: 500, is_active: true })
      .then((res) => {
        const r = res?.result ?? res;
        setClients(r?.data ?? []);
      })
      .catch(() => { });
  }, [fromQuoteId]);

  // Load default Terms & Conditions masters for new orders (not from quote, not editing)
  useEffect(() => {
    if (fromQuoteId || defaultValues?.id) return;
    let cancelled = false;
    const loadDefaults = async () => {
      try {
        const [freightList, paymentList, deliveryList] = await Promise.all([
          getReferenceOptionsSearch("termsAndConditions.model", {
            limit: 1,
            type: "freight",
            is_active: "true",
            is_default: "true",
          }),
          getReferenceOptionsSearch("termsAndConditions.model", {
            limit: 1,
            type: "payment_terms",
            is_active: "true",
            is_default: "true",
          }),
          getReferenceOptionsSearch("termsAndConditions.model", {
            limit: 1,
            type: "delivery_schedule",
            is_active: "true",
            is_default: "true",
          }),
        ]);
        if (cancelled) return;
        const freight = Array.isArray(freightList) ? freightList[0] : null;
        const payment = Array.isArray(paymentList) ? paymentList[0] : null;
        const delivery = Array.isArray(deliveryList) ? deliveryList[0] : null;
        setFormData((prev) => ({
          ...prev,
          freight_terms_id: prev.freight_terms_id || (freight?.id ?? ""),
          payment_terms_id: prev.payment_terms_id || (payment?.id ?? ""),
          delivery_schedule_id: prev.delivery_schedule_id || (delivery?.id ?? ""),
        }));
      } catch {
        // Ignore defaults loading error; user can still select manually
      }
    };
    loadDefaults();
    return () => {
      cancelled = true;
    };
  }, [fromQuoteId, defaultValues?.id]);

  // Load ship-tos and client details when client changes (direct order); pre-select default or first
  useEffect(() => {
    if (fromQuoteId || !formData.client_id) {
      if (!formData.client_id) {
        setShipTos([]);
        setClientDetails(null);
      }
      return;
    }
    b2bClientService
      .getB2bShipTos({ client_id: formData.client_id })
      .then((res) => {
        const r = res?.result ?? res;
        const data = r?.data ?? [];
        setShipTos(data);
        // Only auto-select if not in edit mode OR if client has changed from initial
        const isInitialEditClient = defaultValues?.client_id && Number(formData.client_id) === Number(defaultValues.client_id);
        if (!isInitialEditClient) {
          const defaultShipTo = data.find((s) => s.is_default) || data[0];
          setFormData((p) => ({ ...p, ship_to_id: defaultShipTo?.id ?? "" }));
        }
      })
      .catch(() => setShipTos([]));
    b2bClientService
      .getB2bClientById(formData.client_id)
      .then((res) => {
        const r = res?.result ?? res;
        setClientDetails(r ?? null);
      })
      .catch(() => setClientDetails(null));
  }, [fromQuoteId, formData.client_id]);

  const handleQuoteSubmit = (e) => {
    e.preventDefault();
    if (serverError) onClearServerError();
    const e2 = {};
    if (fromQuoteId && !plannedWarehouseId) e2.planned_warehouse_id = "Planned warehouse is required";
    setErrors(e2);
    if (Object.keys(e2).length > 0) return;
    onSubmit({ planned_warehouse_id: parseInt(plannedWarehouseId, 10) });
  };

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
      const pid = typeof currentItem.product_id === "object" ? currentItem.product_id?.id : currentItem.product_id;
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
    const pid = typeof currentItem.product_id === "object" ? currentItem.product_id?.id : currentItem.product_id;
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
          measurement_unit: currentItem.measurement_unit || "",
        },
      ],
    }));
    setCurrentItem(emptyCurrentItem());
    setItemErrors({});
  };

  const handleRemoveItem = (index) => {
    setFormData((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }));
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

  const handleDirectOrderSubmit = (e) => {
    e.preventDefault();
    if (serverError) onClearServerError();
    const errs = {};
    if (!formData.client_id) errs.client_id = "Client is required";
    if (!formData.order_date) errs.order_date = "Order date is required";
    if (formData.items.length === 0) errs.items = "At least one item is required";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const payload = {
      order_date: formData.order_date,
      client_id: Number(formData.client_id),
      ship_to_id: formData.ship_to_id ? Number(formData.ship_to_id) : null,
      planned_warehouse_id: plannedWarehouseId ? parseInt(plannedWarehouseId, 10) : null,
      payment_terms: formData.payment_terms || null,
      delivery_terms: formData.delivery_terms || null,
      remarks: formData.order_remarks || null,
      terms_remarks: formData.terms_remarks || null,
       freight_terms_id: formData.freight_terms_id || null,
       payment_terms_master_id: formData.payment_terms_id || null,
       delivery_schedule_id: formData.delivery_schedule_id || null,
      items: formData.items.map((it) => ({
        product_id: typeof it.product_id === "object" ? it.product_id?.id : it.product_id,
        quantity: parseInt(it.quantity, 10) || 1,
        unit_rate: parseFloat(it.unit_rate) || 0,
        discount_percent: parseFloat(it.discount_percent) || 0,
        gst_percent: parseFloat(it.gst_percent) || 0,
        hsn_code: it.hsn_code || "",
      })),
    };
    onSubmit(payload);
  };

  if (fromQuoteId) {
    return (
      <FormContainer>
        <form onSubmit={handleQuoteSubmit} className="space-y-4">
          {serverError && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{serverError}</div>
          )}
          <p className="text-sm text-muted-foreground">
            Creating order from quote. Select the planned warehouse for fulfillment.
          </p>
          <AutocompleteField
            label="Planned Warehouse *"
            placeholder="Type to search..."
            options={warehouses}
            getOptionLabel={(w) => w?.name ?? String(w?.id ?? "")}
            value={warehouses.find((w) => w.id === parseInt(plannedWarehouseId)) || (plannedWarehouseId ? { id: parseInt(plannedWarehouseId) } : null)}
            onChange={(e, newValue) => setPlannedWarehouseId(newValue?.id ?? "")}
            error={!!errors.planned_warehouse_id}
            helperText={errors.planned_warehouse_id}
            required
          />
          <FormActions>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Order from Quote"}
            </Button>
          </FormActions>
        </form>
      </FormContainer>
    );
  }

  // Direct order form: loading
  if (loadingOptions) {
    return (
      <FormContainer>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
          <CircularProgress />
        </Box>
      </FormContainer>
    );
  }

  const totals = calculateTotals();

  return (
    <Box>
      <FormContainer>
        <form id="b2b-sales-order-form" onSubmit={handleDirectOrderSubmit} className="mx-auto ml-2 pr-1 max-w-full pb-20" noValidate>
          {serverError && (
            <Alert severity="error" sx={{ mb: 1 }} onClose={onClearServerError}>
              {serverError}
            </Alert>
          )}

          <div className="w-full">
            <Paper sx={{ p: 0.75, mb: 1, bgcolor: "#fafafa" }}>
              <FormGrid cols={6}>
                <DateField
                  name="order_date"
                  label="Order Date"
                  value={formData.order_date}
                  onChange={handleChange}
                  required
                  error={!!errors.order_date}
                  helperText={errors.order_date}
                  className="lg:col-span-1"
                />
                <div className="lg:col-span-2">
                  <AutocompleteField
                    label="Client *"
                    options={clients}
                    getOptionLabel={(c) => (c ? `${c.client_code ?? ""} – ${c.client_name ?? ""}`.trim() || String(c?.id ?? "") : "")}
                    value={clients.find((c) => c.id === parseInt(formData.client_id)) || (formData.client_id ? { id: formData.client_id } : null)}
                    onChange={(e, newValue) => handleChange({ target: { name: "client_id", value: newValue?.id ?? "" } })}
                    required
                    error={!!errors.client_id}
                    helperText={errors.client_id}
                  />
                </div>
                <div className="lg:col-span-2">
                  <AutocompleteField
                    label="Ship To"
                    options={shipTos}
                    getOptionLabel={(s) => s?.ship_to_name || s?.address || (s?.id ? `Ship-to #${s.id}` : "")}
                    value={shipTos.find((s) => s.id === parseInt(formData.ship_to_id)) || (formData.ship_to_id ? { id: formData.ship_to_id } : null)}
                    onChange={(e, newValue) => handleChange({ target: { name: "ship_to_id", value: newValue?.id ?? "" } })}
                    disabled={!formData.client_id}
                  />
                </div>
                <AutocompleteField
                  label="Warehouse"
                  options={warehouses}
                  getOptionLabel={(w) => w?.name ?? String(w?.id ?? "")}
                  value={
                    warehouses.find((w) => w.id === parseInt(plannedWarehouseId)) ||
                    (plannedWarehouseId ? { id: parseInt(plannedWarehouseId) } : null)
                  }
                  onChange={(e, newValue) => setPlannedWarehouseId(newValue?.id ?? "")}
                  className="lg:col-span-1"
                />

                {/* Second row of grid: Terms */}
                <div className="lg:col-span-2">
                  <AutocompleteField
                    name="freight_terms_id"
                    label="Freight"
                    asyncLoadOptions={(q) =>
                      getReferenceOptionsSearch("termsAndConditions.model", {
                        q,
                        limit: 20,
                        type: "freight",
                        is_active: "true",
                      })
                    }
                    referenceModel="termsAndConditions.model"
                    getOptionLabel={(o) => o?.title ?? o?.label ?? ""}
                    value={formData.freight_terms_id ? { id: formData.freight_terms_id } : null}
                    onChange={(_e, v) =>
                      handleChange({
                        target: { name: "freight_terms_id", value: v?.id ?? "" },
                      })
                    }
                  />
                </div>
                <div className="lg:col-span-2">
                  <AutocompleteField
                    name="payment_terms_id"
                    label="Payment terms"
                    asyncLoadOptions={(q) =>
                      getReferenceOptionsSearch("termsAndConditions.model", {
                        q,
                        limit: 20,
                        type: "payment_terms",
                        is_active: "true",
                      })
                    }
                    referenceModel="termsAndConditions.model"
                    getOptionLabel={(o) => o?.title ?? o?.label ?? ""}
                    value={formData.payment_terms_id ? { id: formData.payment_terms_id } : null}
                    onChange={(_e, v) =>
                      handleChange({
                        target: { name: "payment_terms_id", value: v?.id ?? "" },
                      })
                    }
                  />
                </div>
                <div className="lg:col-span-2">
                  <AutocompleteField
                    name="delivery_schedule_id"
                    label="Delivery Schedule"
                    asyncLoadOptions={(q) =>
                      getReferenceOptionsSearch("termsAndConditions.model", {
                        q,
                        limit: 20,
                        type: "delivery_schedule",
                        is_active: "true",
                      })
                    }
                    referenceModel="termsAndConditions.model"
                    getOptionLabel={(o) => o?.title ?? o?.label ?? ""}
                    value={formData.delivery_schedule_id ? { id: formData.delivery_schedule_id } : null}
                    onChange={(_e, v) =>
                      handleChange({
                        target: { name: "delivery_schedule_id", value: v?.id ?? "" },
                      })
                    }
                  />
                </div>

                {/* Third row of grid: Remarks */}
                <div className="lg:col-span-3">
                  <Input
                    name="terms_remarks"
                    label="T&C Remarks"
                    placeholder="Extra terms..."
                    value={formData.terms_remarks}
                    onChange={handleChange}
                    multiline
                    rows={2}
                  />
                </div>
                <div className="lg:col-span-3">
                  <Input
                    name="order_remarks"
                    label="Order Remarks"
                    placeholder="Internal notes/remarks"
                    value={formData.order_remarks}
                    onChange={handleChange}
                    multiline
                    rows={2}
                  />
                </div>
              </FormGrid>
            </Paper>

            {!fromQuoteId && clientDetails && (
              <BillToShipToDisplay
                billTo={clientDetails}
                shipTo={shipTos.find((s) => Number(s.id) === Number(formData.ship_to_id)) || null}
                className="mt-0.5 mb-1"
              />
            )}
          </div>

          <FormSection title="Items" className="mt-1" data-items-section>
            {errors.items && (
              <Alert severity="error" sx={{ mb: 1, py: 0 }}>
                {errors.items}
              </Alert>
            )}

            <Paper sx={{ p: 0.75, mb: 1 }}>
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
                        measurement_unit: p.measurement_unit_name || "",
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
                        measurement_unit: v?.measurement_unit || p.measurement_unit || "",
                      }));
                      if (itemErrors.product_id) setItemErrors((e) => { const n = { ...e }; delete n.product_id; return n; });
                    }}
                    placeholder="Search and select product"
                    getOptionLabel={(o) => o?.label ?? o?.product_name ?? String(o ?? "")}
                    error={!!itemErrors.product_id}
                    helperText={itemErrors.product_id}
                    label="Product"
                  />
                </div>
                <Input
                  name="hsn_code"
                  label="HSN Code"
                  placeholder="Enter HSN code"
                  value={currentItem.hsn_code}
                  onChange={handleCurrentItemChange}
                />
                <Input
                  name="quantity"
                  label={
                    currentItem.measurement_unit
                      ? `Quantity (${currentItem.measurement_unit})`
                      : "Quantity"
                  }
                  placeholder="Enter quantity"
                  type="number"
                  value={currentItem.quantity}
                  onChange={handleCurrentItemChange}
                  inputProps={{ min: 1 }}
                  error={!!itemErrors.quantity}
                  helperText={itemErrors.quantity}
                  required
                />
                <Input
                  name="unit_rate"
                  label="Rate (₹)"
                  placeholder="Enter rate"
                  type="number"
                  value={currentItem.unit_rate}
                  onChange={handleCurrentItemChange}
                  inputProps={{ min: 0, step: 0.01 }}
                  error={!!itemErrors.unit_rate}
                  helperText={itemErrors.unit_rate}
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
                    onClick={handleAddItem}
                    className="w-full lg:w-auto"
                  >
                    <AddIcon sx={{ fontSize: 18, mr: 0.5 }} /> Add
                  </Button>
                </div>
              </div>
            </Paper>

            {formData.items.length > 0 && (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell>HSN Code</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Rate (₹)</TableCell>
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
                          <TableCell align="right">{qty} {item.measurement_unit ? `(${item.measurement_unit})` : ""}</TableCell>
                          <TableCell align="right">₹{rate.toFixed(2)}</TableCell>
                          <TableCell align="right">{disc > 0 ? `${disc}%` : "–"}</TableCell>
                          <TableCell align="right">{gst}%</TableCell>
                          <TableCell align="right">₹{taxable.toFixed(2)}</TableCell>
                          <TableCell align="right">₹{gstAmt.toFixed(2)}</TableCell>
                          <TableCell align="right"><strong>₹{total.toFixed(2)}</strong></TableCell>
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
        </form>
      </FormContainer>

      <div className="sticky bottom-0 z-20 bg-background border-t shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-4 py-3 flex gap-3 justify-end mt-2">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <LoadingButton
          type="submit"
          form="b2b-sales-order-form"
          size="sm"
          loading={loading}
          className="min-w-[120px]"
        >
          {defaultValues?.id ? "Save Changes" : "Create Order"}
        </LoadingButton>
      </div>
    </Box>
  );
}
