"use client";

import { useState, useCallback } from "react";
import {
    Paper,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Typography,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PrintIcon from "@mui/icons-material/Print";
import moment from "moment";
import PaginatedTable from "@/components/common/PaginatedTable";
import ChallanDetailsDrawer from "@/components/common/ChallanDetailsDrawer";
import challanService from "@/services/challanService";
import { toastSuccess, toastError } from "@/utils/toast";
import { printChallanById } from "@/utils/challanPrintUtils";

export default function PreviousChallans({ orderId, onEdit }) {
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [menuChallanId, setMenuChallanId] = useState(null);
    const [reloadTrigger, setReloadTrigger] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedChallanId, setSelectedChallanId] = useState(null);
    const [printingId, setPrintingId] = useState(null);

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
        setSelectedChallanId(menuChallanId);
        setSidebarOpen(true);
        handleMenuClose();
    };

    const handleEdit = () => {
        if (onEdit) {
            onEdit(menuChallanId);
        }
        handleMenuClose();
    };

    const handlePrint = async (challanIdFromAction = null) => {
        const targetId = challanIdFromAction || menuChallanId;
        if (!targetId) {
            handleMenuClose();
            return;
        }
        setPrintingId(targetId);
        try {
            await printChallanById(targetId);
        } finally {
            setPrintingId(null);
            handleMenuClose();
        }
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
                <MenuItem onClick={() => handlePrint()}>
                    <ListItemIcon>
                        <PrintIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Print</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleDelete}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                </MenuItem>
            </Menu>

            <ChallanDetailsDrawer
                open={sidebarOpen}
                onClose={() => {
                    setSidebarOpen(false);
                    setSelectedChallanId(null);
                }}
                challanId={selectedChallanId}
                title="Challan Details"
            />
        </>
    );
}
