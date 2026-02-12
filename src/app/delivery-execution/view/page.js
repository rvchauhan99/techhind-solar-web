"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Paper, Typography, Alert, CircularProgress, Grid } from "@mui/material";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import NewChallanForm from "@/app/confirm-orders/view/components/NewChallanForm";
import CustomerProjectDetails from "@/app/confirm-orders/view/components/CustomerProjectDetails";
import orderService from "@/services/orderService";
import { toastError } from "@/utils/toast";
import { COMPACT_SECTION_HEADER_CLASS } from "@/utils/formConstants";

function DeliveryExecutionViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await orderService.getOrderById(orderId);
        const data = res?.result || res;
        setOrderData(data || null);
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || "Failed to load order";
        setError(msg);
        toastError(msg);
      } finally {
        setLoading(false);
      }
    };
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
              <div className={COMPACT_SECTION_HEADER_CLASS}>Delivery Challans</div>
              <Button size="sm" variant="outline" onClick={() => router.push("/delivery-execution")}>
                Back
              </Button>
            </Box>
            <NewChallanForm orderId={orderId} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function DeliveryExecutionViewPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<Box sx={{ p: 2 }}>Loading...</Box>}>
        <DeliveryExecutionViewContent />
      </Suspense>
    </ProtectedRoute>
  );
}

