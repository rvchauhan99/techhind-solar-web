"use client";

import { useState, useCallback } from "react";
import {
    Paper,
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
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PaymentIcon from "@mui/icons-material/Payment";
import CommentIcon from "@mui/icons-material/Comment";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PhoneIcon from "@mui/icons-material/Phone";
import EventIcon from "@mui/icons-material/Event";
import HelpIcon from "@mui/icons-material/Help";
import { useRouter } from "next/navigation";
import moment from "moment";
import PaginatedList from "@/components/common/PaginatedList";
import confirmOrdersService from "@/services/confirmOrdersService";
import orderService from "@/services/orderService";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import OrderNumberLink from "@/components/common/OrderNumberLink";
import { toastError } from "@/utils/toast";

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

export default function ListView() {
    const router = useRouter();
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [menuOrderId, setMenuOrderId] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const handleMenuOpen = (event, id) => {
        setMenuAnchor(event.currentTarget);
        setMenuOrderId(id);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
        setMenuOrderId(null);
    };

    const handleEdit = () => {
        router.push(`/order/edit?id=${menuOrderId}`);
        handleMenuClose();
    };

    const fetchData = useCallback(async (params) => {
        return await confirmOrdersService.getConfirmedOrders(params);
    }, []);

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

        return (
            <Paper
                elevation={0}
                sx={{
                    position: "relative",
                    border: "1px solid #e0e0e0",
                    borderTop: '3px solid #ff9800', // Orange bar at top
                    borderRadius: '4px 4px 1px 1px',
                    overflow: "hidden",
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
                        onClick={() => handleOpenDetails(row)}
                    />
                    <Chip label="New" size="small" sx={{ bgcolor: "#4caf50", color: "#fff", height: 18, fontSize: "0.58rem", mr: 1, borderRadius: '3px' }} />
                    <Chip label={row.solar_panel_name || "PANEL N/A"} size="small" sx={{ bgcolor: "#1976d2", color: "#fff", height: 18, fontSize: "0.58rem", mr: 1, borderRadius: '3px' }} />
                    <Chip label={row.inverter_name || "INVERTER N/A"} size="small" sx={{ bgcolor: "#9c27b0", color: "#fff", height: 18, fontSize: "0.58rem", mr: 1, borderRadius: '3px' }} />
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: "bold", ml: 1, fontSize: '0.7rem' }}>
                        {row.project_scheme_name}
                    </Typography>

                    <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.1 }}>
                        <IconButton size="small" title="Add Payment" onClick={() => router.push(`/order/view?id=${row.id}&tab=2`)}>
                            <PaymentIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" title="Upload" onClick={() => router.push(`/order/view?id=${row.id}&tab=5`)}>
                            <UploadFileIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" title="Details" onClick={() => handleOpenDetails(row)}>
                            <VisibilityIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" title="Remarks" onClick={() => router.push(`/order/view?id=${row.id}&tab=4`)}>
                            <CommentIcon sx={{ fontSize: 16 }} />
                        </IconButton>
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
                            const isActive = row.current_stage_key === stage.key;

                            return (
                                <Grid item key={stage.key} sx={{ flex: 1, px: 0.1 }}>
                                    <Tooltip title={stage.label}>
                                        <Typography variant="caption" sx={{ display: "block", fontSize: "0.58rem", color: "text.secondary", mb: 0.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {stage.label}
                                        </Typography>
                                    </Tooltip>
                                    <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 18 }}>
                                        {isActive ? (
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
            <PaginatedList
                fetcher={fetchData}
                renderItem={renderOrderItem}
                searchPlaceholder="Search confirmed orders..."
                defaultSortBy="order_date"
                defaultSortOrder="DESC"
                height={calculateHeight()}
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
        </Box>
    );
}
