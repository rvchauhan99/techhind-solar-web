"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
    Paper,
    Button,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Chip,
    Typography,
    Box,
    Grid,
    Stack,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PaymentIcon from "@mui/icons-material/Payment";
import CommentIcon from "@mui/icons-material/Comment";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PhoneIcon from "@mui/icons-material/Phone";
import EventIcon from "@mui/icons-material/Event";
import HelpIcon from "@mui/icons-material/Help";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import { useRouter } from "next/navigation";
import moment from "moment";
import PaginatedList from "@/components/common/PaginatedList";
import { OrderListFilterPanel, ORDER_LIST_FILTER_KEYS } from "@/components/common";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import confirmOrdersService from "@/services/confirmOrdersService";
import orderService from "@/services/orderService";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import OrderNumberLink from "@/components/common/OrderNumberLink";
import OrderIssuedSerialsDialog from "@/components/common/OrderIssuedSerialsDialog";
import { toastError } from "@/utils/toast";
import { toastSuccess } from "@/utils/toast";
import userMasterService from "@/services/userMasterService";
import { useAuth } from "@/hooks/useAuth";
import AutocompleteField from "@/components/common/AutocompleteField";
import Input from "@/components/common/Input";

const STAGES = [
    { key: "estimate_generated", label: "Estimate Generated" },
    { key: "estimate_paid", label: "Estimate Paid" },
    { key: "planner", label: "Planner" },
    { key: "delivery", label: "Delivery" },
    { key: "assign_fabricator_and_installer", label: "Assign Fabricator & Installer" },
    { key: "fabrication", label: "Fabrication" },
    { key: "installation", label: "Installation" },
    { key: "netmeter_apply", label: "Netmeter Apply" },
    { key: "netmeter_installed", label: "Netmeter Installed" },
    { key: "subsidy_claim", label: "Subsidy Claim" },
    { key: "subsidy_disbursed", label: "Subsidy Disbursed" },
];

const isOrderFullyCompleted = (row) => {
    if (row.current_stage_key === "order_completed") return true;
    const stages = row.stages || {};
    return STAGES.every((s) => stages[s.key] === "completed");
};

export default function ListView() {
    const router = useRouter();
    const { user } = useAuth();
    const listingState = useListingQueryState({
        defaultLimit: 25,
        filterKeys: ORDER_LIST_FILTER_KEYS,
    });
    const { page, limit, q, filters, setPage, setLimit, setQ, setFilters, clearFilters } = listingState;
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [menuOrderId, setMenuOrderId] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [serialsDialogOpen, setSerialsDialogOpen] = useState(false);
    const [serialsDialogOrder, setSerialsDialogOrder] = useState(null);
    const [changeHandledByOpen, setChangeHandledByOpen] = useState(false);
    const [reassigning, setReassigning] = useState(false);
    const [selectedOrderForReassign, setSelectedOrderForReassign] = useState(null);
    const [handledByUsers, setHandledByUsers] = useState([]);
    const [handledByLoading, setHandledByLoading] = useState(false);
    const [selectedHandledByUser, setSelectedHandledByUser] = useState(null);
    const [reassignReason, setReassignReason] = useState("");
    const [reassignReloadFn, setReassignReloadFn] = useState(null);

    const normalizeRoleName = (s) =>
        String(s || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
    const isSuperAdmin = normalizeRoleName(user?.role?.name) === "superadmin";

    const userOptionById = useMemo(() => {
        const map = new Map();
        for (const item of handledByUsers) map.set(Number(item.id), item);
        return map;
    }, [handledByUsers]);

    useEffect(() => {
        if (!isSuperAdmin) return;
        let mounted = true;
        const loadUsers = async () => {
            try {
                setHandledByLoading(true);
                const response = await userMasterService.listUserMasters({
                    page: 1,
                    limit: 1000,
                    status: "active",
                    sortBy: "name",
                    sortOrder: "ASC",
                });
                const rows = response?.result?.data || [];
                if (!mounted) return;
                setHandledByUsers(
                    rows.map((u) => ({
                        id: Number(u.id),
                        name: u.name || `User ${u.id}`,
                    }))
                );
            } catch (err) {
                if (!mounted) return;
                toastError(err?.response?.data?.message || "Failed to load users");
            } finally {
                if (mounted) setHandledByLoading(false);
            }
        };
        loadUsers();
        return () => {
            mounted = false;
        };
    }, [isSuperAdmin]);

    const handleMenuOpen = (event, id) => {
        setMenuAnchor(event.currentTarget);
        setMenuOrderId(id);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
        setMenuOrderId(null);
    };

    const openChangeHandledByDialog = useCallback((order, reloadFn = null) => {
        if (!order?.id) return;
        setSelectedOrderForReassign(order);
        setReassignReloadFn(() => (typeof reloadFn === "function" ? reloadFn : null));
        const preselected = userOptionById.get(Number(order.handled_by)) || null;
        setSelectedHandledByUser(preselected);
        setReassignReason("");
        setChangeHandledByOpen(true);
    }, [userOptionById]);

    const closeChangeHandledByDialog = useCallback(() => {
        if (reassigning) return;
        setChangeHandledByOpen(false);
        setSelectedOrderForReassign(null);
        setReassignReloadFn(null);
        setSelectedHandledByUser(null);
        setReassignReason("");
    }, [reassigning]);

    const handleEdit = () => {
        router.push(`/order/edit?id=${menuOrderId}`);
        handleMenuClose();
    };

    const openConfirmOrderView = useCallback((orderId) => {
        if (!orderId) return;
        router.push(`/confirm-orders/view?id=${orderId}`);
    }, [router]);

    const fetchData = useCallback(async (params) => {
        return await confirmOrdersService.getConfirmedOrders(params);
    }, []);

    const submitChangeHandledBy = useCallback(async (reload) => {
        if (!selectedOrderForReassign?.id || !selectedHandledByUser?.id) return;
        if (Number(selectedHandledByUser.id) === Number(selectedOrderForReassign.handled_by)) {
            toastError("Please select a different user");
            return;
        }
        try {
            setReassigning(true);
            await confirmOrdersService.changeHandledBy(selectedOrderForReassign.id, {
                handled_by: selectedHandledByUser.id,
                reason: reassignReason?.trim() || undefined,
            });
            toastSuccess("Handled By updated successfully");
            closeChangeHandledByDialog();
            const effectiveReload = typeof reload === "function" ? reload : reassignReloadFn;
            if (typeof effectiveReload === "function") effectiveReload();
        } catch (err) {
            toastError(err?.response?.data?.message || "Failed to update Handled By");
        } finally {
            setReassigning(false);
        }
    }, [selectedOrderForReassign, selectedHandledByUser, reassignReason, closeChangeHandledByDialog, reassignReloadFn]);

    const handleOpenDetails = useCallback((row) => {
        setSelectedOrder(row);
        setDetailsOpen(true);
    }, []);

    const handleCloseDetails = useCallback(() => {
        setDetailsOpen(false);
        setSelectedOrder(null);
    }, []);

    const handlePrintOrder = useCallback(async (resolvedOrder) => {
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
    }, []);

    const getStageIcon = (status) => {
        if (status === "completed") return <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />;
        if (status === "pending") return <EventIcon color="primary" sx={{ fontSize: 18 }} />;
        if (status === "locked") return <CancelIcon color="error" sx={{ fontSize: 18 }} />;
        return <HelpIcon color="disabled" sx={{ fontSize: 18 }} />;
    };

    const renderOrderDetail = (label, value, isBold = true, color = "text.primary") => (
        <Box mb={0.4}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: "0.68rem", lineHeight: 1.1 }}>
                {label}:
            </Typography>
            <Typography variant="body2" color={color} fontWeight={isBold ? "bold" : "normal"} sx={{ fontSize: "0.78rem", lineHeight: 1.2, wordBreak: 'break-word' }}>
                {value || "-"}
            </Typography>
        </Box>
    );

    const renderOrderItem = (row, reload) => {
        const stages = row.stages || {};
        const outstanding = (Number(row.project_cost || 0) - (Number(row.discount || 0))) - (Number(row.total_paid || 0));
        const fullyCompleted = isOrderFullyCompleted(row);

        return (
            <Paper
                elevation={0}
                onClick={() => openConfirmOrderView(row.id)}
                sx={{
                    position: "relative",
                    border: "1px solid #e0e0e0",
                    borderTop: '3px solid #ff9800', // Orange bar at top
                    borderRadius: '4px 4px 1px 1px',
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: '0.2s',
                    '&:hover': {
                        borderColor: '#1976d2',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }
                }}
            >
                {/* Header Row */}
                <Box sx={{ bgcolor: "#fff", p: 0.6, px: 2, display: "flex", alignItems: "center", borderBottom: "1px solid #f0f0f0" }}>
                    <OrderNumberLink
                        value={row.order_number || "-"}
                        suffix={` : ${row.customer_name?.toUpperCase() || "-"}`}
                        variant="subtitle2"
                        sx={{ mr: 2, fontSize: "0.88rem" }}
                        onClick={() => openConfirmOrderView(row.id)}
                    />
                    <Chip label="New" size="small" sx={{ bgcolor: "#4caf50", color: "#fff", height: 18, fontSize: "0.58rem", mr: 1, borderRadius: '3px' }} />
                    <Chip label={row.solar_panel_name || "PANEL N/A"} size="small" sx={{ bgcolor: "#1976d2", color: "#fff", height: 18, fontSize: "0.58rem", mr: 1, borderRadius: '3px' }} />
                    <Chip label={row.inverter_name || "INVERTER N/A"} size="small" sx={{ bgcolor: "#9c27b0", color: "#fff", height: 18, fontSize: "0.58rem", mr: 1, borderRadius: '3px' }} />
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: "bold", ml: 1, fontSize: '0.7rem' }}>
                        {row.project_scheme_name}
                    </Typography>

                    <Box
                        sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.1 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Tooltip title="Serialized inventory issued to this order">
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setSerialsDialogOrder({ order_number: row.order_number, customer_name: row.customer_name });
                                    setSerialsDialogOpen(true);
                                }}
                            >
                                <Inventory2Icon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                        <IconButton size="small" title="Add Payment" onClick={() => router.push(`/order/view?id=${row.id}&tab=2`)}>
                            <PaymentIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" title="Upload" onClick={() => router.push(`/order/view?id=${row.id}&tab=5`)}>
                            <UploadFileIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" title="Details" onClick={() => openConfirmOrderView(row.id)}>
                            <VisibilityIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" title="Remarks" onClick={() => router.push(`/order/view?id=${row.id}&tab=4`)}>
                            <CommentIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        {isSuperAdmin && (
                            <IconButton
                                size="small"
                                title="Change Handled By"
                                onClick={() => openChangeHandledByDialog(row, reload)}
                            >
                                <ManageAccountsIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        )}
                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, row.id)}>
                            <MoreVertIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Box>
                </Box>

                {/* Details Grid */}
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={1}>
                        <Grid item size={3}>
                            {renderOrderDetail("Order Date", row.order_date ? moment(row.order_date).format("DD-MM-YYYY") : "-")}
                            {renderOrderDetail("Consumer No", row.consumer_no)}
                            {renderOrderDetail("Capacity", row.capacity ? `${row.capacity} kW` : "-")}
                            {renderOrderDetail("Application", row.application_no)}
                            {renderOrderDetail("Registration Date", row.date_of_registration_gov ? moment(row.date_of_registration_gov).format("DD-MM-YYYY") : "-")}
                            {renderOrderDetail("Tags", row.tags)}
                        </Grid>
                        <Grid item size={3}>
                            {renderOrderDetail("Scheme", row.project_scheme_name)}
                            {renderOrderDetail("Discom", row.discom_name)}
                            {renderOrderDetail("Channel Partner", row.channel_partner_name)}
                            {renderOrderDetail("Handled By / Inquiry By", `${row.handled_by_name || "-"} / ${row.inquiry_by_name || "-"}`)}
                            {renderOrderDetail("Last Action", row.updated_at ? `${moment(row.updated_at).format("DD-MM-YYYY HH:mm:ss")} | Order Confirm` : "-")}
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
                            {renderOrderDetail("Reference", row.reference_from)}
                            {renderOrderDetail("Branch", row.branch_name)}
                            {renderOrderDetail("Source", row.inquiry_source_name || "Individual")}
                        </Grid>
                        <Grid item size={3}>
                            {renderOrderDetail("Payment Type", row.payment_type || "PDC Payment")}
                            {renderOrderDetail("Project Cost", `Rs. ${Number(row.project_cost || 0).toLocaleString()}`)}
                            {renderOrderDetail("Payment Received", `Rs. ${Number(row.total_paid || 0).toLocaleString()}`)}
                            <Box mb={0.4}>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: "0.68rem", lineHeight: 1.1 }}>
                                    Outstanding:
                                </Typography>
                                <Typography variant="body2" component="span" sx={{ bgcolor: "#f44336", color: "#fff", px: 0.8, py: 0.1, borderRadius: 0.5, fontWeight: "bold", fontSize: "0.78rem" }}>
                                    Rs. {outstanding.toLocaleString()}
                                </Typography>
                            </Box>
                            {renderOrderDetail("Estimate Due Date", row.estimate_due_date ? moment(row.estimate_due_date).format("DD-MM-YYYY") : "-")}
                            {renderOrderDetail("Estimate Paid Date", row.estimate_paid_at ? moment(row.estimate_paid_at).format("DD-MM-YYYY") : "-")}
                        </Grid>
                    </Grid>
                </Box>

                {/* Pipeline Footer */}
                <Box sx={{ bgcolor: "#f9f9f9", borderTop: "1px solid #f0f0f0", py: 0.6 }}>
                    <Grid container sx={{ textAlign: "center" }}>
                        {STAGES.map((stage, idx) => {
                            const status = stages[stage.key] || (idx === 0 ? "pending" : "locked");
                            const isActive = !fullyCompleted && row.current_stage_key === stage.key;
                            const isLastStage = idx === STAGES.length - 1;

                            return (
                                <Grid item key={stage.key} sx={{ flex: 1, px: 0.1 }}>
                                    <Tooltip title={stage.label}>
                                        <Typography variant="caption" sx={{ display: "block", fontSize: "0.58rem", color: "text.secondary", mb: 0.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {stage.label}
                                        </Typography>
                                    </Tooltip>
                                    <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 18 }}>
                                        {fullyCompleted ? (
                                            isLastStage ? (
                                                <Chip label="Completed" size="small" color="success" sx={{ height: 14, fontSize: "0.5rem", px: 0, borderRadius: '2px' }} />
                                            ) : (
                                                getStageIcon("completed")
                                            )
                                        ) : isActive ? (
                                            <Chip label="Current" size="small" color="primary" sx={{ height: 14, fontSize: "0.5rem", px: 0, borderRadius: '2px' }} />
                                        ) : (
                                            getStageIcon(status)
                                        )}
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>
            </Paper>
        );
    };

    const calculateHeight = () => `calc(100vh - 90px)`;

    return (
        <Box sx={{ width: "100%" }}>
            <OrderListFilterPanel
                open={filterPanelOpen}
                onToggle={setFilterPanelOpen}
                values={filters}
                onApply={(v) => {
                    setFilters(v, true, true);
                    setFilterPanelOpen(false);
                }}
                onClear={() => clearFilters()}
                variant="confirm"
            />
            <PaginatedList
                fetcher={fetchData}
                renderItem={renderOrderItem}
                showSearch={false}
                defaultSortBy="order_date"
                defaultSortOrder="DESC"
                height={calculateHeight()}
                q={q}
                onQChange={setQ}
                filters={filters}
                page={page}
                setPage={setPage}
                limit={limit}
                setLimit={setLimit}
            />

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => { router.push(`/order/view?id=${menuOrderId}&tab=2`); handleMenuClose(); }}>
                    <ListItemIcon><PaymentIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Add Payment</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { router.push(`/order/view?id=${menuOrderId}&tab=4`); handleMenuClose(); }}>
                    <ListItemIcon><CommentIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Remarks</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { router.push(`/order/view?id=${menuOrderId}&tab=5`); handleMenuClose(); }}>
                    <ListItemIcon><UploadFileIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Upload Documents</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleEdit}>
                    <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                </MenuItem>
            </Menu>
            <OrderDetailsDrawer
                open={detailsOpen}
                onClose={handleCloseDetails}
                order={selectedOrder}
                onPrint={handlePrintOrder}
                showPrint
                showDeliverySnapshot
            />
            <OrderIssuedSerialsDialog
                open={serialsDialogOpen}
                onClose={() => {
                    setSerialsDialogOpen(false);
                    setSerialsDialogOrder(null);
                }}
                orderNumber={serialsDialogOrder?.order_number}
                customerName={serialsDialogOrder?.customer_name}
            />
            <Dialog open={changeHandledByOpen} onClose={closeChangeHandledByDialog} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ py: 1 }}>Change Handled By</DialogTitle>
                <DialogContent sx={{ pt: "8px !important", pb: "8px !important" }}>
                    <AutocompleteField
                        name="handled_by"
                        label="Handled By"
                        required
                        options={handledByUsers}
                        loading={handledByLoading}
                        value={selectedHandledByUser}
                        onChange={(_, next) => setSelectedHandledByUser(next)}
                        getOptionLabel={(option) => option?.name || option?.label || ""}
                        placeholder="Select handled by"
                        size="small"
                    />
                    <Input
                        name="reassign_reason"
                        className="mt-2"
                        size="small"
                        label="Reason (optional)"
                        multiline
                        rows={2}
                        value={reassignReason}
                        onChange={(e) => setReassignReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 1 }}>
                    <Button size="small" onClick={closeChangeHandledByDialog} disabled={reassigning}>
                        Close
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        disabled={
                            reassigning ||
                            !selectedHandledByUser?.id ||
                            Number(selectedHandledByUser?.id) === Number(selectedOrderForReassign?.handled_by)
                        }
                        onClick={() => submitChangeHandledBy()}
                    >
                        {reassigning ? "Updating..." : "Update"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
