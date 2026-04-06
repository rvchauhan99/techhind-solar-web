"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Box, Paper, Alert, CircularProgress, Grid } from "@mui/material";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import CustomerProjectDetails from "@/app/confirm-orders/view/components/CustomerProjectDetails";
import Installation from "@/app/confirm-orders/components/Installation";
import orderService from "@/services/orderService";
import { toastError } from "@/utils/toast";
function InstallationViewContent() {
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

    /** Fills dashboard main: mobile subtracts top bar (h-14) + main py-2; desktop subtracts main py-2 only. */
    const pageFillHeight = { xs: "calc(100dvh - 3.5rem - 16px)", lg: "calc(100dvh - 16px)" };

    return (
        <Box
            sx={{
                height: pageFillHeight,
                minHeight: 480,
                display: "flex",
                flexDirection: "column",
                p: 1,
                boxSizing: "border-box",
            }}
        >
            <Grid container spacing={1} sx={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
                <Grid size={2.5} sx={{ display: "flex", minHeight: 0 }}>
                    <Paper
                        sx={{ p: 1.5, flex: 1, minHeight: 0, width: "100%", overflowY: "auto" }}
                        elevation={0}
                        className="border border-border rounded-lg"
                    >
                        <CustomerProjectDetails orderData={orderData} />
                    </Paper>
                </Grid>
                <Grid size={9.5} sx={{ display: "flex", minHeight: 0, minWidth: 0 }}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1.5,
                            flex: 1,
                            minHeight: 0,
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                        }}
                        className="border border-border rounded-lg"
                    >
                        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
                            <Installation
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

export default function InstallationViewPage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<Box sx={{ p: 2 }}>Loading...</Box>}>
                <InstallationViewContent />
            </Suspense>
        </ProtectedRoute>
    );
}
