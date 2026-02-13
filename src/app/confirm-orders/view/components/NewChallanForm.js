"use client";

import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import challanService from "@/services/challanService";
import { printChallanById } from "@/utils/challanPrintUtils";
import { toastError } from "@/utils/toast";
import PreviousChallans from "./PreviousChallans";

export default function NewChallanForm({ orderId }) {
    const router = useRouter();
    const [latestChallanId, setLatestChallanId] = useState(null);
    const [printing, setPrinting] = useState(false);

    useEffect(() => {
        const fetchLatestChallan = async () => {
            if (!orderId) {
                setLatestChallanId(null);
                return;
            }
            try {
                const response = await challanService.getChallans({
                    order_id: orderId,
                    page: 1,
                    limit: 1,
                    sortBy: "id",
                    sortOrder: "DESC",
                });
                const result = response?.result ?? response;
                const latest = Array.isArray(result?.data) && result.data.length > 0 ? result.data[0] : null;
                setLatestChallanId(latest?.id || null);
            } catch {
                setLatestChallanId(null);
            }
        };
        fetchLatestChallan();
    }, [orderId]);

    const handleCreateClick = () => {
        if (!orderId) return;
        router.push(`/delivery-challans/new?order_id=${orderId}`);
    };

    const handlePrintLatest = async () => {
        if (!latestChallanId) {
            toastError("No delivery challan found to print.");
            return;
        }
        setPrinting(true);
        try {
            await printChallanById(latestChallanId);
        } finally {
            setPrinting(false);
        }
    };

    return (
        <Box sx={{ height: "calc(100vh - 390px)", overflowY: "auto" }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1, mb: 0.75 }}>
                <Button size="sm" variant="outline" onClick={handlePrintLatest} disabled={printing}>
                    {printing ? "Printing..." : "Print Latest Challan"}
                </Button>
                <Button size="sm" onClick={handleCreateClick}>
                    Create Delivery Challan
                </Button>
            </Box>

            <PreviousChallans orderId={orderId} />
        </Box>
    );
}


