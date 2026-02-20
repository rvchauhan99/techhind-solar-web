"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import {
    Box,
    Grid,
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
    Card,
    CardContent,
    FormHelperText,
    CircularProgress,
    Collapse,
    TextField,
    IconButton,
    Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ClearIcon from "@mui/icons-material/Clear";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import BillToShipToDisplay from "@/components/common/BillToShipToDisplay";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import DateField from "@/components/common/DateField";
import FormContainer, { FormActions } from "@/components/common/FormContainer";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/common/LoadingButton";
import { toastError } from "@/utils/toast";
import { splitSerialInput, fillSerialSlots } from "@/utils/serialInput";
import { COMPACT_FORM_SPACING, COMPACT_SECTION_HEADER_STYLE } from "@/utils/formConstants";
import b2bSalesOrderService from "@/services/b2bSalesOrderService";
import stockService from "@/services/stockService";

const compactCardContentSx = { p: 1, "&:last-child": { pb: 1 } };
const compactCellSx = { py: 0.5, px: 1 };

/**
 * Build lines from B2B order items for shipment (same pattern as DeliveryChallan BOM lines).
 */
function buildLinesFromOrderItems(items, stockByProductId = {}) {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
        const p = item?.product_snapshot || item?.product || {};
        const productType = p?.productType || p?.product_type;
        const requiredQty = parseInt(item.quantity, 10) || 0;
        const shipped = parseInt(item.shipped_quantity, 10) || 0;
        const pending = Math.max(0, requiredQty - shipped);
        const stockRow = stockByProductId[item.product_id];
        const available =
            stockRow && stockRow.quantity_available != null && !Number.isNaN(Number(stockRow.quantity_available))
                ? Number(stockRow.quantity_available)
                : 0;
        const unitName = p?.measurement_unit_name || "";
        return {
            b2b_sales_order_item_id: item.id,
            product_id: item.product_id,
            product_name: p?.product_name || p?.name || "",
            product_type_name: productType?.name || productType?.product_type_name || "",
            make_name: p?.product_make_name || p?.make_name || "",
            required_qty: requiredQty,
            shipped_qty: shipped,
            pending_qty: pending,
            available_qty: available,
            unit_name: unitName,
            ship_now: "",
            serials: [],
            serial_required: !!(p?.serial_required || productType?.serial_required),
        };
    });
}

export default function B2bShipmentForm({
    onSubmit,
    loading = false,
    serverError = null,
    onClearServerError = () => {},
    onCancel = null,
}) {
    const [order, setOrder] = useState(null);
    const [selectedOrderOption, setSelectedOrderOption] = useState(null);
    const [availableOrders, setAvailableOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [formData, setFormData] = useState({
        shipment_date: new Date().toISOString().split("T")[0],
        transporter: "",
        remarks: "",
    });

    const [lines, setLines] = useState([]);
    const [errors, setErrors] = useState({});
    const [stockByProductId, setStockByProductId] = useState({});
    const [availableSerialsByLineIndex, setAvailableSerialsByLineIndex] = useState({});

    const [expandedSerialLineIndex, setExpandedSerialLineIndex] = useState(null);
    const [serialDrawerValues, setSerialDrawerValues] = useState([]);
    const [serialDrawerError, setSerialDrawerError] = useState("");
    const [serialDrawerFieldErrors, setSerialDrawerFieldErrors] = useState({});
    const [serialDrawerValidating, setSerialDrawerValidating] = useState(null);
    const serialInputRefs = useRef([]);

    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanTargetIndex, setScanTargetIndex] = useState(null);
    const [gunScanValue, setGunScanValue] = useState("");
    const gunScanRef = useRef(null);

    const loadOrderById = async (id) => {
        if (!id) return;
        try {
            setInitialLoading(true);
            const res = await b2bSalesOrderService.getB2bSalesOrderItemsForShipment(id);
            const data = res?.result || res;
            const orderData = data?.order;
            const items = data?.items ?? [];
            if (!orderData) {
                setOrder(null);
                setLines([]);
                setAvailableSerialsByLineIndex({});
                toastError("Order not found or not confirmed");
                return;
            }

            let stockMap = {};
            const warehouseId = orderData.planned_warehouse_id;
            if (warehouseId) {
                try {
                    const stockRes = await stockService.getStocksByWarehouse(warehouseId);
                    const stockData = stockRes?.result || stockRes || [];
                    if (Array.isArray(stockData)) {
                        stockData.forEach((s) => {
                            if (s && s.product_id != null) stockMap[s.product_id] = s;
                        });
                    }
                } catch (e) {
                    console.error("Failed to load warehouse stock for shipment:", e);
                }
            }

            setStockByProductId(stockMap);
            setOrder(orderData);
            setSelectedOrderOption(null);
            const newLines = buildLinesFromOrderItems(items, stockMap);
            setLines(newLines);

            if (warehouseId) {
                const byIndex = {};
                await Promise.all(
                    newLines.map(async (line, index) => {
                        if (!line.serial_required) return;
                        try {
                            const serRes = await stockService.getAvailableSerials(line.product_id, warehouseId);
                            const list = serRes?.result ?? serRes ?? [];
                            byIndex[index] = Array.isArray(list) ? list : [];
                        } catch (e) {
                            byIndex[index] = [];
                        }
                    })
                );
                setAvailableSerialsByLineIndex(byIndex);
            } else {
                setAvailableSerialsByLineIndex({});
            }

            setErrors((prev) => {
                const next = { ...prev };
                delete next.order_id;
                return next;
            });
        } catch (err) {
            console.error("Failed to load order for shipment:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to load order";
            setOrder(null);
            setLines([]);
            setAvailableSerialsByLineIndex({});
            toastError(msg);
        } finally {
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                setOrdersLoading(true);
                setInitialLoading(false);
                const res = await b2bSalesOrderService.getB2bSalesOrders({ status: "CONFIRMED", limit: 200 });
                const r = res?.result ?? res;
                const data = r?.data ?? [];
                setAvailableOrders(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to load confirmed orders:", err);
                toastError(err?.response?.data?.message || err?.message || "Failed to load orders");
                setAvailableOrders([]);
            } finally {
                setOrdersLoading(false);
            }
        };
        init();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
        if (serverError) onClearServerError();
    };

    const handleShipNowChange = (index, value) => {
        const shipNowNum = Number(value) || 0;
        const line = lines[index];
        const isSerialRequired = line?.serial_required;

        if (expandedSerialLineIndex === index) closeSerialRowExpand();

        setLines((prev) =>
            prev.map((l, i) => {
                if (i !== index) return l;
                const newLine = { ...l, ship_now: value };
                if (l.serial_required && newLine.serials.length > shipNowNum) {
                    newLine.serials = newLine.serials.slice(0, shipNowNum);
                }
                return newLine;
            })
        );

        setErrors((prev) => {
            const next = { ...prev };
            const key = `line_${index}_ship_now`;
            const pendingForLine = line?.pending_qty ?? 0;
            const availableForLine = line?.available_qty ?? 0;

            if (!shipNowNum || shipNowNum <= 0) {
                delete next[key];
                return next;
            }
            if (!Number.isInteger(shipNowNum)) next[key] = "Must be a whole number";
            else if (shipNowNum > pendingForLine) next[key] = `Cannot exceed remaining (${pendingForLine})`;
            else if (availableForLine != null && !Number.isNaN(availableForLine) && shipNowNum > availableForLine) {
                next[key] = `Cannot exceed available stock (${availableForLine})`;
            } else delete next[key];
            return next;
        });

        if (isSerialRequired && shipNowNum > 0) {
            setTimeout(() => {
                const existing = (line.serials || []).map((s) => String(s || "").trim()).slice(0, shipNowNum);
                const padded = Array.from({ length: shipNowNum }, (_, i) => existing[i] ?? "");
                setSerialDrawerValues(padded);
                setSerialDrawerError("");
                setSerialDrawerFieldErrors({});
                setSerialDrawerValidating(null);
                setExpandedSerialLineIndex(index);
                serialInputRefs.current = [];
                setTimeout(() => serialInputRefs.current[0]?.focus(), 100);
            }, 0);
        }
    };

    const handleSerialAdd = (lineIndex, serialNumber) => {
        const trimmed = (serialNumber || "").trim();
        if (!trimmed) return;
        const availableList = availableSerialsByLineIndex[lineIndex];
        if (Array.isArray(availableList) && availableList.length > 0) {
            const isAvailable = availableList.some((s) => (s.serial_number || "").trim() === trimmed);
            if (!isAvailable) {
                toastError("This serial is not available at this warehouse");
                return;
            }
        }
        setLines((prev) => {
            const currentLine = prev[lineIndex];
            const shipNow = Number(currentLine?.ship_now) || 0;
            if (currentLine && currentLine.serials.length >= shipNow) {
                toastError(`Maximum ${shipNow} serial numbers allowed`);
                return prev;
            }
            if (currentLine && currentLine.serials.includes(trimmed)) {
                toastError("Serial number already added");
                return prev;
            }
            const usedInOther = prev.some((line, i) => i !== lineIndex && (line.serials || []).includes(trimmed));
            if (usedInOther) {
                toastError("This serial is already used in another line");
                return prev;
            }
            return prev.map((line, i) =>
                i !== lineIndex ? line : { ...line, serials: [...(line.serials || []), trimmed] }
            );
        });
    };

    const handleSerialRemove = (lineIndex, serialIndex) => {
        setLines((prev) =>
            prev.map((line, i) => {
                if (i !== lineIndex) return line;
                const newSerials = [...(line.serials || [])];
                newSerials.splice(serialIndex, 1);
                return { ...line, serials: newSerials };
            })
        );
    };

    const toggleSerialRowExpand = (lineIndex) => {
        const line = lines[lineIndex];
        if (!line?.serial_required) return;
        const shipNow = Number(line.ship_now) || 0;
        if (shipNow <= 0) return;

        if (expandedSerialLineIndex === lineIndex) {
            setExpandedSerialLineIndex(null);
            setSerialDrawerValues([]);
            setSerialDrawerError("");
            setSerialDrawerFieldErrors({});
            setSerialDrawerValidating(null);
            setGunScanValue("");
            serialInputRefs.current = [];
            return;
        }

        const existing = (line.serials || []).map((s) => String(s || "").trim());
        const padded = Array.from({ length: shipNow }, (_, i) => existing[i] ?? "");
        setSerialDrawerValues(padded);
        setSerialDrawerError("");
        setSerialDrawerFieldErrors({});
        setSerialDrawerValidating(null);
        setExpandedSerialLineIndex(lineIndex);
        setGunScanValue("");
        serialInputRefs.current = [];
        setTimeout(() => gunScanRef.current?.focus(), 100);
    };

    const closeSerialRowExpand = () => {
        setExpandedSerialLineIndex(null);
        setSerialDrawerValues([]);
        setSerialDrawerError("");
        setSerialDrawerFieldErrors({});
        setSerialDrawerValidating(null);
        setGunScanValue("");
        serialInputRefs.current = [];
    };

    const handleGunScanKeyDown = (e) => {
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            const firstEmpty = serialDrawerValues.findIndex((v) => !(v || "").trim());
            const idx = firstEmpty !== -1 ? firstEmpty : 0;
            if ((gunScanValue || "").trim()) {
                handleSerialDrawerBulkOrSingle(idx, gunScanValue);
                setGunScanValue("");
            }
            gunScanRef.current?.focus();
        }
    };

    const openScanner = () => {
        const firstEmpty = serialDrawerValues.findIndex((v) => !(v || "").trim());
        setScanTargetIndex(firstEmpty !== -1 ? firstEmpty : 0);
        setScannerOpen(true);
    };

    const handleScanResult = (value) => {
        const tokens = splitSerialInput(value || "");
        if (!tokens.length || scanTargetIndex == null || expandedSerialLineIndex == null) return;

        const line = lines[expandedSerialLineIndex];
        const pending = Number(line?.pending_qty) ?? 0;
        const available = line?.available_qty != null && !Number.isNaN(Number(line.available_qty))
            ? Number(line.available_qty) : Infinity;
        const maxAllowed = Math.min(pending, available);
        const shipNow = serialDrawerValues.length;

        if (tokens.length > maxAllowed) {
            toastError(`Too many serials (${tokens.length}). Cannot exceed remaining (${pending}) or available (${available === Infinity ? "—" : available}).`);
            return;
        }

        if (tokens.length === 1) {
            const trimmed = tokens[0];
            const alreadyEntered = serialDrawerValues.some(
                (v) => (v || "").trim().toLowerCase() === trimmed.toLowerCase()
            );
            if (alreadyEntered) {
                toastError("Serial number already entered.");
                return;
            }
            handleSerialDrawerValueChange(scanTargetIndex, trimmed);
            validateSerialWithBackend(scanTargetIndex, trimmed);
            const updated = serialDrawerValues.map((v, i) => (i === scanTargetIndex ? trimmed : v));
            const nextEmpty = updated.findIndex((v, i) => i > scanTargetIndex && !(v || "").trim());
            if (nextEmpty === -1) {
                setScannerOpen(false);
                setScanTargetIndex(null);
            } else {
                setScanTargetIndex(nextEmpty);
            }
            return;
        }

        // Multi-serial (pallet) barcode
        const existingLower = new Set(
            serialDrawerValues.map((v) => (v || "").trim().toLowerCase()).filter(Boolean)
        );
        const uniqueNew = tokens.filter((t) => !existingLower.has(t.trim().toLowerCase()));
        if (uniqueNew.length === 0) {
            toastError("All serials already entered.");
            return;
        }
        const newShipNow = Math.min(shipNow + uniqueNew.length, maxAllowed);
        if (newShipNow > maxAllowed) {
            toastError(`Too many serials. Cannot exceed remaining (${pending}) or available.`);
            return;
        }

        if (newShipNow > shipNow) {
            setLines((prev) =>
                prev.map((l, i) =>
                    i !== expandedSerialLineIndex
                        ? l
                        : { ...l, ship_now: String(newShipNow), serials: (l.serials || []).slice(0, newShipNow) }
                )
            );
            setErrors((prev) => {
                const next = { ...prev };
                delete next[`line_${expandedSerialLineIndex}_ship_now`];
                return next;
            });
            const paddedSlots = [...serialDrawerValues, ...Array(newShipNow - shipNow).fill("")];
            const { nextSlots, overflow } = fillSerialSlots({
                slots: paddedSlots,
                startIndex: shipNow,
                incoming: uniqueNew,
                caseInsensitive: true,
            });
            if (overflow.length) {
                toastError(`Too many serials. ${overflow.length} not filled (limit ${maxAllowed}).`);
                return;
            }
            setSerialDrawerValues(nextSlots);
            setSerialDrawerFieldErrors({});
            nextSlots.forEach((val, idx) => {
                if ((val || "").trim()) validateSerialWithBackend(idx, val);
            });
        } else {
            const { nextSlots, overflow, duplicates } = fillSerialSlots({
                slots: serialDrawerValues,
                startIndex: scanTargetIndex,
                incoming: uniqueNew,
                caseInsensitive: true,
            });
            if (duplicates.length) {
                toastError(`Duplicate serial(s) ignored: ${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? "…" : ""}`);
            }
            if (overflow.length) {
                toastError(`Cannot add ${overflow.length} serial(s): quantity limit reached.`);
                return;
            }
            setSerialDrawerValues(nextSlots);
            nextSlots.forEach((val, idx) => {
                if ((val || "").trim()) validateSerialWithBackend(idx, val);
            });
        }
        setScannerOpen(false);
        setScanTargetIndex(null);
    };

    const scanHint =
        scanTargetIndex != null && serialDrawerValues.length > 0
            ? `Scanning serial ${scanTargetIndex + 1} of ${serialDrawerValues.length}`
            : "";

    const validateSerialWithBackend = async (drawerValueIndex, value) => {
        const trimmed = (value || "").trim();
        if (!trimmed || expandedSerialLineIndex == null) {
            setSerialDrawerFieldErrors((prev) => { const n = { ...prev }; delete n[drawerValueIndex]; return n; });
            return;
        }
        const warehouseId = order?.planned_warehouse_id;
        const line = lines[expandedSerialLineIndex];
        const productId = line?.product_id;
        if (!warehouseId || !productId) {
            setSerialDrawerFieldErrors((prev) => ({ ...prev, [drawerValueIndex]: "Warehouse or product missing" }));
            return;
        }
        setSerialDrawerValidating(drawerValueIndex);
        try {
            const res = await stockService.validateSerialAvailable(trimmed, productId, warehouseId);
            const result = res?.result ?? res;
            const valid = result?.valid === true;
            setSerialDrawerFieldErrors((prev) => {
                const n = { ...prev };
                if (valid) delete n[drawerValueIndex];
                else n[drawerValueIndex] = result?.message || "Serial is not available at this warehouse";
                return n;
            });
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Validation failed";
            setSerialDrawerFieldErrors((prev) => ({ ...prev, [drawerValueIndex]: msg }));
        } finally {
            setSerialDrawerValidating(null);
        }
    };

    const handleSerialDrawerValueChange = (index, value) => {
        setSerialDrawerValues((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
        setSerialDrawerFieldErrors((prev) => { const n = { ...prev }; delete n[index]; return n; });
        setSerialDrawerError("");
    };

    /** Handle serial field change or paste: if value splits into multiple serials, distribute (same rules as scan). */
    const handleSerialDrawerBulkOrSingle = (index, value) => {
        const tokens = splitSerialInput(value);
        if (tokens.length <= 1) {
            handleSerialDrawerValueChange(index, value);
            return;
        }
        if (expandedSerialLineIndex == null) return;
        const line = lines[expandedSerialLineIndex];
        const pending = Number(line?.pending_qty) ?? 0;
        const available = line?.available_qty != null && !Number.isNaN(Number(line.available_qty))
            ? Number(line.available_qty) : Infinity;
        const maxAllowed = Math.min(pending, available);
        const shipNow = serialDrawerValues.length;

        if (tokens.length > maxAllowed) {
            setSerialDrawerError(`Too many serials (${tokens.length}). Cannot exceed remaining (${pending}) or available.`);
            return;
        }

        const existingLower = new Set(
            serialDrawerValues.map((v) => (v || "").trim().toLowerCase()).filter(Boolean)
        );
        const uniqueNew = tokens.filter((t) => !existingLower.has(t.trim().toLowerCase()));
        if (uniqueNew.length === 0) {
            setSerialDrawerError("All serials already entered.");
            return;
        }
        const newShipNow = Math.min(shipNow + uniqueNew.length, maxAllowed);

        if (newShipNow > shipNow) {
            setLines((prev) =>
                prev.map((l, i) =>
                    i !== expandedSerialLineIndex
                        ? l
                        : { ...l, ship_now: String(newShipNow), serials: (l.serials || []).slice(0, newShipNow) }
                )
            );
            setErrors((prev) => {
                const next = { ...prev };
                delete next[`line_${expandedSerialLineIndex}_ship_now`];
                return next;
            });
            const paddedSlots = [...serialDrawerValues, ...Array(newShipNow - shipNow).fill("")];
            const { nextSlots, overflow } = fillSerialSlots({
                slots: paddedSlots,
                startIndex: shipNow,
                incoming: uniqueNew,
                caseInsensitive: true,
            });
            if (overflow.length) {
                setSerialDrawerError(`Too many serials. ${overflow.length} not filled (limit ${maxAllowed}).`);
                return;
            }
            setSerialDrawerValues(nextSlots);
            setSerialDrawerFieldErrors({});
            setSerialDrawerError("");
            nextSlots.forEach((val, idx) => {
                if ((val || "").trim()) validateSerialWithBackend(idx, val);
            });
        } else {
            const { nextSlots, overflow, duplicates } = fillSerialSlots({
                slots: serialDrawerValues,
                startIndex: index,
                incoming: uniqueNew,
                caseInsensitive: true,
            });
            if (duplicates.length) {
                setSerialDrawerError(`Duplicate serial(s) ignored: ${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? "…" : ""}`);
            }
            if (overflow.length) {
                setSerialDrawerError(`Cannot add ${overflow.length} serial(s): quantity limit reached.`);
                return;
            }
            setSerialDrawerValues(nextSlots);
            setSerialDrawerError("");
            nextSlots.forEach((val, idx) => {
                if ((val || "").trim()) validateSerialWithBackend(idx, val);
            });
        }
    };

    const handleSerialDrawerKeyDown = (index, e) => {
        const shipNow = serialDrawerValues.length;
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            const value = (serialDrawerValues[index] || "").trim();
            if (value) validateSerialWithBackend(index, value);
            if (index < shipNow - 1) serialInputRefs.current[index + 1]?.focus();
            else handleSerialDrawerDone();
        }
    };

    const handleSerialDrawerDone = () => {
        const trimmed = serialDrawerValues.map((s) => String(s || "").trim());
        const emptyIndex = trimmed.findIndex((s) => !s);
        if (emptyIndex !== -1) {
            setSerialDrawerError("Please fill all serial numbers.");
            serialInputRefs.current[emptyIndex]?.focus();
            return;
        }
        const unique = new Set(trimmed);
        if (unique.size !== trimmed.length) {
            setSerialDrawerError("Duplicate serial numbers are not allowed.");
            return;
        }
        if (expandedSerialLineIndex == null) return;
        setLines((prev) =>
            prev.map((line, i) =>
                i !== expandedSerialLineIndex ? line : { ...line, serials: trimmed }
            )
        );
        setErrors((prev) => { const n = { ...prev }; delete n[`line_${expandedSerialLineIndex}_serials`]; return n; });
        closeSerialRowExpand();
    };

    const validate = () => {
        const validationErrors = {};
        if (!order?.id) validationErrors.order_id = "Please select an order";
        if (!formData.shipment_date) validationErrors.shipment_date = "Shipment Date is required";

        let hasShipItems = false;
        lines.forEach((line, index) => {
            const shipNow = Number(line.ship_now);
            if (!shipNow || shipNow <= 0) return;
            hasShipItems = true;
            if (!Number.isInteger(shipNow)) validationErrors[`line_${index}_ship_now`] = "Must be a whole number";
            else if (shipNow > line.pending_qty) {
                validationErrors[`line_${index}_ship_now`] = `Cannot exceed remaining (${line.pending_qty})`;
            } else if (
                line.available_qty != null &&
                !Number.isNaN(Number(line.available_qty)) &&
                shipNow > line.available_qty
            ) {
                validationErrors[`line_${index}_ship_now`] = `Cannot exceed available stock (${line.available_qty})`;
            }
            if (line.serial_required) {
                const serialCount = (line.serials || []).length;
                if (serialCount !== shipNow) {
                    validationErrors[`line_${index}_serials`] = `Serial count (${serialCount}) must match quantity (${shipNow})`;
                }
                const uniqueSerials = new Set(line.serials || []);
                if (uniqueSerials.size !== (line.serials || []).length) {
                    validationErrors[`line_${index}_serials`] = "Duplicate serial numbers are not allowed";
                }
            }
        });
        if (!hasShipItems && order?.id) {
            validationErrors.items = "Please enter Ship Now quantity for at least one line";
        }
        return validationErrors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            const firstKey = Object.keys(validationErrors)[0];
            if (firstKey === "items") {
                const section = document.querySelector("[data-lines-section]");
                if (section) section.scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
                const el = document.querySelector(`[name="${firstKey}"]`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return;
        }
        setErrors({});

        const items = [];
        for (const line of lines) {
            const shipNow = Number(line.ship_now);
            if (!shipNow || shipNow <= 0) continue;
            let serials = [];
            if (line.serial_required) {
                serials = (line.serials || []).map((s) => (s || "").trim()).filter(Boolean);
            }
            items.push({
                product_id: line.product_id,
                quantity: shipNow,
                b2b_sales_order_item_id: line.b2b_sales_order_item_id,
                serials: serials.join(", "),
            });
        }

        const payload = {
            b2b_sales_order_id: Number(order.id),
            shipment_date: formData.shipment_date,
            transporter: formData.transporter || null,
            remarks: formData.remarks || null,
            items,
        };
        onSubmit(payload);
    };

    const totalShipNow = lines.reduce((sum, l) => sum + (Number(l.ship_now) || 0), 0);
    const totalRemaining = lines.reduce((sum, l) => sum + (l.pending_qty || 0), 0);
    const itemsToShip = lines.filter((l) => Number(l.ship_now) > 0).length;

    const orderOptions = availableOrders.map((o) => ({
        id: o.id,
        order_number: o.order_no || o.id,
        customer_name: o.client?.client_name || "",
        planned_warehouse_name: o.plannedWarehouse?.name || "",
        ...o,
    }));

    if (initialLoading && !ordersLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <FormContainer>
                <Box sx={{ p: { xs: 1.5, sm: 1 } }}>
                    {serverError && (
                        <Alert severity="error" sx={{ mb: 1 }} onClose={onClearServerError}>
                            {serverError}
                        </Alert>
                    )}

                    {/* ─── Section 1: Shipment Information ─────────────────── */}
                    <Card sx={{ mb: 0.75 }}>
                        <CardContent sx={compactCardContentSx}>
                            <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Shipment Information
                                </Typography>
                            </Box>
                            <Grid container spacing={COMPACT_FORM_SPACING}>
                                <Grid item size={{ xs: 12, md: 4 }}>
                                    {!order ? (
                                        <AutocompleteField
                                            name="order_id"
                                            label="Confirmed Order"
                                            options={orderOptions}
                                            getOptionLabel={(o) =>
                                                `${o.order_number || o.id} – ${o.customer_name || "N/A"} ${o.planned_warehouse_name ? `– ${o.planned_warehouse_name}` : ""}`
                                            }
                                            value={selectedOrderOption}
                                            onChange={(e, newValue) => {
                                                setSelectedOrderOption(newValue);
                                                if (newValue?.id) loadOrderById(newValue.id);
                                            }}
                                            placeholder="Type to search..."
                                            required
                                            error={!!errors.order_id}
                                            helperText={errors.order_id}
                                            disabled={ordersLoading || availableOrders.length === 0}
                                        />
                                    ) : (
                                        <Input
                                            size="small"
                                            name="order_display"
                                            label="Order"
                                            value={`${order.order_no || order.id} – ${order.client?.client_name || "N/A"} – ${order.plannedWarehouse?.name || "N/A"}`}
                                            disabled
                                        />
                                    )}
                                </Grid>

                                <Grid item size={{ xs: 12, md: 4 }}>
                                    <Input
                                        size="small"
                                        name="customer_name"
                                        label="Customer"
                                        value={order?.client?.client_name || ""}
                                        disabled
                                    />
                                </Grid>

                                <Grid item size={{ xs: 12, md: 4 }}>
                                    <Input
                                        size="small"
                                        name="warehouse_name"
                                        label="Warehouse"
                                        value={order?.plannedWarehouse?.name || ""}
                                        disabled
                                    />
                                </Grid>

                                <Grid item size={{ xs: 12, md: 4 }}>
                                    <DateField
                                        size="small"
                                        name="shipment_date"
                                        label="Shipment Date"
                                        value={formData.shipment_date}
                                        onChange={handleChange}
                                        required
                                        error={!!errors.shipment_date}
                                        helperText={errors.shipment_date}
                                        disabled={!order}
                                    />
                                </Grid>

                                <Grid item size={{ xs: 12, md: 4 }}>
                                    <Input
                                        size="small"
                                        name="transporter"
                                        label="Transporter"
                                        value={formData.transporter}
                                        onChange={handleChange}
                                        disabled={!order}
                                    />
                                </Grid>

                                <Grid item size={{ xs: 12, md: 8 }}>
                                    <Input
                                        size="small"
                                        name="remarks"
                                        label="Remarks"
                                        value={formData.remarks}
                                        onChange={handleChange}
                                        fullWidth
                                        multiline
                                        rows={1}
                                        disabled={!order}
                                    />
                                </Grid>
                            </Grid>
                            {order && (
                                <Box sx={{ mt: 1 }}>
                                    <BillToShipToDisplay
                                        billTo={order.client}
                                        shipTo={order.shipTo}
                                    />
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* ─── Section 2: Order Lines ───────────────────────────── */}
                    <Card data-lines-section>
                        <CardContent sx={compactCardContentSx}>
                            <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Order Lines
                                </Typography>
                            </Box>
                            {errors.items && (
                                <Alert severity="error" sx={{ mb: 1 }}>
                                    {errors.items}
                                </Alert>
                            )}

                            {lines.length > 0 ? (
                                <Fragment>
                                    {/* ── Mobile card list ─────────────────── */}
                                    <Box sx={{ display: { xs: "block", sm: "none" }, mt: 0.5 }}>
                                        {lines.map((line, index) => {
                                            const shipNow = Number(line.ship_now) || 0;
                                            const serialCount = (line.serials || []).length;
                                            const isSerialLine = line.serial_required && shipNow > 0;
                                            const isExpanded = expandedSerialLineIndex === index;
                                            return (
                                                <Card key={line.product_id || line.b2b_sales_order_item_id || index} sx={{ mb: 1, border: 1, borderColor: "divider" }} variant="outlined">
                                                    <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                                                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 0.75 }}>
                                                            <Box sx={{ flex: 1 }}>
                                                                <Typography variant="subtitle2" fontWeight={600}>
                                                                    {index + 1}. {line.product_name}
                                                                </Typography>
                                                                {(line.product_type_name || line.make_name) && (
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {[line.product_type_name, line.make_name].filter(Boolean).join(" · ")}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                            {line.serial_required && (
                                                                <Chip label="SERIAL" size="small" color="primary" sx={{ height: 20, fontSize: "0.65rem", flexShrink: 0 }} />
                                                            )}
                                                        </Box>

                                                        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1.25 }}>
                                                            {[
                                                                { label: "Ordered", value: line.required_qty },
                                                                { label: "Avail", value: Number(line.available_qty) || 0 },
                                                                { label: "Shipped", value: line.shipped_qty },
                                                            ].map(({ label, value }) => (
                                                                <Box key={label}>
                                                                    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                                                                    <Typography variant="body2">{value}</Typography>
                                                                </Box>
                                                            ))}
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary" display="block">Remaining</Typography>
                                                                <Typography variant="body2" fontWeight="medium" color={line.pending_qty > 0 ? "warning.main" : "success.main"}>
                                                                    {line.pending_qty} {line.unit_name || ""}
                                                                </Typography>
                                                            </Box>
                                                        </Box>

                                                        <Input
                                                            type="number"
                                                            size="small"
                                                            label="Ship Now"
                                                            value={line.ship_now}
                                                            onChange={(e) => handleShipNowChange(index, e.target.value)}
                                                            inputProps={{ min: 0, max: line.pending_qty }}
                                                            error={!!errors[`line_${index}_ship_now`]}
                                                            helperText={errors[`line_${index}_ship_now`]}
                                                            disabled={!order}
                                                            fullWidth
                                                        />

                                                        {isSerialLine && (
                                                            <Box sx={{ mt: 1.5 }}>
                                                                <Box
                                                                    sx={{
                                                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                                                        p: 1.25, borderRadius: 1, border: 1,
                                                                        borderColor: errors[`line_${index}_serials`] ? "error.main" : "divider",
                                                                        bgcolor: "action.hover", cursor: "pointer", minHeight: 44,
                                                                    }}
                                                                    onClick={() => toggleSerialRowExpand(index)}
                                                                >
                                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                        <QrCodeScannerIcon fontSize="small" color={serialCount === shipNow ? "success" : "action"} />
                                                                        <Typography variant="body2">Serials: {serialCount} / {shipNow}</Typography>
                                                                    </Box>
                                                                    {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                                                </Box>
                                                                {errors[`line_${index}_serials`] && (
                                                                    <FormHelperText error sx={{ mt: 0.5 }}>{errors[`line_${index}_serials`]}</FormHelperText>
                                                                )}

                                                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                                    <Box sx={{ pt: 1.5 }}>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="w-full mb-3 min-h-[44px] touch-manipulation flex items-center justify-center gap-1.5"
                                                                            onClick={openScanner}
                                                                        >
                                                                            <QrCodeScannerIcon sx={{ fontSize: 20 }} />
                                                                            Scan Barcode / QR Code
                                                                        </Button>
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
                                                                            sx={{ mb: 1.5 }}
                                                                            helperText="Point scanner here; it will type and press Enter."
                                                                        />
                                                                        <Divider sx={{ mb: 1.5 }}>
                                                                            <Typography variant="caption" color="text.secondary">or type manually</Typography>
                                                                        </Divider>
                                                                        {serialDrawerError && (
                                                                            <Alert severity="error" sx={{ mb: 1 }} onClose={() => setSerialDrawerError("")}>
                                                                                {serialDrawerError}
                                                                            </Alert>
                                                                        )}
                                                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, mb: 1.5 }}>
                                                                            {isExpanded && serialDrawerValues.length === shipNow && serialDrawerValues.map((value, idx) => (
                                                                                <TextField
                                                                                    key={idx}
                                                                                    size="small"
                                                                                    fullWidth
                                                                                    label={`Serial ${idx + 1} of ${shipNow}`}
                                                                                    value={value}
                                                                                    onChange={(e) => handleSerialDrawerBulkOrSingle(idx, e.target.value)}
                                                                                    onBlur={() => value?.trim() && validateSerialWithBackend(idx, value)}
                                                                                    onKeyDown={(e) => handleSerialDrawerKeyDown(idx, e)}
                                                                                    inputRef={(el) => { serialInputRefs.current[idx] = el; }}
                                                                                    variant="outlined"
                                                                                    error={!!serialDrawerFieldErrors[idx]}
                                                                                    helperText={serialDrawerFieldErrors[idx]}
                                                                                    InputProps={{
                                                                                        endAdornment: serialDrawerValidating === idx
                                                                                            ? <CircularProgress size={16} sx={{ ml: 0.5 }} />
                                                                                            : value?.trim()
                                                                                                ? <IconButton size="small" tabIndex={-1} edge="end" onClick={() => handleSerialDrawerValueChange(idx, "")}>
                                                                                                    <ClearIcon fontSize="small" />
                                                                                                </IconButton>
                                                                                                : null,
                                                                                    }}
                                                                                />
                                                                            ))}
                                                                        </Box>
                                                                        <Box sx={{ display: "flex", gap: 1 }}>
                                                                            <Button type="button" variant="outline" size="sm" className="flex-1 min-h-[44px] touch-manipulation" onClick={closeSerialRowExpand}>
                                                                                Cancel
                                                                            </Button>
                                                                            <Button type="button" size="sm" className="flex-1 min-h-[44px] touch-manipulation" onClick={handleSerialDrawerDone}>
                                                                                Done
                                                                            </Button>
                                                                        </Box>
                                                                    </Box>
                                                                </Collapse>
                                                            </Box>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </Box>

                                    {/* ── Desktop table ────────────────────────── */}
                                    <Box sx={{ display: { xs: "none", sm: "block" } }}>
                                        <TableContainer component={Paper} sx={{ mt: 0.5 }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell><strong>#</strong></TableCell>
                                                        <TableCell sx={{ minWidth: 220 }}><strong>Product</strong></TableCell>
                                                        <TableCell><strong>Type</strong></TableCell>
                                                        <TableCell><strong>Make</strong></TableCell>
                                                        <TableCell align="right"><strong>Ordered</strong></TableCell>
                                                        <TableCell align="right"><strong>Avail.</strong></TableCell>
                                                        <TableCell align="right"><strong>Shipped</strong></TableCell>
                                                        <TableCell align="right"><strong>Rem.</strong></TableCell>
                                                        <TableCell align="right" sx={{ minWidth: 110 }}><strong>Ship Now</strong></TableCell>
                                                        <TableCell sx={{ minWidth: 120 }}><strong>Serials</strong></TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {lines.map((line, index) => {
                                                        const shipNow = Number(line.ship_now) || 0;
                                                        const serialCount = (line.serials || []).length;
                                                        const isSerialLine = line.serial_required && shipNow > 0;
                                                        const isExpanded = expandedSerialLineIndex === index;
                                                        return (
                                                            <Fragment key={line.product_id || line.b2b_sales_order_item_id || index}>
                                                                <TableRow
                                                                    sx={{
                                                                        "&:nth-of-type(odd)": { backgroundColor: "action.hover" },
                                                                        ...(isSerialLine && { cursor: "pointer" }),
                                                                    }}
                                                                    onClick={(e) => {
                                                                        if (!isSerialLine) return;
                                                                        if (e.target.closest("[data-no-row-toggle]")) return;
                                                                        toggleSerialRowExpand(index);
                                                                    }}
                                                                >
                                                                    <TableCell sx={compactCellSx}>{index + 1}</TableCell>
                                                                    <TableCell sx={compactCellSx}>
                                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                                            {isSerialLine && (
                                                                                <IconButton size="small" sx={{ p: 0.25 }} aria-label={isExpanded ? "Collapse" : "Expand"}>
                                                                                    {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                                                                </IconButton>
                                                                            )}
                                                                            <Typography variant="body2" fontWeight="medium" sx={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                                                                                {line.product_name}
                                                                            </Typography>
                                                                            {line.serial_required && (
                                                                                <Chip label="SERIAL" size="small" color="primary" sx={{ mt: 0.25, height: 18, fontSize: "0.65rem" }} />
                                                                            )}
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell sx={compactCellSx}>{line.product_type_name}</TableCell>
                                                                    <TableCell sx={compactCellSx}>{line.make_name}</TableCell>
                                                                    <TableCell sx={compactCellSx} align="right">{line.required_qty}</TableCell>
                                                                    <TableCell sx={compactCellSx} align="right">{Number(line.available_qty) || 0}</TableCell>
                                                                    <TableCell sx={compactCellSx} align="right">{line.shipped_qty}</TableCell>
                                                                    <TableCell sx={compactCellSx} align="right">
                                                                        <Typography variant="body2" fontWeight="medium" color={line.pending_qty > 0 ? "warning.main" : "success.main"}>
                                                                            {line.pending_qty} {line.unit_name || ""}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell sx={compactCellSx} data-no-row-toggle>
                                                                        <Input
                                                                            type="number"
                                                                            size="small"
                                                                            value={line.ship_now}
                                                                            onChange={(e) => handleShipNowChange(index, e.target.value)}
                                                                            inputProps={{ min: 0, max: line.pending_qty }}
                                                                            error={!!errors[`line_${index}_ship_now`]}
                                                                            helperText={errors[`line_${index}_ship_now`]}
                                                                            disabled={!order}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell sx={{ ...compactCellSx, minWidth: 120, maxWidth: 140 }}>
                                                                        {line.serial_required && shipNow > 0 ? (
                                                                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                                                                <Typography variant="caption" color="text.secondary" noWrap title={`${serialCount} / ${shipNow} serials`}>
                                                                                    {serialCount} / {shipNow} serials
                                                                                </Typography>
                                                                                {line.serials?.length > 0 && (
                                                                                    <Typography variant="caption" color="text.secondary">
                                                                                        {line.serials.length <= 2
                                                                                            ? line.serials.join(", ")
                                                                                            : `${line.serials.slice(0, 2).join(", ")} and ${line.serials.length - 2} more`}
                                                                                    </Typography>
                                                                                )}
                                                                                {errors[`line_${index}_serials`] && (
                                                                                    <FormHelperText error sx={{ mt: 0.5 }}>{errors[`line_${index}_serials`]}</FormHelperText>
                                                                                )}
                                                                            </Box>
                                                                        ) : (
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {line.serial_required ? "Enter quantity to add serials" : "-"}
                                                                            </Typography>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                                {isSerialLine && (
                                                                    <TableRow sx={{ "& > td": { borderBottom: isExpanded ? undefined : "none", py: 0, verticalAlign: "top" } }}>
                                                                        <TableCell colSpan={10} sx={{ p: 0, borderBottom: isExpanded ? undefined : "none" }}>
                                                                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                                                <Box data-no-row-toggle sx={{ p: 2, bgcolor: "action.hover", borderBottom: 1, borderColor: "divider" }}>
                                                                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, flexWrap: "wrap", gap: 1 }}>
                                                                                        <Typography variant="subtitle2" color="text.secondary">
                                                                                            Enter exactly {shipNow} serial number(s). Use TAB or ENTER to move to the next.
                                                                                        </Typography>
                                                                                        <Button type="button" variant="outline" size="sm" className="flex items-center gap-1.5 min-h-[36px] touch-manipulation" onClick={openScanner}>
                                                                                            <QrCodeScannerIcon sx={{ fontSize: 18 }} />
                                                                                            Scan Barcode
                                                                                        </Button>
                                                                                    </Box>
                                                                                    <TextField
                                                                                        inputRef={gunScanRef}
                                                                                        size="small"
                                                                                        label="Scan with gun"
                                                                                        placeholder="Scanner gun types here, then Enter"
                                                                                        value={gunScanValue}
                                                                                        onChange={(e) => setGunScanValue(e.target.value)}
                                                                                        onKeyDown={handleGunScanKeyDown}
                                                                                        variant="outlined"
                                                                                        sx={{ mb: 1, minWidth: 280 }}
                                                                                        helperText="Point scanner here; it will type and press Enter."
                                                                                    />
                                                                                    {serialDrawerError && (
                                                                                        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setSerialDrawerError("")}>
                                                                                            {serialDrawerError}
                                                                                        </Alert>
                                                                                    )}
                                                                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 1.5 }}>
                                                                                        {isExpanded && serialDrawerValues.length === shipNow && serialDrawerValues.map((value, idx) => (
                                                                                            <Box key={idx} sx={{ minWidth: 200 }}>
                                                                                                <TextField
                                                                                                    size="small"
                                                                                                    fullWidth
                                                                                                    sx={{ minWidth: 180 }}
                                                                                                    label={`Serial ${idx + 1} of ${shipNow}`}
                                                                                                    value={value}
                                                                                                    onChange={(e) => handleSerialDrawerBulkOrSingle(idx, e.target.value)}
                                                                                                    onBlur={() => value?.trim() && validateSerialWithBackend(idx, value)}
                                                                                                    onKeyDown={(e) => handleSerialDrawerKeyDown(idx, e)}
                                                                                                    inputRef={(el) => { serialInputRefs.current[idx] = el; }}
                                                                                                    variant="outlined"
                                                                                                    error={!!serialDrawerFieldErrors[idx]}
                                                                                                    helperText={serialDrawerFieldErrors[idx]}
                                                                                                    InputProps={{
                                                                                                        endAdornment: serialDrawerValidating === idx
                                                                                                            ? <CircularProgress size={16} sx={{ ml: 0.5 }} />
                                                                                                            : value?.trim()
                                                                                                                ? <IconButton size="small" tabIndex={-1} edge="end" onClick={() => handleSerialDrawerValueChange(idx, "")}>
                                                                                                                    <ClearIcon fontSize="small" />
                                                                                                                </IconButton>
                                                                                                                : null,
                                                                                                    }}
                                                                                                />
                                                                                            </Box>
                                                                                        ))}
                                                                                    </Box>
                                                                                    <Box sx={{ display: "flex", gap: 1 }}>
                                                                                        <Button type="button" variant="outline" size="sm" onClick={closeSerialRowExpand}>Cancel</Button>
                                                                                        <Button type="button" size="sm" onClick={handleSerialDrawerDone}>Done</Button>
                                                                                    </Box>
                                                                                </Box>
                                                                            </Collapse>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </Fragment>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                </Fragment>
                            ) : (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    {order ? "No order lines found" : "Select a Confirmed Order to load lines"}
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    {/* ─── Section 3: Shipping Summary ────────────────────── */}
                    {lines.length > 0 && (
                        <Card sx={{ mt: 0.75 }}>
                            <CardContent sx={compactCardContentSx}>
                                <Box sx={COMPACT_SECTION_HEADER_STYLE}>
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        Shipping Summary
                                    </Typography>
                                </Box>
                                <Grid container spacing={COMPACT_FORM_SPACING}>
                                    <Grid item size={{ xs: 12, md: 4 }}>
                                        <Typography variant="caption" color="text.secondary">Items to Ship</Typography>
                                        <Typography variant="subtitle1">{itemsToShip}</Typography>
                                    </Grid>
                                    <Grid item size={{ xs: 12, md: 4 }}>
                                        <Typography variant="caption" color="text.secondary">Total Ship Now Quantity</Typography>
                                        <Typography variant="subtitle1" color="primary.main">{totalShipNow}</Typography>
                                    </Grid>
                                    <Grid item size={{ xs: 12, md: 4 }}>
                                        <Typography variant="caption" color="text.secondary">Total Remaining After Ship</Typography>
                                        <Typography variant="subtitle1" color={totalRemaining - totalShipNow > 0 ? "warning.main" : "success.main"}>
                                            {totalRemaining - totalShipNow}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    )}
                </Box>

                <FormActions className="p-2 gap-2">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="min-h-[44px] touch-manipulation">
                            Cancel
                        </Button>
                    )}
                    <LoadingButton
                        type="submit"
                        loading={loading}
                        className="min-w-[120px] min-h-[44px] touch-manipulation"
                        disabled={!order}
                    >
                        Create Shipment
                    </LoadingButton>
                </FormActions>
            </FormContainer>

            <BarcodeScanner
                open={scannerOpen}
                onScan={handleScanResult}
                onClose={() => { setScannerOpen(false); setScanTargetIndex(null); }}
                hint={scanHint}
            />
        </Box>
    );
}
