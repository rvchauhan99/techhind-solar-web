"use client";

import { useState, useEffect, useRef } from "react";
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
        planned_solar_panel_qty: "",
        planned_inverter_qty: "",
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
    const lastSyncedOrderIdRef = useRef(null);
    const solarPanelQtyRef = useRef(null);
    const inverterQtyRef = useRef(null);

    useEffect(() => {
        fetchWarehouses();
    }, []);

    // Sync formData from orderData only when the order changes (or first load). Avoid overwriting
    // user input when the parent re-renders and passes a new orderData reference.
    useEffect(() => {
        if (!orderData?.id) return;
        const orderIdToSync = String(orderData.id);
        if (lastSyncedOrderIdRef.current === orderIdToSync) return;
        lastSyncedOrderIdRef.current = orderIdToSync;

        const plannerCompleted = orderData.stages?.planner === "completed";
        const defaultChecked = (val) => (plannerCompleted ? (val ?? true) : true);

        setFormData({
            planned_delivery_date: orderData.planned_delivery_date ? moment(orderData.planned_delivery_date).format("YYYY-MM-DD") : "",
            planned_priority: orderData.planned_priority || "Medium",
            planned_warehouse_id: orderData.planned_warehouse_id || "",
            planned_remarks: orderData.planned_remarks || "",
            planned_solar_panel_qty: orderData.planned_solar_panel_qty ?? "",
            planned_inverter_qty: orderData.planned_inverter_qty ?? "",
            planned_has_structure: defaultChecked(orderData.planned_has_structure),
            planned_has_solar_panel: defaultChecked(orderData.planned_has_solar_panel),
            planned_has_inverter: defaultChecked(orderData.planned_has_inverter),
            planned_has_acdb: defaultChecked(orderData.planned_has_acdb),
            planned_has_dcdb: defaultChecked(orderData.planned_has_dcdb),
            planned_has_earthing_kit: defaultChecked(orderData.planned_has_earthing_kit),
            planned_has_cables: defaultChecked(orderData.planned_has_cables),
        });
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

        const solarQty = (solarPanelQtyRef.current?.value ?? "").trim();
        const inverterQty = (inverterQtyRef.current?.value ?? "").trim();

        try {
            const newFieldErrors = {};
            if (!formData.planned_delivery_date) newFieldErrors.planned_delivery_date = "Required";
            if (!formData.planned_priority) newFieldErrors.planned_priority = "Required";
            if (!formData.planned_warehouse_id) newFieldErrors.planned_warehouse_id = "Required";
            if (!solarQty) newFieldErrors.planned_solar_panel_qty = "Required";
            if (!inverterQty) newFieldErrors.planned_inverter_qty = "Required";

            if (Object.keys(newFieldErrors).length > 0) {
                setFieldErrors(newFieldErrors);
                return;
            }

            const updatedStages = {
                ...(orderData?.stages || {}),
                planner: "completed",
                delivery: "pending",
            };

            const payload = {
                ...formData,
                planned_solar_panel_qty: solarQty,
                planned_inverter_qty: inverterQty,
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
            lastSyncedOrderIdRef.current = null;
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

    // Materials table rows: productType, description, qtyField (for editable qty), status, and checkbox field name.
    // All material checkboxes default to checked (initial state and orderData sync use ?? true).
    const materialsRows = [
        {
            name: "planned_has_solar_panel",
            productType: "Solar Panel",
            description: orderData?.solar_panel_description || orderData?.solar_panel_name || "N/A",
            qtyField: "planned_solar_panel_qty",
            status: formData.planned_has_solar_panel,
        },
        {
            name: "planned_has_inverter",
            productType: "Inverter",
            description: orderData?.inverter_description || orderData?.inverter_name || "N/A",
            qtyField: "planned_inverter_qty",
            status: formData.planned_has_inverter,
        },
        { name: "planned_has_structure", productType: "Structure", description: "Structure", qtyField: null, status: formData.planned_has_structure },
        { name: "planned_has_acdb", productType: "ACDB", description: "ACDB", qtyField: null, status: formData.planned_has_acdb },
        { name: "planned_has_dcdb", productType: "DCDB", description: "DCDB", qtyField: null, status: formData.planned_has_dcdb },
        { name: "planned_has_earthing_kit", productType: "Earthing Kit", description: "Earthing Kit", qtyField: null, status: formData.planned_has_earthing_kit },
        { name: "planned_has_cables", productType: "Cables", description: "Cables", qtyField: null, status: formData.planned_has_cables },
    ];

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
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border">
                                        <th className="text-left font-semibold p-2 w-12"></th>
                                        <th className="text-left font-semibold p-2">Product type</th>
                                        <th className="text-left font-semibold p-2">Description</th>
                                        <th className="text-left font-semibold p-2 w-24">Qty</th>
                                        <th className="text-left font-semibold p-2 w-20">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {materialsRows.map((row) => (
                                        <tr key={row.name} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                                            <td className="p-2">
                                                <input
                                                    type="checkbox"
                                                    name={row.name}
                                                    checked={row.status}
                                                    onChange={(e) => handleInputChange({ target: { name: row.name, checked: e.target.checked } })}
                                                    className="size-4 rounded border-input border bg-background accent-primary cursor-pointer"
                                                    disabled={isCompleted || isReadOnly}
                                                />
                                            </td>
                                            <td className="p-2">{row.productType}</td>
                                            <td className="p-2">{row.description}</td>
                                            <td className="p-2">
                                                {row.qtyField === "planned_solar_panel_qty" ? (
                                                    <div>
                                                        <input
                                                            ref={solarPanelQtyRef}
                                                            key={`qty-${orderData?.id ?? "new"}-solar`}
                                                            type="number"
                                                            name="planned_solar_panel_qty"
                                                            defaultValue={String(formData.planned_solar_panel_qty ?? "")}
                                                            min={0}
                                                            inputMode="numeric"
                                                            aria-invalid={!!fieldErrors.planned_solar_panel_qty}
                                                            disabled={isCompleted || isReadOnly}
                                                            className={`h-9 w-full max-w-[80px] min-w-0 rounded-lg border bg-white px-2.5 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring border-input ${fieldErrors.planned_solar_panel_qty ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                                        />
                                                        {fieldErrors.planned_solar_panel_qty && (
                                                            <p className="mt-0.5 text-xs text-destructive">{fieldErrors.planned_solar_panel_qty}</p>
                                                        )}
                                                    </div>
                                                ) : row.qtyField === "planned_inverter_qty" ? (
                                                    <div>
                                                        <input
                                                            ref={inverterQtyRef}
                                                            key={`qty-${orderData?.id ?? "new"}-inverter`}
                                                            type="number"
                                                            name="planned_inverter_qty"
                                                            defaultValue={String(formData.planned_inverter_qty ?? "")}
                                                            min={0}
                                                            inputMode="numeric"
                                                            aria-invalid={!!fieldErrors.planned_inverter_qty}
                                                            disabled={isCompleted || isReadOnly}
                                                            className={`h-9 w-full max-w-[80px] min-w-0 rounded-lg border bg-white px-2.5 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring border-input ${fieldErrors.planned_inverter_qty ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                                        />
                                                        {fieldErrors.planned_inverter_qty && (
                                                            <p className="mt-0.5 text-xs text-destructive">{fieldErrors.planned_inverter_qty}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="p-2">
                                                {row.status ? (
                                                    <CheckCircleIcon color="success" sx={{ fontSize: 20 }} />
                                                ) : (
                                                    <CancelIcon color="error" sx={{ fontSize: 20 }} />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
