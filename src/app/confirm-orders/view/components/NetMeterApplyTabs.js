"use client";

import { useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import { usePathname } from "next/navigation";
import NetMeterApplyForm from "./NetMeterApplyForm";
import PredefinedDocuments from "./PredefinedDocuments";

function TabPanel({ children, value, index }) {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ p: index == 1 ? 0 : 3 }}>{children}</Box>}
        </div>
    );
}

export default function NetMeterApplyTabs({ orderId, orderData, orderDocuments, onRefresh }) {
    const [tabValue, setTabValue] = useState(0);
    const pathname = usePathname();
    const isReadOnly = pathname?.startsWith("/closed-orders");

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    return (
        <Box sx={{ width: "100%" }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="Net Meter Apply" />
                    <Tab label="Predefined Documents" />
                </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
                <NetMeterApplyForm
                    orderId={orderId}
                    orderData={orderData}
                    orderDocuments={orderDocuments}
                    onSuccess={onRefresh}
                    readOnly={isReadOnly}
                />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                <PredefinedDocuments />
            </TabPanel>
        </Box>
    );
}
