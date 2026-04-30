"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Typography, Paper, Grid, Tooltip, IconButton, Drawer, Chip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from "@mui/material";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Container from "@/components/container";
import orderService from "@/services/orderService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { toastError, toastSuccess } from "@/utils/toast";
import PaginatedList from "@/components/common/PaginatedList";
import PaginatedTable from "@/components/common/PaginatedTable";
import { OrderListFilterPanel, ORDER_LIST_FILTER_KEYS } from "@/components/common";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import Installation from "@/app/confirm-orders/components/Installation";
import VisibilityIcon from "@mui/icons-material/Visibility";
import OrderNumberLink from "@/components/common/OrderNumberLink";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EventIcon from "@mui/icons-material/Event";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpIcon from "@mui/icons-material/Help";
import PhoneIcon from "@mui/icons-material/Phone";
import moment from "moment";
import {
    getOrderOutstandingAmount,
    getOrderProjectCostAmount,
    getOrderReceivedAmount,
} from "@/utils/orderPaymentSummary";

const TAB_PENDING = "pending";
const TAB_HISTORY = "history";

const STAGES = [
    { key: "estimate_generated", label: "Estimate Generated" },
    { key: "estimate_paid", label: "Estimate Paid" },
    { key: "planner", label: "Planner" },
    { key: "delivery", label: "Delivery" },
    { key: "assign_fabricator_and_installer", label: "Assign Fabricator & Installer" },
    { key: "fabrication", label: "Fabrication" },
    { key: "installation", label: "Installation" },
];

export default function InstallationManagerApprovalPage() {
    const [activeTab, setActiveTab] = useState(TAB_PENDING);
    const listingState = useListingQueryState({
        defaultLimit: 25,
        filterKeys: ORDER_LIST_FILTER_KEYS,
    });
    const { page, limit, q, filters, setPage, setLimit, setQ, setFilters, clearFilters } = listingState;
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [actionId, setActionId] = useState(null);
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [targetOrderId, setTargetOrderId] = useState(null);
    const [approveRemarks, setApproveRemarks] = useState("");
    const [rejectReasonId, setRejectReasonId] = useState("");
    const [rejectRemarks, setRejectRemarks] = useState("");
    const [rejectionReasonOptions, setRejectionReasonOptions] = useState([]);
    const [triggerReload, setTriggerReload] = useState(0);

    const reloadList = () => setTriggerReload((prev) => prev + 1);

    useEffect(() => {
        let mounted = true;
        getReferenceOptionsSearch("reason.model", {
            reason_type: "installation_rejection",
            is_active: true,
            limit: 200,
        })
            .then((options) => {
                if (!mounted) return;
                setRejectionReasonOptions(Array.isArray(options) ? options : []);
            })
            .catch(() => {
                if (!mounted) return;
                setRejectionReasonOptions([]);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const fetchData = useCallback(
        async (params) => {
            const next = {
                ...params,
                tab: activeTab === TAB_PENDING ? "installation_pending_approval" : "installation_approval_history",
                includeSummary: "true",
            };
            const fromRaw = next.capacity_kw_from;
            const toRaw = next.capacity_kw_to;
            delete next.capacity_kw_from;
            delete next.capacity_kw_to;
            const fromStr = fromRaw != null ? String(fromRaw).trim() : "";
            if (fromStr !== "") {
                next.capacity_from = fromStr;
                next.capacity_to =
                    toRaw != null && String(toRaw).trim() !== "" ? String(toRaw).trim() : fromStr;
            }
            return await orderService.getFabricationInstallationOrders(next);
        },
        [activeTab]
    );

    const statusBadge = useCallback((status) => {
        const key = String(status || "").toLowerCase();
        if (key === "approved") return <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>;
        if (key === "rejected") return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
        return <Badge className="bg-amber-100 text-amber-700">Pending Approval</Badge>;
    }, []);

    const openApproveDialog = (id) => {
        setTargetOrderId(id);
        setApproveRemarks("");
        setApproveDialogOpen(true);
    };

    const openRejectDialog = (id) => {
        setTargetOrderId(id);
        setRejectReasonId("");
        setRejectRemarks("");
        setRejectDialogOpen(true);
    };

    const handleApprove = async () => {
        if (!targetOrderId) return;
        setActionId(targetOrderId);
        try {
            await orderService.managerApproveInstallation(targetOrderId, { remarks: approveRemarks || "" });
            toastSuccess("Installation approved.");
            setApproveDialogOpen(false);
            setTargetOrderId(null);
            setDrawerOpen(false);
            reloadList();
        } catch (err) {
            toastError(err?.response?.data?.message || "Approval failed.");
        } finally {
            setActionId(null);
        }
    };

    const handleReject = async () => {
        if (!targetOrderId || !rejectReasonId) return;
        setActionId(targetOrderId);
        try {
            await orderService.managerRejectInstallation(targetOrderId, {
                reason_id: Number(rejectReasonId),
                remarks: rejectRemarks || "",
            });
            toastSuccess("Installation rejected.");
            setRejectDialogOpen(false);
            setTargetOrderId(null);
            setDrawerOpen(false);
            reloadList();
        } catch (err) {
            toastError(err?.response?.data?.message || "Rejection failed.");
        } finally {
            setActionId(null);
        }
    };

    const renderOrderDetail = (label, value, isBold = true, color = "text.primary") => (
        <Box mb={0.4}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: "0.68rem", lineHeight: 1.1 }}>
                {label}:
            </Typography>
            <Typography variant="body2" color={color} fontWeight={isBold ? "bold" : "normal"} sx={{ fontSize: "0.78rem", lineHeight: 1.2, wordBreak: "break-word" }}>
                {value || "-"}
            </Typography>
        </Box>
    );

    const renderOrderItem = (row, reload) => {
        const isApprovalPending = String(row.installation_approval_status || "").toLowerCase() === "pending_approval";

        return (
            <Paper
                elevation={0}
                onClick={() => {
                    setSelectedOrder(row);
                    setDrawerOpen(true);
                }}
                sx={{
                    position: "relative",
                    border: "1px solid #e0e0e0",
                    borderTop: "3px solid #1976d2",
                    borderRadius: "4px 4px 1px 1px",
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "0.2s",
                    "&:hover": {
                        borderColor: "#1976d2",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    },
                }}
            >
                <Box sx={{ bgcolor: "#fff", p: 0.6, px: 2, display: "flex", alignItems: "center", borderBottom: "1px solid #f0f0f0" }}>
                    <OrderNumberLink
                        value={row.order_number || row.id || "-"}
                        suffix={` : ${row.customer_name?.toUpperCase() || "-"}`}
                        variant="subtitle2"
                        sx={{ mr: 2, fontSize: "0.88rem" }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(row);
                            setDrawerOpen(true);
                        }}
                    />
                    <div className="ml-2 mr-2">
                        {statusBadge(row.installation_approval_status)}
                    </div>
                    {row.planned_warehouse_name && (
                        <Chip label={row.planned_warehouse_name} size="small" sx={{ bgcolor: "#f5f5f5", color: "#333", height: 18, fontSize: "0.58rem", mr: 1, borderRadius: "3px" }} />
                    )}

                    <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="View Detailed Audit">
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setSelectedOrder(row);
                                    setDrawerOpen(true);
                                }}
                            >
                                <VisibilityIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                        {isApprovalPending && (
                            <>
                                <Button size="sm" onClick={() => openApproveDialog(row.id)}>
                                    Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => openRejectDialog(row.id)}>
                                    Reject
                                </Button>
                            </>
                        )}
                    </Box>
                </Box>

                <Box sx={{ p: 2 }}>
                    <Grid container spacing={1}>
                        <Grid item size={3}>
                            {renderOrderDetail("Order Date", row.order_date ? moment(row.order_date).format("DD-MM-YYYY") : "-")}
                            {renderOrderDetail("Capacity", row.capacity ? `${row.capacity} kW` : "-")}
                            {renderOrderDetail("Consumer No", row.consumer_no)}
                            {renderOrderDetail("Application", row.application_no)}
                            {renderOrderDetail("Tags", row.tags)}
                        </Grid>
                        <Grid item size={3}>
                            <Box mb={0.4}>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: "0.68rem", lineHeight: 1.1 }}>
                                    Mobile No:
                                </Typography>
                                <Typography variant="body2" color="primary" fontWeight="bold" sx={{ fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <PhoneIcon sx={{ fontSize: 12 }} /> {row.mobile_number}
                                </Typography>
                            </Box>
                            {renderOrderDetail("Address", row.address)}
                            {renderOrderDetail("Scheme", row.project_scheme_name)}
                            {renderOrderDetail("Discom", row.discom_name)}
                        </Grid>
                        <Grid item size={3}>
                            {renderOrderDetail("Payment Type", row.payment_type || "PDC Payment")}
                            {renderOrderDetail("Total Payable", `Rs. ${getOrderProjectCostAmount(row).toLocaleString()}`)}
                            {renderOrderDetail("Payment Received", `Rs. ${getOrderReceivedAmount(row).toLocaleString()}`)}
                            <Box mb={0.4}>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: "0.68rem", lineHeight: 1.1 }}>
                                    Outstanding:
                                </Typography>
                                <Typography variant="body2" component="span" sx={{ bgcolor: "#f44336", color: "#fff", px: 0.8, py: 0.1, borderRadius: 0.5, fontWeight: "bold", fontSize: "0.78rem" }}>
                                    Rs. {getOrderOutstandingAmount(row).toLocaleString()}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item size={3}>
                            {renderOrderDetail("Manager Action", isApprovalPending ? "Required" : row.installation_approval_status || "-")}
                            {renderOrderDetail("Remarks", row.installation_rejection_reason || row.installation_approval_remarks || row.installation_rejection_remarks || "-")}
                            {renderOrderDetail("Installer / Fabricator", `${row.installer_name || "-"} / ${row.fabricator_name || "-"}`)}
                            {renderOrderDetail("Installation Completed At", row.installation_completed_at ? new Date(row.installation_completed_at).toLocaleString() : "-")}
                            {renderOrderDetail("Requested At", row.installation_approval_requested_at ? new Date(row.installation_approval_requested_at).toLocaleString() : "-")}
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        );
    };

    const historyColumns = [
        { field: "order_number", label: "Order", render: (row) => <OrderNumberLink value={row.order_number || row.id} onClick={(e) => { e?.stopPropagation(); setSelectedOrder(row); setDrawerOpen(true); }} /> },
        { field: "customer_name", label: "Customer" },
        { field: "planned_warehouse_name", label: "Warehouse" },
        { field: "installation_approval_status", label: "Status", render: (row) => statusBadge(row.installation_approval_status) },
        { field: "remarks", label: "Reason/Remarks", render: (row) => row.installation_rejection_reason || row.installation_approval_remarks || row.installation_rejection_remarks || "-" },
        { field: "installer_name", label: "Installer", render: (row) => row.installer_name || "-" },
        { field: "fabricator_name", label: "Fabricator", render: (row) => row.fabricator_name || "-" },
        { field: "installation_approval_requested_at", label: "Requested At", render: (row) => row.installation_approval_requested_at ? new Date(row.installation_approval_requested_at).toLocaleString() : "-" },
        {
            field: "actions", label: "Actions", stickyLeft: true, render: (row) => (
                <Tooltip title="View Detailed Audit">
                    <IconButton size="small" onClick={() => { setSelectedOrder(row); setDrawerOpen(true); }}>
                        <VisibilityIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            )
        }
    ];

    return (
        <ProtectedRoute>
            <Container className="py-1 h-full min-h-0 max-w-[1536px] mx-auto flex flex-col gap-2">
                <div className="flex items-center justify-between border-b pb-1">
                    <div>
                        <h1 className="text-xl font-bold leading-tight">Installation Manager Approval</h1>
                        <p className="text-[11px] text-slate-500">
                            Review submitted installations and approve or reject by planned warehouse.
                        </p>
                    </div>
                    <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setPage(1); }}>
                        <TabsList className="h-8">
                            <TabsTrigger value={TAB_PENDING} className="text-[11px]">Pending</TabsTrigger>
                            <TabsTrigger value={TAB_HISTORY} className="text-[11px]">History</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <OrderListFilterPanel
                    open={filterPanelOpen}
                    onToggle={setFilterPanelOpen}
                    values={filters}
                    onApply={(v) => {
                        setFilters(v, true, true);
                        setFilterPanelOpen(false);
                    }}
                    onClear={() => clearFilters({ keepQuickSearch: false })}
                    variant="dashboard"
                    excludeKeys={["status", "current_stage_key", "cancelled_stage", "cancelled_at_stage_key"]}
                />

                {activeTab === TAB_PENDING ? (
                    <PaginatedList
                        key={activeTab + "_" + triggerReload}
                        fetcher={fetchData}
                        renderItem={renderOrderItem}
                        showSearch={false}
                        defaultSortBy="id"
                        defaultSortOrder="DESC"
                        height="calc(100vh - 170px)"
                        q={q}
                        onQChange={setQ}
                        filters={filters}
                        page={page}
                        setPage={setPage}
                        limit={limit}
                        setLimit={setLimit}
                    />
                ) : (
                    <PaginatedTable
                        key={activeTab + "_" + triggerReload}
                        columns={historyColumns}
                        fetcher={fetchData}
                        showSearch={false}
                        initialSortBy="id"
                        initialSortOrder="DESC"
                        height="calc(100vh - 170px)"
                        q={q}
                        onQChange={setQ}
                        filterParams={filters}
                        page={page}
                        onPageChange={setPage}
                        limit={limit}
                        onRowsPerPageChange={setLimit}
                    />
                )}

                <Drawer
                    anchor="right"
                    open={drawerOpen}
                    onClose={() => {
                        setDrawerOpen(false);
                        setSelectedOrder(null);
                    }}
                    PaperProps={{ sx: { width: "100%", maxWidth: 1000 } }}
                >
                    {selectedOrder && (
                        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                            <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <Typography variant="h6">
                                        Audit Installation: {selectedOrder.order_number || selectedOrder.id}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {selectedOrder.customer_name}
                                    </Typography>
                                </div>
                                <div className="flex items-center gap-2">
                                    {statusBadge(selectedOrder.installation_approval_status)}
                                    <IconButton onClick={() => setDrawerOpen(false)}>
                                        <CancelIcon />
                                    </IconButton>
                                </div>
                            </Box>

                            <Box sx={{ flex: 1, overflow: "auto", p: 2, bgcolor: "#f9f9f9" }}>
                                <Paper sx={{ p: 2, borderRadius: 2 }}>
                                    <Installation
                                        orderId={selectedOrder.id}
                                        orderData={selectedOrder}
                                        forceReadOnly={true}
                                    />
                                </Paper>
                            </Box>

                            {String(selectedOrder.installation_approval_status || "").toLowerCase() === "pending_approval" && (
                                <Box sx={{ p: 2, borderTop: "1px solid #e0e0e0", display: "flex", justifyContent: "flex-end", gap: 2, bgcolor: "#fff" }}>
                                    <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button variant="destructive" onClick={() => openRejectDialog(selectedOrder.id)}>
                                        Reject
                                    </Button>
                                    <Button onClick={() => openApproveDialog(selectedOrder.id)}>
                                        Approve
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    )}
                </Drawer>

                <Dialog fullWidth maxWidth="sm" open={approveDialogOpen} onClose={() => !actionId && setApproveDialogOpen(false)}>
                    <DialogTitle>Approve Installation</DialogTitle>
                    <DialogContent>
                        <DialogContentText sx={{ mb: 2 }}>Add remarks if needed.</DialogContentText>
                        <Textarea value={approveRemarks} onChange={(e) => setApproveRemarks(e.target.value)} rows={4} />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button variant="outline" disabled={!!actionId} onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleApprove} disabled={!!actionId} loading={!!actionId}>Approve</Button>
                    </DialogActions>
                </Dialog>

                <Dialog fullWidth maxWidth="sm" open={rejectDialogOpen} onClose={() => !actionId && setRejectDialogOpen(false)}>
                    <DialogTitle>Reject Installation</DialogTitle>
                    <DialogContent>
                        <DialogContentText sx={{ mb: 2 }}>Select rejection reason.</DialogContentText>
                        <select
                            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mb-4"
                            value={rejectReasonId}
                            onChange={(e) => setRejectReasonId(e.target.value)}
                        >
                            <option value="">Select reason</option>
                            {rejectionReasonOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.label || opt.reason || opt.value}
                                </option>
                            ))}
                        </select>
                        <Textarea value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)} rows={3} />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button variant="outline" disabled={!!actionId} onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={!!actionId || !rejectReasonId} loading={!!actionId}>Reject</Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </ProtectedRoute>
    );
}
