"use client";

import { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Drawer,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import OrderNumberLink from "@/components/common/OrderNumberLink";
import orderService from "@/services/orderService";
import { toastError } from "@/utils/toast";
import {
    compactAddress,
    formatCurrency,
    formatDate,
    formatKw,
    getPrimaryPhone,
    safeValue,
} from "@/utils/orderFormatters";

const COLUMNS = [
    {
        key: "pending_fabrication",
        title: "Pending Fabrication",
        headerBg: "#dc2626",
        chipBg: "#b91c1c",
        accentColor: "#0ea5e9",
        emptyMessage: "No pending fabrication orders assigned to you.",
    },
    {
        key: "pending_installation",
        title: "Pending Installation",
        headerBg: "#eab308",
        chipBg: "#ca8a04",
        accentColor: "#f59e0b",
        emptyMessage: "No pending installation orders assigned to you.",
    },
    {
        key: "completed_installation_15d",
        title: "Completed Fabrication and Installation",
        headerBg: "#15803d",
        chipBg: "#166534",
        accentColor: "#22c55e",
        emptyMessage: "No completed fabrication and installation in the last 15 days.",
    },
];

const toDateTime = (value, fallback) => {
    const ts = value ? new Date(value).getTime() : Number.NaN;
    return Number.isFinite(ts) ? ts : fallback;
};

const sortOrdersForColumn = (list, key) => {
    const rows = [...(list || [])];
    if (key === "completed_installation_15d") {
        return rows.sort(
            (a, b) =>
                toDateTime(b.installation_completed_at, 0) - toDateTime(a.installation_completed_at, 0)
        );
    }
    return rows.sort(
        (a, b) =>
            toDateTime(a.planned_delivery_date, Number.MAX_SAFE_INTEGER) -
            toDateTime(b.planned_delivery_date, Number.MAX_SAFE_INTEGER)
    );
};

const priorityColor = (priority) => {
    const p = String(priority || "").toLowerCase();
    if (p.includes("high")) return "error";
    if (p.includes("medium")) return "warning";
    if (p.includes("low")) return "success";
    return "default";
};

const initialFilters = {
    order_number: "",
    customer_name: "",
    contact_number: "",
    address: "",
    consumer_no: "",
};

const buildFilterParams = (filters) =>
    Object.fromEntries(
        Object.entries(filters || {}).filter(([, value]) => {
            if (value == null) return false;
            const str = String(value).trim();
            return str !== "";
        })
    );

function FabricationInstallationPageContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [groupedOrders, setGroupedOrders] = useState({});
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filters, setFilters] = useState(initialFilters);
    const [appliedFilters, setAppliedFilters] = useState(initialFilters);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const sharedParams = buildFilterParams(appliedFilters);
                const responses = await Promise.all(
                    COLUMNS.map((col) =>
                        orderService.getFabricationInstallationOrders({
                            tab: col.key,
                            ...sharedParams,
                        })
                    )
                );
                const nextGrouped = {};
                COLUMNS.forEach((col, index) => {
                    const data = responses[index];
                    nextGrouped[col.key] = Array.isArray(data) ? data : [];
                });
                setGroupedOrders(nextGrouped);
            } catch (err) {
                console.error("Failed to load fabrication/installation orders:", err);
                const msg =
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to load orders";
                setError(msg);
                toastError(msg);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [appliedFilters]);

    const handleFilterChange = (event) => {
        const { name, value } = event.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        setAppliedFilters(filters);
        setFilterDrawerOpen(false);
    };

    const resetFilters = () => {
        setFilters(initialFilters);
        setAppliedFilters(initialFilters);
    };

    const activeFilterCount = Object.keys(buildFilterParams(appliedFilters)).length;

    const handleOpenDetails = (order) => {
        setSelectedOrder(order);
        setDetailsOpen(true);
    };

    const handleCloseDetails = () => setDetailsOpen(false);

    const handleActionFabrication = (orderId) => {
        router.push(`/fabrication-installation/fabrication/view?id=${orderId}`);
    };

    const handleActionInstallation = (orderId) => {
        router.push(`/fabrication-installation/installation/view?id=${orderId}`);
    };

    const handlePrintOrder = async (resolvedOrder) => {
        try {
            const file = await orderService.downloadOrderPDF(resolvedOrder?.id);
            const blob = file?.blob || file;
            const filename = file?.filename || `order-${resolvedOrder?.order_number || resolvedOrder?.id}.pdf`;
            if (!blob) throw new Error("PDF download failed");
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Failed to download order PDF";
            toastError(msg);
        }
    };

    const totalOrders = COLUMNS.reduce(
        (sum, col) => sum + ((groupedOrders[col.key] || []).length || 0),
        0
    );

    const renderActions = (statusKey, order) => {
        if (statusKey === "pending_fabrication") {
            return (
                <>
                    <Button size="small" variant="contained" onClick={() => handleActionFabrication(order.id)}>
                        Action
                    </Button>
                </>
            );
        }

        if (statusKey === "pending_installation") {
            return (
                <>
                    <Button size="small" variant="contained" onClick={() => handleActionInstallation(order.id)}>
                        Action
                    </Button>
                </>
            );
        }

        return null;
    };

    return (
        <Box
            sx={{
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                height: "calc(100dvh)",
                minHeight: 0,
                overflow: "hidden",
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                <Typography variant="h6">Fabrication & Installation</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => setFilterDrawerOpen(true)}>
                        Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
                    </Button>
                    {activeFilterCount > 0 && (
                        <Button size="small" variant="text" onClick={resetFilters}>
                            Clear
                        </Button>
                    )}
                </Box>
            </Box>

            {loading && (
                <Box display="flex" justifyContent="center" mt={4}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && totalOrders === 0 && (
                <Alert severity="info">No fabrication/installation orders assigned to you.</Alert>
            )}

            {!loading && !error && totalOrders > 0 && (
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        display: "flex",
                        gap: 2,
                        overflowX: "auto",
                        overflowY: "hidden",
                        pb: 1,
                        alignItems: "stretch",
                    }}
                >
                    {COLUMNS.map((col) => {
                        const list = sortOrdersForColumn(groupedOrders[col.key] || [], col.key);
                        const totalCapacity = list.reduce((sum, row) => sum + (Number(row.capacity) || 0), 0);
                        return (
                            <Paper
                                key={col.key}
                                sx={{
                                    minWidth: 360,
                                    maxWidth: 420,
                                    flex: "1 0 360px",
                                    height: "100%",
                                    bgcolor: "#f8fafc",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    overflow: "hidden",
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <Box
                                    sx={{
                                        bgcolor: col.headerBg,
                                        color: "#fff",
                                        px: 1.5,
                                        py: 1,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                        {col.title}
                                    </Typography>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <Typography variant="caption" sx={{ opacity: 0.95 }}>
                                            {formatKw(totalCapacity)} kW
                                        </Typography>
                                        <Chip
                                            size="small"
                                            label={list.length}
                                            sx={{
                                                height: 20,
                                                bgcolor: col.chipBg,
                                                color: "#fff",
                                                fontWeight: 700,
                                                "& .MuiChip-label": { px: 1 },
                                            }}
                                        />
                                    </Box>
                                </Box>
                                <Box
                                    sx={{
                                        p: 1.25,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 1,
                                        flex: 1,
                                        minHeight: 0,
                                        overflowY: "auto",
                                    }}
                                >
                                    {list.length === 0 && (
                                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {col.emptyMessage}
                                            </Typography>
                                        </Paper>
                                    )}
                                    {list.map((o) => (
                                        <Paper
                                            key={o.id}
                                            variant="outlined"
                                            sx={{
                                                p: 1.25,
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 0.75,
                                                borderLeft: "4px solid",
                                                borderLeftColor: col.accentColor,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: 1,
                                                }}
                                            >
                                                <OrderNumberLink
                                                    value={o.order_number || "-"}
                                                    onClick={() => handleOpenDetails(o)}
                                                />
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                    <Chip
                                                        size="small"
                                                        label={o.planned_priority || "No Priority"}
                                                        color={priorityColor(o.planned_priority)}
                                                        sx={{ height: 20, fontSize: "0.68rem" }}
                                                    />
                                                </Box>
                                            </Box>
                                            <Box>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontWeight: 600 }}
                                                    title={o.customer_name || "-"}
                                                >
                                                    {o.customer_name || "-"}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Contact: {getPrimaryPhone(o)}
                                                    {o.company_name ? ` • ${o.company_name}` : ""}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ display: "block" }}
                                                    title={compactAddress(o)}
                                                >
                                                    Address: {compactAddress(o)}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ display: "block" }}
                                                >
                                                    Order Date: {formatDate(o.order_date)}
                                                    {o.consumer_no ? ` • Consumer: ${o.consumer_no}` : ""}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                                    Capacity: {safeValue(o.capacity)} kW
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Project: {formatCurrency(o.project_cost)} • Paid:{" "}
                                                    {formatCurrency(o.total_paid)}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        display: "block",
                                                        color: o.outstanding_balance > 0 ? "error.main" : "success.main",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Outstanding: {formatCurrency(o.outstanding_balance)}
                                                </Typography>
                                            </Box>
                                            {col.key === "completed_installation_15d" && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                                    Completed: {formatDate(o.installation_completed_at)}
                                                </Typography>
                                            )}
                                            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", pt: 0.25 }}>
                                                {renderActions(col.key, o)}
                                            </Box>
                                        </Paper>
                                    ))}
                                </Box>
                            </Paper>
                        );
                    })}
                </Box>
            )}

            <Drawer anchor="left" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}>
                <Box sx={{ width: { xs: 320, sm: 420 }, p: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
                    <Typography variant="h6">Filters</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                        Apply filters to narrow down fabrication/installation orders.
                    </Typography>
                    <TextField
                        size="small"
                        label="Order No"
                        name="order_number"
                        value={filters.order_number ?? ""}
                        onChange={handleFilterChange}
                    />
                    <TextField
                        size="small"
                        label="Customer Name"
                        name="customer_name"
                        value={filters.customer_name ?? ""}
                        onChange={handleFilterChange}
                    />
                    <TextField
                        size="small"
                        label="Contact Number"
                        name="contact_number"
                        value={filters.contact_number ?? ""}
                        onChange={handleFilterChange}
                        placeholder="Mobile or phone"
                    />
                    <TextField
                        size="small"
                        label="Address"
                        name="address"
                        value={filters.address ?? ""}
                        onChange={handleFilterChange}
                        placeholder="Address, landmark, taluka, district, pin"
                    />
                    <TextField
                        size="small"
                        label="Consumer No"
                        name="consumer_no"
                        value={filters.consumer_no ?? ""}
                        onChange={handleFilterChange}
                    />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                        <Button size="small" variant="contained" onClick={applyFilters}>
                            Apply
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                                resetFilters();
                                setFilterDrawerOpen(false);
                            }}
                        >
                            Reset
                        </Button>
                        <Button size="small" variant="text" onClick={() => setFilterDrawerOpen(false)}>
                            Cancel
                        </Button>
                    </Box>
                </Box>
            </Drawer>

            <OrderDetailsDrawer
                open={detailsOpen}
                onClose={handleCloseDetails}
                order={selectedOrder}
                onPrint={handlePrintOrder}
                showPrint
                showDeliverySnapshot={false}
            />
        </Box>
    );
}

export default function FabricationInstallationPage() {
    return (
        <ProtectedRoute>
            <FabricationInstallationPageContent />
        </ProtectedRoute>
    );
}
