"use client";

import { useState } from "react";
import { Box, Tabs, Tab, Paper } from "@mui/material";
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

    const handleChallanCreated = () => {
        // Refresh delivery status cards
        setRefreshKey(prev => prev + 1);

        // Refresh order data to update pipeline stages
        if (onRefresh) {
            onRefresh();
        }

        // Redirect to fabrication tab (index 4 in parent tabs)
        if (onTabChange) {
            onTabChange(4);
        }
    };

    return (
        <Box>
            {/* Delivery Status Cards */}
            <DeliveryStatusCards orderId={orderId} key={refreshKey} />

            {/* <Paper> */}
            <Tabs value={activeTab} onChange={handleTabChange}>
                {!isReadOnly && <Tab label="New Challan" />}
                <Tab label="Previous Challans" />
            </Tabs>
            {/* </Paper> */}

            {!isReadOnly && (
                <TabPanel value={activeTab} index={0}>
                    <NewChallanComponent
                        orderId={orderId}
                        orderData={orderData}
                        onChallanCreated={handleChallanCreated}
                    />
                </TabPanel>
            )}

            <TabPanel value={activeTab} index={isReadOnly ? 0 : 1}>
                <PreviousChallansComponent orderId={orderId} />
            </TabPanel>
        </Box>
    );
}
