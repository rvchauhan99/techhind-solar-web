"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Tab, Tabs, Typography } from "@mui/material";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import Input from "@/components/common/Input";
import OrderForm from "../components/OrderForm";
import orderService from "@/services/orderService";
import orderDocumentsService from "@/services/orderDocumentsService";
import { useAuth } from "@/hooks/useAuth";
import { toastError, toastSuccess } from "@/utils/toast";
import EstimateGenerated from "@/app/confirm-orders/components/EstimateGenerated";
import EstimatePaid from "@/app/confirm-orders/components/EstimatePaid";
import Planner from "@/app/confirm-orders/components/Planner";
import AssignFabricatorAndInstaller from "@/app/confirm-orders/components/AssignFabricatorAndInstaller";
import Fabrication from "@/app/confirm-orders/components/Fabrication";
import Installation from "@/app/confirm-orders/components/Installation";
import NetMeterInstalled from "@/app/confirm-orders/components/NetMeterInstalled";
import SubsidyClaim from "@/app/confirm-orders/components/SubsidyClaim";
import SubsidyDisbursed from "@/app/confirm-orders/components/SubsidyDisbursed";
import ChallanTabs from "@/app/confirm-orders/view/components/ChallanTabs";
import NewChallanForm from "@/app/confirm-orders/view/components/NewChallanForm";
import PreviousChallans from "@/app/confirm-orders/view/components/PreviousChallans";
import NetMeterApplyTabs from "@/app/confirm-orders/view/components/NetMeterApplyTabs";

const normalizeRoleName = (value) =>
    String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

const STAGES = [
    { key: "basic", label: "Basic Details" },
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
    { key: "history", label: "Amendment History" },
];

const DOCUMENT_TYPES = [
    { key: "electricity_bill", label: "Electricity Bill" },
    { key: "house_tax_bill", label: "House Tax Bill" },
    { key: "aadhar_card", label: "Aadhar Card" },
    { key: "passport_photo", label: "Passport Photo" },
    { key: "pan_card", label: "PAN Card" },
    { key: "cancelled_cheque", label: "Cancelled Cheque" },
    { key: "customer_sign", label: "Customer Sign" },
];

export default function AmendOrderPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<Loader />}>
                <AmendOrderPageContent />
            </Suspense>
        </ProtectedRoute>
    );
}

function AmendOrderPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("id");
    const { user, modulePermissions, currentModuleId } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [orderData, setOrderData] = useState(null);
    const [orderDocuments, setOrderDocuments] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const [historyRows, setHistoryRows] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogSubmitting, setDialogSubmitting] = useState(false);
    const [amendmentReason, setAmendmentReason] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const pendingActionRef = useRef(null);

    const roleName = normalizeRoleName(user?.role?.name);
    const isAllowedRole = roleName === "ba" || roleName === "superadmin";
    const currentPerm = useMemo(
        () => (currentModuleId ? modulePermissions?.[currentModuleId] || null : null),
        [modulePermissions, currentModuleId]
    );
    const hasUpdatePermission = currentPerm ? currentPerm.can_update === true : true;

    const fetchOrderData = async () => {
        if (!orderId) {
            setError("Order ID is required");
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const [orderRes, docsRes] = await Promise.all([
                orderService.getOrderById(orderId),
                orderDocumentsService.getOrderDocuments({ order_id: orderId, limit: 1000 }),
            ]);
            const order = orderRes?.result || orderRes;
            const docs = docsRes?.result?.data || docsRes?.data || [];
            setOrderData(order || null);
            setOrderDocuments(Array.isArray(docs) ? docs : []);
            setError(null);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Failed to load order data";
            setError(msg);
            toastError(msg);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        if (!orderId) return;
        try {
            setHistoryLoading(true);
            const res = await orderService.getOrderAmendments(orderId);
            const rows = res?.result || res?.data || [];
            setHistoryRows(Array.isArray(rows) ? rows : []);
        } catch {
            setHistoryRows([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderData();
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    const requestStepUpConfirmation = ({ execute }) =>
        new Promise((resolve, reject) => {
            pendingActionRef.current = { execute, resolve, reject };
            setAmendmentReason("");
            setCurrentPassword("");
            setDialogOpen(true);
        });

    useEffect(() => {
        if (!orderId) return undefined;
        const originalUpdateOrder = orderService.updateOrder;
        const originalSaveFabrication = orderService.saveFabrication;
        const originalSaveInstallation = orderService.saveInstallation;

        orderService.updateOrder = async (id, payload) => {
            if (String(id) !== String(orderId)) return originalUpdateOrder(id, payload);
            return requestStepUpConfirmation({
                execute: ({ reason, password }) =>
                    orderService.amendOrder(id, {
                        ...(payload || {}),
                        amendment_reason: reason,
                        current_password: password,
                    }),
            });
        };

        orderService.saveFabrication = async (id, payload) => {
            if (String(id) !== String(orderId)) return originalSaveFabrication(id, payload);
            return requestStepUpConfirmation({
                execute: ({ reason, password }) =>
                    originalSaveFabrication(id, {
                        ...(payload || {}),
                        amendment_reason: reason,
                        current_password: password,
                    }),
            });
        };

        orderService.saveInstallation = async (id, payload) => {
            if (String(id) !== String(orderId)) return originalSaveInstallation(id, payload);
            return requestStepUpConfirmation({
                execute: ({ reason, password }) =>
                    originalSaveInstallation(id, {
                        ...(payload || {}),
                        amendment_reason: reason,
                        current_password: password,
                    }),
            });
        };

        return () => {
            orderService.updateOrder = originalUpdateOrder;
            orderService.saveFabrication = originalSaveFabrication;
            orderService.saveInstallation = originalSaveInstallation;
        };
    }, [orderId]);

    const handleConfirmDialog = async () => {
        const reason = String(amendmentReason || "").trim();
        if (!reason) {
            toastError("Amendment reason is required");
            return;
        }
        if (!currentPassword) {
            toastError("Current password is required");
            return;
        }
        if (!pendingActionRef.current) return;

        setDialogSubmitting(true);
        try {
            const { execute, resolve } = pendingActionRef.current;
            const result = await execute({ reason, password: currentPassword });
            resolve(result);
            pendingActionRef.current = null;
            setDialogOpen(false);
            setCurrentPassword("");
            setAmendmentReason("");
            toastSuccess("Amendment saved successfully");
            await Promise.all([fetchOrderData(), fetchHistory()]);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Failed to save amendment";
            toastError(msg);
            if (pendingActionRef.current?.reject) pendingActionRef.current.reject(err);
            pendingActionRef.current = null;
            setDialogOpen(false);
        } finally {
            setDialogSubmitting(false);
        }
    };

    const handleCloseDialog = () => {
        if (dialogSubmitting) return;
        if (pendingActionRef.current?.reject) {
            pendingActionRef.current.reject({ cancelled: true });
        }
        pendingActionRef.current = null;
        setDialogOpen(false);
        setCurrentPassword("");
        setAmendmentReason("");
    };

    const handleBasicSubmit = async (formData) => {
        const payload = { ...(formData || {}) };
        delete payload.documentIds;

        DOCUMENT_TYPES.forEach((doc) => {
            delete payload[doc.key];
        });

        await orderService.updateOrder(orderId, payload);

        const filesToUpload = DOCUMENT_TYPES.filter((doc) => formData?.[doc.key] instanceof File);
        for (const doc of filesToUpload) {
            try {
                const uploadData = new FormData();
                uploadData.append("document", formData[doc.key]);
                uploadData.append("order_id", orderId);
                uploadData.append("doc_type", doc.key);
                uploadData.append("remarks", doc.label);
                await orderDocumentsService.createOrderDocument(uploadData);
            } catch (uploadErr) {
                toastError(uploadErr?.response?.data?.message || `Failed to upload ${doc.label}`);
            }
        }
    };

    const title = orderData?.order_number ? `Order Amend - ${orderData.order_number}` : "Order Amend";

    if (loading) {
        return (
            <AddEditPageShell title="Order Amend" listHref="/order" listLabel="Order">
                <div className="flex justify-center items-center min-h-[60vh]">
                    <Loader />
                </div>
            </AddEditPageShell>
        );
    }

    if (error) {
        return (
            <AddEditPageShell title="Order Amend" listHref="/order" listLabel="Order">
                <Alert severity="error">{error}</Alert>
            </AddEditPageShell>
        );
    }

    if (!isAllowedRole || !hasUpdatePermission) {
        return (
            <AddEditPageShell title={title} listHref="/order" listLabel="Order">
                <Alert severity="error" sx={{ mb: 1 }}>
                    Restricted to BA/SuperAdmin users with update permission.
                </Alert>
                <Button size="small" variant="outlined" onClick={() => router.push("/order")}>
                    Back to Order List
                </Button>
            </AddEditPageShell>
        );
    }

    return (
        <AddEditPageShell title={title} listHref="/order" listLabel="Order">
            <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, mb: 1 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, nextValue) => setTabValue(nextValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ ".MuiTab-root": { textTransform: "none", minHeight: 36, py: 0.5 } }}
                >
                    {STAGES.map((stage) => (
                        <Tab key={stage.key} label={stage.label} />
                    ))}
                </Tabs>
            </Paper>

            {tabValue === 0 && <OrderForm defaultValues={orderData || {}} onSubmit={handleBasicSubmit} />}
            {tabValue === 1 && <EstimateGenerated orderId={orderId} orderData={orderData} onSuccess={fetchOrderData} amendMode />}
            {tabValue === 2 && (
                <EstimatePaid orderId={orderId} orderData={orderData} orderDocuments={orderDocuments} onSuccess={fetchOrderData} amendMode />
            )}
            {tabValue === 3 && <Planner orderId={orderId} orderData={orderData} onSuccess={fetchOrderData} amendMode />}
            {tabValue === 4 && (
                <ChallanTabs
                    orderId={orderId}
                    orderData={orderData}
                    NewChallanComponent={NewChallanForm}
                    PreviousChallansComponent={PreviousChallans}
                    onTabChange={() => {}}
                    onRefresh={fetchOrderData}
                />
            )}
            {tabValue === 5 && <AssignFabricatorAndInstaller orderId={orderId} orderData={orderData} onSuccess={fetchOrderData} amendMode />}
            {tabValue === 6 && <Fabrication orderId={orderId} orderData={orderData} onSuccess={fetchOrderData} amendMode />}
            {tabValue === 7 && <Installation orderId={orderId} orderData={orderData} onSuccess={fetchOrderData} amendMode />}
            {tabValue === 8 && <NetMeterApplyTabs orderId={orderId} orderData={orderData} orderDocuments={orderDocuments} onRefresh={fetchOrderData} amendMode />}
            {tabValue === 9 && (
                <NetMeterInstalled orderId={orderId} orderData={orderData} orderDocuments={orderDocuments} onSuccess={fetchOrderData} amendMode />
            )}
            {tabValue === 10 && <SubsidyClaim orderId={orderId} orderData={orderData} onSuccess={fetchOrderData} amendMode />}
            {tabValue === 11 && <SubsidyDisbursed orderId={orderId} orderData={orderData} onSuccess={fetchOrderData} amendMode />}
            {tabValue === 12 && (
                <Paper elevation={0} sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Amendment History
                    </Typography>
                    {historyLoading ? (
                        <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                            <CircularProgress size={20} />
                        </Box>
                    ) : historyRows.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No amendments recorded yet.
                        </Typography>
                    ) : (
                        <Box sx={{ display: "grid", gap: 0.75 }}>
                            {historyRows.map((row) => (
                                <Paper key={row.id} variant="outlined" sx={{ p: 0.75 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {row.reason || "-"}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        By {row.actor_user_name || "Unknown"} on {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
                                    </Typography>
                                    <Typography variant="caption" display="block" color="text.secondary">
                                        Fields: {Array.isArray(row.changed_fields) && row.changed_fields.length > 0 ? row.changed_fields.join(", ") : "-"}
                                    </Typography>
                                </Paper>
                            ))}
                        </Box>
                    )}
                </Paper>
            )}

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Confirm Amendment</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Enter amendment reason and your current password to continue.
                    </Typography>
                    <Input
                        name="amendment_reason"
                        label="Amendment Reason"
                        value={amendmentReason}
                        onChange={(e) => setAmendmentReason(e.target.value)}
                        required
                        fullWidth
                        multiline
                        rows={2}
                    />
                    <Box sx={{ mt: 1 }}>
                        <Input
                            name="current_password"
                            label="Current Password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button size="small" onClick={handleCloseDialog} disabled={dialogSubmitting}>
                        Close
                    </Button>
                    <Button size="small" variant="contained" onClick={handleConfirmDialog} disabled={dialogSubmitting}>
                        {dialogSubmitting ? "Saving..." : "Confirm"}
                    </Button>
                </DialogActions>
            </Dialog>
        </AddEditPageShell>
    );
}
