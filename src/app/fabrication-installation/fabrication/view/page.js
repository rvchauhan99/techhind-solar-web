"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Paper, Alert, CircularProgress, Grid } from "@mui/material";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import CustomerProjectDetails from "@/app/confirm-orders/view/components/CustomerProjectDetails";
import Fabrication from "@/app/confirm-orders/components/Fabrication";
import orderService from "@/services/orderService";
import { toastError } from "@/utils/toast";
import { COMPACT_SECTION_HEADER_CLASS } from "@/utils/formConstants";

function FabricationViewContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("id");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [orderData, setOrderData] = useState(null);

    const fetchOrder = async () => {
        if (!orderId) return;
        try {
            setLoading(true);
            setError(null);
            const res = await orderService.getOrderById(orderId);
            const data = res?.result ?? res;
            setOrderData(data || null);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Failed to load order";
            setError(msg);
            toastError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [orderId]);

    if (!orderId) {
        return <Alert severity="error">Order ID is required</Alert>;
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Box sx={{ p: 2 }}>
            <Grid container spacing={1}>
                <Grid size={2.5}>
                    <Paper
                        sx={{ p: 1.5, height: "calc(100vh - 140px)", overflowY: "auto" }}
                        elevation={0}
                        className="border border-border rounded-lg"
                    >
                        <CustomerProjectDetails orderData={orderData} />
                    </Paper>
                </Grid>
                <Grid size={9.5}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1.5,
                            height: "calc(100vh - 140px)",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                        }}
                        className="border border-border rounded-lg"
                    >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                            <div className={COMPACT_SECTION_HEADER_CLASS}>Fabrication</div>
                            <Button size="sm" variant="outline" onClick={() => router.push("/fabrication-installation")}>
                                Back
                            </Button>
                        </Box>
                        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                            <Fabrication
                                orderId={orderId}
                                orderData={orderData}
                                onSuccess={fetchOrder}
                            />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}

export default function FabricationViewPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<Box sx={{ p: 2 }}>Loading...</Box>}>
                <FabricationViewContent />
            </Suspense>
        </ProtectedRoute>
    );
}
