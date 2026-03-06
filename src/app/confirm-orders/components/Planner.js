"use client";

import { useState, useEffect } from "react";
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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

/** Number of days after planner completion during which the planner remains editable. */
const PLANNER_EDITABLE_DAYS = 100;

export default function Planner({ orderId, orderData, onSuccess }) {
    const pathname = usePathname();
    const isReadOnly = pathname?.startsWith("/closed-orders");
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

    useEffect(() => {
        fetchWarehouses();
    }, []);

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
            setBomPlan(
                orderData.bom_snapshot.map((line, index) => ({
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
                }))
            );
        } else {
            setBomPlan([]);
        }
    }, [orderData]);

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
            await orderService.updateOrder(orderId, payload);

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
                return;
            }

            // Build updated BOM snapshot from bomPlan (includes new lines from Add item)
            let updatedBomSnapshot = Array.isArray(orderData?.bom_snapshot) ? orderData.bom_snapshot : [];
            if (Array.isArray(bomPlan) && bomPlan.length > 0) {
                updatedBomSnapshot = bomPlan.map((line) => {
                    const { __rowKey, planned, ...rest } = line;
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
                    };
                });
            }

            const updatedStages = {
                ...(orderData?.stages || {}),
                planner: "completed",
                delivery: "pending",
            };

            const payloadBarState = deriveBarStateFromBomPlan(bomPlan);
            const payload = {
                ...formData,
                ...payloadBarState,
                bom_snapshot: updatedBomSnapshot,
                stages: updatedStages,
                planner_completed_at: new Date().toISOString(),
                current_stage_key: "delivery",
            };

            if (orderData?.stages?.["planner"] === "completed") {
                delete payload.stages;
                delete payload.current_stage_key;
            }

            const projectCost = Number(orderData?.project_cost) || 0;
            const discount = Number(orderData?.discount) || 0;
            const payableAmount = Math.max(projectCost - discount, 0);
            const totalPaid = Number(orderData?.total_paid) || 0;
            const fallbackOutstanding = Math.max(payableAmount - totalPaid, 0);
            const outstandingAmount = Math.max(
                Number(orderData?.outstanding_balance ?? fallbackOutstanding) || 0,
                0
            );
            const outstandingPercent =
                payableAmount > 0 ? (outstandingAmount / payableAmount) * 100 : 0;

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
        } catch (err) {
            console.error("Failed to prepare planner details:", err);
            const errMsg = err?.message || "Failed to save data";
            setError(errMsg);
            toastError(errMsg);
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
    const isPlannerLocked = isCompleted && !withinEditableWindow;

    const hasNoBom = !orderData?.bom_snapshot?.length;
    const showImportFromProject = hasNoBom && !isReadOnly && !isPlannerLocked;

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
        const newLine = {
            product_id: p.id,
            quantity: qty,
            planned_qty: qty,
            planned: true,
            shipped_qty: 0,
            returned_qty: 0,
            __rowKey: `add-${Date.now()}-${p.id}`,
            product_snapshot: {
                product_name: productName,
                product_type_name: typeName,
                product_make_name: makeName,
            },
            product_name: productName,
            product_type_name: typeName,
            product_make_name: makeName,
        };
        setBomPlan((prev) => [...prev, newLine]);
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
        setBomPlan((prev) => prev.filter((line) => line.__rowKey !== rowKey));
        if (fieldErrors.bomPlan) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.bomPlan;
                return next;
            });
        }
    };

    /** Normalize product type name for mapping (lowercase, spaces to underscore). */
    const normalizeProductTypeName = (s) => (s || "").toLowerCase().trim().replace(/\s+/g, "_");

    /**
     * Map normalized product_type_name to one of the seven bar category keys.
     * Returns null if the type does not match any category.
     */
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

    const StatusItem = ({ label, isDone }) => (
        <Stack alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 80 }}>
            <Typography variant="caption" sx={{ fontWeight: "bold", textAlign: "center" }}>{label}</Typography>
            {isDone ? (
                <CheckCircleIcon color="success" sx={{ fontSize: 24 }} />
            ) : (
                <CancelIcon color="error" sx={{ fontSize: 24 }} />
            )}
        </Stack>
    );

    if (loading) return <Loader />;

    return (
        <Box className="p-4">
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
                <Tab label="Planner" value="add_planner" />
                <Tab label="Activity" value="activity" />
            </Tabs>
            {activeTab === "add_planner" ? (
                <Box component="form" onSubmit={handleSubmit}>
                    <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "#fcfcfc" }} className="rounded-lg">
                        <Stack direction="row" divider={<Box sx={{ borderRight: 1, borderColor: "divider", mx: 1 }} />} spacing={1}>
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
                                                                disabled={isPlannerLocked || isReadOnly || isFullyShipped}
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
                                                                disabled={isPlannerLocked || isReadOnly}
                                                                className="w-20 text-right border border-input rounded px-1 py-0.5 bg-background"
                                                            />
                                                        </td>
                                                        <td className="p-2 text-right align-middle">{shippedQty}</td>
                                                        <td className="p-2 text-right align-middle">{pendingQty}</td>
                                                        {!isReadOnly && !isPlannerLocked && (
                                                            <td className="p-2 text-center align-middle">
                                                                {canRemove ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleBomRemove(line.__rowKey)}
                                                                        className="text-muted-foreground hover:text-destructive p-0.5 rounded"
                                                                        aria-label="Remove line"
                                                                    >
                                                                        <DeleteOutlineIcon fontSize="small" />
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-muted-foreground/50" title={shippedQty > 0 ? "Cannot remove: already shipped" : ""}>—</span>
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
                        open={outstandingConfirmOpen}
                        onOpenChange={(open) => !open && handleCancelOutstandingConfirm()}
                    >
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Outstanding payment warning</DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-muted-foreground mb-2">
                                {`Outstanding payment is ${outstandingInfo?.percent ?? ""}% (Rs. ${outstandingInfo?.amountFormatted ?? ""
                                    }) of payable amount. Do you want to continue saving planner details?`}
                            </p>
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
                                    getOptionLabel={(o) => o?.product_name ?? o?.name ?? ""}
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
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Activity log</Typography>
                    {Array.isArray(orderData?.planner_activity_log) && orderData.planner_activity_log.length > 0 ? (
                        <Stack spacing={1.5}>
                            {[...orderData.planner_activity_log]
                                .sort((a, b) => new Date(b?.at || 0) - new Date(a?.at || 0))
                                .map((entry, idx) => {
                                    const actionLabel =
                                        entry.action === "bom_line_added"
                                            ? "Added line"
                                            : entry.action === "bom_line_removed"
                                                ? "Removed line"
                                                : entry.action === "bom_qty_changed"
                                                    ? "Changed qty"
                                                    : entry.action === "bom_imported_from_project"
                                                        ? "Imported BOM from project"
                                                        : entry.action === "planner_saved"
                                                            ? "Saved planner"
                                                            : entry.action || "—";
                                    const when = entry.at ? moment(entry.at).format("DD MMM YYYY, HH:mm") : "—";
                                    const who = entry.user_name || (entry.user_id != null ? `User #${entry.user_id}` : "—");
                                    const product = entry.product_name ? `: ${entry.product_name}` : "";
                                    const qtyDetail =
                                        entry.action === "bom_qty_changed" && entry.old_qty != null && entry.new_qty != null
                                            ? ` (${entry.old_qty} → ${entry.new_qty})`
                                            : entry.action === "bom_line_added" && entry.new_qty != null
                                                ? ` (qty ${entry.new_qty})`
                                                : entry.action === "bom_line_removed" && entry.old_qty != null
                                                    ? ` (was qty ${entry.old_qty})`
                                                    : "";
                                    return (
                                        <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                                            <Typography variant="body2">
                                                <strong>{actionLabel}</strong>
                                                {product}
                                                {qtyDetail}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {when} · {who}
                                            </Typography>
                                        </Paper>
                                    );
                                })}
                        </Stack>
                    ) : (
                        <Typography color="text.secondary">No activity yet.</Typography>
                    )}
                </Box>
            )}
        </Box>
    );
}
