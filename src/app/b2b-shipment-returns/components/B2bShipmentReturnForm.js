"use client";

import { useEffect, useMemo, useState, useRef, useCallback, Fragment } from "react";
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
  FormHelperText,
  Chip,
  IconButton,
  Collapse,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ClearIcon from "@mui/icons-material/Clear";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import LoadingButton from "@/components/common/LoadingButton";
import { Button } from "@/components/ui/button";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import b2bShipmentService from "@/services/b2bShipmentService";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { toast } from "sonner";


export default function B2bShipmentReturnForm({
  eligibility = null,
  returnId = null,
  lockedShipmentId = null,
  loading = false,
  serverError = null,
  onClearServerError = () => {},
  onSubmit,
  onCancel,
}) {
  const compactCellSx = { py: 0.5, px: 1 };

  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [reasonId, setReasonId] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [remarks, setRemarks] = useState("");
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [eligibilityData, setEligibilityData] = useState(eligibility);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [lines, setLines] = useState([]);
  const [errors, setErrors] = useState({});

  const [expandedSerialLineIndex, setExpandedSerialLineIndex] = useState(null);
  const [serialDrawerValues, setSerialDrawerValues] = useState([]);
  const [serialDrawerError, setSerialDrawerError] = useState("");
  const [serialDrawerFieldErrors, setSerialDrawerFieldErrors] = useState({});
  const serialInputRefs = useRef([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanTargetIndex, setScanTargetIndex] = useState(null);

  const buildLinesFromEligibility = useCallback((data, existingItems = []) => {
    return (data?.items || []).map((item) => {
      const existing = existingItems.find((e) => e.b2b_shipment_item_id === item.b2b_shipment_item_id);
      const returnableSerials = (item.returnable_serials || []).map((s) =>
        typeof s === "string" ? s : s.serial_number
      );
      return {
        b2b_shipment_item_id: item.b2b_shipment_item_id,
        b2b_sales_order_item_id: item.b2b_sales_order_item_id,
        product_id: item.product_id,
        product_name: item.product?.product_name || "-",
        product_type_name: item.product?.productType?.name || "",
        shipped_quantity: item.shipped_quantity ?? 0,
        already_returned_quantity: item.already_returned_quantity ?? 0,
        returnable_quantity: item.returnable_quantity ?? 0,
        return_qty: existing?.return_quantity != null ? String(existing.return_quantity) : "",
        returnable_serials: returnableSerials,
        serials: existing?.serials?.map((s) => (typeof s === "string" ? s : s.serial_number)) || [],
        serial_required: item.serial_required || returnableSerials.length > 0,
      };
    });
  }, []);

  useEffect(() => {
    if (eligibility) {
      setEligibilityData(eligibility);
      const existingItems = eligibility._defaults?.items || [];
      setLines(buildLinesFromEligibility(eligibility, existingItems));
      if (eligibility._defaults?.return_date) setReturnDate(eligibility._defaults.return_date);
      if (eligibility._defaults?.reason_id) setReasonId(eligibility._defaults.reason_id);
      if (eligibility._defaults?.reason_text) setReasonText(eligibility._defaults.reason_text);
      if (eligibility._defaults?.remarks) setRemarks(eligibility._defaults.remarks);
      if (eligibility.shipment) {
        setSelectedShipment({
          id: eligibility.shipment.id,
          shipment_no: eligibility.shipment.shipment_no,
          label: `${eligibility.shipment.shipment_no} — ${eligibility.shipment.salesOrder?.order_no || ""}`,
        });
      }
    }
  }, [eligibility, buildLinesFromEligibility]);

  const loadEligibility = async (shipmentId) => {
    if (!shipmentId) return;
    setLoadingEligibility(true);
    try {
      const b2bShipmentReturnService = (await import("@/services/b2bShipmentReturnService")).default;
      const data = await b2bShipmentReturnService.getShipmentEligibilityForReturn(
        shipmentId,
        returnId || undefined
      );
      setEligibilityData(data);
      setLines(buildLinesFromEligibility(data));
    } catch (err) {
      console.error(err);
      setEligibilityData(null);
      setLines([]);
    } finally {
      setLoadingEligibility(false);
    }
  };

  useEffect(() => {
    if (lockedShipmentId && !eligibility) {
      loadEligibility(lockedShipmentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedShipmentId]);

  const handleShipmentChange = async (val) => {
    setSelectedShipment(val);
    onClearServerError();
    setErrors((prev) => {
      const next = { ...prev };
      delete next.shipment;
      return next;
    });
    if (val?.id) {
      await loadEligibility(val.id);
    } else {
      setEligibilityData(null);
      setLines([]);
    }
  };

  const setLineField = (idx, patch) => {
    setLines((prev) => prev.map((line, i) => (i === idx ? { ...line, ...patch } : line)));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`line_${idx}_qty`];
      delete next[`line_${idx}_serials`];
      return next;
    });
  };

  const handleReturnQtyChange = (index, value) => {
    const returnQtyNum = Number(value) || 0;
    const line = lines[index];
    if (expandedSerialLineIndex === index) closeSerialRowExpand();

    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const newLine = { ...l, return_qty: value };
        if (l.serial_required && newLine.serials.length > returnQtyNum) {
          newLine.serials = newLine.serials.slice(0, returnQtyNum);
        }
        return newLine;
      })
    );

    setErrors((prev) => {
      const next = { ...prev };
      const key = `line_${index}_qty`;
      if (!returnQtyNum || returnQtyNum <= 0) {
        delete next[key];
        return next;
      }
      if (!Number.isInteger(returnQtyNum)) next[key] = "Must be a whole number";
      else if (returnQtyNum > Number(line.returnable_quantity)) {
        next[key] = `Cannot exceed returnable (${line.returnable_quantity})`;
      } else delete next[key];
      return next;
    });
  };

  const closeSerialRowExpand = () => {
    setExpandedSerialLineIndex(null);
    setSerialDrawerValues([]);
    setSerialDrawerError("");
    setSerialDrawerFieldErrors({});
    serialInputRefs.current = [];
  };

  const toggleSerialRowExpand = (lineIndex) => {
    const line = lines[lineIndex];
    if (!line?.serial_required) return;
    const returnQty = Number(line.return_qty) || 0;
    if (returnQty <= 0) return;

    if (expandedSerialLineIndex === lineIndex) {
      closeSerialRowExpand();
      return;
    }

    const existing = (line.serials || []).map((s) => String(s || "").trim());
    const padded = Array.from({ length: returnQty }, (_, i) => existing[i] ?? "");
    setSerialDrawerValues(padded);
    setExpandedSerialLineIndex(lineIndex);
    serialInputRefs.current = [];
  };

  const saveSerialDrawer = () => {
    if (expandedSerialLineIndex == null) return;
    const line = lines[expandedSerialLineIndex];
    const returnQty = Number(line.return_qty) || 0;
    const serials = serialDrawerValues.map((s) => s.trim()).filter(Boolean);

    if (serials.length !== returnQty) {
      setSerialDrawerError(`Enter exactly ${returnQty} serial(s)`);
      return;
    }

    const returnableSet = new Set((line.returnable_serials || []).map((s) => s.toLowerCase()));
    for (const s of serials) {
      if (!returnableSet.has(s.toLowerCase())) {
        setSerialDrawerError(`Serial "${s}" is not returnable`);
        return;
      }
    }

    setLineField(expandedSerialLineIndex, { serials });
    closeSerialRowExpand();
  };

  const handleReturnAll = () => {
    setLines((prev) =>
      prev.map((line) => {
        const qty = Number(line.returnable_quantity) || 0;
        if (qty <= 0) {
          return { ...line, return_qty: "", serials: [] };
        }
        const serials =
          line.serial_required && Array.isArray(line.returnable_serials)
            ? line.returnable_serials.slice(0, qty).map((s) => String(s).trim()).filter(Boolean)
            : [];
        return {
          ...line,
          return_qty: String(qty),
          serials,
        };
      })
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next.items;
      Object.keys(next).forEach((k) => {
        if (k.startsWith("line_") && (k.endsWith("_qty") || k.endsWith("_serials"))) {
          delete next[k];
        }
      });
      return next;
    });
    closeSerialRowExpand();
  };

  const totals = useMemo(() => {
    let shipped = 0;
    let alreadyReturned = 0;
    let returnable = 0;
    let thisReturn = 0;
    lines.forEach((l) => {
      shipped += Number(l.shipped_quantity) || 0;
      alreadyReturned += Number(l.already_returned_quantity) || 0;
      returnable += Number(l.returnable_quantity) || 0;
      thisReturn += Number(l.return_qty) || 0;
    });
    return { shipped, alreadyReturned, returnable, thisReturn };
  }, [lines]);

  const runValidation = () => {
    const next = {};
    if (!returnDate) {
      next.return_date = "Return date is required";
    }
    if (!reasonId) {
      next.reason_id = "Reason is required";
    }
    if (!selectedShipment?.id && !eligibilityData?.shipment?.id) {
      next.shipment = "Shipment is required";
    }
    let hasLine = false;
    lines.forEach((line, idx) => {
      const qty = Number(line.return_qty) || 0;
      if (qty <= 0) return;
      hasLine = true;
      if (!Number.isInteger(qty)) next[`line_${idx}_qty`] = "Must be a whole number";
      else if (qty > Number(line.returnable_quantity)) {
        next[`line_${idx}_qty`] = `Cannot exceed returnable (${line.returnable_quantity})`;
      }
      if (line.serial_required) {
        if ((line.serials || []).length !== qty) {
          next[`line_${idx}_serials`] = `Enter ${qty} serial(s)`;
        }
      }
    });
    if (!hasLine) next.items = "At least one line with return quantity is required";
    return { valid: Object.keys(next).length === 0, errors: next };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onClearServerError();
    const { valid, errors: validationErrors } = runValidation();
    setErrors(validationErrors);
    if (!valid) {
      const firstMsg = Object.values(validationErrors)[0] || "Please fix validation errors before saving";
      toast.error(firstMsg);
      const firstKey = Object.keys(validationErrors)[0];
      if (firstKey === "items") {
        document.querySelector("[data-return-lines-section]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const shipmentId = selectedShipment?.id || eligibilityData?.shipment?.id;
    const activeLines = lines
      .filter((l) => (Number(l.return_qty) || 0) > 0)
      .map((l) => ({
        b2b_shipment_item_id: l.b2b_shipment_item_id,
        return_quantity: Number(l.return_qty),
        serials: l.serial_required ? l.serials : undefined,
        remarks: l.remarks,
      }));

    const isFull = activeLines.every((l) => {
      const line = lines.find((x) => x.b2b_shipment_item_id === l.b2b_shipment_item_id);
      return line && l.return_quantity === line.returnable_quantity;
    });

    onSubmit({
      b2b_shipment_id: shipmentId,
      return_date: returnDate,
      return_type: isFull ? "FULL" : "PARTIAL",
      reason_id: reasonId ? parseInt(reasonId, 10) : null,
      reason_text: reasonText || null,
      remarks: remarks || null,
      items: activeLines,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={preventEnterSubmit}
      noValidate
      className="flex flex-col flex-1 min-h-0"
    >
    <FormContainer>
      {serverError && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={onClearServerError}>
          {serverError}
        </Alert>
      )}

      <FormSection title="Return Details">
        <FormGrid>
          {!lockedShipmentId && (
            <AutocompleteField
              label="B2B Shipment"
              required
              value={selectedShipment}
              onChange={(_e, newValue) => handleShipmentChange(newValue)}
              asyncLoadOptions={async (q) => {
                const res = await b2bShipmentService.getB2bShipments({ q, limit: 20, page: 1 });
                const data = res?.result?.data ?? res?.data ?? [];
                return data.map((s) => ({
                  id: s.id,
                  shipment_no: s.shipment_no,
                  label: `${s.shipment_no} — ${s.salesOrder?.order_no || ""} (${s.client?.client_name || ""})`,
                }));
              }}
              getOptionLabel={(o) => o?.label || o?.shipment_no || ""}
              error={!!errors.shipment}
              helperText={errors.shipment}
              disabled={!!returnId}
            />
          )}
          <Input
            label="Return Date"
            type="date"
            required
            value={returnDate}
            onChange={(e) => {
              setReturnDate(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.return_date;
                return next;
              });
            }}
            error={!!errors.return_date}
            helperText={errors.return_date}
          />
          <AutocompleteField
            label="Reason"
            required
            asyncLoadOptions={(q) =>
              getReferenceOptionsSearch("reason.model", {
                q,
                limit: 30,
                reason_type: "b2b_shipment_return",
                is_active: true,
              })
            }
            getOptionLabel={(o) => (o && (o.reason ?? o.label)) || ""}
            value={
              reasonId
                ? { id: reasonId, reason: reasonText, label: reasonText }
                : null
            }
            onChange={(_e, newValue) => {
              const id = newValue?.id ?? "";
              const text = newValue ? newValue.reason ?? newValue.label ?? "" : "";
              setReasonId(id ? String(id) : "");
              setReasonText(text ? String(text) : "");
              setErrors((prev) => {
                const next = { ...prev };
                delete next.reason_id;
                return next;
              });
            }}
            error={!!errors.reason_id}
            helperText={errors.reason_id}
            placeholder="Select reason…"
          />
          <Input label="Reason Text" value={reasonText} onChange={(e) => setReasonText(e.target.value)} />
          <Input label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="md:col-span-2" />
        </FormGrid>
      </FormSection>

      {eligibilityData?.shipment && (
        <div className="mt-4 mb-2">
          <div className="font-semibold text-sm text-gray-700 bg-gray-100 p-2 rounded">
            Shipment: {eligibilityData.shipment.shipment_no} | Order:{" "}
            {eligibilityData.shipment.salesOrder?.order_no || "-"} | Client:{" "}
            {eligibilityData.shipment.client?.client_name || "-"}
          </div>
        </div>
      )}

      <div className="flex justify-between items-end mb-2 mt-4" data-return-lines-section>
        <h3 className="text-lg font-semibold text-gray-800">
          Returnable Items <span className="text-destructive">*</span>
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={handleReturnAll} disabled={loadingEligibility}>
          Return All
        </Button>
      </div>

      {errors.items && <FormHelperText error>{errors.items}</FormHelperText>}

      <TableContainer component={Paper} sx={{ mb: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={compactCellSx}>Product</TableCell>
              <TableCell sx={compactCellSx} align="right">Shipped</TableCell>
              <TableCell sx={compactCellSx} align="right">Returned</TableCell>
              <TableCell sx={compactCellSx} align="right">Returnable</TableCell>
              <TableCell sx={compactCellSx} align="right">Return Qty</TableCell>
              <TableCell sx={compactCellSx}>Serials</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingEligibility ? (
              <TableRow>
                <TableCell colSpan={6} sx={compactCellSx}>Loading lines...</TableCell>
              </TableRow>
            ) : lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={compactCellSx}>Select a shipment to load returnable lines</TableCell>
              </TableRow>
            ) : (
              lines.map((line, idx) => (
                <Fragment key={line.b2b_shipment_item_id}>
                  <TableRow>
                    <TableCell sx={compactCellSx}>
                      <Typography variant="body2">{line.product_name}</Typography>
                      {line.product_type_name && (
                        <Typography variant="caption" color="text.secondary">{line.product_type_name}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={compactCellSx} align="right">{line.shipped_quantity}</TableCell>
                    <TableCell sx={compactCellSx} align="right">{line.already_returned_quantity}</TableCell>
                    <TableCell sx={compactCellSx} align="right">{line.returnable_quantity}</TableCell>
                    <TableCell sx={compactCellSx} align="right">
                      <Input
                        type="number"
                        value={line.return_qty}
                        onChange={(e) => handleReturnQtyChange(idx, e.target.value)}
                        inputProps={{ min: 0, max: line.returnable_quantity }}
                        error={!!errors[`line_${idx}_qty`]}
                        helperText={errors[`line_${idx}_qty`]}
                        className="w-24 inline-block"
                        fullWidth={false}
                      />
                    </TableCell>
                    <TableCell sx={compactCellSx}>
                      {line.serial_required ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Chip
                            size="small"
                            label={`${(line.serials || []).length}/${Number(line.return_qty) || 0}`}
                            color={(line.serials || []).length === (Number(line.return_qty) || 0) && Number(line.return_qty) > 0 ? "success" : "default"}
                            onClick={() => toggleSerialRowExpand(idx)}
                          />
                          <IconButton size="small" onClick={() => toggleSerialRowExpand(idx)}>
                            {expandedSerialLineIndex === idx ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          </IconButton>
                        </Box>
                      ) : (
                        "-"
                      )}
                      {errors[`line_${idx}_serials`] && (
                        <FormHelperText error>{errors[`line_${idx}_serials`]}</FormHelperText>
                      )}
                    </TableCell>
                  </TableRow>
                  {line.serial_required && expandedSerialLineIndex === idx && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0.5, px: 1, bgcolor: "action.hover" }}>
                        <Collapse in>
                          {serialDrawerError && (
                            <Alert severity="error" sx={{ mb: 0.5 }}>{serialDrawerError}</Alert>
                          )}
                          <div className="flex flex-wrap gap-2 items-end">
                                {serialDrawerValues.map((val, sIdx) => (
                                  <div key={sIdx} className="flex items-center gap-1">
                                    <Input
                                      label={`Serial ${sIdx + 1}`}
                                      value={val}
                                      onChange={(e) => {
                                        const next = [...serialDrawerValues];
                                        next[sIdx] = e.target.value;
                                        setSerialDrawerValues(next);
                                      }}
                                      className="w-40"
                                      fullWidth={false}
                                      error={!!serialDrawerFieldErrors[sIdx]}
                                    />
                                    <IconButton size="small" onClick={() => setScanTargetIndex(sIdx)} sx={{ mt: 3 }}>
                                      <QrCodeScannerIcon fontSize="small" />
                                    </IconButton>
                                  </div>
                                ))}
                              </div>
                          <Box sx={{ mt: 0.5, display: "flex", gap: 1 }}>
                            <Button type="button" size="sm" onClick={saveSerialDrawer}>Save Serials</Button>
                            <Button type="button" variant="outline" size="sm" onClick={closeSerialRowExpand}>Cancel</Button>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 mt-6 mb-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Shipped</span>
          <span className="text-lg font-semibold text-gray-900">{totals.shipped}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Already Returned</span>
          <span className="text-lg font-semibold text-gray-900">{totals.alreadyReturned}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Returnable</span>
          <span className="text-lg font-semibold text-blue-600">{totals.returnable}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase tracking-wider">This Return</span>
          <span className="text-lg font-bold text-green-600">{totals.thisReturn}</span>
        </div>
      </div>

      <FormActions>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <LoadingButton type="submit" loading={loading}>
          Save Draft
        </LoadingButton>
      </FormActions>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          if (scanTargetIndex != null) {
            const next = [...serialDrawerValues];
            next[scanTargetIndex] = code;
            setSerialDrawerValues(next);
          }
          setScannerOpen(false);
        }}
      />
    </FormContainer>
    </form>
  );
}
