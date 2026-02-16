"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
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
import { toastError } from "@/utils/toast";
import CustomerProjectDetails from "./components/CustomerProjectDetails";


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
        if (status === "pending") return <EventIcon color="primary" />;
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
                                    <Chip label="Current" size="small" color="primary" sx={{ height: "20px", fontSize: "10px" }} />
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

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [orderData, setOrderData] = useState(null);
    const [orderDocuments, setOrderDocuments] = useState([]);
    const [totalReceivedAmount, setTotalReceivedAmount] = useState(0);
    const [tabValue, setTabValue] = useState(0);

    const fetchOrderData = useCallback(async () => {
        if (!orderId) {
            setError("Order ID is required");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const [orderRes, paymentsRes, docsRes] = await Promise.all([
                confirmOrdersService.getOrderById(orderId),
                orderPaymentsService.getPayments({ order_id: orderId, limit: 1000 }),
                orderDocumentsService.getOrderDocuments({ order_id: orderId, limit: 1000 })
            ]);

            const data = orderRes?.result || orderRes;
            setOrderData(data);

            const payments = paymentsRes?.result || [];
            const total = payments.reduce((sum, p) => sum + parseFloat(p.payment_amount || 0), 0);
            setTotalReceivedAmount(total);

            const docs = docsRes?.result?.data || docsRes?.data || [];
            setOrderDocuments(docs);

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
        fetchOrderData();
    }, [fetchOrderData]);

    useEffect(() => {
        if (orderData?.current_stage_key) {
            const index = STAGES.findIndex(s => s.key === orderData.current_stage_key);
            if (index !== -1) {
                setTabValue(index);
            }
        }
    }, [orderData?.current_stage_key]);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const calculateOrderDetailHeight = () => {
        // Slightly taller panels to better use vertical space on large screens
        return `calc(100vh - 140px)`;
    };

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

    return (
        <Box>
            {/* Pipeline Top Bar */}
            <PipelineStages
                currentStageKey={currentStageKey}
                stagesStatus={pipelineStages}
                onStageClick={(index) => setTabValue(index)}
            />

            <Grid container spacing={1}>
                {/* Left Sidebar - Details */}
                <Grid size={2.5}>
                    <Paper sx={{ p: 1.5, height: calculateOrderDetailHeight(), overflowY: "auto" }} elevation={0} className="border border-border rounded-lg">
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

                            <Typography variant="body2" color="text.secondary" mt={2}>Project Cost:</Typography>
                            <Typography variant="body1" fontWeight="bold">
                                Rs. {orderData?.project_cost ? Number(orderData.project_cost).toLocaleString() : "0"}
                            </Typography>

                            <Typography variant="body2" color="text.secondary" mt={2}>Discount:</Typography>
                            <Typography variant="body1">Rs. {orderData?.discount || "0"}</Typography>

                            <Typography variant="body2" color="text.secondary" mt={2}>Payable Cost:</Typography>
                            <Typography variant="body1" fontWeight="bold">
                                Rs. {orderData?.project_cost ? (Number(orderData.project_cost) - (Number(orderData.discount) || 0)).toLocaleString() : "0"}
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
                                Rs. {orderData?.project_cost ? ((Number(orderData.project_cost) - (Number(orderData.discount) || 0)) - totalReceivedAmount).toLocaleString() : "0"}
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                {/* Right Panel - Stage Tabs */}
                <Grid size={9.5}>
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
        </Box>
    );
}
