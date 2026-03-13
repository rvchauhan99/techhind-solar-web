"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormHelperText,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tooltip,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ClearIcon from "@mui/icons-material/Clear";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InventoryIcon from "@mui/icons-material/Inventory";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import { toastError, toastSuccess } from "@/utils/toast";
import { splitSerialInput, fillSerialSlots } from "@/utils/serialInput";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import FormGrid from "@/components/common/FormGrid";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import purchaseReturnService from "@/services/purchaseReturnService";
import poInwardService from "@/services/poInwardService";
import companyService from "@/services/companyService";
import { getReferenceOptionsSearch } from "@/services/mastersService";

const isSerialItem = (item) => {
  if (!item) return false;
  const t = item.tracking_type ? item.tracking_type.toUpperCase() : "LOT";
  return t === "SERIAL" || item.serial_required === true;
};

function SerialEntryDialog({
  open,
  item,
  initialSerials = [],
  onDone,
  onClose,
  onValidateSerials,
  purchaseReturnId = null,
  warehouseId = null,
}) {
  const acceptedQty = item ? parseInt(item.return_quantity || 0, 10) || 0 : 0;
  const productName = item?.product_name || "Item";
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState("");
  const [slotErrors, setSlotErrors] = useState({});
  const [validating, setValidating] = useState(false);
  const [gunValue, setGunValue] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const gunRef = useRef(null);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!open) return;
    const existing = (initialSerials || []).map((s) =>
      (typeof s === "string" ? s : s?.serial_number ?? "").trim()
    );
    const padded = Array.from({ length: acceptedQty }, (_, i) => existing[i] ?? "");
    setSlots(padded);
    setError("");
    setSlotErrors({});
    setGunValue("");
    inputRefs.current = [];
    setTimeout(() => gunRef.current?.focus(), 150);
  }, [open, acceptedQty, initialSerials]);

  const handleValueChange = useCallback((index, value) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setError("");
    setSlotErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, []);

  const handleBulkOrSingle = useCallback(
    (index, value) => {
      const tokens = splitSerialInput(value);
      if (tokens.length <= 1) {
        handleValueChange(index, value);
        return;
      }
      setSlotErrors({});
      if (tokens.length > acceptedQty) {
        setError(
          `Too many serials (${tokens.length}). Cannot exceed return quantity (${acceptedQty}).`
        );
        return;
      }
      setSlots((prev) => {
        const existingLower = new Set(
          prev
            .map((v) => (v || "").trim().toLowerCase())
            .filter(Boolean)
        );
        const uniqueNew = tokens.filter(
          (t) => !existingLower.has(t.trim().toLowerCase())
        );
        if (uniqueNew.length === 0) {
          setError("All serials already entered.");
          return prev;
        }
        const { nextSlots, overflow, duplicates } = fillSerialSlots({
          slots: prev,
          startIndex: index,
          incoming: uniqueNew,
          caseInsensitive: true,
        });
        if (duplicates.length) {
          setError(
            `Duplicate serial(s) ignored: ${duplicates
              .slice(0, 3)
              .join(", ")}${duplicates.length > 3 ? "…" : ""}`
          );
        }
        if (overflow.length) {
          setError(
            `Cannot add ${overflow.length} serial(s): quantity limit reached.`
          );
          return prev;
        }
        return nextSlots;
      });
    },
    [acceptedQty, handleValueChange]
  );

  const handleKeyDown = useCallback(
    (index, e) => {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (index < slots.length - 1) {
          inputRefs.current[index + 1]?.focus();
        } else {
          handleDone();
        }
      }
    },
    [slots.length]
  );

  const handleGunKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const trimmed = (gunValue || "").trim();
        if (!trimmed) return;
        const firstEmpty = slots.findIndex((v) => !(v || "").trim());
        const idx = firstEmpty !== -1 ? firstEmpty : 0;
        handleBulkOrSingle(idx, trimmed);
        setGunValue("");
        gunRef.current?.focus();
      }
    },
    [gunValue, slots, handleBulkOrSingle]
  );

  const handleScanResult = useCallback(
    (value) => {
      const tokens = splitSerialInput(value || "");
      if (!tokens.length) return;
      setProcessing(true);
      setTimeout(() => {
        try {
          if (tokens.length > acceptedQty) {
            toastError(
              `Too many serials (${tokens.length}). Max for this return: ${acceptedQty}.`
            );
            return;
          }
          setSlots((prev) => {
            const existingLower = new Set(
              prev
                .map((v) => (v || "").trim().toLowerCase())
                .filter(Boolean)
            );
            const uniqueNew = tokens.filter(
              (t) => !existingLower.has(t.trim().toLowerCase())
            );
            if (!uniqueNew.length) {
              toastError("All serials already entered.");
              return prev;
            }
            const { nextSlots, overflow } = fillSerialSlots({
              slots: prev,
              startIndex: 0,
              incoming: uniqueNew,
              caseInsensitive: true,
            });
            if (overflow.length) {
              toastError(`${overflow.length} serial(s) exceed quantity limit.`);
            }
            return nextSlots;
          });
          setScannerOpen(false);
        } finally {
          setProcessing(false);
        }
      }, 120);
    },
    [acceptedQty]
  );

  const handleDone = async () => {
    const trimmed = slots.map((s) => String(s || "").trim());
    const emptyIdx = trimmed.findIndex((s) => !s);
    if (emptyIdx !== -1) {
      setError("Please fill all serial numbers.");
      inputRefs.current[emptyIdx]?.focus();
      return;
    }
    const unique = new Set(trimmed);
    if (unique.size !== trimmed.length) {
      setError("Duplicate serial numbers are not allowed.");
      return;
    }

    if (!onValidateSerials || !item?.product_id || !warehouseId) {
      onDone(trimmed);
      return;
    }

    setValidating(true);
    setError("");
    setSlotErrors({});
    try {
      const result = await onValidateSerials({
        product_id: item.product_id,
        serial_numbers: trimmed,
        warehouse_id: warehouseId,
        purchase_return_id: purchaseReturnId ?? undefined,
      });
      if (result?.valid === true) {
        onDone(trimmed);
        return;
      }
      if (result?.invalid_serials?.length) {
        const invalidSet = new Set(
          result.invalid_serials.map((x) => (x.serial_number || "").trim())
        );
        const message =
          result.invalid_serials[0]?.message || "Serial not valid for return.";
        const nextSlotErrors = {};
        trimmed.forEach((sn, idx) => {
          if (invalidSet.has(sn)) nextSlotErrors[idx] = message;
        });
        setSlotErrors(nextSlotErrors);
        setError("Some serials are not available for return.");
        return;
      }
      onDone(trimmed);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Validation failed. Please try again."
      );
    } finally {
      setValidating(false);
    }
  };

  const filledCount = slots.filter((v) => (v || "").trim()).length;
  const isComplete = filledCount === acceptedQty && acceptedQty > 0;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <QrCodeScannerIcon color="primary" sx={{ fontSize: 22 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                Return Serial Entry
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {productName}
              </Typography>
            </Box>
            <Chip
              label={`${filledCount} / ${acceptedQty}`}
              size="small"
              color={isComplete ? "success" : "default"}
              icon={isComplete ? <CheckCircleIcon /> : undefined}
            />
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 1, pb: 1 }}>
          {processing && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                mb: 1.5,
                borderRadius: 1,
                bgcolor: "primary.50",
                border: 1,
                borderColor: "primary.200",
              }}
            >
              <CircularProgress size={18} />
              <Typography
                variant="body2"
                color="primary.main"
                fontWeight={500}
              >
                Processing scan, settling serial numbers…
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              mb: 1.5,
              p: 1.5,
              bgcolor: "action.hover",
              borderRadius: 1.5,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 0.75, display: "block", fontWeight: 600 }}
            >
              🔫 SCANNER GUN INPUT
            </Typography>
            <TextField
              inputRef={gunRef}
              size="small"
              fullWidth
              placeholder="Point scanner gun here, then scan…"
              value={gunValue}
              onChange={(e) => setGunValue(e.target.value)}
              onKeyDown={handleGunKeyDown}
              variant="outlined"
              autoComplete="off"
              helperText="Scanner types here, then auto-submits on Enter."
            />
          </Box>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full mb-3 flex items-center justify-center gap-2"
            onClick={() => setScannerOpen(true)}
          >
            <QrCodeScannerIcon sx={{ fontSize: 18 }} />
            Scan with Camera
          </Button>

          <Divider sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              or type manually
            </Typography>
          </Divider>

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 1.5 }}
              onClose={() => setError("")}
            >
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, mb: 1 }}>
            {slots.map((value, idx) => (
              <TextField
                key={idx}
                size="small"
                sx={{ minWidth: 180, flex: "1 1 180px" }}
                label={`Serial ${idx + 1} of ${acceptedQty}`}
                value={value}
                onChange={(e) => handleBulkOrSingle(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                inputRef={(el) => {
                  inputRefs.current[idx] = el;
                }}
                variant="outlined"
                autoComplete="off"
                error={!!slotErrors[idx]}
                helperText={slotErrors[idx] || ""}
                InputProps={{
                  endAdornment: (value || "").trim() ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      tabIndex={-1}
                      onClick={() => handleValueChange(idx, "")}
                    >
                      <ClearIcon fontSize="small" />
                    </Button>
                  ) : null,
                }}
              />
            ))}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex-1"
            disabled={validating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDone}
            disabled={processing || validating}
            className={`flex-1 ${
              isComplete ? "bg-green-600 hover:bg-green-700" : ""
            }`}
          >
            {validating ? (
              <>
                <CircularProgress size={16} sx={{ mr: 0.5 }} />
                Validating…
              </>
            ) : isComplete ? (
              <>
                <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5 }} />
                Save Serials
              </>
            ) : (
              "Save Serials"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        onScan={handleScanResult}
        onClose={() => setScannerOpen(false)}
      />
    </>
  );
}

export default function PurchaseReturnForm({
  defaultValues = {},
  onSubmit,
  loading,
  serverError = null,
  onClearServerError = () => {},
  onCancel = null,
}) {
  const [returnAgainstMode, setReturnAgainstMode] = useState("inward");
  const [formData, setFormData] = useState({
    po_inward_id: "",
    purchase_order_id: "",
    warehouse_id: "",
    supplier_return_ref: "",
    supplier_return_date: "",
    return_date: new Date().toISOString().split("T")[0],
    reason_id: "",
    reason_text: "",
    remarks: "",
    items: [],
  });

  const [errors, setErrors] = useState({});
  const [selectedInward, setSelectedInward] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [poInwardLoading, setPoInwardLoading] = useState(false);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [serialDialogIndex, setSerialDialogIndex] = useState(null);

  useEffect(() => {
    companyService.listWarehouses().then((res) => {
      const data = res?.result || res?.data || res;
      setWarehouses(Array.isArray(data) ? data : []);
    }).catch(() => setWarehouses([]));
  }, []);

  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      const hasInward = defaultValues.po_inward_id != null && defaultValues.po_inward_id !== "";
      setReturnAgainstMode(hasInward ? "inward" : "po");
      setFormData({
        po_inward_id: defaultValues.po_inward_id || "",
        purchase_order_id: defaultValues.purchase_order_id ?? "",
        warehouse_id: defaultValues.warehouse_id || "",
        supplier_return_ref: defaultValues.supplier_return_ref || "",
        supplier_return_date: defaultValues.supplier_return_date || "",
        return_date:
          defaultValues.return_date ||
          new Date().toISOString().split("T")[0],
        reason_id: defaultValues.reason_id ?? "",
        reason_text: defaultValues.reason_text || "",
        remarks: defaultValues.remarks || "",
        items: defaultValues.items || [],
      });
      if (defaultValues.po_inward_id) {
        loadPOInward(defaultValues.po_inward_id, defaultValues.items || []);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues]);

  const loadPOInward = async (inwardId, existingItems = []) => {
    setPoInwardLoading(true);
    try {
      const response = await poInwardService.getPOInwardById(inwardId);
      const result = response.result || response;
      setSelectedInward(result);

      if (result.items && result.items.length > 0) {
        const items = result.items.map((it) => {
          const accepted = it.accepted_quantity || 0;
          const alreadyReturned = it.purchaseReturnItems
            ? it.purchaseReturnItems.reduce(
                (sum, r) => sum + (r.return_quantity || 0),
                0
              )
            : 0;
          const eligible = Math.max(0, accepted - alreadyReturned);
          const existing = existingItems.find(
            (e) => e.po_inward_item_id === it.id
          );
          return {
            po_inward_item_id: it.id,
            purchase_order_item_id: it.purchaseOrderItem?.id || it.purchase_order_item_id,
            product_id: it.product_id,
            product_name: it.product?.product_name || "",
            tracking_type: it.tracking_type || it.product?.tracking_type || "LOT",
            serial_required: it.serial_required || it.product?.serial_required || false,
            inward_accepted_quantity: accepted,
            already_returned_quantity:
              existing?.already_returned_quantity ?? alreadyReturned,
            eligible_quantity: eligible,
            return_quantity: existing?.return_quantity || 0,
            rate: existing?.rate || it.rate,
            gst_percent: existing?.gst_percent || it.gst_percent,
            serials: existing?.serials || [],
          };
        });
        setFormData((prev) => ({
          ...prev,
          warehouse_id: result.warehouse_id || prev.warehouse_id,
          items,
        }));
      }
    } catch (err) {
      console.error("Failed to load PO Inward", err);
      setSelectedInward(null);
      setFormData((prev) => ({ ...prev, items: [] }));
    } finally {
      setPoInwardLoading(false);
    }
  };

  const loadPOEligibility = async (purchaseOrderId, warehouseId, existingItems = []) => {
    if (!purchaseOrderId || !warehouseId) return;
    setPoInwardLoading(true);
    try {
      const result = await purchaseReturnService.getPOEligibilityForReturn(purchaseOrderId, warehouseId);
      const data = result?.result || result;
      if (!data || !data.items || data.items.length === 0) {
        setFormData((prev) => ({ ...prev, items: [] }));
        return;
      }
      const items = data.items.map((it) => {
        const existing = existingItems.find((e) => e.po_inward_item_id === it.po_inward_item_id);
        return {
          po_inward_item_id: it.po_inward_item_id,
          purchase_order_item_id: it.purchase_order_item_id,
          product_id: it.product_id,
          product_name: it.product_name || "",
          tracking_type: it.tracking_type || "LOT",
          serial_required: it.serial_required || false,
          inward_accepted_quantity: it.inward_accepted_quantity ?? 0,
          already_returned_quantity: it.already_returned_quantity ?? 0,
          eligible_quantity: it.eligible_quantity ?? 0,
          return_quantity: existing?.return_quantity || 0,
          rate: existing?.rate ?? it.rate,
          gst_percent: existing?.gst_percent ?? it.gst_percent,
          serials: existing?.serials || [],
          eligible_serials: it.eligible_serials || [],
        };
      });
      setFormData((prev) => ({
        ...prev,
        items,
      }));
    } catch (err) {
      console.error("Failed to load PO eligibility", err);
      setFormData((prev) => ({ ...prev, items: [] }));
    } finally {
      setPoInwardLoading(false);
    }
  };

  const handleAutoFillReverseReturn = async () => {
    const poInwardId = formData.po_inward_id;
    if (!poInwardId || returnAgainstMode !== "inward" || !formData.items?.length) return;
    setAutoFillLoading(true);
    try {
      const result = await purchaseReturnService.getInwardEligibilityForReturn(poInwardId);
      const data = result?.result ?? result;
      if (!data?.items?.length) {
        toastError("No eligibility data returned for this inward.");
        return;
      }
      const byInwardItemId = {};
      (data.items || []).forEach((it) => {
        byInwardItemId[it.po_inward_item_id] = it;
      });
      let filled = 0;
      let skipped = 0;
      const items = formData.items.map((item) => {
        const elig = byInwardItemId[item.po_inward_item_id];
        if (!elig) {
          skipped += 1;
          return { ...item, return_quantity: 0, serials: item.serials || [] };
        }
        const maxQty = elig.max_returnable_now ?? 0;
        if (maxQty <= 0) {
          skipped += 1;
          return { ...item, return_quantity: 0, serials: [] };
        }
        filled += 1;
        const serialRequired = elig.serial_required && (elig.eligible_serials?.length > 0);
        const serials = serialRequired
          ? (elig.eligible_serials || []).slice(0, maxQty)
          : (item.serials || []);
        return {
          ...item,
          return_quantity: maxQty,
          serials,
        };
      });
      setFormData((prev) => ({ ...prev, items }));
      if (skipped > 0) {
        toastSuccess(`${filled} line(s) auto-filled; ${skipped} line(s) skipped (no available stock).`);
      } else {
        toastSuccess(`${filled} line(s) auto-filled.`);
      }
    } catch (err) {
      console.error("Auto-fill reverse return failed", err);
      toastError(err?.response?.data?.message || err?.message || "Failed to auto-fill return.");
    } finally {
      setAutoFillLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "po_inward_id") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        items: [],
      }));
      setSelectedInward(null);
      if (value) loadPOInward(value);
    } else if (name === "purchase_order_id") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        items: [],
      }));
      setSelectedPO(value ? { id: value } : null);
      if (value && formData.warehouse_id) {
        loadPOEligibility(value, formData.warehouse_id);
      }
    } else if (name === "warehouse_id") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        ...(returnAgainstMode === "po" ? { items: [] } : {}),
      }));
      if (returnAgainstMode === "po" && value && formData.purchase_order_id) {
        loadPOEligibility(formData.purchase_order_id, value);
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    if (errors[name]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
    if (serverError) onClearServerError();
  };

  const handleReturnAgainstModeChange = (mode) => {
    setReturnAgainstMode(mode);
    setFormData((prev) => ({
      ...prev,
      po_inward_id: "",
      purchase_order_id: "",
      warehouse_id: "",
      items: [],
    }));
    setSelectedInward(null);
    setSelectedPO(null);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    if (field === "return_quantity") {
      const qty = parseInt(value || 0, 10) || 0;
      const eligible = parseInt(newItems[index].eligible_quantity || 0, 10) || 0;
      if (qty > eligible) {
        setErrors((prev) => ({
          ...prev,
          [`item_${index}_return`]: `Return qty (${qty}) exceeds eligible (${eligible})`,
        }));
      } else {
        setErrors((prev) => {
          const n = { ...prev };
          delete n[`item_${index}_return`];
          return n;
        });
      }
      if (isSerialItem(newItems[index])) {
        if ((newItems[index].serials || []).length > qty) {
          newItems[index].serials = (newItems[index].serials || []).slice(0, qty);
        }
      }
    }
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const openSerialDialog = (index) => {
    const item = formData.items[index];
    if (!item || !isSerialItem(item)) return;
    const qty = parseInt(item.return_quantity || 0, 10) || 0;
    if (qty === 0) return;
    setSerialDialogIndex(index);
  };

  const handleSerialDialogDone = (serials) => {
    if (serialDialogIndex == null) return;
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[serialDialogIndex].serials = serials;
      return { ...prev, items: newItems };
    });
    if (errors[`item_${serialDialogIndex}_serials`]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[`item_${serialDialogIndex}_serials`];
        return n;
      });
    }
    setSerialDialogIndex(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isEdit = !!defaultValues?.id;
    const actionLabel = isEdit ? "update return" : "create return";
    const validationErrors = {};

    if (returnAgainstMode === "inward") {
      if (!formData.po_inward_id) {
        validationErrors.po_inward_id = `PO Inward is required to ${actionLabel}`;
      }
    } else {
      if (!formData.purchase_order_id) {
        validationErrors.purchase_order_id = `Purchase Order is required to ${actionLabel}`;
      }
    }
    if (!formData.warehouse_id) {
      validationErrors.warehouse_id = `Warehouse is required to ${actionLabel}`;
    }
    if (!formData.return_date) {
      validationErrors.return_date = "Return Date is required";
    }

    if (formData.items.length === 0) {
      validationErrors.items = `At least one item is required to ${actionLabel}`;
    } else {
      let hasPositiveReturn = false;
      formData.items.forEach((item, index) => {
        const qty = parseInt(item.return_quantity || 0, 10) || 0;
        const eligible = parseInt(item.eligible_quantity || 0, 10) || 0;
        const productName = item.product_name || `Item ${index + 1}`;
        if (qty < 0) {
          validationErrors[`item_${index}_return`] =
            `Return qty cannot be negative for ${productName}`;
        } else if (qty > eligible) {
          validationErrors[`item_${index}_return`] =
            `Return (${qty}) exceeds eligible (${eligible}) for ${productName}`;
        } else if (qty > 0) {
          hasPositiveReturn = true;
        }
        if (isSerialItem(item) && qty > 0) {
          const serialCount = (item.serials || []).length;
          if (serialCount !== qty) {
            validationErrors[`item_${index}_serials`] =
              `Enter exactly ${qty} serial(s) for ${productName}`;
          } else {
            const sns = (item.serials || [])
              .map((s) =>
                typeof s === "string"
                  ? s.trim()
                  : s.serial_number?.trim()
              )
              .filter(Boolean);
            if (sns.length !== new Set(sns).size) {
              validationErrors[`item_${index}_serials`] =
                `Duplicate serials found for ${productName}`;
            }
          }
        }
      });
      if (!validationErrors.items && !hasPositiveReturn) {
        validationErrors.items =
          `At least one item must have return quantity ≥ 1 to ${actionLabel}`;
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      const el =
        firstKey === "items"
          ? document.querySelector("[data-items-section]")
          : document.querySelector(`[name="${firstKey}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setErrors({});

    const returnItems = formData.items.filter(
      (item) => (parseInt(item.return_quantity || 0, 10) || 0) > 0
    );

    const totals = returnItems.reduce(
      (acc, item) => {
        const qty = parseInt(item.return_quantity || 0, 10) || 0;
        const rate = parseFloat(item.rate || 0) || 0;
        const gstPercent = parseFloat(item.gst_percent || 0) || 0;
        const taxableAmount = rate * qty;
        const gstAmount = (taxableAmount * gstPercent) / 100;
        acc.total_qty += qty;
        acc.total_amount += taxableAmount + gstAmount;
        return acc;
      },
      { total_qty: 0, total_amount: 0 }
    );

    const payload = {
      ...formData,
      po_inward_id: returnAgainstMode === "inward" && formData.po_inward_id ? parseInt(formData.po_inward_id, 10) : null,
      purchase_order_id: returnAgainstMode === "po" && formData.purchase_order_id ? parseInt(formData.purchase_order_id, 10) : undefined,
      warehouse_id: parseInt(formData.warehouse_id, 10),
      reason_id: formData.reason_id ? parseInt(formData.reason_id, 10) : null,
      total_return_quantity: totals.total_qty,
      total_return_amount: parseFloat(totals.total_amount.toFixed(2)),
      items: returnItems.map((item) => {
        const qty = parseInt(item.return_quantity || 0, 10) || 0;
        const rate = parseFloat(item.rate || 0) || 0;
        const gstPercent = parseFloat(item.gst_percent || 0) || 0;
        const taxableAmount = rate * qty;
        const gstAmount = (taxableAmount * gstPercent) / 100;
        return {
          po_inward_item_id: item.po_inward_item_id,
          purchase_order_item_id: item.purchase_order_item_id,
          product_id: item.product_id,
          tracking_type: item.tracking_type,
          serial_required: isSerialItem(item),
          inward_accepted_quantity: item.inward_accepted_quantity,
          already_returned_quantity: item.already_returned_quantity,
          return_quantity: qty,
          rate,
          gst_percent: gstPercent,
          taxable_amount: parseFloat(taxableAmount.toFixed(2)),
          gst_amount: parseFloat(gstAmount.toFixed(2)),
          total_amount: parseFloat((taxableAmount + gstAmount).toFixed(2)),
          serials: isSerialItem(item)
            ? (item.serials || []).map((s) => ({
                serial_number: typeof s === "string" ? s : s.serial_number,
              }))
            : [],
          remarks: item.remarks || "",
        };
      }),
    };

    onSubmit(payload);
  };

  const totals = formData.items.reduce(
    (acc, item) => {
      const accepted = parseInt(item.inward_accepted_quantity || 0, 10) || 0;
      const returned = parseInt(item.already_returned_quantity || 0, 10) || 0;
      const eligible = parseInt(item.eligible_quantity || 0, 10) || 0;
      const qty = parseInt(item.return_quantity || 0, 10) || 0;
      acc.accepted += accepted;
      acc.alreadyReturned += returned;
      acc.eligible += eligible;
      acc.returned += qty;
      return acc;
    },
    { accepted: 0, alreadyReturned: 0, eligible: 0, returned: 0 }
  );

  const activeSerialItem =
    serialDialogIndex != null ? formData.items[serialDialogIndex] : null;
  const activeSerialInitial = activeSerialItem?.serials || [];

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <FormContainer>
        <Box sx={{ p: 1 }}>
          {serverError && (
            <Alert
              severity="error"
              sx={{ mb: 1 }}
              onClose={onClearServerError}
            >
              {serverError}
            </Alert>
          )}

          <div className="w-full">
            <FormGrid cols={2} className="lg:grid-cols-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Return against</span>
                <select
                  value={returnAgainstMode}
                  onChange={(e) => handleReturnAgainstModeChange(e.target.value)}
                  disabled={!!(defaultValues && defaultValues.id)}
                  className="rounded border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value="inward">PO Inward</option>
                  <option value="po">Purchase Order</option>
                </select>
              </div>

              {returnAgainstMode === "inward" ? (
                <>
                  <AutocompleteField
                    name="po_inward_id"
                    label="PO Inward"
                    asyncLoadOptions={(q) =>
                      poInwardService
                        .getPOInwards({
                          q,
                          status: "RECEIVED",
                          limit: 20,
                        })
                        .then((res) => {
                          const payload = res.result || res;
                          const rows = payload.data || payload;
                          return (
                            rows?.map((r) => ({
                              id: r.id,
                              label: `${r.purchaseOrder?.po_number ?? r.id} - ${
                                r.supplier?.supplier_name ?? ""
                              }`,
                            })) || []
                          );
                        })
                    }
                    getOptionLabel={(o) => o?.label ?? ""}
                    value={
                      selectedInward || (formData.po_inward_id
                        ? { id: formData.po_inward_id }
                        : null)
                    }
                    onChange={(_e, newValue) =>
                      handleChange({
                        target: {
                          name: "po_inward_id",
                          value: newValue?.id ?? "",
                        },
                      })
                    }
                    placeholder="Type to search approved inward…"
                    disabled={!!(defaultValues && defaultValues.id)}
                    required
                    error={!!errors.po_inward_id}
                    helperText={errors.po_inward_id}
                  />
                  <Input
                    fullWidth
                    name="warehouse_id"
                    label="Warehouse (auto from inward)"
                    value={selectedInward?.warehouse?.name ?? formData.warehouse_id ?? ""}
                    onChange={handleChange}
                    disabled
                    error={!!errors.warehouse_id}
                    helperText={errors.warehouse_id}
                  />
                </>
              ) : (
                <>
                  <AutocompleteField
                    name="purchase_order_id"
                    label="Purchase Order"
                    asyncLoadOptions={(q) =>
                      getReferenceOptionsSearch("purchaseOrder.model", {
                        q,
                        limit: 20,
                        status_in: "APPROVED,PARTIAL_RECEIVED,CLOSED",
                      })
                    }
                    getOptionLabel={(o) =>
                      o?.label ?? `${o?.po_number ?? o?.id ?? ""} - ${o?.supplier?.supplier_name ?? ""}`
                    }
                    value={
                      selectedPO || (formData.purchase_order_id
                        ? { id: formData.purchase_order_id }
                        : null)
                    }
                    onChange={(_e, newValue) => {
                      setSelectedPO(newValue ?? null);
                      handleChange({
                        target: {
                          name: "purchase_order_id",
                          value: newValue?.id ?? "",
                        },
                      });
                    }}
                    placeholder="Type to search PO…"
                    disabled={!!(defaultValues && defaultValues.id)}
                    required
                    error={!!errors.purchase_order_id}
                    helperText={errors.purchase_order_id}
                  />
                  <AutocompleteField
                    name="warehouse_id"
                    label="Warehouse"
                    options={warehouses}
                    getOptionLabel={(w) => w?.name ?? w?.label ?? ""}
                    value={
                      warehouses.find((w) => w.id === formData.warehouse_id || String(w.id) === String(formData.warehouse_id))
                      || (formData.warehouse_id ? { id: formData.warehouse_id } : null)
                    }
                    onChange={(_e, newValue) =>
                      handleChange({
                        target: { name: "warehouse_id", value: newValue?.id ?? "" },
                      })
                    }
                    placeholder="Select warehouse…"
                    disabled={!!(defaultValues && defaultValues.id)}
                    required
                    error={!!errors.warehouse_id}
                    helperText={errors.warehouse_id}
                  />
                </>
              )}

              <DateField
                name="return_date"
                label="Return Date"
                value={formData.return_date}
                onChange={handleChange}
                required
                error={!!errors.return_date}
                helperText={errors.return_date}
              />

              <Input
                fullWidth
                name="supplier_return_ref"
                label="Supplier Return Ref"
                value={formData.supplier_return_ref}
                onChange={handleChange}
              />

              <DateField
                name="supplier_return_date"
                label="Supplier Return Ref Date"
                value={formData.supplier_return_date}
                onChange={handleChange}
              />

              <div className="md:col-span-2">
                <AutocompleteField
                  name="reason_id"
                  label="Reason"
                  asyncLoadOptions={(q) =>
                    getReferenceOptionsSearch("reason.model", {
                      q,
                      limit: 30,
                      reason_type: "purchase_return",
                      is_active: true,
                    })
                  }
                  getOptionLabel={(o) =>
                    (o && (o.reason ?? o.label)) || ""
                  }
                  value={
                    formData.reason_id
                      ? {
                          id: formData.reason_id,
                          reason: formData.reason_text,
                          label: formData.reason_text,
                        }
                      : null
                  }
                  onChange={(_e, newValue) => {
                    const id = newValue?.id ?? "";
                    const text = newValue
                      ? newValue.reason ?? newValue.label ?? ""
                      : "";
                    setFormData((prev) => ({
                      ...prev,
                      reason_id: id,
                      reason_text: text,
                    }));
                  }}
                  placeholder="Select reason…"
                  error={!!errors.reason_id}
                  helperText={errors.reason_id}
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  fullWidth
                  name="remarks"
                  label="Remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  multiline
                  rows={1}
                />
              </div>
            </FormGrid>
          </div>

          {selectedInward && (
            <div className="mt-1.5 mb-1 rounded-md border border-border bg-card px-3 py-2 flex flex-wrap gap-3 items-start">
              <div className="flex items-center gap-2 min-w-0">
                <InventoryIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Source PO Inward
                  </p>
                  <p className="text-sm font-semibold">
                    {selectedInward.id
                      ? `Inward #${selectedInward.id}`
                      : ""}
                  </p>
                </div>
              </div>
              {selectedInward.purchaseOrder?.po_number && (
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">
                    PO Number
                  </p>
                  <p className="text-sm font-semibold">
                    {selectedInward.purchaseOrder.po_number}
                  </p>
                </div>
              )}
              {selectedInward.supplier?.supplier_name && (
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">
                    Supplier
                  </p>
                  <p className="text-sm font-semibold">
                    {selectedInward.supplier.supplier_name}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="w-full mt-1">
            <div data-items-section>
              {errors.items && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {errors.items}
                </Alert>
              )}

              {poInwardLoading && (
                <Box sx={{ mt: 0.5 }}>
                  <Alert severity="info">
                    {returnAgainstMode === "inward"
                      ? "Loading PO Inward items for return…"
                      : "Loading PO items for return…"}
                  </Alert>
                </Box>
              )}

              {returnAgainstMode === "inward" &&
                selectedInward &&
                formData.items.length > 0 && (
                  <Box sx={{ mt: 0.5, mb: 0.5 }}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoFillReverseReturn}
                      disabled={!!autoFillLoading}
                    >
                      {autoFillLoading ? (
                        <>
                          <CircularProgress size={14} sx={{ mr: 0.5 }} />
                          Filling…
                        </>
                      ) : (
                        "Auto Fill Reverse Return"
                      )}
                    </Button>
                  </Box>
                )}
              {!poInwardLoading && formData.items.length > 0 ? (
                <Box sx={{ display: { xs: "none", sm: "block" } }}>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "action.hover" }}>
                          <TableCell
                            sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.75 }}
                          >
                            #
                          </TableCell>
                          <TableCell
                            sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.75 }}
                          >
                            Product
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.75 }}
                          >
                            Inward Accepted
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.75 }}
                          >
                            Already Returned
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.75 }}
                          >
                            Eligible
                          </TableCell>
                          <TableCell
                            sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.75 }}
                          >
                            Return Qty
                          </TableCell>
                          <TableCell
                            sx={{ fontWeight: 700, fontSize: "0.75rem", py: 0.75 }}
                          >
                            Tracking / Serials
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formData.items.map((item, index) => {
                          const serialRequired = isSerialItem(item);
                          const serialCount = (item.serials || []).length;
                          const qty =
                            parseInt(item.return_quantity || 0, 10) || 0;
                          const serialComplete =
                            serialRequired && qty > 0 && serialCount === qty;
                          return (
                            <TableRow
                              key={index}
                              sx={{
                                "&:nth-of-type(odd)": { bgcolor: "action.hover" },
                              }}
                            >
                              <TableCell
                                sx={{
                                  color: "text.secondary",
                                  fontSize: "0.78rem",
                                  py: 0.5,
                                }}
                              >
                                {index + 1}
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Typography variant="body2" fontWeight={500}>
                                  {item.product_name}
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 0.5,
                                    mt: 0.25,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {serialRequired && (
                                    <Chip
                                      label="SERIAL"
                                      size="small"
                                      color="primary"
                                      sx={{
                                        height: 16,
                                        fontSize: "0.6rem",
                                      }}
                                    />
                                  )}
                                  {!serialRequired &&
                                    item.tracking_type === "LOT" && (
                                      <Chip
                                        label="LOT"
                                        size="small"
                                        color="secondary"
                                        sx={{
                                          height: 16,
                                          fontSize: "0.6rem",
                                        }}
                                      />
                                    )}
                                </Box>
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ fontSize: "0.82rem", py: 0.5 }}
                              >
                                {item.inward_accepted_quantity}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ fontSize: "0.82rem", py: 0.5 }}
                              >
                                {item.already_returned_quantity}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ fontSize: "0.82rem", py: 0.5 }}
                              >
                                {item.eligible_quantity}
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Input
                                  type="number"
                                  size="small"
                                  fullWidth
                                  value={item.return_quantity}
                                  onChange={(e) =>
                                    handleItemChange(
                                      index,
                                      "return_quantity",
                                      e.target.value
                                    )
                                  }
                                  inputProps={{
                                    min: 0,
                                    max: item.eligible_quantity,
                                  }}
                                  error={!!errors[`item_${index}_return`]}
                                  helperText={errors[`item_${index}_return`]}
                                />
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                {serialRequired ? (
                                  <>
                                    <Tooltip title="Click to enter return serials">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={qty <= 0}
                                        onClick={() => openSerialDialog(index)}
                                      >
                                        {serialComplete
                                          ? `Serials ${serialCount}/${qty}`
                                          : `Enter Serials ${serialCount}/${qty}`}
                                      </Button>
                                    </Tooltip>
                                    {errors[`item_${index}_serials`] && (
                                      <FormHelperText error sx={{ mt: 0.25 }}>
                                        {errors[`item_${index}_serials`]}
                                      </FormHelperText>
                                    )}
                                  </>
                                ) : (
                                  <Typography
                                    variant="caption"
                                    color="text.disabled"
                                  >
                                    N/A
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : !poInwardLoading && formData.items.length === 0 ? (
                <Alert severity="info" sx={{ mt: 1 }} icon={<InventoryIcon />}>
                  {returnAgainstMode === "inward"
                    ? "Select a PO Inward above to load items for return."
                    : formData.purchase_order_id && formData.warehouse_id
                      ? "No eligible items for this PO and warehouse. Ensure the PO has received inwards and stock is available."
                      : "Select a Purchase Order and Warehouse above to load items for return."}
                </Alert>
              ) : null}
            </div>
          </div>

          {formData.items.length > 0 && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { label: "Inward Accepted", value: totals.accepted, color: "#64748b" },
                {
                  label: "Already Returned",
                  value: totals.alreadyReturned,
                  color: "#6366f1",
                },
                { label: "Eligible", value: totals.eligible, color: "#0ea5e9" },
                { label: "This Return", value: totals.returned, color: "#22c55e" },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="relative overflow-hidden rounded-md border border-border bg-card px-2.5 py-2 pl-3"
                  style={{ borderLeft: `3px solid ${color}` }}
                >
                  <p className="text-[10px] text-muted-foreground font-medium leading-none mb-0.5">
                    {label}
                  </p>
                  <p className="text-lg font-bold leading-none" style={{ color }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Box>

        <FormActions>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <LoadingButton
            type="submit"
            size="sm"
            loading={loading}
            className="min-w-[140px]"
          >
            {defaultValues?.id ? "Update Return" : "Create Return"}
          </LoadingButton>
        </FormActions>
      </FormContainer>

      {activeSerialItem && (
        <SerialEntryDialog
          open={serialDialogIndex != null}
          item={activeSerialItem}
          initialSerials={activeSerialInitial}
          onDone={handleSerialDialogDone}
          onClose={() => setSerialDialogIndex(null)}
          onValidateSerials={purchaseReturnService.validateReturnSerials}
          purchaseReturnId={defaultValues?.id ?? null}
          warehouseId={formData.warehouse_id || selectedInward?.warehouse_id}
        />
      )}
    </Box>
  );
}

