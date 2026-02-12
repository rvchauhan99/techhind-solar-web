"use client";

import { useState, useCallback, useMemo } from "react";
import {
    Paper,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Typography,
    Box,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import moment from "moment";
import PaginatedTable from "@/components/common/PaginatedTable";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import challanService from "@/services/challanService";
import { toastSuccess, toastError } from "@/utils/toast";

export default function PreviousChallans({ orderId, onEdit }) {
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [menuChallanId, setMenuChallanId] = useState(null);
    const [reloadTrigger, setReloadTrigger] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedChallan, setSelectedChallan] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState(null);

    const handleMenuOpen = (event, id) => {
        setMenuAnchor(event.currentTarget);
        setMenuChallanId(id);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
        setMenuChallanId(null);
    };

    const handleView = async () => {
        if (!menuChallanId) {
            handleMenuClose();
            return;
        }
        setSidebarOpen(true);
        setDetailLoading(true);
        setDetailError(null);
        setSelectedChallan(null);
        try {
            const response = await challanService.getChallanById(menuChallanId);
            const result = response?.result ?? response;
            setSelectedChallan(result);
        } catch (error) {
            console.error("Failed to load challan details:", error);
            setDetailError(
                error?.response?.data?.message || error.message || "Failed to load challan details"
            );
        } finally {
            setDetailLoading(false);
            handleMenuClose();
        }
    };

    const handleEdit = () => {
        if (onEdit) {
            onEdit(menuChallanId);
        }
        handleMenuClose();
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this challan?")) {
            try {
                await challanService.deleteChallan(menuChallanId);
                setReloadTrigger(prev => prev + 1);
                toastSuccess("Challan deleted successfully");
            } catch (err) {
                console.error("Failed to delete challan:", err);
                toastError(err?.response?.data?.message || "Failed to delete challan");
            }
        }
        handleMenuClose();
    };

    const fetchChallans = useCallback(async (params) => {
        const result = await challanService.getChallans({
            ...params,
            order_id: orderId,
        });
        return result;
    }, [orderId]);

    const formatDate = (date) => {
        if (!date) return "-";
        return moment(date).format("DD-MM-YYYY");
    };

    const columns = [
        {
            field: "actions",
            label: "Actions",
            sortable: false,
            render: (row) => (
                <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, row.id)}
                    sx={{ p: 0.5 }}
                >
                    <MoreVertIcon fontSize="small" />
                </IconButton>
            ),
        },
        {
            field: "challan_no",
            label: "Challan No",
            render: (row) => (
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {row.challan_no || row.id}
                </Typography>
            ),
        },
        {
            field: "challan_date",
            label: "Challan Date",
            render: (row) => formatDate(row.challan_date),
        },
        {
            field: "transporter",
            label: "Transporter",
            render: (row) => row.transporter || "-",
        },
        {
            field: "warehouse",
            label: "Warehouse",
            render: (row) => row.warehouse?.name || "-",
        },
        {
            field: "items_count",
            label: "Items Count",
            render: (row) => row.items?.length || 0,
        },
        {
            field: "created_by_name",
            label: "Created By",
            render: (row) => row.created_by_name || row.created_by || "-",
        },
        {
            field: "created_at",
            label: "Created On",
            render: (row) => formatDate(row.created_at),
        },
    ];

    const sidebarContent = useMemo(() => {
        if (detailLoading) {
            return (
                <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">
                    Loading challan…
                </div>
            );
        }
        if (detailError) {
            return <div className="text-sm text-destructive">{detailError}</div>;
        }
        if (!selectedChallan) return null;

        const c = selectedChallan;
        const order = c.order || {};
        const warehouse = c.warehouse || {};
        const items = Array.isArray(c.items) ? c.items : [];

        return (
            <div className="pr-1 space-y-3 text-sm">
                <div>
                    <p className="font-semibold">{c.challan_no || c.id}</p>
                    <p className="text-xs text-muted-foreground">
                        {formatDate(c.challan_date) || "-"}
                    </p>
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Order</p>
                    <p>{order.order_number || "-"}</p>
                    <p className="text-xs text-muted-foreground">
                        {order.customer_name || ""}{" "}
                        {order.capacity != null ? `• ${order.capacity} kW` : ""}
                    </p>
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Warehouse</p>
                    <p>{warehouse.name || "-"}</p>
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Transporter</p>
                    <p>{c.transporter || "-"}</p>
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Items</p>
                    {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No items</p>
                    ) : (
                        <div className="max-h-56 overflow-y-auto border rounded-md border-border">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40">
                                        <th className="px-2 py-1 text-left font-semibold">Product</th>
                                        <th className="px-2 py-1 text-right font-semibold">Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it, idx) => (
                                        <tr key={idx} className="border-b border-border last:border-b-0">
                                            <td className="px-2 py-1">
                                                {(it.product_snapshot || it)?.product_name ?? "-"}
                                            </td>
                                            <td className="px-2 py-1 text-right">
                                                {it.quantity ?? 0}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Audit</p>
                    <p>
                        Created By: {c.created_by_name || c.created_by || "-"}
                    </p>
                    <p>Created On: {formatDate(c.created_at) || "-"}</p>
                    <p>Updated On: {formatDate(c.updated_at) || "-"}</p>
                </div>
            </div>
        );
    }, [detailLoading, detailError, selectedChallan]);

    return (
        <>
            <PaginatedTable
                columns={columns}
                fetcher={fetchChallans}
                initialPage={1}
                initialLimit={10}
                key={reloadTrigger}
                height="calc(100vh - 340px)"
            />

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleView}>
                    <ListItemIcon>
                        <VisibilityIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>View</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleEdit}>
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleDelete}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                </MenuItem>
            </Menu>

            <DetailsSidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                title="Challan Details"
            >
                {sidebarContent}
            </DetailsSidebar>
        </>
    );
}
