"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Box, Typography, Alert, Paper, Stack, Tabs, Tab } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { usePathname } from "next/navigation";
import moment from "moment";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import Checkbox from "@/components/common/Checkbox";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Loader from "@/components/common/Loader";
import orderService from "@/services/orderService";
import companyService from "@/services/companyService";
import quotationService from "@/services/quotationService";
import projectPriceService from "@/services/projectPriceService";
import { toastSuccess, toastError } from "@/utils/toast";
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { preventEnterSubmit } from "@/lib/preventEnterSubmit";
import { useAuth } from "@/hooks/useAuth";

/** Number of days after planner completion during which the planner remains editable. */
const PLANNER_EDITABLE_DAYS = 100;

const normalizeRoleName = (s) =>
    String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

const normalizeProductTypeName = (s) => (s || "").toLowerCase().trim().replace(/\s+/g, "_");

const productTypeNameToBarKey = (normalized) => {
    if (!normalized) return null;
    switch (normalized) {
        case "structure":
            return "structure";
        case "panel":
        case "solar_panel":
            return "solar_panel";
        case "inverter":
            return "inverter";
        case "acdb":
            return "acdb";
        case "dcdb":
            return "dcdb";
        case "earthing":
        case "earthing_kit":
            return "earthing_kit";
        case "cable":
        case "cables":
        case "dc_cable":
        case "ac_cable":
            return "cables";
        default:
            return null;
    }
};

function mergeRowAdjustmentsIntoSurvivor(surv, dup) {
    const s = surv || {};
    const d = dup || {};
    if (s.gst_mode && d.gst_mode && s.gst_mode !== d.gst_mode) {
        return { error: "Conflicting GST mode on duplicate BOM rows for the same product.", merged: null };
    }
    const numPos = (v) => {
        if (v === "" || v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : null;
    };
    const sEx = numPos(s.manual_unit_price_excluding_gst);
    const dEx = numPos(d.manual_unit_price_excluding_gst);
    const sIn = numPos(s.manual_unit_price_including_gst);
    const dIn = numPos(d.manual_unit_price_including_gst);
    if (sEx != null && dEx != null && Math.abs(sEx - dEx) > 0.001) {
        return { error: "Conflicting manual unit prices on duplicate BOM rows for the same product.", merged: null };
    }
    if (sIn != null && dIn != null && Math.abs(sIn - dIn) > 0.001) {
        return { error: "Conflicting manual unit prices on duplicate BOM rows for the same product.", merged: null };
    }
    const merged = {
        gst_mode: s.gst_mode || d.gst_mode || "INCLUDING_GST",
        note: [s.note, d.note].filter((x) => x && String(x).trim()).join(" | ") || "",
        manual_unit_price_excluding_gst:
            sEx != null ? s.manual_unit_price_excluding_gst : (d.manual_unit_price_excluding_gst ?? ""),
        manual_unit_price_including_gst:
            sIn != null ? s.manual_unit_price_including_gst : (d.manual_unit_price_including_gst ?? ""),
    };
    return { merged, error: null };
}

/**
 * Merge duplicate BOM plan rows by product_id (matches API mergeBomSnapshotLinesByProductId).
 */
function mergeBomPlanByProductId(bomPlan, adjustmentByRow) {
    if (!Array.isArray(bomPlan) || bomPlan.length === 0) {
        return {
            mergedPlan: bomPlan || [],
            mergedAdjustmentByRow: { ...(adjustmentByRow || {}) },
            error: null,
        };
    }
    const qty = (n) => (n != null && !Number.isNaN(Number(n)) ? Number(n) : 0);
    const plannedOf = (line) => {
        const pq = line?.planned_qty;
        if (pq != null && pq !== "" && !Number.isNaN(Number(pq))) return Number(pq);
        return qty(line?.quantity);
    };

    const mergedPlan = [];
    const indexByProductId = new Map();
    const nextAdj = { ...(adjustmentByRow || {}) };

    for (const line of bomPlan) {
        const pid = Number(line?.product_id);
        if (!Number.isInteger(pid) || pid <= 0) {
            mergedPlan.push(line);
            continue;
        }
        if (!indexByProductId.has(pid)) {
            indexByProductId.set(pid, mergedPlan.length);
            mergedPlan.push(line);
            continue;
        }
        const idx = indexByProductId.get(pid);
        const canon = mergedPlan[idx];
        const survivorKey = canon.__rowKey;
        const absorbedKey = line.__rowKey;

        const r = mergeRowAdjustmentsIntoSurvivor(nextAdj[survivorKey], nextAdj[absorbedKey]);
        if (r.error) {
            return { mergedPlan: null, mergedAdjustmentByRow: null, error: r.error };
        }
        nextAdj[survivorKey] = r.merged;
        delete nextAdj[absorbedKey];

        const merged = {
            ...canon,
            quantity: qty(canon.quantity) + qty(line.quantity),
            planned_qty: plannedOf(canon) + plannedOf(line),
            shipped_qty: Math.max(qty(canon.shipped_qty), qty(line.shipped_qty)),
            returned_qty: Math.max(qty(canon.returned_qty), qty(line.returned_qty)),
            planner_added: !!canon.planner_added,
        };
        const baseCanon = canon.baseline_planned_qty;
        const baseLine = line.baseline_planned_qty;
        if (baseCanon != null || baseLine != null) {
            merged.baseline_planned_qty = qty(baseCanon) + qty(baseLine);
        }
        if (line.planned === true || canon.planned === true) {
            merged.planned = true;
        } else if (line.planned === false && canon.planned === false) {
            merged.planned = false;
        }
        mergedPlan[idx] = merged;
    }

    return { mergedPlan, mergedAdjustmentByRow: nextAdj, error: null };
}

function computePlannerCostPreviewFromInputs({
    projectCost,
    bomPlan,
    adjustmentByRow,
    purchasePriceByProductId,
    removedLineAdjustments,
    manualFinalPayable,
    isManualOverride,
    isSuperAdmin,
}) {
    const baseProjectCost = Number(projectCost) || 0;
    const qtyNum = (n) => (n != null && !Number.isNaN(Number(n)) ? Number(n) : 0);
    const activeLines = (bomPlan || []).map((line) => {
        const adjustment = (adjustmentByRow || {})[line.__rowKey] || {};
        const editedPlannedQty = qtyNum(line.planned_qty ?? line.quantity);
        const baselinePlannedQty = qtyNum(line.baseline_planned_qty ?? line.quantity);
        const qtyDelta = editedPlannedQty - baselinePlannedQty;
        const gstMode = adjustment.gst_mode || "INCLUDING_GST";
        const price = purchasePriceByProductId[line.product_id] || null;
        const gstRate = Number(price?.gst_rate) || 0;
        const hasPriceFromPo = !price?.missing_price &&
            Number.isFinite(Number(price?.unit_price_excluding_gst)) &&
            Number(price?.unit_price_excluding_gst) > 0;
        const manualExclRaw = Number(adjustment?.manual_unit_price_excluding_gst);
        const manualInclRaw = Number(adjustment?.manual_unit_price_including_gst);
        const hasManualExcl = Number.isFinite(manualExclRaw) && manualExclRaw > 0;
        const hasManualIncl = Number.isFinite(manualInclRaw) && manualInclRaw > 0;
        let unitExcl = Number(price?.unit_price_excluding_gst) || 0;
        let unitIncl = Number(price?.unit_price_including_gst) || 0;
        let priceSource = "LATEST_PURCHASE";
        if (!hasPriceFromPo) {
            priceSource = "MANUAL_FALLBACK";
            if (hasManualExcl && hasManualIncl) {
                unitExcl = manualExclRaw;
                unitIncl = manualInclRaw;
            } else if (hasManualExcl) {
                unitExcl = manualExclRaw;
                unitIncl = unitExcl * (1 + gstRate / 100);
            } else if (hasManualIncl) {
                unitIncl = manualInclRaw;
                unitExcl = unitIncl / (1 + gstRate / 100);
            } else {
                unitExcl = 0;
                unitIncl = 0;
            }
        }
        const amountExcl = qtyDelta * unitExcl;
        const amountIncl = qtyDelta * unitIncl;
        const deltaCost = gstMode === "EXCLUDING_GST" ? amountExcl : amountIncl;
        return {
            rowKey: line.__rowKey,
            qtyDelta,
            gstMode,
            product_id: line.product_id,
            price,
            gstRate,
            unitExcl,
            unitIncl,
            priceSource,
            amountExcl,
            amountIncl,
            deltaCost,
        };
    });
    const removedLines = (removedLineAdjustments || []).map((line) => {
        const qtyDelta = qtyNum(line.qtyDelta);
        const gstMode = line.gstMode || "INCLUDING_GST";
        const price = purchasePriceByProductId[line.product_id] || null;
        const gstRate = Number(price?.gst_rate) || 0;
        const hasPriceFromPo = !price?.missing_price &&
            Number.isFinite(Number(price?.unit_price_excluding_gst)) &&
            Number(price?.unit_price_excluding_gst) > 0;
        const manualExclRaw = Number(line?.manual_unit_price_excluding_gst);
        const manualInclRaw = Number(line?.manual_unit_price_including_gst);
        const hasManualExcl = Number.isFinite(manualExclRaw) && manualExclRaw > 0;
        const hasManualIncl = Number.isFinite(manualInclRaw) && manualInclRaw > 0;
        let unitExcl = Number(price?.unit_price_excluding_gst) || 0;
        let unitIncl = Number(price?.unit_price_including_gst) || 0;
        let priceSource = "LATEST_PURCHASE";
        if (!hasPriceFromPo) {
            priceSource = "MANUAL_FALLBACK";
            if (hasManualExcl && hasManualIncl) {
                unitExcl = manualExclRaw;
                unitIncl = manualInclRaw;
            } else if (hasManualExcl) {
                unitExcl = manualExclRaw;
                unitIncl = unitExcl * (1 + gstRate / 100);
            } else if (hasManualIncl) {
                unitIncl = manualInclRaw;
                unitExcl = unitIncl / (1 + gstRate / 100);
            } else {
                unitExcl = 0;
                unitIncl = 0;
            }
        }
        const amountExcl = qtyDelta * unitExcl;
        const amountIncl = qtyDelta * unitIncl;
        const deltaCost = gstMode === "EXCLUDING_GST" ? amountExcl : amountIncl;
        return {
            rowKey: line.rowKey,
            qtyDelta,
            gstMode,
            product_id: line.product_id,
            price,
            gstRate,
            unitExcl,
            unitIncl,
            priceSource,
            amountExcl,
            amountIncl,
            deltaCost,
        };
    });
    const lines = [...activeLines, ...removedLines];
    const autoProjectCost = baseProjectCost + lines.reduce((sum, line) => sum + line.deltaCost, 0);
    const manual = manualFinalPayable === "" ? null : Number(manualFinalPayable);
    const finalProjectCost =
        isSuperAdmin && isManualOverride && Number.isFinite(manual) ? manual : autoProjectCost;
    return {
        baseProjectCost,
        autoProjectCost,
        finalProjectCost,
        lines,
    };
}

function computeBomCapacityPreviewKw(bomPlan) {
    const qtyNum = (n) => (n != null && !Number.isNaN(Number(n)) ? Number(n) : 0);
    let totalW = 0;
    let sawPanel = false;
    for (const line of bomPlan || []) {
        const p = line.product_snapshot || line;
        const key = productTypeNameToBarKey(normalizeProductTypeName(p?.product_type_name ?? ""));
        if (key !== "solar_panel") continue;
        sawPanel = true;
        const w = qtyNum(p?.capacity);
        const q = qtyNum(line.planned_qty ?? line.quantity);
        totalW += w * q;
    }
    if (!sawPanel) return null;
    return Math.round((totalW / 1000 + Number.EPSILON) * 100) / 100;
}

export default function Planner({ orderId, orderData, onSuccess, amendMode = false }) {
    const pathname = usePathname();
    const isReadOnly = pathname?.startsWith("/closed-orders") || pathname?.startsWith("/cancelled-orders");
    const { user } = useAuth();
    const isSuperAdmin = normalizeRoleName(user?.role?.name) === "superadmin";
    // All material checkboxes (planned_has_*) default to true; sync from orderData uses ?? true.
    const [formData, setFormData] = useState({
        planned_delivery_date: "",
        planned_priority: "Medium",
        planned_warehouse_id: "",
        planned_remarks: "",
        planned_has_structure: true,
        planned_has_solar_panel: true,
        planned_has_inverter: true,
        planned_has_acdb: true,
        planned_has_dcdb: true,
        planned_has_earthing_kit: true,
        planned_has_cables: true,
    });

    const [activeTab, setActiveTab] = useState("add_planner");
    const [warehouses, setWarehouses] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState(null);
    // Local, UI-only planning state for BOM lines. Each entry mirrors one line
    // from orderData.bom_snapshot and adds a `planned` flag. Currently we do
    // not persist this back to the API; it's for operator visibility and
    // future extension (e.g. planner_bom_plan JSON on the order).
    const [bomPlan, setBomPlan] = useState([]);
    const [outstandingConfirmOpen, setOutstandingConfirmOpen] = useState(false);
    const [pendingPayload, setPendingPayload] = useState(null);
    const [outstandingInfo, setOutstandingInfo] = useState(null);
    // Add BOM line dialog
    const [addBomOpen, setAddBomOpen] = useState(false);
    const [addBomProduct, setAddBomProduct] = useState(null);
    const [addBomQty, setAddBomQty] = useState(1);
    const [productsForBom, setProductsForBom] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    // Import BOM from project: when order has no BOM, show project dropdown
    const [projectPricesWithBom, setProjectPricesWithBom] = useState([]);
    const [loadingProjectPrices, setLoadingProjectPrices] = useState(false);
    const [selectedProjectForImport, setSelectedProjectForImport] = useState(null);
    const [importingFromProject, setImportingFromProject] = useState(false);
    const [purchasePriceByProductId, setPurchasePriceByProductId] = useState({});
    const [adjustmentByRow, setAdjustmentByRow] = useState({});
    const [manualFinalPayable, setManualFinalPayable] = useState("");
    const [isManualOverride, setIsManualOverride] = useState(false);
    const [loadingPrices, setLoadingPrices] = useState(false);
    const [costAmendments, setCostAmendments] = useState([]);
    const [costUpdateSummary, setCostUpdateSummary] = useState(null);
    const [removedLineAdjustments, setRemovedLineAdjustments] = useState([]);
    const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
    const [saveConfirmPayload, setSaveConfirmPayload] = useState(null);
    const [saveConfirmSummary, setSaveConfirmSummary] = useState(null);
    /** After BOM import from project, skip one planner save of cost amendments / override so project_cost stays as on order. */
    const skipNextPlannerCostEffectsRef = useRef(false);

    useEffect(() => {
        fetchWarehouses();
    }, []);

    useEffect(() => {
        if (!isSuperAdmin) setIsManualOverride(false);
    }, [isSuperAdmin]);

    // Sync formData from orderData only when the order changes (or first load). Avoid overwriting
    // user input when the parent re-renders and passes a new orderData reference.
    useEffect(() => {
        if (!orderData?.id) return;
        const plannerCompleted = orderData.stages?.planner === "completed";
        const defaultChecked = (val) => (plannerCompleted ? (val ?? true) : true);

        setFormData({
            planned_delivery_date: orderData.planned_delivery_date ? moment(orderData.planned_delivery_date).format("YYYY-MM-DD") : "",
            planned_priority: orderData.planned_priority || "Medium",
            planned_warehouse_id: orderData.planned_warehouse_id || "",
            planned_remarks: orderData.planned_remarks || "",
            planned_has_structure: defaultChecked(orderData.planned_has_structure),
            planned_has_solar_panel: defaultChecked(orderData.planned_has_solar_panel),
            planned_has_inverter: defaultChecked(orderData.planned_has_inverter),
            planned_has_acdb: defaultChecked(orderData.planned_has_acdb),
            planned_has_dcdb: defaultChecked(orderData.planned_has_dcdb),
            planned_has_earthing_kit: defaultChecked(orderData.planned_has_earthing_kit),
            planned_has_cables: defaultChecked(orderData.planned_has_cables),
        });

        // Build BOM planning snapshot from orderData.bom_snapshot. This is
        // local UI state; we will persist only planned quantities back to the API.
        if (Array.isArray(orderData.bom_snapshot)) {
            const qty = (n) => (n != null && !Number.isNaN(Number(n)) ? Number(n) : 0);
            const nextPlan = orderData.bom_snapshot.map((line, index) => ({
                    // retain the original line for reference
                    ...line,
                    // stable key for React rendering
                    __rowKey: `${orderData.id}-${index}-${line.product_id ?? "unknown"}`,
                    // mark as part of the current planning scope
                    planned: true,
                    // editable planned quantity (defaults from planned_qty or quantity)
                    planned_qty:
                        line.planned_qty != null && line.planned_qty !== ""
                            ? qty(line.planned_qty)
                            : qty(line.quantity),
                    baseline_planned_qty:
                        line.planned_qty != null && line.planned_qty !== ""
                            ? qty(line.planned_qty)
                            : qty(line.quantity),
                }));
            setBomPlan(nextPlan);
            const nextAdjustmentByRow = {};
            nextPlan.forEach((line) => {
                nextAdjustmentByRow[line.__rowKey] = {
                    gst_mode: "INCLUDING_GST",
                    note: "",
                    manual_unit_price_excluding_gst: "",
                    manual_unit_price_including_gst: "",
                };
            });
            setAdjustmentByRow(nextAdjustmentByRow);
        } else {
            setBomPlan([]);
            setAdjustmentByRow({});
        }
        setRemovedLineAdjustments([]);
        setManualFinalPayable("");
        setIsManualOverride(false);
        setCostUpdateSummary(null);
        setSaveConfirmOpen(false);
        setSaveConfirmPayload(null);
        setSaveConfirmSummary(null);
    }, [orderData]);

    const plannerOrderIdRef = useRef(undefined);
    useEffect(() => {
        if (plannerOrderIdRef.current !== undefined && plannerOrderIdRef.current !== orderId) {
            skipNextPlannerCostEffectsRef.current = false;
        }
        plannerOrderIdRef.current = orderId;
    }, [orderId]);

    const fetchWarehouses = async () => {
        try {
            const res = await companyService.listWarehouses();
            const data = res?.result ?? res?.data ?? res ?? [];
            setWarehouses(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch warehouses:", err);
            toastError(err?.response?.data?.message || err?.message || "Failed to load warehouses");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name } = e.target;
        const value = typeof e.target.checked === "boolean" ? e.target.checked : e.target.value;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const savePlanner = async (payload) => {
        try {
            const response = await orderService.updateOrder(orderId, payload);
            const updatedOrder = response?.result ?? response?.data ?? response ?? {};
            setCostUpdateSummary(updatedOrder?.cost_update_summary || null);
            try {
                const amendmentRes = await orderService.getOrderCostAmendments(orderId);
                const amendmentRows = amendmentRes?.result ?? amendmentRes?.data ?? amendmentRes ?? [];
                setCostAmendments(Array.isArray(amendmentRows) ? amendmentRows : []);
            } catch (amendmentErr) {
                console.error("Failed to refresh amendment history after save:", amendmentErr);
            }

            skipNextPlannerCostEffectsRef.current = false;

            const msg = "Planner details saved successfully!";
            setSuccessMsg(msg);
            toastSuccess(msg);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Failed to save planner details:", err);
            const errMsg = err?.response?.data?.message || err?.message || "Failed to save data";
            setError(errMsg);
            toastError(errMsg);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isReadOnly || isPlannerLocked || submitting) return;
        setSubmitting(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const newFieldErrors = {};
            if (!formData.planned_delivery_date) newFieldErrors.planned_delivery_date = "Required";
            if (!formData.planned_priority) newFieldErrors.planned_priority = "Required";
            if (!formData.planned_warehouse_id) newFieldErrors.planned_warehouse_id = "Required";

            // Require at least one BOM line to be in scope when there are any BOM lines
            if (bomPlan.length > 0) {
                const anyPlanned = bomPlan.some((line) => line.planned);
                if (!anyPlanned) {
                    newFieldErrors.bomPlan = "Select at least one BOM item for planning.";
                }
            }

            if (Object.keys(newFieldErrors).length > 0) {
                setFieldErrors(newFieldErrors);
                setSubmitting(false);
                return;
            }

            const bomMerge = mergeBomPlanByProductId(bomPlan, adjustmentByRow);
            if (bomMerge.error) {
                setError(bomMerge.error);
                setSubmitting(false);
                return;
            }
            const planForSave = bomMerge.mergedPlan;
            const adjForSave = bomMerge.mergedAdjustmentByRow;

            const costForSave = computePlannerCostPreviewFromInputs({
                projectCost: orderData?.project_cost,
                bomPlan: planForSave,
                adjustmentByRow: adjForSave,
                purchasePriceByProductId,
                removedLineAdjustments,
                manualFinalPayable,
                isManualOverride,
                isSuperAdmin,
            });
            const previewCapacityKwForSave = computeBomCapacityPreviewKw(planForSave);

            // Build updated BOM snapshot from merged plan (includes new lines from Add item)
            let updatedBomSnapshot = Array.isArray(orderData?.bom_snapshot) ? orderData.bom_snapshot : [];
            if (Array.isArray(planForSave) && planForSave.length > 0) {
                updatedBomSnapshot = planForSave.map((line) => {
                    const { __rowKey, planned, planner_added, ...rest } = line;
                    const qty = (n, fallback) => {
                        if (n === "" || n == null) return fallback;
                        const num = Number(n);
                        return Number.isNaN(num) ? fallback : num;
                    };
                    const baseQuantity = qty(rest.quantity, 0);
                    const plannedQty = qty(rest.planned_qty, baseQuantity);
                    return {
                        ...rest,
                        quantity: baseQuantity || plannedQty,
                        planned_qty: plannedQty,
                        ...(planner_added && { planner_added: true }),
                    };
                });
            }

            if (updatedBomSnapshot.length === 0) {
                setError("At least 1 product should be planned for delivery.");
                setSubmitting(false);
                return;
            }

            const updatedStages = {
                ...(orderData?.stages || {}),
                planner: "completed",
                delivery: "pending",
            };

            const payloadBarState = deriveBarStateFromBomPlan(planForSave);
            const skipCostEffectsOnce = skipNextPlannerCostEffectsRef.current;
            const costAdjustments = skipCostEffectsOnce
                ? []
                : costForSave.lines
                    .filter((line) => line.qtyDelta !== 0)
                    .map((line) => ({
                        product_id: line.product_id,
                        qty_delta: line.qtyDelta,
                        gst_mode: line.gstMode,
                        note: (adjForSave[line.rowKey]?.note || "").trim() || null,
                        manual_unit_price_excluding_gst:
                            line.priceSource === "MANUAL_FALLBACK" ? line.unitExcl : undefined,
                    manual_unit_price_including_gst:
                        line.priceSource === "MANUAL_FALLBACK" ? line.unitIncl : undefined,
                    price_source: line.priceSource || "LATEST_PURCHASE",
                    metadata: {
                        planner_added: !!(planForSave || []).find((bp) => bp.__rowKey === line.rowKey)?.planner_added,
                    },
                }));
            const hasMissingManualPrice = costAdjustments.some((line) =>
                line.price_source === "MANUAL_FALLBACK" &&
                (!Number.isFinite(Number(line.manual_unit_price_excluding_gst)) ||
                    Number(line.manual_unit_price_excluding_gst) <= 0 ||
                    !Number.isFinite(Number(line.manual_unit_price_including_gst)) ||
                    Number(line.manual_unit_price_including_gst) <= 0)
            );
            if (hasMissingManualPrice) {
                setError("Enter manual unit price (Excl/Incl GST) for rows where latest purchase price is not available.");
                setSubmitting(false);
                return;
            }
            const payload = {
                ...formData,
                ...payloadBarState,
                bom_snapshot: updatedBomSnapshot,
                stages: updatedStages,
                planner_completed_at: new Date().toISOString(),
                current_stage_key: "delivery",
                cost_adjustments: costAdjustments,
            };
            const parsedManualOverride = Number(manualFinalPayable);
            const hasManualOverrideValue =
                !skipCostEffectsOnce &&
                isSuperAdmin &&
                isManualOverride &&
                manualFinalPayable !== "" &&
                Number.isFinite(parsedManualOverride) &&
                Math.abs(parsedManualOverride - costForSave.autoProjectCost) > 0.009;
            if (hasManualOverrideValue) {
                payload.manual_project_cost_override = parsedManualOverride;
            }

            if (orderData?.stages?.["planner"] === "completed") {
                delete payload.stages;
                delete payload.current_stage_key;
            }

            const previousProjectCost = Number(costForSave.baseProjectCost) || 0;
            const finalProjectCost = skipCostEffectsOnce
                ? previousProjectCost
                : (Number(costForSave.finalProjectCost) || 0);
            const autoProjectCost = skipCostEffectsOnce
                ? previousProjectCost
                : (Number(costForSave.autoProjectCost) || 0);
            const discount = Number(orderData?.discount) || 0;
            const totalPaid = Number(orderData?.total_paid) || 0;
            const payableAmount = Math.max(finalProjectCost - discount, 0);
            const outstandingAmount = Math.max(payableAmount - totalPaid, 0);
            const amendmentItems = skipCostEffectsOnce
                ? []
                : costForSave.lines
                .filter((line) => line.qtyDelta !== 0)
                .map((line) => {
                    const rowInPlan = (planForSave || []).find((bomLine) => bomLine.__rowKey === line.rowKey);
                    const fallbackRemoved = (removedLineAdjustments || []).find((removed) => removed.rowKey === line.rowKey);
                    const productName =
                        rowInPlan?.product_snapshot?.product_name ||
                        rowInPlan?.product_name ||
                        fallbackRemoved?.product_name ||
                        `Product #${line.product_id}`;
                    return {
                        rowKey: line.rowKey,
                        product_id: line.product_id,
                        product_name: productName,
                        qty_delta: line.qtyDelta,
                        gst_mode: line.gstMode,
                        unit_excl: Number(line.unitExcl) || 0,
                        unit_incl: Number(line.unitIncl) || 0,
                        amount_excl: Number(line.amountExcl) || 0,
                        amount_incl: Number(line.amountIncl) || 0,
                        price_source: line.priceSource || "LATEST_PURCHASE",
                        planner_added: !!rowInPlan?.planner_added,
                    };
                });

            setSaveConfirmSummary({
                previousProjectCost,
                autoProjectCost,
                finalProjectCost,
                totalDelta: skipCostEffectsOnce ? 0 : (finalProjectCost - previousProjectCost),
                discount,
                payableAmount,
                totalPaid,
                outstandingAmount,
                adjustmentCount: amendmentItems.length,
                amendmentItems,
                previousCapacityKw: Number(orderData?.capacity) || 0,
                previewCapacityKw: previewCapacityKwForSave,
            });
            setSaveConfirmPayload(payload);
            setSaveConfirmOpen(true);
        } catch (err) {
            console.error("Failed to prepare planner details:", err);
            const errMsg = err?.message || "Failed to save data";
            setError(errMsg);
            toastError(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const runSaveWithOutstandingCheck = async (payload) => {
        const projectCost = skipNextPlannerCostEffectsRef.current
            ? (Number(orderData?.project_cost) || 0)
            : (Number(costPreview.finalProjectCost) || 0);
        const discount = Number(orderData?.discount) || 0;
        const payableAmount = Math.max(projectCost - discount, 0);
        const totalPaid = Number(orderData?.total_paid) || 0;
        const outstandingAmount = Math.max(payableAmount - totalPaid, 0);
        const outstandingPercent = payableAmount > 0 ? (outstandingAmount / payableAmount) * 100 : 0;

        if (outstandingPercent > 50) {
            setPendingPayload(payload);
            setOutstandingInfo({
                percent: outstandingPercent.toFixed(2),
                amountFormatted: outstandingAmount.toLocaleString("en-IN"),
            });
            setOutstandingConfirmOpen(true);
            return;
        }
        await savePlanner(payload);
    };

    const handleCancelSaveConfirm = () => {
        setSaveConfirmOpen(false);
        setSaveConfirmPayload(null);
        setSaveConfirmSummary(null);
    };

    const handleConfirmSaveProceed = async () => {
        if (!saveConfirmPayload) {
            handleCancelSaveConfirm();
            return;
        }
        setSaveConfirmOpen(false);
        setSubmitting(true);
        try {
            await runSaveWithOutstandingCheck(saveConfirmPayload);
            setSaveConfirmPayload(null);
            setSaveConfirmSummary(null);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelOutstandingConfirm = () => {
        setOutstandingConfirmOpen(false);
        setPendingPayload(null);
    };

    const handleConfirmOutstandingProceed = async () => {
        if (!pendingPayload) {
            handleCancelOutstandingConfirm();
            return;
        }
        setSubmitting(true);
        try {
            await savePlanner(pendingPayload);
            setPendingPayload(null);
            setOutstandingConfirmOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    const isCompleted = orderData?.stages?.planner === "completed";
    const completedAt = orderData?.planner_completed_at ? moment(orderData.planner_completed_at) : null;
    const withinEditableWindow =
        isCompleted && completedAt && moment().diff(completedAt, "days") < PLANNER_EDITABLE_DAYS;
    const isPlannerLocked = !amendMode && isCompleted && !withinEditableWindow;

    const hasNoBom = !orderData?.bom_snapshot?.length;
    const showImportFromProject = isSuperAdmin && hasNoBom && !isReadOnly && !isPlannerLocked;

    useEffect(() => {
        if (showImportFromProject && projectPricesWithBom.length === 0 && !loadingProjectPrices) {
            setLoadingProjectPrices(true);
            projectPriceService.getProjectPrices({ has_bom: true, limit: 500 })
                .then((res) => {
                    const raw = res?.result ?? res;
                    const data = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
                    setProjectPricesWithBom(data);
                })
                .catch((err) => {
                    console.error("Failed to fetch project prices:", err);
                    toastError(err?.response?.data?.message || err?.message || "Failed to load projects");
                    setProjectPricesWithBom([]);
                })
                .finally(() => setLoadingProjectPrices(false));
        }
    }, [showImportFromProject]);

    const handleImportFromProjectSelect = async (e, newValue) => {
        if (!newValue?.id) return;
        setImportingFromProject(true);
        try {
            await orderService.updateOrder(orderId, { project_price_id: newValue.id });
            skipNextPlannerCostEffectsRef.current = true;
            toastSuccess("BOM imported from project. Refreshing…");
            setSelectedProjectForImport(newValue);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Failed to import BOM from project:", err);
            toastError(err?.response?.data?.message || err?.message || "Failed to import BOM");
        } finally {
            setImportingFromProject(false);
        }
    };

    useEffect(() => {
        const plannedProductIds = (bomPlan || []).map((line) => Number(line.product_id));
        const removedProductIds = (removedLineAdjustments || []).map((line) => Number(line.product_id));
        const uniqueProductIds = [...new Set([...plannedProductIds, ...removedProductIds].filter((id) => Number.isFinite(id) && id > 0))];
        if (uniqueProductIds.length === 0) {
            setPurchasePriceByProductId({});
            return;
        }
        let cancelled = false;
        const run = async () => {
            setLoadingPrices(true);
            try {
                const res = await orderService.getLatestPurchasePrices(uniqueProductIds);
                const data = res?.result ?? res?.data ?? res ?? [];
                if (cancelled) return;
                const next = {};
                (Array.isArray(data) ? data : []).forEach((row) => {
                    next[row.product_id] = row;
                });
                setPurchasePriceByProductId(next);
            } catch (err) {
                if (!cancelled) {
                    console.error("Failed to fetch latest purchase prices:", err);
                    setPurchasePriceByProductId({});
                }
            } finally {
                if (!cancelled) setLoadingPrices(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [bomPlan, removedLineAdjustments]);

    useEffect(() => {
        if (activeTab !== "activity" || !orderId) return;
        let cancelled = false;
        const run = async () => {
            try {
                const res = await orderService.getOrderCostAmendments(orderId);
                if (cancelled) return;
                const data = res?.result ?? res?.data ?? res ?? [];
                setCostAmendments(Array.isArray(data) ? data : []);
            } catch (err) {
                if (!cancelled) {
                    console.error("Failed to fetch cost amendments:", err);
                    setCostAmendments([]);
                }
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [activeTab, orderId]);

    // Toggle handler for BOM planning checkbox. This only updates local UI
    // state and does not affect the persisted order yet.
    const handleBomToggle = (rowKey, checked) => {
        setBomPlan((prev) =>
            prev.map((line) =>
                line.__rowKey === rowKey
                    ? { ...line, planned: checked }
                    : line
            )
        );
        // Clear soft validation error once user interacts.
        if (fieldErrors.bomPlan) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.bomPlan;
                return next;
            });
        }
    };

    const fetchProductsForBom = async () => {
        setLoadingProducts(true);
        try {
            const res = await quotationService.getAllProducts();
            const data = res?.result ?? res?.data ?? res ?? [];
            setProductsForBom(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch products:", err);
            toastError(err?.response?.data?.message || err?.message || "Failed to load products");
            setProductsForBom([]);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleAddBomOpen = () => {
        setAddBomProduct(null);
        setAddBomQty(1);
        setAddBomOpen(true);
        if (productsForBom.length === 0) fetchProductsForBom();
    };

    const handleAddBomConfirm = () => {
        if (!addBomProduct?.id) {
            toastError("Select a product");
            return;
        }
        const qty = Math.max(1, Number(addBomQty) || 1);
        const p = addBomProduct;
        const productName = p?.product_name ?? p?.name ?? "";
        const typeName = p?.productType?.name ?? p?.product_type_name ?? "";
        const makeName = p?.productMake?.name ?? p?.product_make_name ?? "";
        const measurementUnitName =
            p?.measurement_unit_name ?? p?.measurementUnit?.unit ?? "";
        const serialRequired = !!p?.serial_required;
        const newLine = {
            product_id: p.id,
            quantity: qty,
            planned_qty: qty,
            baseline_planned_qty: 0,
            planned: true,
            shipped_qty: 0,
            returned_qty: 0,
            __rowKey: `add-${Date.now()}-${p.id}`,
            product_snapshot: {
                product_name: productName,
                product_type_name: typeName,
                product_make_name: makeName,
                measurement_unit_name: measurementUnitName,
                serial_required: serialRequired,
            },
            product_name: productName,
            product_type_name: typeName,
            product_make_name: makeName,
            measurement_unit_name: measurementUnitName,
            serial_required: serialRequired,
            planner_added: true,
        };
        setBomPlan((prev) => [...prev, newLine]);
        setAdjustmentByRow((prev) => ({
            ...prev,
            [newLine.__rowKey]: {
                gst_mode: "INCLUDING_GST",
                note: "",
                manual_unit_price_excluding_gst: "",
                manual_unit_price_including_gst: "",
            },
        }));
        if (fieldErrors.bomPlan) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.bomPlan;
                return next;
            });
        }
        setAddBomOpen(false);
        setAddBomProduct(null);
        setAddBomQty(1);
    };

    const handleBomRemove = (rowKey) => {
        const removedLine = (bomPlan || []).find((line) => line.__rowKey === rowKey);
        if (removedLine) {
            const baselineQtyRaw = Number(removedLine.baseline_planned_qty ?? removedLine.quantity ?? 0);
            const baselineQty = Number.isFinite(baselineQtyRaw) ? baselineQtyRaw : 0;
            if (baselineQty > 0) {
                setRemovedLineAdjustments((prev) => ([
                    ...prev.filter((line) => line.originalRowKey !== rowKey),
                    {
                        originalRowKey: rowKey,
                        rowKey: `removed-${rowKey}`,
                        product_id: removedLine.product_id,
                        product_name: removedLine?.product_snapshot?.product_name || removedLine?.product_name || null,
                        qtyDelta: -baselineQty,
                        gstMode: adjustmentByRow[rowKey]?.gst_mode || "INCLUDING_GST",
                        manual_unit_price_excluding_gst: adjustmentByRow[rowKey]?.manual_unit_price_excluding_gst ?? "",
                        manual_unit_price_including_gst: adjustmentByRow[rowKey]?.manual_unit_price_including_gst ?? "",
                    },
                ]));
            } else {
                // Added-then-removed rows (baseline 0) should not create a net adjustment.
                setRemovedLineAdjustments((prev) => prev.filter((line) => line.originalRowKey !== rowKey));
            }
        }
        setBomPlan((prev) => prev.filter((line) => line.__rowKey !== rowKey));
        setAdjustmentByRow((prev) => {
            const next = { ...prev };
            delete next[rowKey];
            return next;
        });
        if (fieldErrors.bomPlan) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.bomPlan;
                return next;
            });
        }
    };

    const updateLineAdjustment = (rowKey, patch) => {
        setAdjustmentByRow((prev) => ({
            ...prev,
            [rowKey]: {
                gst_mode: "INCLUDING_GST",
                note: "",
                manual_unit_price_excluding_gst: "",
                manual_unit_price_including_gst: "",
                ...(prev[rowKey] || {}),
                ...patch,
            },
        }));
    };

    const handleManualRateInput = (rowKey, changedField, rawValue, gstRateValue) => {
        const parsed = Number(rawValue);
        if (rawValue === "" || !Number.isFinite(parsed) || parsed < 0) {
            if (changedField === "manual_unit_price_excluding_gst") {
                updateLineAdjustment(rowKey, {
                    manual_unit_price_excluding_gst: rawValue,
                    manual_unit_price_including_gst: "",
                });
            } else {
                updateLineAdjustment(rowKey, {
                    manual_unit_price_including_gst: rawValue,
                    manual_unit_price_excluding_gst: "",
                });
            }
            return;
        }
        const gstRate = Number.isFinite(Number(gstRateValue)) ? Number(gstRateValue) : 0;
        if (changedField === "manual_unit_price_excluding_gst") {
            const excl = parsed;
            const incl = excl * (1 + gstRate / 100);
            updateLineAdjustment(rowKey, {
                // Keep typing natural; do not force-decimal format while user inputs.
                manual_unit_price_excluding_gst: rawValue,
                manual_unit_price_including_gst: String(Math.round((incl + Number.EPSILON) * 100) / 100),
            });
        } else {
            const incl = parsed;
            const excl = incl / (1 + gstRate / 100);
            updateLineAdjustment(rowKey, {
                manual_unit_price_including_gst: rawValue,
                manual_unit_price_excluding_gst: String(Math.round((excl + Number.EPSILON) * 100) / 100),
            });
        }
    };

    /**
     * Derive the seven planned_has_* flags from current bomPlan.
     * Only planned lines (line.planned === true) contribute; product_type_name from product_snapshot or line.
     */
    const deriveBarStateFromBomPlan = (plan) => {
        const state = {
            planned_has_structure: false,
            planned_has_solar_panel: false,
            planned_has_inverter: false,
            planned_has_acdb: false,
            planned_has_dcdb: false,
            planned_has_earthing_kit: false,
            planned_has_cables: false,
        };
        if (!Array.isArray(plan)) return state;
        for (const line of plan) {
            if (!line.planned) continue;
            const p = line.product_snapshot || line;
            const typeName = p?.product_type_name ?? "";
            const key = productTypeNameToBarKey(normalizeProductTypeName(typeName));
            const stateKey = key ? `planned_has_${key}` : null;
            if (stateKey && state[stateKey] !== undefined) state[stateKey] = true;
        }
        return state;
    };

    const barState = deriveBarStateFromBomPlan(bomPlan);

    /** Preview kW from BOM (product W × planned qty ÷ 1000). Snapshot capacity; server uses product master. */
    const bomCapacityPreviewKw = useMemo(() => computeBomCapacityPreviewKw(bomPlan), [bomPlan]);

    const costPreview = useMemo(
        () =>
            computePlannerCostPreviewFromInputs({
                projectCost: orderData?.project_cost,
                bomPlan,
                adjustmentByRow,
                purchasePriceByProductId,
                removedLineAdjustments,
                manualFinalPayable,
                isManualOverride,
                isSuperAdmin,
            }),
        [
            orderData?.project_cost,
            bomPlan,
            removedLineAdjustments,
            adjustmentByRow,
            purchasePriceByProductId,
            manualFinalPayable,
            isManualOverride,
            isSuperAdmin,
        ]
    );

    useEffect(() => {
        if (!isManualOverride) {
            setManualFinalPayable(costPreview.autoProjectCost.toFixed(2));
        }
    }, [costPreview.autoProjectCost, isManualOverride]);

    const formatMoneyOrDash = (value) => {
        const num = Number(value);
        return Number.isFinite(num) ? num.toFixed(2) : "—";
    };

    const getChangeTypeMeta = (changeType) => {
        if (changeType === "ADD_QTY") return { label: "Add Qty", tone: "text-emerald-700" };
        if (changeType === "DEDUCT_QTY") return { label: "Deduct Qty", tone: "text-rose-700" };
        if (changeType === "FINAL_OVERRIDE") return { label: "Final Override", tone: "text-amber-700" };
        return { label: changeType || "Amendment", tone: "text-foreground" };
    };

    const getMoneyToneClass = (value) => {
        const n = Number(value) || 0;
        if (n > 0) return "text-emerald-700";
        if (n < 0) return "text-rose-700";
        return "text-slate-700";
    };

    const StatusItem = ({ label, isDone }) => (
        <Stack alignItems="center" spacing={0.5} sx={{ flex: 1, minWidth: { xs: 68, md: 72, lg: 76 } }}>
            <Typography
                variant="caption"
                sx={{ fontWeight: "bold", textAlign: "center", lineHeight: 1.1, fontSize: { xs: "10px", md: "11px" } }}
            >
                {label}
            </Typography>
            {isDone ? (
                <CheckCircleIcon color="success" sx={{ fontSize: { xs: 20, md: 22 } }} />
            ) : (
                <CancelIcon color="error" sx={{ fontSize: { xs: 20, md: 22 } }} />
            )}
        </Stack>
    );

    if (loading) return <Loader />;

    return (
        <Box className="p-3 md:p-2 xl:p-1.5">
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: { xs: 1.5, md: 1 }, borderBottom: 1, borderColor: "divider", minHeight: 36 }}>
                <Tab label="Planner" value="add_planner" />
                <Tab label="Activity" value="activity" />
            </Tabs>
            {activeTab === "add_planner" ? (
                <Box component="form" onSubmit={handleSubmit} onKeyDown={preventEnterSubmit}>
                    <Paper variant="outlined" sx={{ p: { xs: 1.25, md: 1, lg: 0.75 }, mb: { xs: 2, md: 1.25, lg: 1 }, bgcolor: "#fcfcfc" }} className="rounded-lg">
                        <Stack direction="row" divider={<Box sx={{ borderRight: 1, borderColor: "divider", mx: { xs: 0.5, md: 0.75 } }} />} spacing={0.5}>
                            <StatusItem label="Structure" isDone={barState.planned_has_structure} />
                            <StatusItem label="Solar Panel" isDone={barState.planned_has_solar_panel} />
                            <StatusItem label="Inverter" isDone={barState.planned_has_inverter} />
                            <StatusItem label="ACDB" isDone={barState.planned_has_acdb} />
                            <StatusItem label="DCDB" isDone={barState.planned_has_dcdb} />
                            <StatusItem label="Earthing Kit" isDone={barState.planned_has_earthing_kit} />
                            <StatusItem label="Cable" isDone={barState.planned_has_cables} />
                        </Stack>
                    </Paper>

                    <FormSection title="Planner details">
                        <FormGrid cols={3}>
                            <DateField
                                name="planned_delivery_date"
                                label="Plan Delivery Date"
                                value={formData.planned_delivery_date}
                                onChange={handleInputChange}
                                fullWidth
                                disabled={isPlannerLocked || isReadOnly}
                                error={!!fieldErrors.planned_delivery_date}
                                helperText={fieldErrors.planned_delivery_date}
                                required
                            />
                            <AutocompleteField
                                name="planned_priority"
                                label="Priority"
                                options={[{ value: "High", label: "High" }, { value: "Medium", label: "Medium" }, { value: "Low", label: "Low" }]}
                                getOptionLabel={(o) => o?.label ?? o?.value ?? ""}
                                value={formData.planned_priority ? { value: formData.planned_priority, label: formData.planned_priority } : null}
                                onChange={(e, newValue) => handleInputChange({ target: { name: "planned_priority", value: newValue?.value ?? "" } })}
                                disabled={isPlannerLocked || isReadOnly}
                                error={!!fieldErrors.planned_priority}
                                helperText={fieldErrors.planned_priority}
                                required
                            />
                            <AutocompleteField
                                name="planned_warehouse_id"
                                label="Warehouse"
                                options={warehouses}
                                getOptionLabel={(w) => w?.name ?? w?.label ?? ""}
                                value={warehouses.find((w) => w.id === formData.planned_warehouse_id) || (formData.planned_warehouse_id ? { id: formData.planned_warehouse_id } : null)}
                                onChange={(e, newValue) => handleInputChange({ target: { name: "planned_warehouse_id", value: newValue?.id ?? "" } })}
                                disabled={isPlannerLocked || isReadOnly}
                                error={!!fieldErrors.planned_warehouse_id}
                                helperText={fieldErrors.planned_warehouse_id}
                                required
                            />
                        </FormGrid>

                        <div className="mt-3">
                            <Input
                                name="planned_remarks"
                                label="Remarks"
                                multiline
                                rows={2}
                                value={formData.planned_remarks}
                                onChange={handleInputChange}
                                fullWidth
                                disabled={isPlannerLocked || isReadOnly}
                            />
                        </div>
                    </FormSection>

                    {showImportFromProject && (
                        <FormSection title="Import BOM from project">
                            {orderData?.project_price_id ? (
                                <Typography variant="body2" color="text.secondary">
                                    Project selected. Materials below will reflect the imported BOM after refresh.
                                </Typography>
                            ) : (
                                <>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        Select a project with a linked BOM to import materials into this order.
                                    </Typography>
                                    <AutocompleteField
                                        name="import_project_price_id"
                                        label="Project (with BOM)"
                                        options={projectPricesWithBom}
                                        getOptionLabel={(o) => {
                                            const cap = o?.project_capacity != null ? `${o.project_capacity} kW` : "";
                                            const name = o?.bill_of_material_name ?? o?.billOfMaterial?.bom_name ?? "Project";
                                            return cap ? `${cap} - ${name}` : name;
                                        }}
                                        value={selectedProjectForImport}
                                        onChange={handleImportFromProjectSelect}
                                        disabled={loadingProjectPrices || importingFromProject}
                                        placeholder={loadingProjectPrices ? "Loading…" : "Select project"}
                                    />
                                    {importingFromProject && <Typography variant="caption" color="text.secondary">Importing…</Typography>}
                                </>
                            )}
                        </FormSection>
                    )}

                    <FormSection title="Materials for planning / delivery">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5 md:gap-1 mb-1.5 md:mb-1">
                            <div className="rounded border border-slate-200 bg-slate-50 p-1.5 md:p-1.5 text-xs">
                                <div className="text-muted-foreground">Current Project Cost</div>
                                <div className="font-semibold text-slate-700">{costPreview.baseProjectCost.toFixed(2)}</div>
                            </div>
                            <div className="rounded border border-blue-200 bg-blue-50 p-1.5 md:p-1.5 text-xs">
                                <div className="text-muted-foreground">Auto Calculated Cost</div>
                                <div className={`font-semibold ${getMoneyToneClass(costPreview.autoProjectCost - costPreview.baseProjectCost)}`}>
                                    {costPreview.autoProjectCost.toFixed(2)}
                                </div>
                            </div>
                            <div className="rounded border border-indigo-200 bg-indigo-50 p-1.5 md:p-1.5 text-xs">
                                <div className="text-muted-foreground">Final Project Cost</div>
                                <div className={`font-semibold ${getMoneyToneClass(costPreview.finalProjectCost - costPreview.baseProjectCost)}`}>
                                    {costPreview.finalProjectCost.toFixed(2)}
                                </div>
                            </div>
                            <div
                                className={`rounded border p-1.5 md:p-1.5 text-xs ${
                                    isSuperAdmin && isManualOverride
                                        ? "border-amber-300 bg-amber-50"
                                        : "border-emerald-200 bg-emerald-50"
                                }`}
                            >
                                <label className="text-muted-foreground block mb-1">Final Payable Override</label>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        value={manualFinalPayable}
                                        onChange={(e) => {
                                            setManualFinalPayable(e.target.value);
                                            setIsManualOverride(true);
                                        }}
                                        disabled={isPlannerLocked || isReadOnly || !isSuperAdmin}
                                        className="w-full border border-input rounded px-1 py-0.5 bg-background disabled:opacity-60"
                                    />
                                    {isSuperAdmin && isManualOverride && !isPlannerLocked && !isReadOnly && (
                                        <button
                                            type="button"
                                            className="px-2 py-0.5 text-[11px] border rounded hover:bg-muted"
                                            onClick={() => {
                                                setIsManualOverride(false);
                                            }}
                                        >
                                            Auto
                                        </button>
                                    )}
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-1">
                                    {!isSuperAdmin
                                        ? "Only superadmin can set manual override."
                                        : isManualOverride
                                          ? "Manual override active"
                                          : "Auto-calculated"}
                                </div>
                            </div>
                        </div>
                        <div className="rounded border border-amber-200/80 bg-amber-50/90 p-1.5 text-[11px] mb-1.5 md:mb-1 leading-tight">
                            <span className="text-muted-foreground">Order capacity (BOM preview, W×qty→kW): </span>
                            <span className="font-semibold text-slate-800">
                                {bomCapacityPreviewKw != null ? `${bomCapacityPreviewKw.toFixed(2)} kW` : "—"}
                            </span>
                            <span className="text-muted-foreground"> · stored: </span>
                            <span className="font-medium">{(Number(orderData?.capacity) || 0).toFixed(2)} kW</span>
                        </div>
                        {costUpdateSummary && (
                            <div className="rounded border border-emerald-200 bg-emerald-50 p-1.5 text-xs mb-1.5 md:mb-1">
                                <div className="font-semibold mb-1">Update Summary</div>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
                                    <div>
                                        <div className="text-muted-foreground">Before</div>
                                        <div className="font-medium text-slate-700">{Number(costUpdateSummary.previous_project_cost || 0).toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Auto</div>
                                        <div className="font-medium text-blue-700">{Number(costUpdateSummary.auto_calculated_project_cost || 0).toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Final</div>
                                        <div className="font-medium text-indigo-700">{Number(costUpdateSummary.final_saved_project_cost || 0).toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Delta</div>
                                        <div className={`font-semibold ${getMoneyToneClass(costUpdateSummary.total_delta)}`}>
                                            {Number(costUpdateSummary.total_delta || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Override</div>
                                        <div className={`font-semibold ${costUpdateSummary.override_applied ? "text-amber-700" : "text-emerald-700"}`}>
                                            {costUpdateSummary.override_applied ? "Yes" : "No"}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mt-1.5 pt-1.5 border-t border-emerald-200/80">
                                    <div>
                                        <div className="text-muted-foreground">Capacity before (kW)</div>
                                        <div className="font-medium text-slate-700">{Number(costUpdateSummary.previous_capacity_kw ?? 0).toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Capacity saved (kW)</div>
                                        <div className="font-medium text-indigo-800">{Number(costUpdateSummary.computed_capacity_kw ?? 0).toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Δ kW</div>
                                        <div className={`font-semibold ${Number(costUpdateSummary.capacity_delta_kw || 0) < 0 ? "text-rose-700" : "text-emerald-800"}`}>
                                            {Number(costUpdateSummary.capacity_delta_kw || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">From BOM</div>
                                        <div className={`font-semibold ${costUpdateSummary.capacity_recomputed ? "text-emerald-800" : "text-slate-600"}`}>
                                            {costUpdateSummary.capacity_recomputed ? "Yes" : "No"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center justify-end gap-2 mb-2">
                            {!isReadOnly && !isPlannerLocked && (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleAddBomOpen}
                                    className="bg-green-600 hover:bg-green-700 text-white border-0"
                                >
                                    +Add Product
                                </Button>
                            )}
                        </div>
                        {bomPlan.length > 0 ? (
                            <>
                                <div className="overflow-x-auto rounded-lg border border-border">
                                    <table className="w-full text-xs sm:text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-muted/50 border-b border-border">
                                                <th className="text-left font-semibold p-2 w-10"></th>
                                                <th className="text-left font-semibold p-2 min-w-[140px]">Product</th>
                                                <th className="text-left font-semibold p-2 min-w-[110px]">Type</th>
                                                <th className="text-left font-semibold p-2 min-w-[110px]">Make</th>
                                                <th className="text-right font-semibold p-2 w-24">Planned Qty</th>
                                                <th className="text-right font-semibold p-2 w-20">Shipped</th>
                                                <th className="text-right font-semibold p-2 w-20">Pending</th>
                                                <th className="text-right font-semibold p-2 w-24">Adj Qty</th>
                                                <th className="text-left font-semibold p-2 w-28">GST Mode</th>
                                                <th className="text-right font-semibold p-2 w-24">Rate Excl</th>
                                                <th className="text-right font-semibold p-2 w-24">Rate Incl</th>
                                                <th className="text-right font-semibold p-2 w-24">Amt Excl</th>
                                                <th className="text-right font-semibold p-2 w-24">Amt Incl</th>
                                                {!isReadOnly && !isPlannerLocked && <th className="text-center font-semibold p-2 w-12"></th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bomPlan.map((line) => {
                                                const p = line.product_snapshot || line;
                                                const productName = p?.product_name ?? "-";
                                                const typeName = p?.product_type_name ?? "-";
                                                const makeName = p?.product_make_name ?? "-";
                                                const qtyNum = (n) => (n != null && !Number.isNaN(Number(n)) ? Number(n) : 0);
                                                const plannedQty = qtyNum(line.planned_qty ?? line.quantity);
                                                const shippedQty = qtyNum(line.shipped_qty);
                                                const returnedQty = qtyNum(line.returned_qty);
                                                const pendingQty = plannedQty - shippedQty + returnedQty;
                                                const isFullyShipped = Number(pendingQty) <= 0;
                                                const canRemove = !isPlannerLocked && !isReadOnly && shippedQty === 0;
                                                const adjustment = adjustmentByRow[line.__rowKey] || { gst_mode: "INCLUDING_GST" };
                                                const latestPrice = purchasePriceByProductId[line.product_id];
                                                const gstRate = Number(latestPrice?.gst_rate) || 0;
                                                const isMissingLatestPrice = !!latestPrice?.missing_price;
                                                const manualExcl = Number(adjustment?.manual_unit_price_excluding_gst);
                                                const manualIncl = Number(adjustment?.manual_unit_price_including_gst);
                                                const hasManualExcl = Number.isFinite(manualExcl) && manualExcl > 0;
                                                const hasManualIncl = Number.isFinite(manualIncl) && manualIncl > 0;
                                                const unitExcl = isMissingLatestPrice
                                                    ? (hasManualExcl ? manualExcl : (hasManualIncl ? (manualIncl / (1 + gstRate / 100)) : 0))
                                                    : (Number(latestPrice?.unit_price_excluding_gst) || 0);
                                                const unitIncl = isMissingLatestPrice
                                                    ? (hasManualIncl ? manualIncl : (hasManualExcl ? (manualExcl * (1 + gstRate / 100)) : 0))
                                                    : (Number(latestPrice?.unit_price_including_gst) || 0);
                                                const baselineQty = qtyNum(line.baseline_planned_qty ?? line.quantity);
                                                const adjQty = plannedQty - baselineQty;
                                                const amountExcl = adjQty * unitExcl;
                                                const amountIncl = adjQty * unitIncl;

                                                const isPlannerAdded = !!line.planner_added;
                                                const canEditRow = isSuperAdmin || isPlannerAdded;

                                                return (
                                                    <tr
                                                        key={line.__rowKey}
                                                        className={`border-b border-border last:border-b-0 ${
                                                            isFullyShipped ? "bg-muted/40" : "hover:bg-muted/30"
                                                        }`}
                                                    >
                                                        <td className="p-2 align-middle">
                                                            <Checkbox
                                                                name={`bom_${line.__rowKey}`}
                                                                label=""
                                                                checked={!!line.planned}
                                                                onChange={(e) => handleBomToggle(line.__rowKey, e.target.checked)}
                                                                disabled={isPlannerLocked || isReadOnly || isFullyShipped || !canEditRow}
                                                                className="w-auto"
                                                            />
                                                        </td>
                                                        <td className="p-2 align-middle">{productName}</td>
                                                        <td className="p-2 align-middle">{typeName}</td>
                                                        <td className="p-2 align-middle">{makeName}</td>
                                                        <td className="p-2 text-right align-middle">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                value={line.planned_qty ?? ""}
                                                                onChange={(e) =>
                                                                    setBomPlan((prev) =>
                                                                        prev.map((row) =>
                                                                            row.__rowKey === line.__rowKey
                                                                                ? {
                                                                                    ...row,
                                                                                    planned_qty:
                                                                                        e.target.value === ""
                                                                                            ? ""
                                                                                            : Number(e.target.value),
                                                                                }
                                                                                : row
                                                                        )
                                                                    )
                                                                }
                                                                disabled={isPlannerLocked || isReadOnly || !canEditRow}
                                                                className="w-20 text-right border border-input rounded px-1 py-0.5 bg-background"
                                                            />
                                                        </td>
                                                        <td className="p-2 text-right align-middle">{shippedQty}</td>
                                                        <td className="p-2 text-right align-middle">{pendingQty}</td>
                                                        <td className="p-2 text-right align-middle">
                                                            <span className={`${adjQty > 0 ? "text-emerald-700" : adjQty < 0 ? "text-rose-700" : "text-muted-foreground"} font-medium`}>
                                                                {adjQty > 0 ? `+${adjQty}` : `${adjQty}`}
                                                            </span>
                                                        </td>
                                                        <td className="p-2 align-middle">
                                                            <select
                                                                value={adjustment.gst_mode || "INCLUDING_GST"}
                                                                onChange={(e) => updateLineAdjustment(line.__rowKey, { gst_mode: e.target.value })}
                                                                disabled={isPlannerLocked || isReadOnly || adjQty === 0 || !canEditRow}
                                                                className="w-28 border border-input rounded px-1 py-0.5 bg-background text-xs"
                                                            >
                                                                <option value="INCLUDING_GST">Including GST</option>
                                                                <option value="EXCLUDING_GST">Excluding GST</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-2 text-right align-middle">
                                                            {!canEditRow ? "—" : isMissingLatestPrice ? (
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    step="0.01"
                                                                    value={adjustment?.manual_unit_price_excluding_gst ?? ""}
                                                                    onChange={(e) =>
                                                                        handleManualRateInput(
                                                                            line.__rowKey,
                                                                            "manual_unit_price_excluding_gst",
                                                                            e.target.value,
                                                                            gstRate
                                                                        )
                                                                    }
                                                                    disabled={isPlannerLocked || isReadOnly || adjQty === 0}
                                                                    className="w-20 text-right border border-input rounded px-1 py-0.5 bg-background"
                                                                />
                                                            ) : (
                                                                unitExcl.toFixed(2)
                                                            )}
                                                        </td>
                                                        <td className="p-2 text-right align-middle">
                                                            {!canEditRow ? "—" : isMissingLatestPrice ? (
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    step="0.01"
                                                                    value={adjustment?.manual_unit_price_including_gst ?? ""}
                                                                    onChange={(e) =>
                                                                        handleManualRateInput(
                                                                            line.__rowKey,
                                                                            "manual_unit_price_including_gst",
                                                                            e.target.value,
                                                                            gstRate
                                                                        )
                                                                    }
                                                                    disabled={isPlannerLocked || isReadOnly || adjQty === 0}
                                                                    className="w-20 text-right border border-input rounded px-1 py-0.5 bg-background"
                                                                />
                                                            ) : (
                                                                unitIncl.toFixed(2)
                                                            )}
                                                        </td>
                                                        <td className="p-2 text-right align-middle">{canEditRow ? amountExcl.toFixed(2) : "—"}</td>
                                                        <td className="p-2 text-right align-middle">{canEditRow ? amountIncl.toFixed(2) : "—"}</td>
                                                        {!isReadOnly && !isPlannerLocked && (
                                                            <td className="p-2 text-center align-middle">
                                                                {canRemove && canEditRow ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleBomRemove(line.__rowKey)}
                                                                        className="text-muted-foreground hover:text-destructive p-0.5 rounded"
                                                                        aria-label="Remove line"
                                                                    >
                                                                        <DeleteOutlineIcon fontSize="small" />
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-muted-foreground/50" title={shippedQty > 0 ? "Cannot remove: already shipped" : !canEditRow ? "Cannot remove original items" : ""}>—</span>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {fieldErrors.bomPlan && (
                                    <p className="mt-1 text-xs text-destructive">{fieldErrors.bomPlan}</p>
                                )}
                                {loadingPrices && <p className="mt-1 text-xs text-muted-foreground">Loading latest purchase prices...</p>}
                            </>
                        ) : (
                            <Alert severity="info" sx={{ mt: 1 }}>
                                No BOM lines yet. Use &quot;Add item&quot; to add products, or this order will use only the
                                high-level planner flags and quantities.
                            </Alert>
                        )}
                    </FormSection>

                    <div className="mt-4 flex flex-col gap-2">
                        {error && <Alert severity="error">{error}</Alert>}
                        {successMsg && <Alert severity="success">{successMsg}</Alert>}
                        <Button type="submit" size="sm" loading={submitting} disabled={isPlannerLocked || isReadOnly}>
                            {isCompleted ? "Update Details" : "Save"}
                        </Button>
                    </div>

                    <Dialog
                        open={saveConfirmOpen}
                        onOpenChange={(open) => !open && handleCancelSaveConfirm()}
                    >
                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Confirm planner update</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2 text-xs">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div className="rounded border border-slate-200 bg-slate-50 p-2">
                                        <div className="text-muted-foreground">Current Cost</div>
                                        <div className="font-semibold text-slate-700">{Number(saveConfirmSummary?.previousProjectCost || 0).toFixed(2)}</div>
                                    </div>
                                    <div className="rounded border border-blue-200 bg-blue-50 p-2">
                                        <div className="text-muted-foreground">Auto Cost</div>
                                        <div className="font-semibold text-blue-700">{Number(saveConfirmSummary?.autoProjectCost || 0).toFixed(2)}</div>
                                    </div>
                                    <div className="rounded border border-indigo-200 bg-indigo-50 p-2">
                                        <div className="text-muted-foreground">Final Cost</div>
                                        <div className="font-semibold text-indigo-700">{Number(saveConfirmSummary?.finalProjectCost || 0).toFixed(2)}</div>
                                    </div>
                                    <div className="rounded border border-violet-200 bg-violet-50 p-2">
                                        <div className="text-muted-foreground">Delta</div>
                                        <div className={`font-semibold ${Number(saveConfirmSummary?.totalDelta || 0) < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                                            {Number(saveConfirmSummary?.totalDelta || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div className="rounded border border-cyan-200 bg-cyan-50 p-2">
                                        <div className="text-muted-foreground">Payable</div>
                                        <div className="font-semibold text-cyan-700">{Number(saveConfirmSummary?.payableAmount || 0).toFixed(2)}</div>
                                    </div>
                                    <div className="rounded border border-emerald-200 bg-emerald-50 p-2">
                                        <div className="text-muted-foreground">Paid</div>
                                        <div className="font-semibold text-emerald-700">{Number(saveConfirmSummary?.totalPaid || 0).toFixed(2)}</div>
                                    </div>
                                    <div className="rounded border border-rose-300 bg-rose-100 p-2 md:col-span-2">
                                        <div className="text-muted-foreground">Outstanding</div>
                                        <div className="font-semibold text-rose-800">{Number(saveConfirmSummary?.outstandingAmount || 0).toFixed(2)}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div className="rounded border border-amber-200 bg-amber-50 p-2">
                                        <div className="text-muted-foreground">Capacity now (kW)</div>
                                        <div className="font-semibold text-slate-800">{Number(saveConfirmSummary?.previousCapacityKw || 0).toFixed(2)}</div>
                                    </div>
                                    <div className="rounded border border-amber-200 bg-amber-50 p-2 md:col-span-3">
                                        <div className="text-muted-foreground">After save — BOM preview (kW)</div>
                                        <div className="font-semibold text-amber-950">
                                            {saveConfirmSummary?.previewCapacityKw != null
                                                ? `${saveConfirmSummary.previewCapacityKw.toFixed(2)} (server uses product master W)`
                                                : "—"}
                                        </div>
                                    </div>
                                </div>
                                <details open className="rounded border p-2 bg-slate-50/60">
                                    <summary className="cursor-pointer font-medium">
                                        View item-wise amendments ({Number(saveConfirmSummary?.adjustmentCount || 0)})
                                    </summary>
                                    <div className="mt-2 space-y-1 max-h-60 overflow-auto">
                                        {(saveConfirmSummary?.amendmentItems || []).length === 0 ? (
                                            <div className="text-muted-foreground">No quantity/cost amendment rows in this save.</div>
                                        ) : (
                                            (saveConfirmSummary?.amendmentItems || []).map((item) => (
                                                <div key={item.rowKey} className="rounded border bg-background p-2">
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <div className="flex items-center gap-2 text-[11px]">
                                                            <span className={`font-semibold ${Number(item.qty_delta) < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                                                                {Number(item.qty_delta) < 0 ? "DEDUCT_QTY" : "ADD_QTY"}
                                                            </span>
                                                            <span className="text-muted-foreground">|</span>
                                                            <span className="font-medium">{item.product_name}</span>
                                                            <span className="text-muted-foreground">|</span>
                                                            <span className={Number(item.qty_delta) < 0 ? "text-rose-700 font-semibold" : "text-emerald-700 font-semibold"}>
                                                                Qty {Number(item.qty_delta) > 0 ? `+${item.qty_delta}` : item.qty_delta}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] text-muted-foreground">Preview</span>
                                                    </div>
                                                    <div className="mt-1 grid grid-cols-2 md:grid-cols-6 gap-2 text-[11px]">
                                                        <div><span className="text-muted-foreground">Unit Excl</span><br />{isSuperAdmin || item.planner_added ? Number(item.unit_excl || 0).toFixed(2) : "—"}</div>
                                                        <div><span className="text-muted-foreground">Unit Incl</span><br />{isSuperAdmin || item.planner_added ? Number(item.unit_incl || 0).toFixed(2) : "—"}</div>
                                                        <div><span className="text-muted-foreground">GST Mode</span><br />{item.gst_mode || "—"}</div>
                                                        <div><span className="text-muted-foreground">Amt Excl</span><br />{isSuperAdmin || item.planner_added ? Number(item.amount_excl || 0).toFixed(2) : "—"}</div>
                                                        <div><span className="text-muted-foreground">Amt Incl</span><br />{isSuperAdmin || item.planner_added ? Number(item.amount_incl || 0).toFixed(2) : "—"}</div>
                                                        <div><span className="text-muted-foreground">Cost Basis</span><br />{item.gst_mode === "EXCLUDING_GST" ? "Excl GST" : "Incl GST"}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </details>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelSaveConfirm}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleConfirmSaveProceed}
                                    loading={submitting}
                                    disabled={submitting}
                                >
                                    Confirm and continue
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog
                        open={outstandingConfirmOpen}
                        onOpenChange={(open) => !open && handleCancelOutstandingConfirm()}
                    >
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Outstanding payment warning</DialogTitle>
                            </DialogHeader>
                            <div className="rounded border border-rose-300 bg-rose-100 p-2 mb-2">
                                <p className="text-sm text-rose-800 font-medium">
                                    {`Outstanding payment is ${outstandingInfo?.percent ?? ""}% (Rs. ${outstandingInfo?.amountFormatted ?? ""
                                        }) of payable amount. Do you want to continue saving planner details?`}
                                </p>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelOutstandingConfirm}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleConfirmOutstandingProceed}
                                    loading={submitting}
                                    disabled={submitting}
                                >
                                    OK
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={addBomOpen} onOpenChange={(open) => !open && setAddBomOpen(false)}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add BOM line</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 py-2">
                                <AutocompleteField
                                    label="Product"
                                    options={productsForBom}
                                    getOptionLabel={(o) => formatProductAutocompleteLabel(o)}
                                    value={addBomProduct}
                                    onChange={(e, newVal) => setAddBomProduct(newVal)}
                                    disabled={loadingProducts}
                                    placeholder={loadingProducts ? "Loading…" : "Select product"}
                                />
                                {addBomProduct && (
                                    <Typography variant="body2" color="text.secondary">
                                        Unit of measure: {addBomProduct?.measurement_unit_name ?? addBomProduct?.measurementUnit?.unit ?? "—"}
                                    </Typography>
                                )}
                                <Input
                                    label={addBomProduct?.measurement_unit_name || addBomProduct?.measurementUnit?.unit
                                        ? `Quantity (${addBomProduct.measurement_unit_name || addBomProduct.measurementUnit?.unit})`
                                        : "Quantity"}
                                    type="number"
                                    min={1}
                                    value={addBomQty}
                                    onChange={(e) => setAddBomQty(e.target.value)}
                                />
                            </div>
                            <DialogFooter className="pt-4">
                                <Button variant="outline" size="sm" onClick={() => setAddBomOpen(false)}>
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleAddBomConfirm} disabled={!addBomProduct?.id}>
                                    Add
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </Box>
            ) : (
                <Box className="p-4">
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Amendment Activity</Typography>
                    {costAmendments.length === 0 ? (
                        <Typography color="text.secondary">No amendment activity yet.</Typography>
                    ) : (
                        <Stack spacing={1}>
                            {costAmendments.map((entry) => {
                                const meta = getChangeTypeMeta(entry.change_type);
                                const qtyDelta = Number(entry.qty_delta);
                                const qtyLabel = Number.isFinite(qtyDelta)
                                    ? (qtyDelta > 0 ? `+${qtyDelta}` : `${qtyDelta}`)
                                    : "—";
                                const actorName = entry.actor_user_name || "—";
                                const when = entry.created_at ? moment(entry.created_at).format("DD MMM YYYY, HH:mm") : "—";
                                const productName = entry.product_name || (entry.change_type === "FINAL_OVERRIDE" ? "Final Override" : "—");
                                return (
                                    <Paper key={`cost-${entry.id}`} variant="outlined" sx={{ p: 1.25 }}>
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className={`font-semibold ${meta.tone}`}>{meta.label}</span>
                                                <span className="text-muted-foreground">|</span>
                                                <span className="font-medium">{productName}</span>
                                                <span className="text-muted-foreground">|</span>
                                                <span className={Number.isFinite(qtyDelta) && qtyDelta < 0 ? "text-rose-700 font-semibold" : "text-emerald-700 font-semibold"}>
                                                    Qty {qtyLabel}
                                                </span>
                                            </div>
                                            <Typography variant="caption" color="text.secondary">
                                                {when} · {actorName}
                                            </Typography>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-1 text-[11px]">
                                            <div><span className="text-muted-foreground">Unit Excl</span><br />{isSuperAdmin || entry.metadata?.planner_added ? formatMoneyOrDash(entry.unit_price_base && entry.gst_mode === "EXCLUDING_GST" ? entry.unit_price_base : entry.line_amount_excluding_gst && qtyDelta ? Number(entry.line_amount_excluding_gst) / qtyDelta : null) : "—"}</div>
                                            <div><span className="text-muted-foreground">Unit Incl</span><br />{isSuperAdmin || entry.metadata?.planner_added ? formatMoneyOrDash(entry.unit_price_base && entry.gst_mode === "INCLUDING_GST" ? entry.unit_price_base : entry.line_amount_including_gst && qtyDelta ? Number(entry.line_amount_including_gst) / qtyDelta : null) : "—"}</div>
                                            <div><span className="text-muted-foreground">GST Mode</span><br />{entry.gst_mode || "—"}</div>
                                            <div><span className="text-muted-foreground">Amt Excl</span><br />{isSuperAdmin || entry.metadata?.planner_added ? formatMoneyOrDash(entry.line_amount_excluding_gst) : "—"}</div>
                                            <div><span className="text-muted-foreground">Amt Incl</span><br />{isSuperAdmin || entry.metadata?.planner_added ? formatMoneyOrDash(entry.line_amount_including_gst) : "—"}</div>
                                            <div><span className="text-muted-foreground">Project Cost</span><br />{isSuperAdmin ? `${formatMoneyOrDash(entry.project_cost_before)} → ${formatMoneyOrDash(entry.project_cost_after)}` : "—"}</div>
                                        </div>
                                        <div className="mt-1 text-[11px]">
                                            <span className="text-muted-foreground">Final Payable:</span>{" "}
                                            <span>{isSuperAdmin ? `${formatMoneyOrDash(entry.final_payable_before)} → ${formatMoneyOrDash(entry.final_payable_after)}` : "—"}</span>
                                        </div>
                                    </Paper>
                                );
                            })}
                        </Stack>
                    )}
                </Box>
            )}
        </Box>
    );
}
