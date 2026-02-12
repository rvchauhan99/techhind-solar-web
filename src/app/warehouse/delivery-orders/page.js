"use client";

import { useEffect, useState } from "react";
import {
    Box,
    Tabs,
    Tab,
    Paper,
    Typography,
    Grid,
    Button,
    Chip,
    CircularProgress,
    Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";
import orderService from "@/services/orderService";
import { toastError } from "@/utils/toast";

const VIEW_TABS = [
    { value: "kanban", label: "Kanban" },
    { value: "list", label: "List" },
];

const priorityColor = (priority) => {
    if (!priority) return "default";
    const p = String(priority).toLowerCase();
    if (p.includes("high")) return "error";
    if (p.includes("medium")) return "warning";
    if (p.includes("low")) return "success";
    return "default";
};

const deliveryStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "complete") return "success";
    if (s === "partial") return "warning";
    return "default";
};

export default function WarehouseDeliveryOrdersPage() {
    const [view, setView] = useState("kanban");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [orders, setOrders] = useState([]);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await orderService.getPendingDeliveryOrders();
                const data = res?.result || res || [];
                setOrders(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to load pending delivery orders:", err);
                const msg = err?.response?.data?.message || err?.message || "Failed to load pending delivery orders";
                setError(msg);
                toastError(msg);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleViewChange = (_event, newValue) => {
        setView(newValue);
    };

    const handleCreateChallan = (orderId) => {
        router.push(`/delivery-challans/new?order_id=${orderId}`);
    };

    const groupedByPriority = orders.reduce((acc, o) => {
        const key = o.planned_priority || "Unprioritized";
        acc[key] = acc[key] || [];
        acc[key].push(o);
        return acc;
    }, {});

    return (
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h6">Pending Delivery Orders (Warehouse Manager)</Typography>

            <Tabs value={view} onChange={handleViewChange} sx={{ mb: 1 }}>
                {VIEW_TABS.map((tab) => (
                    <Tab key={tab.value} value={tab.value} label={tab.label} />
                ))}
            </Tabs>

            {loading && (
                <Box display="flex" justifyContent="center" mt={4}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && error && (
                <Alert severity="error">{error}</Alert>
            )}

            {!loading && !error && orders.length === 0 && (
                <Alert severity="info">No pending delivery orders assigned to your warehouses.</Alert>
            )}

            {!loading && !error && orders.length > 0 && (
                <>
                    {view === "kanban" && (
                        <Box sx={{ display: "flex", gap: 2, overflowX: "auto" }}>
                            {Object.entries(groupedByPriority).map(([priority, list]) => (
                                <Paper key={priority} sx={{ minWidth: 260, p: 1, flexShrink: 0 }}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                                        <Typography variant="subtitle2">{priority}</Typography>
                                        <Chip
                                            size="small"
                                            label={list.length}
                                            color={priorityColor(priority)}
                                        />
                                    </Box>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                        {list.map((o) => (
                                            <Paper
                                                key={o.id}
                                                variant="outlined"
                                                sx={{ p: 1, display: "flex", flexDirection: "column", gap: 0.5 }}
                                            >
                                                <Typography variant="body2" fontWeight={600}>
                                                    {o.order_number}
                                                </Typography>
                                                <Typography variant="caption">
                                                    {o.customer_name || "-"}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {o.planned_warehouse_name || ""} •{" "}
                                                    {o.planned_delivery_date || ""}
                                                </Typography>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Shipped {o.total_shipped} / {o.total_required} (Pending {o.total_pending})
                                                    </Typography>
                                                    <Chip
                                                        size="small"
                                                        label={
                                                            o.delivery_status === "complete"
                                                                ? "Delivery: Complete"
                                                                : o.delivery_status === "partial"
                                                                    ? "Delivery: Partial"
                                                                    : "Delivery: Pending"
                                                        }
                                                        color={deliveryStatusColor(o.delivery_status)}
                                                        sx={{ fontSize: "0.65rem", height: 18 }}
                                                    />
                                                </Box>
                                                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => router.push(`/confirm-orders/view?id=${o.id}`)}
                                                    >
                                                        View
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        onClick={() => handleCreateChallan(o.id)}
                                                    >
                                                        Create Challan
                                                    </Button>
                                                </Box>
                                            </Paper>
                                        ))}
                                    </Box>
                                </Paper>
                            ))}
                        </Box>
                    )}

                    {view === "list" && (
                        <Paper sx={{ p: 1 }}>
                            <Grid container spacing={1}>
                                <Grid item xs={3}>
                                    <Typography variant="caption" fontWeight={600}>Order</Typography>
                                </Grid>
                                <Grid item xs={3}>
                                    <Typography variant="caption" fontWeight={600}>Customer</Typography>
                                </Grid>
                                <Grid item xs={2}>
                                    <Typography variant="caption" fontWeight={600}>Warehouse</Typography>
                                </Grid>
                                <Grid item xs={2.5}>
                                    <Typography variant="caption" fontWeight={600}>Delivery</Typography>
                                </Grid>
                                <Grid item xs={1.5}>
                                    <Typography variant="caption" fontWeight={600}>Actions</Typography>
                                </Grid>
                                {orders.map((o) => (
                                    <Grid item xs={12} key={o.id}>
                                        <Box sx={{ display: "flex", alignItems: "center", py: 0.5, borderTop: "1px solid #eee" }}>
                                            <Box sx={{ flex: 3 }}>
                                                <Typography variant="body2" fontWeight={600}>{o.order_number}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Capacity {o.capacity || "-"} • Rs. {o.project_cost || 0}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ flex: 3 }}>
                                                <Typography variant="body2">{o.customer_name || "-"}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {o.mobile_number || ""} {o.address ? `• ${o.address}` : ""}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ flex: 2 }}>
                                                <Typography variant="body2">{o.planned_warehouse_name || "-"}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {o.planned_priority || "-"}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ flex: 2.5 }}>
                                                <Typography variant="body2">
                                                    {o.planned_delivery_date || "-"}
                                                </Typography>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Shipped {o.total_shipped} / {o.total_required}
                                                    </Typography>
                                                    <Chip
                                                        size="small"
                                                        label={
                                                            o.delivery_status === "complete"
                                                                ? "Delivery: Complete"
                                                                : o.delivery_status === "partial"
                                                                    ? "Delivery: Partial"
                                                                    : "Delivery: Pending"
                                                        }
                                                        color={deliveryStatusColor(o.delivery_status)}
                                                        sx={{ fontSize: "0.65rem", height: 18 }}
                                                    />
                                                </Box>
                                            </Box>
                                            <Box sx={{ flex: 1.5, display: "flex", gap: 1, justifyContent: "flex-end" }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => router.push(`/confirm-orders/view?id=${o.id}`)}
                                                >
                                                    View
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    onClick={() => handleCreateChallan(o.id)}
                                                >
                                                    Create Challan
                                                </Button>
                                            </Box>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    )}
                </>
            )}
        </Box>
    );
}

