"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Grid,
    Paper,
    Tabs,
    Tab,
    Chip,
    Divider,
    Button,
    Stack,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Drawer,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import EventIcon from "@mui/icons-material/Event";
import HelpIcon from "@mui/icons-material/Help";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import confirmOrdersService from "@/services/confirmOrdersService";
import orderDocumentsService from "@/services/orderDocumentsService";
import orderPaymentsService from "@/services/orderPaymentsService";
import moment from "moment";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import EstimateGenerated from "../components/EstimateGenerated";
import EstimatePaid from "../components/EstimatePaid";
import Planner from "../components/Planner";
import ChallanTabs from "./components/ChallanTabs";
import NewChallanForm from "./components/NewChallanForm";
import PreviousChallans from "./components/PreviousChallans";
import Fabrication from "../components/Fabrication";
import AssignFabricatorAndInstaller from "@/app/confirm-orders/components/AssignFabricatorAndInstaller";
import Installation from "../components/Installation";
import NetMeterApplyTabs from "./components/NetMeterApplyTabs";
import NetMeterInstalled from "../components/NetMeterInstalled";
import SubsidyClaim from "../components/SubsidyClaim";
import SubsidyDisbursed from "../components/SubsidyDisbursed";
import { COMPACT_SECTION_HEADER_CLASS } from "@/utils/formConstants";
import { toastError, toastSuccess } from "@/utils/toast";
import CustomerProjectDetails from "./components/CustomerProjectDetails";
import orderService from "@/services/orderService";
import QuotationDetailsDrawer from "@/components/common/QuotationDetailsDrawer";
import userMasterService from "@/services/userMasterService";
import mastersService from "@/services/mastersService";
import { useAuth } from "@/hooks/useAuth";
import CloseIcon from "@mui/icons-material/Close";

// In-flight fetch cache: reuse same promise when effect runs twice (e.g. React Strict Mode)
const inFlightFetchByOrderId = new Map();

/** Pure fetch: returns { data, totalReceivedAmount, docs } or throws. No React state. */
async function fetchOrderDataRaw(orderId) {
    const [orderRes, paymentsRes, docsRes] = await Promise.all([
        confirmOrdersService.getOrderById(orderId),
        orderPaymentsService.getPayments({ order_id: orderId, limit: 1000 }),
        orderDocumentsService.getOrderDocuments({ order_id: orderId, limit: 1000 })
    ]);
    const data = orderRes?.result || orderRes;
    const payments = paymentsRes?.result || [];
    const paidPayments = payments.filter(
        (p) => p.status === "approved" || p.status === "pending_approval"
    );
    const totalReceivedAmount = paidPayments.reduce(
        (sum, p) => sum + parseFloat(p.payment_amount || 0),
        0
    );
    const docs = docsRes?.result?.data || docsRes?.data || [];
    return { data, totalReceivedAmount, docs };
}

// --- Constants ---

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

// --- Components ---

function TabPanel({ children, value, index }) {
    return (
        <div hidden={value !== index} style={{ padding: index == 3 ? "0" : "10px 0" }}>
            {value === index && children}
        </div>
    );
}

const PipelineStages = ({ currentStageKey, stagesStatus = {}, onStageClick }) => {
    const stages = STAGES;

    const getIcon = (status) => {
        if (status === "completed") return <CheckCircleIcon color="success" />;
        if (status === "pending") return <EventIcon color="error" />;
        if (status === "locked") return <CancelIcon color="error" />;
        return <HelpIcon color="disabled" />;
    };

    return (
        <Paper elevation={0} sx={{ borderBottom: 1, borderColor: "divider", overflowX: "auto", mb: 2 }} className="rounded-lg border border-border">
            <Stack direction="row" spacing={0} sx={{ minWidth: "1200px" }}>
                {stages.map((stage, index) => {
                    const status = stagesStatus[stage.key] || (index === 0 ? "pending" : "locked");
                    const isActive = currentStageKey === stage.key;
                    const currentStageIndex = stages.findIndex(s => s.key === currentStageKey);
                    const isLocked = status === "locked" && index > currentStageIndex;

                    return (
                        <Box
                            key={stage.key}
                            sx={{
                                flex: 1,
                                textAlign: "center",
                                py: 1,
                                borderRight: index < stages.length - 1 ? 1 : 0,
                                borderColor: "divider",
                                bgcolor: isActive ? "action.hover" : "transparent",
                                position: "relative",
                                cursor: isLocked ? "not-allowed" : "pointer",
                                opacity: (isLocked && !isActive) ? 0.6 : 1,
                                "&:hover": { bgcolor: isLocked ? "transparent" : "action.hover" }
                            }}
                            onClick={() => !isLocked && onStageClick(index)}
                        >
                            <Typography variant="caption" display="block" sx={{ fontWeight: isActive ? "bold" : "normal", height: "30px", px: 0.5 }}>
                                {stage.label}
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                                {isActive ? (
                                    <Chip label="Current" size="small" color="warning" sx={{ height: "20px", fontSize: "10px" }} />
                                ) : (
                                    getIcon(status)
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Stack>
        </Paper>
    );
};

// --- Main Page ---

export default function ConfirmedOrderViewPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<CircularProgress />}>
                <ConfirmedOrderViewPageContent />
            </Suspense>
        </ProtectedRoute>
    );
}

function ConfirmedOrderViewPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("id");
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [orderData, setOrderData] = useState(null);
    const [orderDocuments, setOrderDocuments] = useState([]);
    const [totalReceivedAmount, setTotalReceivedAmount] = useState(0);
    const [tabValue, setTabValue] = useState(0);
    const mountedRef = useRef(true);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelReasonId, setCancelReasonId] = useState("");
    const [cancelRemarks, setCancelRemarks] = useState("");
    const [cancelReasonOptions, setCancelReasonOptions] = useState([]);
    const [cancelReasonLoading, setCancelReasonLoading] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [quotationDrawerOpen, setQuotationDrawerOpen] = useState(false);
    const [changeHandledByOpen, setChangeHandledByOpen] = useState(false);
    const [handledByUsers, setHandledByUsers] = useState([]);
    const [handledByLoading, setHandledByLoading] = useState(false);
    const [selectedHandledByUser, setSelectedHandledByUser] = useState(null);
    const [reassignReason, setReassignReason] = useState("");
    const [reassigning, setReassigning] = useState(false);
    const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);

    const normalizeRoleName = (s) =>
        String(s || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
    const isSuperAdmin = normalizeRoleName(user?.role?.name) === "superadmin";

    const fetchOrderData = useCallback(async () => {
        if (!orderId) {
            setError("Order ID is required");
            setLoading(false);
            return;
        }
        inFlightFetchByOrderId.delete(orderId);
        setLoading(true);
        setError(null);
        try {
            const result = await fetchOrderDataRaw(orderId);
            setOrderData(result.data);
            setTotalReceivedAmount(result.totalReceivedAmount);
            setOrderDocuments(result.docs);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch order details:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to load order data";
            setError(msg);
            toastError(msg);
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        mountedRef.current = true;
        if (!orderId) {
            setError("Order ID is required");
            setLoading(false);
            return () => { mountedRef.current = false; };
        }
        setLoading(true);
        setError(null);
        let promise = inFlightFetchByOrderId.get(orderId);
        if (!promise) {
            promise = fetchOrderDataRaw(orderId);
            inFlightFetchByOrderId.set(orderId, promise);
            promise.finally(() => inFlightFetchByOrderId.delete(orderId));
        }
        promise
            .then((result) => {
                if (mountedRef.current) {
                    setOrderData(result.data);
                    setTotalReceivedAmount(result.totalReceivedAmount);
                    setOrderDocuments(result.docs);
                    setError(null);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch order details:", err);
                if (mountedRef.current) {
                    const msg = err?.response?.data?.message || err?.message || "Failed to load order data";
                    setError(msg);
                    toastError(msg);
                }
            })
            .finally(() => {
                if (mountedRef.current) setLoading(false);
            });
        return () => {
            mountedRef.current = false;
        };
    }, [orderId]);

    useEffect(() => {
        if (orderData?.current_stage_key) {
            const index = STAGES.findIndex(s => s.key === orderData.current_stage_key);
            if (index !== -1) {
                setTabValue(index);
            }
        }
    }, [orderData?.current_stage_key]);

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

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const calculateOrderDetailHeight = () => {
        // Slightly taller panels to better use vertical space on large screens
        return `calc(100vh - 140px)`;
    };

    const canCancelOrder = () => {
        if (!orderData) return false;
        const status = String(orderData.status || "").toLowerCase();
        const deliveryStatus = String(orderData.delivery_status || "").toLowerCase();
        if (status !== "pending" && status !== "confirmed") return false;
        if (status === "cancelled" || status === "completed") return false;
        if (deliveryStatus === "partial" || deliveryStatus === "complete") return false;
        return true;
    };

    const handleOpenCancelDialog = async () => {
        setCancelReasonId("");
        setCancelRemarks("");
        setCancelDialogOpen(true);
        try {
            setCancelReasonLoading(true);
            const options = await mastersService.getReferenceOptionsSearch("reason.model", {
                reason_type: "order_cancellation",
                is_active: true,
            });
            setCancelReasonOptions(Array.isArray(options) ? options : []);
        } catch (err) {
            console.error("Failed to load cancellation reasons:", err);
            toastError("Failed to load cancellation reasons");
        } finally {
            setCancelReasonLoading(false);
        }
    };

    const handleConfirmCancel = async () => {
        if (!orderId) return;
        if (!cancelReasonId) {
            toastError("Please select a cancellation reason");
            return;
        }
        try {
            setCancelling(true);
            const selectedReason = cancelReasonOptions.find((o) => o.id == cancelReasonId);
            await orderService.cancelOrder(orderId, {
                cancellation_reason_id: cancelReasonId,
                cancellation_reason: selectedReason?.label || selectedReason?.reason || "",
                cancellation_remarks: cancelRemarks?.trim() || undefined,
            });
            toastSuccess("Order cancelled successfully");
            setCancelDialogOpen(false);
            router.push("/confirm-orders");
        } catch (err) {
            console.error("Failed to cancel order:", err);
            const msg = err?.response?.data?.message || err?.message || "Failed to cancel order";
            toastError(msg);
        } finally {
            setCancelling(false);
        }
    };

    const openChangeHandledByDialog = useCallback(() => {
        if (!orderData?.id) return;
        const preselected = handledByUsers.find((u) => Number(u.id) === Number(orderData.handled_by)) || null;
        setSelectedHandledByUser(preselected);
        setReassignReason("");
        setChangeHandledByOpen(true);
    }, [orderData, handledByUsers]);

    const closeChangeHandledByDialog = useCallback(() => {
        if (reassigning) return;
        setChangeHandledByOpen(false);
        setSelectedHandledByUser(null);
        setReassignReason("");
    }, [reassigning]);

    const submitChangeHandledBy = useCallback(async () => {
        if (!orderData?.id || !selectedHandledByUser?.id) return;
        if (Number(selectedHandledByUser.id) === Number(orderData.handled_by)) {
            toastError("Please select a different user");
            return;
        }
        try {
            setReassigning(true);
            await confirmOrdersService.changeHandledBy(orderData.id, {
                handled_by: selectedHandledByUser.id,
                reason: reassignReason?.trim() || undefined,
            });
            toastSuccess("Handled By updated successfully");
            closeChangeHandledByDialog();
            await fetchOrderData();
        } catch (err) {
            toastError(err?.response?.data?.message || "Failed to update Handled By");
        } finally {
            setReassigning(false);
        }
    }, [orderData, selectedHandledByUser, reassignReason, closeChangeHandledByDialog, fetchOrderData]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error">{error}</Alert>
        );
    }

    // Default status for stages if not present in data
    const pipelineStages = orderData?.stages || {
        estimate_generated: "pending",
        estimate_paid: "locked",
        planner: "locked",
        delivery: "locked",
        assign_fabricator_and_installer: "locked",
        fabrication: "locked",
        installation: "locked",
        netmeter_apply: "locked",
        netmeter_installed: "locked",
        subsidy_claim: "locked",
        subsidy_disbursed: "locked",
    };

    const currentStageKey = orderData?.current_stage_key;
    const renderOrderDetailsSidebar = () => (
        <Paper sx={{ p: 1.5, height: "100%", overflowY: "auto" }} elevation={0} className="border border-border rounded-lg">
            <CustomerProjectDetails orderData={orderData} />

            {orderData?.bom_snapshot?.length > 0 && (
                <>
                    <div className={COMPACT_SECTION_HEADER_CLASS}>Scope (BOM)</div>
                    <Box mt={2} mb={2} sx={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", fontSize: "0.75rem", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
                                    <th style={{ textAlign: "left", padding: "4px 6px" }}>#</th>
                                    <th style={{ textAlign: "left", padding: "4px 6px" }}>Product</th>
                                    <th style={{ textAlign: "left", padding: "4px 6px" }}>Type</th>
                                    <th style={{ textAlign: "left", padding: "4px 6px" }}>Make</th>
                                    <th style={{ textAlign: "left", padding: "4px 6px" }}>Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderData.bom_snapshot.map((line, idx) => {
                                    const p = line.product_snapshot || line;
                                    return (
                                        <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                                            <td style={{ padding: "4px 6px" }}>{idx + 1}</td>
                                            <td style={{ padding: "4px 6px" }}>{p?.product_name ?? "-"}</td>
                                            <td style={{ padding: "4px 6px" }}>{p?.product_type_name ?? "-"}</td>
                                            <td style={{ padding: "4px 6px" }}>{p?.product_make_name ?? "-"}</td>
                                            <td style={{ padding: "4px 6px" }}>{line.quantity ?? "-"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Box>
                </>
            )}

            <div className={COMPACT_SECTION_HEADER_CLASS}>Payment Details</div>
            <Box mt={2} mb={2}>
                <Typography variant="body2" color="text.secondary">Payment Mode:</Typography>
                <Typography variant="body1" fontWeight="bold">{orderData?.payment_type || orderData?.loan_type_name || "N/A"}</Typography>

                {orderData?.estimate_paid_by && (
                    <>
                        <Typography variant="body2" color="text.secondary" mt={2}>Paid By:</Typography>
                        <Typography variant="body1" fontWeight="bold">
                            {orderData.estimate_paid_by === "customer" ? "Customer" : orderData.estimate_paid_by === "company" ? "Company" : orderData.estimate_paid_by}
                        </Typography>
                    </>
                )}

                <Typography variant="body2" color="text.secondary" mt={2}>Total Payable:</Typography>
                <Typography variant="body1" fontWeight="bold">
                    Rs. {orderData?.project_cost ? Number(orderData.project_cost).toLocaleString() : "0"}
                </Typography>

                <Typography variant="body2" color="text.secondary" mt={2}>Received:</Typography>
                <Typography variant="body1" fontWeight="bold">
                    Rs. {totalReceivedAmount.toLocaleString()}
                </Typography>

                <Typography variant="body2" color="text.secondary" mt={2}>Outstanding:</Typography>
                <Typography
                    variant="h6"
                    fontWeight="bold"
                    color="white"
                    bgcolor="error.main"
                    px={1}
                    py={0.5}
                    borderRadius={0.5}
                    mt={1}
                >
                    Rs. {orderData?.project_cost ? (Number(orderData.project_cost) - totalReceivedAmount).toLocaleString() : "0"}
                </Typography>
            </Box>
        </Paper>
    );

    return (
        <Box>
            <Box px={1} py={0.5} display="flex" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title="Back to Confirmed Orders">
                        <IconButton size="small" onClick={() => router.push("/confirm-orders")}>
                            <HomeIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Typography variant="subtitle1" fontWeight="bold">
                        Confirmed Order - {orderData?.order_number || "N/A"}
                    </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setQuotationDrawerOpen(true)}
                    >
                        Quotation
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setDetailsDrawerOpen(true)}
                    >
                        Order Details
                    </Button>
                    {isSuperAdmin && (
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={openChangeHandledByDialog}
                        >
                            Change Handled By
                        </Button>
                    )}
                    {canCancelOrder() && (
                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={handleOpenCancelDialog}
                        >
                            Cancel Order
                        </Button>
                    )}
                </Stack>
            </Box>
            {/* Pipeline Top Bar */}
            <PipelineStages
                currentStageKey={currentStageKey}
                stagesStatus={pipelineStages}
                onStageClick={(index) => setTabValue(index)}
            />

            <Grid container spacing={1}>
                {/* Right Panel - Stage Tabs */}
                <Grid size={12}>
                    <Paper elevation={0} sx={{ height: calculateOrderDetailHeight(), display: "flex", flexDirection: "column", overflow: "hidden" }} className="border border-border rounded-lg">
                        <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
                        >
                            {STAGES.map((stage, idx) => {
                                const status = pipelineStages[stage.key] || (idx === 0 ? "pending" : "locked");
                                const currentStageIndex = STAGES.findIndex(s => s.key === currentStageKey);
                                const isLocked = status === "locked" && idx > currentStageIndex;
                                return (
                                    <Tab
                                        key={stage.key}
                                        label={stage.label}
                                        disabled={isLocked}
                                        sx={{
                                            textTransform: "none",
                                            fontWeight: tabValue === idx ? "bold" : "normal"
                                        }}
                                    />
                                );
                            })}
                        </Tabs>

                        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                            <TabPanel value={tabValue} index={0}>
                                <Box>
                                    <EstimateGenerated
                                        orderId={orderId}
                                        orderData={orderData}
                                        orderDocuments={orderDocuments}
                                        onSuccess={fetchOrderData}
                                    />
                                </Box>
                            </TabPanel>

                            <TabPanel value={tabValue} index={1}>
                                <Box>
                                    <EstimatePaid
                                        orderId={orderId}
                                        orderData={orderData}
                                        orderDocuments={orderDocuments}
                                        onSuccess={fetchOrderData}
                                    />
                                </Box>
                            </TabPanel>

                            <TabPanel value={tabValue} index={2}>
                                <Box>
                                    <Planner
                                        orderId={orderId}
                                        orderData={orderData}
                                        onSuccess={fetchOrderData}
                                    />
                                </Box>
                            </TabPanel>
                            <TabPanel value={tabValue} index={3}>
                                <Box>
                                    <ChallanTabs
                                        orderId={orderId}
                                        orderData={orderData}
                                        NewChallanComponent={NewChallanForm}
                                        PreviousChallansComponent={PreviousChallans}
                                        onTabChange={setTabValue}
                                        onRefresh={fetchOrderData}
                                    />
                                </Box>
                            </TabPanel>
                            <TabPanel value={tabValue} index={4}>
                                <AssignFabricatorAndInstaller orderId={orderId} orderData={orderData} onSuccess={fetchOrderData} />
                            </TabPanel>
                            <TabPanel value={tabValue} index={5}>
                                <Fabrication orderId={orderId} orderData={orderData} onSuccess={fetchOrderData} />
                            </TabPanel>
                            <TabPanel value={tabValue} index={6}>
                                <Installation orderId={orderId} orderData={orderData} onSuccess={fetchOrderData} />
                            </TabPanel>
                            <TabPanel value={tabValue} index={7}>
                                <NetMeterApplyTabs orderId={orderId} orderData={orderData} orderDocuments={orderDocuments} onRefresh={fetchOrderData} />
                            </TabPanel>
                            <TabPanel value={tabValue} index={8}>
                                <NetMeterInstalled orderId={orderId} orderData={orderData} orderDocuments={orderDocuments} onSuccess={fetchOrderData} />
                            </TabPanel>
                            <TabPanel value={tabValue} index={9}>
                                <SubsidyClaim orderId={orderId} orderData={orderData} onSuccess={fetchOrderData} />
                            </TabPanel>
                            <TabPanel value={tabValue} index={10}>
                                <SubsidyDisbursed orderId={orderId} orderData={orderData} onSuccess={fetchOrderData} />
                            </TabPanel>
                        </div>
                    </Paper>
                </Grid>
            </Grid>
            <Drawer
                anchor="left"
                open={detailsDrawerOpen}
                onClose={() => setDetailsDrawerOpen(false)}
            >
                <Box sx={{ width: { xs: 320, sm: 380 }, p: 1, height: "100vh" }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                            Order Details
                        </Typography>
                        <IconButton size="small" onClick={() => setDetailsDrawerOpen(false)}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                    <Box sx={{ height: "calc(100% - 34px)" }}>
                        {renderOrderDetailsSidebar()}
                    </Box>
                </Box>
            </Drawer>

            <Dialog
                open={cancelDialogOpen}
                onClose={() => !cancelling && setCancelDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Cancel Order</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" mb={2}>
                        Are you sure you want to cancel this order? This action cannot be undone.
                    </Typography>
                    <AutocompleteField
                        options={cancelReasonOptions}
                        loading={cancelReasonLoading}
                        value={cancelReasonOptions.find((o) => o.id == cancelReasonId) || null}
                        onChange={(e, v) => setCancelReasonId(v?.id || "")}
                        getOptionLabel={(o) => o?.label || o?.reason || ""}
                        placeholder="Select Cancellation Reason"
                        label="Reason"
                        name="cancellation_reason_id"
                        required
                        fullWidth
                    />
                    <Box mt={2}>
                        <Input
                            fullWidth
                            label="Remarks (optional)"
                            name="cancellation_remarks"
                            value={cancelRemarks}
                            onChange={(e) => setCancelRemarks(e.target.value)}
                            multiline
                            rows={3}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCancelDialogOpen(false)} disabled={cancelling} size="small">
                        Close
                    </Button>
                    <Button
                        onClick={handleConfirmCancel}
                        color="error"
                        variant="contained"
                        size="small"
                        disabled={cancelling || !cancelReasonId}
                    >
                        {cancelling ? "Cancelling..." : "Confirm Cancel"}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={changeHandledByOpen} onClose={closeChangeHandledByDialog} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ py: 1 }}>Change Handled By</DialogTitle>
                <DialogContent sx={{ pt: "8px !important" }}>
                    <AutocompleteField
                        options={handledByUsers}
                        loading={handledByLoading}
                        value={selectedHandledByUser}
                        onChange={(e, v) => setSelectedHandledByUser(v || null)}
                        getOptionLabel={(o) => o?.name || ""}
                        placeholder="Select active user"
                        label="Handled By"
                        name="handled_by"
                        required
                    />
                    <Box mt={1}>
                        <Input
                            name="reassign_reason"
                            label="Reason (optional)"
                            value={reassignReason}
                            onChange={(e) => setReassignReason(e.target.value)}
                            multiline
                            rows={3}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 1 }}>
                    <Button size="small" onClick={closeChangeHandledByDialog} disabled={reassigning}>
                        Close
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        onClick={submitChangeHandledBy}
                        disabled={reassigning || !selectedHandledByUser?.id}
                    >
                        {reassigning ? "Updating..." : "Update"}
                    </Button>
                </DialogActions>
            </Dialog>
            <QuotationDetailsDrawer
                open={quotationDrawerOpen}
                onClose={() => setQuotationDrawerOpen(false)}
                orderId={orderId}
                quotationId={orderData?.quotation_id}
            />
        </Box>
    );
}
