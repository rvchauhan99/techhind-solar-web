"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Container from "@/components/container";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import orderService from "@/services/orderService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { toastError, toastSuccess } from "@/utils/toast";

const TAB_PENDING = "pending";
const TAB_HISTORY = "history";

export default function InstallationManagerApprovalPage() {
    const [activeTab, setActiveTab] = useState(TAB_PENDING);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [actionId, setActionId] = useState(null);
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [targetOrderId, setTargetOrderId] = useState(null);
    const [approveRemarks, setApproveRemarks] = useState("");
    const [rejectReasonId, setRejectReasonId] = useState("");
    const [rejectRemarks, setRejectRemarks] = useState("");
    const [rejectionReasonOptions, setRejectionReasonOptions] = useState([]);

    const loadRows = useCallback(async () => {
        setLoading(true);
        try {
            const response = await orderService.getFabricationInstallationOrders({
                tab: activeTab === TAB_PENDING ? "installation_pending_approval" : "installation_approval_history",
            });
            setRows(Array.isArray(response) ? response : []);
        } catch (err) {
            setRows([]);
            toastError(err?.response?.data?.message || err?.message || "Failed to load installation approvals.");
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

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

    const statusBadge = useCallback((status) => {
        const key = String(status || "").toLowerCase();
        if (key === "approved") return <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>;
        if (key === "rejected") return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
        return <Badge className="bg-amber-100 text-amber-700">Pending Approval</Badge>;
    }, []);

    const sortedRows = useMemo(() => {
        const copy = [...rows];
        copy.sort((a, b) => Number(b.id) - Number(a.id));
        return copy;
    }, [rows]);

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
            await loadRows();
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
            await loadRows();
        } catch (err) {
            toastError(err?.response?.data?.message || "Rejection failed.");
        } finally {
            setActionId(null);
        }
    };

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
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="h-8">
                            <TabsTrigger value={TAB_PENDING} className="text-[11px]">Pending</TabsTrigger>
                            <TabsTrigger value={TAB_HISTORY} className="text-[11px]">History</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {loading && (
                    <Box className="py-8 flex justify-center">
                        <CircularProgress size={24} />
                    </Box>
                )}

                {!loading && sortedRows.length === 0 && (
                    <Alert severity="info">
                        {activeTab === TAB_PENDING ? "No pending installation approvals." : "No approval history found."}
                    </Alert>
                )}

                {!loading && sortedRows.length > 0 && (
                    <div className="border rounded-md overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left p-2">Order</th>
                                    <th className="text-left p-2">Customer</th>
                                    <th className="text-left p-2">Warehouse</th>
                                    <th className="text-left p-2">Status</th>
                                    <th className="text-left p-2">Reason/Remarks</th>
                                    <th className="text-left p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRows.map((row) => (
                                    <tr key={row.id} className="border-t">
                                        <td className="p-2 font-medium">{row.order_number || row.id}</td>
                                        <td className="p-2">{row.customer_name || "-"}</td>
                                        <td className="p-2">{row.planned_warehouse_name || "-"}</td>
                                        <td className="p-2">{statusBadge(row.installation_approval_status)}</td>
                                        <td className="p-2 text-xs">
                                            {row.installation_rejection_reason || row.installation_approval_remarks || row.installation_rejection_remarks || "-"}
                                        </td>
                                        <td className="p-2">
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelected(row);
                                                        setDetailsOpen(true);
                                                    }}
                                                >
                                                    View
                                                </Button>
                                                {activeTab === TAB_PENDING && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openApproveDialog(row.id)}
                                                            disabled={actionId === row.id}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => openRejectDialog(row.id)}
                                                            disabled={actionId === row.id}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <OrderDetailsDrawer
                    open={detailsOpen}
                    onClose={() => setDetailsOpen(false)}
                    order={selected}
                    showPrint={false}
                    showDeliverySnapshot={false}
                />

                <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Approve Installation</AlertDialogTitle>
                            <AlertDialogDescription>Add remarks if needed.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <Textarea value={approveRemarks} onChange={(e) => setApproveRemarks(e.target.value)} rows={4} />
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={!!actionId}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleApprove} disabled={!!actionId} loading={!!actionId}>
                                Approve
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Reject Installation</AlertDialogTitle>
                            <AlertDialogDescription>Select rejection reason.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <select
                            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
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
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={!!actionId}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleReject}
                                disabled={!!actionId || !rejectReasonId}
                                loading={!!actionId}
                            >
                                Reject
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Container>
        </ProtectedRoute>
    );
}
