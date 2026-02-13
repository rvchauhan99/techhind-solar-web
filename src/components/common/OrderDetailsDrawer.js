"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Drawer,
    Stack,
    Typography,
} from "@mui/material";
import orderService from "@/services/orderService";
import { toastError } from "@/utils/toast";
import {
    compactAddress,
    formatCurrency,
    formatDate,
    safeValue,
    getPrimaryPhone,
} from "@/utils/orderFormatters";
import { buildOrderedStages } from "@/utils/orderStageUtils";

const stageChipColor = (status) => {
    if (status === "completed") return "success";
    if (status === "in_progress") return "warning";
    return "default";
};

export default function OrderDetailsDrawer({
    open,
    onClose,
    order,
    onPrint,
    showPrint = true,
    showDeliverySnapshot = true,
    extraActions = null,
}) {
    const [loading, setLoading] = useState(false);
    const [resolvedOrder, setResolvedOrder] = useState(order || null);
    const [printLoading, setPrintLoading] = useState(false);

    useEffect(() => {
        setResolvedOrder(order || null);
    }, [order]);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!open || !order?.id) return;
            try {
                setLoading(true);
                const data = await orderService.getOrderById(order.id);
                const item = data?.result ?? data;
                setResolvedOrder(item || order);
            } catch (err) {
                const msg =
                    err?.response?.data?.message || err?.message || "Failed to load order details";
                toastError(msg);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [open, order]);

    const stages = useMemo(
        () => buildOrderedStages(resolvedOrder?.stages, resolvedOrder?.current_stage_key),
        [resolvedOrder]
    );

    const bomLines = Array.isArray(resolvedOrder?.bom_snapshot) ? resolvedOrder.bom_snapshot : [];

    const handlePrint = async () => {
        if (!resolvedOrder?.id || !onPrint) return;
        try {
            setPrintLoading(true);
            await onPrint(resolvedOrder);
        } finally {
            setPrintLoading(false);
        }
    };

    return (
        <Drawer anchor="right" open={open} onClose={onClose}>
            <Box sx={{ width: { xs: 340, sm: 420 }, p: 2 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 1,
                    }}
                >
                    <Box>
                        <Typography variant="h6" sx={{ mb: 0.5 }}>
                            Order Details
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {safeValue(resolvedOrder?.order_number)}
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {showPrint && (
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={handlePrint}
                                disabled={!resolvedOrder?.id || printLoading}
                            >
                                {printLoading ? "Generating..." : "Print"}
                            </Button>
                        )}
                        {extraActions}
                    </Box>
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {loading ? (
                    <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <Stack spacing={1.5}>
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                                Customer Details
                            </Typography>
                            <Typography variant="body2">Name: {safeValue(resolvedOrder?.customer_name)}</Typography>
                            <Typography variant="body2">
                                Contact: {safeValue(getPrimaryPhone(resolvedOrder || {}))}
                            </Typography>
                            <Typography variant="body2">
                                Address: {safeValue(resolvedOrder ? compactAddress(resolvedOrder) : "-")}
                            </Typography>
                            <Typography variant="body2">Reference: {safeValue(resolvedOrder?.reference_from)}</Typography>
                            <Typography variant="body2">
                                Channel Partner: {safeValue(resolvedOrder?.channel_partner_name)}
                            </Typography>
                            <Typography variant="body2">Handled By: {safeValue(resolvedOrder?.handled_by_name)}</Typography>
                            <Typography variant="body2">Branch: {safeValue(resolvedOrder?.branch_name)}</Typography>
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                                Project Details
                            </Typography>
                            <Typography variant="body2">Order Date: {formatDate(resolvedOrder?.order_date)}</Typography>
                            <Typography variant="body2">Consumer No: {safeValue(resolvedOrder?.consumer_no)}</Typography>
                            <Typography variant="body2">Capacity: {safeValue(resolvedOrder?.capacity)}</Typography>
                            <Typography variant="body2">Scheme: {safeValue(resolvedOrder?.project_scheme_name)}</Typography>
                            <Typography variant="body2">Discom: {safeValue(resolvedOrder?.discom_name)}</Typography>
                            <Typography variant="body2">
                                Delivery Date: {formatDate(resolvedOrder?.planned_delivery_date)}
                            </Typography>
                            <Typography variant="body2">Warehouse: {safeValue(resolvedOrder?.planned_warehouse_name)}</Typography>
                            <Typography variant="body2">Panel: {safeValue(resolvedOrder?.solar_panel_name)}</Typography>
                            <Typography variant="body2">Inverter: {safeValue(resolvedOrder?.inverter_name)}</Typography>
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                                Payment Details
                            </Typography>
                            <Typography variant="body2">Payment Type: {safeValue(resolvedOrder?.payment_type)}</Typography>
                            <Typography variant="body2">
                                Project Cost: {formatCurrency(resolvedOrder?.project_cost)}
                            </Typography>
                            <Typography variant="body2">Discount: {formatCurrency(resolvedOrder?.discount)}</Typography>
                            <Typography variant="body2">Payable: {formatCurrency(resolvedOrder?.payable_cost)}</Typography>
                            <Typography variant="body2">Paid: {formatCurrency(resolvedOrder?.total_paid)}</Typography>
                            <Typography variant="body2" sx={{ color: "error.main", fontWeight: 700 }}>
                                Outstanding: {formatCurrency(resolvedOrder?.outstanding_balance)}
                            </Typography>
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                                Stage Status
                            </Typography>
                            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                                {stages.map((stage) => (
                                    <Chip
                                        key={stage.key}
                                        size="small"
                                        label={`${stage.label}: ${stage.isCurrent ? "Current" : stage.status}`}
                                        color={stageChipColor(stage.status)}
                                        variant={stage.isCurrent ? "filled" : "outlined"}
                                        sx={{ mb: 0.5 }}
                                    />
                                ))}
                            </Stack>
                        </Box>

                        {showDeliverySnapshot && (
                            <>
                                <Divider />
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                                        Delivery Snapshot
                                    </Typography>
                                    <Typography variant="body2">
                                        Status: {safeValue(resolvedOrder?.delivery_status || "pending")}
                                    </Typography>
                                    <Typography variant="body2">
                                        Shipped: {safeValue(resolvedOrder?.total_shipped)} / {safeValue(resolvedOrder?.total_required)}
                                    </Typography>
                                    <Typography variant="body2">Pending Qty: {safeValue(resolvedOrder?.total_pending)}</Typography>
                                    <Typography variant="body2">
                                        Last Challan: {formatDate(resolvedOrder?.last_challan_date)}
                                    </Typography>
                                    <Typography variant="body2">Challan Count: {safeValue(resolvedOrder?.challan_count)}</Typography>
                                </Box>
                            </>
                        )}

                        <Divider />
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                                Fabricator & Installer
                            </Typography>
                            <Typography variant="body2">
                                Fabricator: {safeValue(resolvedOrder?.fabrication?.fabricator_name) || "-"}
                            </Typography>
                            <Typography variant="body2">
                                Installer: {safeValue(resolvedOrder?.installation?.installer_name) || "-"}
                            </Typography>
                        </Box>

                        <Divider />
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                                BOM Summary
                            </Typography>
                            {bomLines.length === 0 ? (
                                <Typography variant="body2">No BOM snapshot available.</Typography>
                            ) : (
                                <Stack spacing={0.4}>
                                    {bomLines.slice(0, 12).map((line, index) => (
                                        <Typography key={`${line.product_id || index}-${index}`} variant="caption">
                                            {index + 1}. {safeValue(line.product_name || line.product_type_name)} - Qty{" "}
                                            {safeValue(line.quantity)}
                                        </Typography>
                                    ))}
                                    {bomLines.length > 12 && (
                                        <Typography variant="caption" color="text.secondary">
                                            + {bomLines.length - 12} more items
                                        </Typography>
                                    )}
                                </Stack>
                            )}
                        </Box>
                    </Stack>
                )}
            </Box>
        </Drawer>
    );
}

