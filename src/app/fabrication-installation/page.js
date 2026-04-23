"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Drawer,
    Paper,
    Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconFilter } from "@tabler/icons-react";
import OrderListQuickSearch from "@/components/common/OrderListQuickSearch";
import Input from "@/components/common/Input";
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
        headerStyle: { background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)" },
        chipBg: "rgba(0,0,0,0.2)",
        accentColor: "#ef4444",
        emptyMessage: "No pending fabrication orders assigned to you.",
    },
    {
        key: "pending_installation",
        title: "Pending Installation",
        headerStyle: { background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" },
        chipBg: "rgba(0,0,0,0.2)",
        accentColor: "#f59e0b",
        emptyMessage: "No pending installation orders assigned to you.",
    },
    {
        key: "completed_installation_15d",
        title: "Completed Fabrication and Installation",
        headerStyle: { background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" },
        chipBg: "rgba(0,0,0,0.2)",
        accentColor: "#10b981",
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
    const [appliedDrawerFilters, setAppliedDrawerFilters] = useState(initialFilters);
    const [quickSearch, setQuickSearch] = useState("");
    const [appliedQ, setAppliedQ] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const debounceRef = useRef(null);
    const searchFeedbackRef = useRef(null);

    const handleQuickSearchChange = useCallback((val) => {
        setQuickSearch(val);
        setIsSearching(true);
        if (searchFeedbackRef.current) clearTimeout(searchFeedbackRef.current);
        searchFeedbackRef.current = setTimeout(() => setIsSearching(false), 500);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setAppliedQ(val.trim()), 350);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const sharedParams = appliedQ
                    ? { q: appliedQ }
                    : buildFilterParams(appliedDrawerFilters);
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
    }, [appliedQ, appliedDrawerFilters]);

    const handleFilterChange = (event) => {
        const { name, value } = event.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const applyFilters = () => {
        setAppliedDrawerFilters(filters);
        setQuickSearch("");
        setAppliedQ("");
        setFilterDrawerOpen(false);
    };

    const resetFilters = () => {
        setFilters(initialFilters);
        setAppliedDrawerFilters(initialFilters);
        setQuickSearch("");
        setAppliedQ("");
    };

    const activeFilterCount = appliedQ
        ? 1
        : Object.keys(buildFilterParams(appliedDrawerFilters)).length;

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
                <Button size="sm" onClick={() => handleActionFabrication(order.id)}>
                    Action
                </Button>
            );
        }
        if (statusKey === "pending_installation") {
            return (
                <Button size="sm" onClick={() => handleActionInstallation(order.id)}>
                    Action
                </Button>
            );
        }
        return null;
    };

    return (
        <div className="p-2 flex flex-col gap-2 h-dvh min-h-0 overflow-hidden">
            <Card className="rounded-xl shadow-sm border-slate-200 bg-white">
                <div className="flex flex-col sm:flex-row items-center gap-2 px-2.5 py-1.5">
                    <h1 className="text-base font-bold text-slate-900 whitespace-nowrap shrink-0">
                        Fabrication & Installation
                    </h1>
                    <OrderListQuickSearch
                        value={quickSearch}
                        onValueChange={handleQuickSearchChange}
                        isSearching={isSearching}
                        className="flex-1 min-w-[180px] max-w-[340px] w-full sm:w-80"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setFilterDrawerOpen(true)}
                            className="h-8 text-xs gap-1.5 px-2.5"
                        >
                            <IconFilter size={14} />
                            Filters
                            {activeFilterCount > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="text-[10px] h-4 px-1 leading-none bg-green-100 text-green-700 border-green-200"
                                >
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </Button>
                        {activeFilterCount > 0 && (
                            <Button size="sm" variant="ghost" onClick={resetFilters} className="h-8 text-xs px-2">
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

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
                                        ...col.headerStyle,
                                        color: "#fff",
                                        px: 1.5,
                                        py: 1.25,
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
                                                transition: "all 0.2s ease-in-out",
                                                "&:hover": {
                                                    transform: "translateY(-2px)",
                                                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                                                    borderColor: col.accentColor,
                                                }
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
                                                    Fabricator: {o.fabricator_name || "-"}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                                    Installer: {o.installer_name || "-"}
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
                <div className="w-[320px] sm:w-[420px] p-4 flex flex-col gap-2.5">
                    <h2 className="text-lg font-bold text-slate-900">Filters</h2>
                    <p className="text-xs text-slate-500 -mt-1 mb-0.5">
                        Narrow down fabrication/installation orders.
                    </p>
                    <Input
                        size="small"
                        label="Order No"
                        name="order_number"
                        value={filters.order_number ?? ""}
                        onChange={handleFilterChange}
                    />
                    <Input
                        size="small"
                        label="Customer Name"
                        name="customer_name"
                        value={filters.customer_name ?? ""}
                        onChange={handleFilterChange}
                    />
                    <Input
                        size="small"
                        label="Contact Number"
                        name="contact_number"
                        value={filters.contact_number ?? ""}
                        onChange={handleFilterChange}
                        placeholder="Mobile or phone"
                    />
                    <Input
                        size="small"
                        label="Address"
                        name="address"
                        value={filters.address ?? ""}
                        onChange={handleFilterChange}
                        placeholder="Address, landmark, taluka, district, pin"
                    />
                    <Input
                        size="small"
                        label="Consumer No"
                        name="consumer_no"
                        value={filters.consumer_no ?? ""}
                        onChange={handleFilterChange}
                    />
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <Button size="sm" onClick={applyFilters} className="h-8 px-3 text-xs w-20">
                            Apply
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs w-20"
                            onClick={() => {
                                resetFilters();
                                setFilterDrawerOpen(false);
                            }}
                        >
                            Reset
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-3 text-xs" onClick={() => setFilterDrawerOpen(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </Drawer>

            <OrderDetailsDrawer
                open={detailsOpen}
                onClose={handleCloseDetails}
                order={selectedOrder}
                onPrint={handlePrintOrder}
                showPrint
                showDeliverySnapshot={false}
            />
        </div>
    );
}

export default function FabricationInstallationPage() {
    return (
        <ProtectedRoute>
            <FabricationInstallationPageContent />
        </ProtectedRoute>
    );
}
