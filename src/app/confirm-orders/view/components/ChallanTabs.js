"use client";

import { useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import { usePathname } from "next/navigation";
import DeliveryStatusCards from "./DeliveryStatusCards";

function TabPanel({ children, value, index }) {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ p: index == 1 ? 0 : 3 }}>{children}</Box>}
        </div>
    );
}

export default function ChallanTabs({ orderId, orderData, NewChallanComponent, PreviousChallansComponent, onTabChange, onRefresh }) {
    const [activeTab, setActiveTab] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);
    const pathname = usePathname();
    const isReadOnly = pathname?.startsWith("/closed-orders");

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Box>
            {/* Delivery Status Cards */}
            <DeliveryStatusCards orderId={orderId} key={refreshKey} />

            <Tabs value={activeTab} onChange={handleTabChange}>
                <Tab label="Challans" />
            </Tabs>
            <TabPanel value={activeTab} index={0}>
                <NewChallanComponent
                    orderId={orderId}
                    orderData={orderData}
                    onChallanCreated={() => {
                        // Refresh delivery status cards and order data when returning from challan page
                        setRefreshKey(prev => prev + 1);
                        if (onRefresh) {
                            onRefresh();
                        }
                    }}
                />
            </TabPanel>
        </Box>
    );
}
