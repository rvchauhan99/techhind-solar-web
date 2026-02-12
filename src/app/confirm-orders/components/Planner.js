"use client";

import { useState, useEffect } from "react";
import { Box, Typography, Alert, Paper, Stack } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { usePathname } from "next/navigation";
import moment from "moment";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import Select, { MenuItem } from "@/components/common/Select";
import Checkbox from "@/components/common/Checkbox";
import FormSection from "@/components/common/FormSection";
import FormGrid from "@/components/common/FormGrid";
import { Button } from "@/components/ui/button";
import Loader from "@/components/common/Loader";
import orderService from "@/services/orderService";
import companyService from "@/services/companyService";
import { toastSuccess, toastError } from "@/utils/toast";

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isReadOnly) return;
        setSubmitting(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const newFieldErrors = {};
            if (!formData.planned_delivery_date) newFieldErrors.planned_delivery_date = "Required";
            if (!formData.planned_priority) newFieldErrors.planned_priority = "Required";
            if (!formData.planned_warehouse_id) newFieldErrors.planned_warehouse_id = "Required";

            // Soft validation: require at least one BOM line to remain in scope
            // when a BOM snapshot exists. This does not block legacy orders
            // with no BOM attached.
            if (Array.isArray(orderData?.bom_snapshot) && orderData.bom_snapshot.length > 0) {
                const anyPlanned = bomPlan.some((line) => line.planned);
                if (!anyPlanned) {
                    newFieldErrors.bomPlan = "Select at least one BOM item for planning.";
                }
            }

            if (Object.keys(newFieldErrors).length > 0) {
                setFieldErrors(newFieldErrors);
                return;
            }

            // Build updated BOM snapshot with edited planned_qty values.
            let updatedBomSnapshot = orderData.bom_snapshot;
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
                        planned_qty: plannedQty,
                    };
                });
            }

            const updatedStages = {
                ...(orderData?.stages || {}),
                planner: "completed",
                delivery: "pending",
            };

            const payload = {
                ...formData,
                bom_snapshot: updatedBomSnapshot,
                stages: updatedStages,
                planner_completed_at: new Date().toISOString(),
                current_stage_key: "delivery",
            };

            if (orderData?.stages?.["planner"] === "completed") {
                delete payload.stages;
                delete payload.current_stage_key;
            }
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
        } finally {
            setSubmitting(false);
        }
    };

    const isCompleted = orderData?.stages?.planner === "completed";

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
            {activeTab === "add_planner" ? (
                <Box component="form" onSubmit={handleSubmit}>
                    <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "#fcfcfc" }} className="rounded-lg">
                        <Stack direction="row" divider={<Box sx={{ borderRight: 1, borderColor: "divider", mx: 1 }} />} spacing={1}>
                            <StatusItem label="Structure" isDone={formData.planned_has_structure} />
                            <StatusItem label="Solar Panel" isDone={formData.planned_has_solar_panel} />
                            <StatusItem label="Inverter" isDone={formData.planned_has_inverter} />
                            <StatusItem label="ACDB" isDone={formData.planned_has_acdb} />
                            <StatusItem label="DCDB" isDone={formData.planned_has_dcdb} />
                            <StatusItem label="Earthing Kit" isDone={formData.planned_has_earthing_kit} />
                            <StatusItem label="Cable" isDone={formData.planned_has_cables} />
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
                                disabled={isCompleted || isReadOnly}
                                error={!!fieldErrors.planned_delivery_date}
                                helperText={fieldErrors.planned_delivery_date}
                                required
                            />
                            <Select
                                name="planned_priority"
                                label="Priority"
                                value={formData.planned_priority}
                                onChange={handleInputChange}
                                disabled={isCompleted || isReadOnly}
                                error={!!fieldErrors.planned_priority}
                                helperText={fieldErrors.planned_priority}
                                required
                            >
                                <MenuItem value="High">High</MenuItem>
                                <MenuItem value="Medium">Medium</MenuItem>
                                <MenuItem value="Low">Low</MenuItem>
                            </Select>
                            <Select
                                name="planned_warehouse_id"
                                label="Warehouse"
                                value={formData.planned_warehouse_id}
                                onChange={handleInputChange}
                                disabled={isCompleted || isReadOnly}
                                error={!!fieldErrors.planned_warehouse_id}
                                helperText={fieldErrors.planned_warehouse_id}
                                required
                            >
                                <MenuItem value="">-- Select --</MenuItem>
                                {warehouses.map(w => (
                                    <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                                ))}
                            </Select>
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
                                disabled={isCompleted || isReadOnly}
                            />
                        </div>
                    </FormSection>

                    <FormSection title="Materials for planning / delivery">
                        {Array.isArray(orderData?.bom_snapshot) && orderData.bom_snapshot.length > 0 ? (
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

                                                return (
                                                    <tr
                                                        key={line.__rowKey}
                                                        className={`border-b border-border last:border-b-0 ${
                                                            isFullyShipped ? "bg-muted/40" : "hover:bg-muted/30"
                                                        }`}
                                                    >
                                                        <td className="p-2 align-middle">
                                                            <input
                                                                type="checkbox"
                                                                name={`bom_${line.__rowKey}`}
                                                                checked={line.planned}
                                                                onChange={(e) => handleBomToggle(line.__rowKey, e.target.checked)}
                                                                className="size-4 rounded border-input border bg-background accent-primary cursor-pointer"
                                                                disabled={isCompleted || isReadOnly || isFullyShipped}
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
                                                                disabled={isCompleted || isReadOnly}
                                                                className="w-20 text-right border border-input rounded px-1 py-0.5 bg-background"
                                                            />
                                                        </td>
                                                        <td className="p-2 text-right align-middle">{shippedQty}</td>
                                                        <td className="p-2 text-right align-middle">{pendingQty}</td>
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
                                No BOM snapshot is available for this order. Materials scope will be based on the
                                high-level planner flags and quantities only.
                            </Alert>
                        )}
                    </FormSection>

                    <div className="mt-4 flex flex-col gap-2">
                        {error && <Alert severity="error">{error}</Alert>}
                        {successMsg && <Alert severity="success">{successMsg}</Alert>}
                        <Button type="submit" size="sm" loading={submitting} disabled={isCompleted || isReadOnly}>
                            {isCompleted ? "Update Details" : "Save"}
                        </Button>
                    </div>
                </Box>
            ) : (
                <Box className="p-4">
                    <Typography>Activity Log - Coming Soon</Typography>
                </Box>
            )}
        </Box>
    );
}
