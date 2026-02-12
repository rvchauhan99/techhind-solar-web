"use client";

import { Box } from "@mui/material";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import PreviousChallans from "./PreviousChallans";

export default function NewChallanForm({ orderId }) {
    const router = useRouter();

    const handleCreateClick = () => {
        if (!orderId) return;
        router.push(`/delivery-challans/new?order_id=${orderId}`);
    };

    return (
        <Box sx={{ height: "calc(100vh - 390px)", overflowY: "auto" }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", mb: 0.75 }}>
                <Button size="sm" onClick={handleCreateClick}>
                    Create Delivery Challan
                </Button>
            </Box>

            <PreviousChallans orderId={orderId} />
        </Box>
    );
}


