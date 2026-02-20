"use client";

import { useState, useEffect, useRef } from "react";
import {
  Box,
  Grid,
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
  Chip,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import { toastError } from "@/utils/toast";
import { splitSerialInput } from "@/utils/serialInput";
import stockService from "@/services/stockService";
import companyService from "@/services/companyService";
import productService from "@/services/productService";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import { COMPACT_FORM_SPACING, COMPACT_SECTION_HEADER_STYLE, FORM_PADDING } from "@/utils/formConstants";

export default function StockTransferForm({
  defaultValues = {},
  onSubmit,
  loading,
  serverError = null,
  onClearServerError = () => {},
  onCancel = null,
}) {
  const [formData, setFormData] = useState({
    transfer_date: new Date().toISOString().split("T")[0],
    from_warehouse_id: "",
    to_warehouse_id: "",
    remarks: "",
    items: [],
  });

  const [errors, setErrors] = useState({});
  const [itemErrors, setItemErrors] = useState({});
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [availableStocks, setAvailableStocks] = useState({});
  const [availableSerials, setAvailableSerials] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingSerials, setLoadingSerials] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Current item being added
  const [currentItem, setCurrentItem] = useState({
    product_id: "",
    quantity: "",
    serials: [],
  });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [gunScanValue, setGunScanValue] = useState("");
  const gunScanRef = useRef(null);

  useEffect(() => {
    const loadWarehouses = async () => {
      setLoadingOptions(true);
      try {
        const warehousesRes = await companyService.listWarehouses();
        // API returns: { status: true, message: "...", result: [...] }
        // result is an array directly, not result.data
        let warehousesData = [];
        if (warehousesRes?.result) {
          warehousesData = Array.isArray(warehousesRes.result) ? warehousesRes.result : [];
        } else if (warehousesRes?.data) {
          warehousesData = Array.isArray(warehousesRes.data) ? warehousesRes.data : [];
        } else if (Array.isArray(warehousesRes)) {
          warehousesData = warehousesRes;
        }
        
        console.log("Loaded warehouses:", warehousesData); // Debug log
        setWarehouses(warehousesData);
      } catch (err) {
        console.error("Failed to load warehouses", err);
        setWarehouses([]);
      } finally {
        setLoadingOptions(false);
      }
    };
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      setFormData({
        transfer_date:
          defaultValues.transfer_date || new Date().toISOString().split("T")[0],
        from_warehouse_id: defaultValues.from_warehouse_id ? String(defaultValues.from_warehouse_id) : "",
        to_warehouse_id: defaultValues.to_warehouse_id ? String(defaultValues.to_warehouse_id) : "",
        remarks: defaultValues.remarks || "",
        items: defaultValues.items || [],
      });
      
      // Load available stocks for the from warehouse if editing
      // This will be handled by the useEffect for formData.from_warehouse_id
      // But we need to ensure it loads if defaultValues has warehouse_id
      if (defaultValues.from_warehouse_id) {
        const warehouseId = parseInt(defaultValues.from_warehouse_id);
        console.log("Loading stocks for default warehouse:", warehouseId); // Debug log
        loadAvailableStocks(warehouseId);
      }
    }
  }, [defaultValues]);

  useEffect(() => {
    if (formData.from_warehouse_id) {
      const warehouseId = parseInt(formData.from_warehouse_id);
      console.log("Warehouse changed, loading stocks for:", warehouseId); // Debug log
      if (!isNaN(warehouseId)) {
        loadAvailableStocks(warehouseId);
      }
      // Clear serials and products when warehouse changes
      setCurrentItem((prev) => ({
        ...prev,
        product_id: "",
        quantity: "",
        serials: [],
      }));
      setAvailableSerials([]);
    } else {
      // Clear products and stocks when warehouse is cleared
      setProducts([]);
      setAvailableStocks({});
    }
  }, [formData.from_warehouse_id]);

  useEffect(() => {
    const product = products.find((p) => p.id === parseInt(currentItem.product_id));
    const quantity = Number(currentItem.quantity) || 0;
    if (formData.from_warehouse_id && currentItem.product_id && quantity > 0 && product?.serial_required) {
      const t = setTimeout(() => gunScanRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [currentItem.product_id, currentItem.quantity, formData.from_warehouse_id, products]);

  const loadAvailableStocks = async (warehouseId) => {
    if (!warehouseId) {
      setAvailableStocks({});
      setProducts([]);
      return;
    }

    setLoadingProducts(true);
    try {
      console.log("Loading stocks for warehouse:", warehouseId); // Debug log
      const response = await stockService.getStocksByWarehouse(warehouseId);
      console.log("Stock API response:", response); // Debug log
      
      // API returns: { status: true, message: "...", result: [...] }
      // result is the array directly, not result.data
      const data = response?.result || response?.data || response || [];
      const stocksArray = Array.isArray(data) ? data : [];
      
      console.log("Parsed stocks array:", stocksArray); // Debug log
      
      const stockMap = {};
      const productMap = {}; // Use object to ensure uniqueness by product_id
      
      stocksArray.forEach((stock) => {
        if (stock && stock.product_id) {
          stockMap[stock.product_id] = stock;
          
          // Only include products with available stock > 0
          if (stock.quantity_available > 0 && stock.product) {
            // Use product_id as key to ensure uniqueness (no duplicates)
            if (!productMap[stock.product_id]) {
              productMap[stock.product_id] = {
                id: stock.product_id,
                product_name: stock.product.product_name || "",
                // tracking_type and serial_required come from Stock table, fallback to Product
                tracking_type: stock.tracking_type || stock.product.tracking_type || "LOT",
                serial_required: stock.serial_required !== undefined ? stock.serial_required : (stock.product.serial_required || false),
              };
            }
          }
        }
      });
      
      const uniqueProducts = Object.values(productMap);
      console.log("Extracted unique products:", uniqueProducts); // Debug log
      
      setAvailableStocks(stockMap);
      setProducts(uniqueProducts);
    } catch (err) {
      console.error("Failed to load available stocks", err);
      setAvailableStocks({});
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If from_warehouse_id changes, clear items and reset product selection
    if (name === "from_warehouse_id") {
      console.log("From Warehouse changed to:", value); // Debug log
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        items: [], // Clear items when warehouse changes
      }));
      setCurrentItem({
        product_id: "",
        quantity: "",
        serials: [],
      });
      // Products will be loaded by useEffect when formData.from_warehouse_id changes
      // No need to call loadAvailableStocks here as useEffect handles it
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

    // Clear serials when product or quantity changes
    if (name === "product_id" || name === "quantity") {
      setCurrentItem((prev) => ({
        ...prev,
        [name]: value,
        serials: [],
      }));
    }

    // Load available serials when product and warehouse are selected
    if (name === "product_id" && value && formData.from_warehouse_id) {
      const product = products.find((p) => p.id === parseInt(value));
      if (product && product.serial_required) {
        loadAvailableSerials(parseInt(value), parseInt(formData.from_warehouse_id));
      } else {
        setAvailableSerials([]);
      }
    }

    // Clear errors
    if (itemErrors[name]) {
      setItemErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const loadAvailableSerials = async (productId, warehouseId) => {
    if (!productId || !warehouseId) {
      setAvailableSerials([]);
      return;
    }

    setLoadingSerials(true);
    try {
      const response = await stockService.getAvailableSerials(productId, warehouseId);
      const serials = response?.result || response?.data || response || [];
      setAvailableSerials(Array.isArray(serials) ? serials : []);
    } catch (err) {
      console.error("Failed to load available serials", err);
      setAvailableSerials([]);
    } finally {
      setLoadingSerials(false);
    }
  };

  const handleSerialSelection = (selectedSerials) => {
    setCurrentItem((prev) => ({
      ...prev,
      serials: selectedSerials.map((s) => ({
        stock_serial_id: s.id,
        serial_number: s.serial_number,
      })),
    }));
  };

  const handleScanResult = (value) => {
    const tokens = splitSerialInput(value || "");
    if (!tokens.length) return;

    const productId = parseInt(currentItem.product_id, 10);
    const stock = productId ? availableStocks[productId] : null;
    const maxAllowed = stock && stock.quantity_available != null ? Number(stock.quantity_available) : 0;

    if (!productId || !maxAllowed) {
      toastError("Select a product with available stock first.");
      return;
    }

    if (tokens.length > maxAllowed) {
      toastError(`Too many serials (${tokens.length}). Cannot exceed available quantity (${maxAllowed}).`);
      return;
    }

    const existingIds = new Set((currentItem.serials || []).map((s) => s.stock_serial_id));
    const existingSerialsLower = new Set(
      (currentItem.serials || []).map((s) => (s.serial_number || "").trim().toLowerCase())
    );
    const toAdd = [];
    const notFound = [];

    for (const token of tokens) {
      const key = token.trim().toLowerCase();
      if (existingSerialsLower.has(key)) continue;
      const match = availableSerials.find(
        (s) => (s.serial_number || "").trim().toLowerCase() === key
      );
      if (match) {
        if (!existingIds.has(match.id)) {
          toAdd.push({ stock_serial_id: match.id, serial_number: match.serial_number });
          existingIds.add(match.id);
          existingSerialsLower.add(key);
        }
      } else {
        notFound.push(token);
      }
    }

    if (notFound.length) {
      toastError(
        `Serial(s) not found in this warehouse: ${notFound.slice(0, 3).join(", ")}${notFound.length > 3 ? "…" : ""}`
      );
      return;
    }

    if (toAdd.length === 0) {
      toastError("All serials already selected.");
      return;
    }

    const newSerials = [...(currentItem.serials || []), ...toAdd];
    const newQty = Number(currentItem.quantity) || 0;
    const suggestedQty = Math.max(newQty, newSerials.length);
    const cappedQty = Math.min(suggestedQty, maxAllowed);

    setCurrentItem((prev) => ({
      ...prev,
      quantity: prev.quantity ? String(cappedQty) : String(cappedQty),
      serials: newSerials,
    }));

    if (newSerials.length >= cappedQty) setScannerOpen(false);
  };

  const handleGunScanKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if ((gunScanValue || "").trim()) {
        handleScanResult(gunScanValue);
        setGunScanValue("");
      }
      gunScanRef.current?.focus();
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const validationErrors = {};
    if (!currentItem.product_id) {
      validationErrors.product_id = "Product is required";
    }
    if (!currentItem.quantity || Number(currentItem.quantity) <= 0) {
      validationErrors.quantity = "Quantity must be greater than 0";
    }

    const product = products.find(
      (p) => p.id === parseInt(currentItem.product_id)
    );
    const stock = availableStocks[parseInt(currentItem.product_id)];

    if (stock && Number(currentItem.quantity) > stock.quantity_available) {
      validationErrors.quantity = `Available quantity is only ${stock.quantity_available}`;
    }

    if (product && product.serial_required) {
      const serialCount = (currentItem.serials || []).length;
      const quantity = Number(currentItem.quantity);
      if (serialCount !== quantity) {
        validationErrors.serials = `Exactly ${quantity} serial number${quantity > 1 ? "s" : ""} required (selected: ${serialCount})`;
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setItemErrors(validationErrors);
      return;
    }

    const newItem = {
      product_id: parseInt(currentItem.product_id),
      transfer_quantity: parseInt(currentItem.quantity),
      quantity: parseInt(currentItem.quantity), // Keep for backward compatibility
      serials: currentItem.serials || [],
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setCurrentItem({
      product_id: "",
      quantity: "",
      serials: [],
    });
    setGunScanValue("");
    setItemErrors({});
    setAvailableSerials([]);
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
    
    // Required field validations
    if (!formData.from_warehouse_id) {
      validationErrors.from_warehouse_id = "From Warehouse is required";
    }
    if (!formData.to_warehouse_id) {
      validationErrors.to_warehouse_id = "To Warehouse is required";
    }
    if (formData.from_warehouse_id === formData.to_warehouse_id) {
      validationErrors.to_warehouse_id = "From and To warehouses must be different";
    }
    if (!formData.transfer_date) {
      validationErrors.transfer_date = "Transfer Date is required";
    } else {
      // Validate date is not in future
      const transferDate = new Date(formData.transfer_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (transferDate > today) {
        validationErrors.transfer_date = "Transfer Date cannot be in the future";
      }
    }

    // Items validation
    if (formData.items.length === 0) {
      validationErrors.items = "At least one item is required";
    } else {
      // Validate each item
      formData.items.forEach((item, index) => {
        const product = products.find((p) => p.id === item.product_id);
        const stock = availableStocks[item.product_id];
        const quantity = item.transfer_quantity || item.quantity;

        if (!item.product_id) {
          validationErrors[`item_${index}_product`] = "Product is required";
        }
        if (!quantity || quantity <= 0) {
          validationErrors[`item_${index}_quantity`] = "Quantity must be greater than 0";
        } else if (stock && quantity > stock.quantity_available) {
          validationErrors[`item_${index}_quantity`] = `Available quantity is only ${stock.quantity_available}`;
        }

        // Serial validation for SERIAL products
        if (product && product.serial_required) {
          const serialCount = (item.serials || []).length;
          if (serialCount !== quantity) {
            validationErrors[`item_${index}_serials`] = `Exactly ${quantity} serial number${quantity > 1 ? "s" : ""} required (selected: ${serialCount})`;
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

    const payload = {
      ...formData,
      from_warehouse_id: parseInt(formData.from_warehouse_id),
      to_warehouse_id: parseInt(formData.to_warehouse_id),
      items: formData.items.map((item) => ({
        product_id: item.product_id,
        transfer_quantity: parseInt(item.transfer_quantity || item.quantity),
        serials: item.serials || [],
      })),
    };

    onSubmit(payload);
  };

  if (loadingOptions) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 200,
        }}
      >
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

        <Grid container spacing={COMPACT_FORM_SPACING}>
          <Grid item size={{ xs: 12, md: 4 }}>
            <DateField
              name="transfer_date"
              label="Transfer Date"
              value={formData.transfer_date}
              onChange={handleChange}
              required
              error={!!errors.transfer_date}
              helperText={errors.transfer_date}
              maxDate={new Date().toISOString().split("T")[0]}
            />
          </Grid>

          <Grid item size={{ xs: 12, md: 4 }}>
            <AutocompleteField
              label="From Warehouse *"
              placeholder="Type to search..."
              options={warehouses}
              getOptionLabel={(w) => w?.name ?? String(w?.id ?? "")}
              value={warehouses.find((w) => w.id === parseInt(formData.from_warehouse_id)) || (formData.from_warehouse_id ? { id: parseInt(formData.from_warehouse_id) } : null)}
              onChange={(e, newValue) => handleChange({ target: { name: "from_warehouse_id", value: newValue?.id ?? "" } })}
              required
              error={!!errors.from_warehouse_id}
              helperText={errors.from_warehouse_id || (loadingOptions ? "Loading warehouses..." : warehouses.length === 0 ? "No warehouses available" : "")}
              disabled={!!(defaultValues && defaultValues.id && defaultValues.status !== "DRAFT") || loadingOptions}
            />
          </Grid>

          <Grid item size={{ xs: 12, md: 4 }}>
            <AutocompleteField
              label="To Warehouse *"
              placeholder="Type to search..."
              options={warehouses}
              getOptionLabel={(w) => w?.name ?? String(w?.id ?? "")}
              value={warehouses.find((w) => w.id === parseInt(formData.to_warehouse_id)) || (formData.to_warehouse_id ? { id: parseInt(formData.to_warehouse_id) } : null)}
              onChange={(e, newValue) => handleChange({ target: { name: "to_warehouse_id", value: newValue?.id ?? "" } })}
              required
              error={!!errors.to_warehouse_id}
              helperText={errors.to_warehouse_id || (loadingOptions ? "Loading warehouses..." : warehouses.length === 0 ? "No warehouses available" : "")}
              disabled={!!(defaultValues && defaultValues.id && defaultValues.status !== "DRAFT") || loadingOptions}
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

          <Grid item size={12} data-items-section>
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
              <Grid container spacing={COMPACT_FORM_SPACING} alignItems="flex-start">
                <Grid item size={{ xs: 12, md: 3 }}>
                  <AutocompleteField
                    label="Product"
                    placeholder="Type to search..."
                    options={products}
                    getOptionLabel={(p) => {
                      if (!p) return "";
                      const stock = availableStocks[p.id];
                      return `${p.product_name ?? ""} (Available: ${stock?.quantity_available ?? 0})${p.serial_required ? " [Serial]" : ""}`;
                    }}
                    value={products.find((p) => p.id === parseInt(currentItem.product_id)) || (currentItem.product_id ? { id: parseInt(currentItem.product_id) } : null)}
                    onChange={(e, newValue) => handleItemChange({ target: { name: "product_id", value: newValue?.id ?? "" } })}
                    error={!!itemErrors.product_id}
                    helperText={
                      itemErrors.product_id ||
                      (!formData.from_warehouse_id
                        ? "Please select From Warehouse first"
                        : loadingProducts
                        ? "Loading products..."
                        : products.length === 0
                        ? "No products available in this warehouse"
                        : `${products.length} product${products.length !== 1 ? "s" : ""} available`)
                    }
                    disabled={!formData.from_warehouse_id || loadingProducts}
                  />
                </Grid>

                <Grid item size={{ xs: 12, md: 2 }}>
                  <Input
                    fullWidth
                    name="quantity"
                    label="Quantity"
                    type="number"
                    value={currentItem.quantity}
                    onChange={handleItemChange}
                    inputProps={{ min: 1 }}
                    error={!!itemErrors.quantity}
                    helperText={itemErrors.quantity}
                  />
                </Grid>

                {/* Serial Selection for SERIAL products */}
                {currentItem.product_id && (() => {
                  const product = products.find((p) => p.id === parseInt(currentItem.product_id));
                  const isSerial = product && product.serial_required;
                  const quantity = Number(currentItem.quantity) || 0;
                  
                  return isSerial && formData.from_warehouse_id && quantity > 0 ? (
                    <>
                      <Grid item size={{ xs: 12, md: 5 }}>
                        <Autocomplete
                          multiple
                          options={availableSerials}
                          getOptionLabel={(option) => option.serial_number || ""}
                          value={availableSerials.filter((s) =>
                            currentItem.serials.some((sel) => sel.stock_serial_id === s.id)
                          )}
                          onChange={(e, newValue) => {
                            handleSerialSelection(newValue);
                          }}
                          loading={loadingSerials}
                          disabled={loadingSerials || !formData.from_warehouse_id}
                          renderInput={(params) => (
                            <Input
                              {...params}
                              label={`Select ${quantity} Serial${quantity > 1 ? "s" : ""}`}
                              error={!!itemErrors.serials}
                              helperText={itemErrors.serials || `${currentItem.serials.length} / ${quantity} selected`}
                              placeholder={loadingSerials ? "Loading serials..." : "Select serial numbers"}
                            />
                          )}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                {...getTagProps({ index })}
                                key={option.id}
                                label={option.serial_number}
                                size="small"
                              />
                            ))
                          }
                          limitTags={3}
                        />
                      </Grid>
                      <Grid item size={{ xs: 12, md: "auto" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1.5 min-h-[36px] touch-manipulation"
                            disabled={loadingSerials || !formData.from_warehouse_id || !currentItem.quantity}
                            onClick={() => setScannerOpen(true)}
                          >
                            <QrCodeScannerIcon sx={{ fontSize: 18 }} />
                            Scan Barcode
                          </Button>
                          <Typography variant="caption" color="text.secondary">
                            {currentItem.serials.length} / {quantity} scanned
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item size={{ xs: 12, md: 4 }}>
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
                          helperText="Point scanner here; it will type and press Enter."
                        />
                      </Grid>
                    </>
                  ) : null;
                })()}

                <Grid item size={{ xs: 12, md: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddItem}
                    fullWidth
                    type="button"
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
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell>Serials</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.items.map((item, index) => {
                      const product = products.find(
                        (p) => p.id === item.product_id
                      );
                      const quantity = item.transfer_quantity || item.quantity;
                      const serials = item.serials || [];
                      const isSerial = product && product.serial_required;
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {product?.product_name || "-"}
                              </Typography>
                              {isSerial && (
                                <Chip
                                  label="SERIAL"
                                  size="small"
                                  color="primary"
                                  sx={{ mt: 0.5 }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: "bold" }}>
                            {quantity}
                          </TableCell>
                          <TableCell>
                            {isSerial && serials.length > 0 ? (
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                {serials.slice(0, 3).map((serial, idx) => (
                                  <Chip
                                    key={idx}
                                    label={serial.serial_number || serial.stockSerial?.serial_number || "-"}
                                    size="small"
                                    variant="outlined"
                                  />
                                ))}
                                {serials.length > 3 && (
                                  <Typography variant="caption" color="text.secondary">
                                    +{serials.length - 3} more
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">N/A</Typography>
                            )}
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
          </Grid>

          <Grid item size={12}>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: "flex-end",
                mt: 2,
              }}
            />
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
            {defaultValues?.id ? "Update" : "Create"}
          </LoadingButton>
        </FormActions>
      </FormContainer>

      <BarcodeScanner
        open={scannerOpen}
        onScan={handleScanResult}
        onClose={() => setScannerOpen(false)}
        hint={
          currentItem.serials.length > 0
            ? `Scanned ${currentItem.serials.length} of ${Number(currentItem.quantity) || 0}`
            : ""
        }
      />
    </Box>
  );
}
