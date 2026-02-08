"use client";

import { useState, useEffect } from "react";
import { Box, Paper, Typography, CircularProgress, Alert } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import challanService from "@/services/challanService";

const PRODUCT_TYPE_LABELS = {
    structure: "Structure",
    panel: "Solar Panel",
    inverter: "Inverter",
    hybrid_inverter: "Hybrid Inverter",
    battery: "Battery",
    acdb: "ACDB",
    dcdb: "DCDB",
    ac_cable: "AC Cable",
    dc_cable: "DC Cable",
    earthing: "Earthing Kit",
    la: "LA",
};

export default function DeliveryStatusCards({ orderId }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deliveryStatus, setDeliveryStatus] = useState({});

    useEffect(() => {
        if (orderId) {
            fetchDeliveryStatus();
        }
    }, [orderId]);

    const fetchDeliveryStatus = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await challanService.getDeliveryStatus(orderId);
            setDeliveryStatus(response.result?.status || {});
        } catch (err) {
            console.error("Failed to fetch delivery status:", err);
            setError(err?.response?.data?.message || "Failed to load delivery status");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={2}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    const statusEntries = Object.entries(deliveryStatus);

    if (statusEntries.length === 0) {
        return (
            <Box p={2}>
                <Alert severity="info">No delivery items found for this order</Alert>
            </Box>
        );
    }

    return (

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", p: 0.5, justifyContent: "space-evenly", }}>
            {statusEntries.map(([type, data]) => {
                const isComplete = data.status === "complete";
                const label = PRODUCT_TYPE_LABELS[type] || type;

                return (
                    <Paper
                        key={type}
                        sx={{
                            minWidth: 80,
                            // p: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            flexShrink: 0,
                            gap: 0.5,
                            border: 1,
                            borderColor: isComplete ? "success.main" : "error.main",
                        }}
                    >
                        <Typography variant="body2" fontWeight={600} textAlign="center" sx={{ fontSize: 10 }}>
                            {label}
                        </Typography>
                        {isComplete ? (
                            <CheckCircleIcon color="success" sx={{ fontSize: 20 }} />
                        ) : (
                            <CancelIcon color="error" sx={{ fontSize: 20 }} />
                        )}
                        <Typography variant="caption" color="text.secondary">
                            {data.delivered} / {data.required}
                        </Typography>
                    </Paper>
                );
            })}
        </Box>
    );
}
