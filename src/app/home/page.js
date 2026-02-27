"use client";

import React, { useRef, useState } from "react";
import KPICards from "../erp-dashboard/components/KPICards";
import PipelineBoard from "../erp-dashboard/components/PipelineBoard";
import AlertPanel from "../erp-dashboard/components/AlertPanel";
import OrdersTable from "../erp-dashboard/components/OrdersTable";
import AnalyticsCharts from "../erp-dashboard/components/AnalyticsCharts";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import OrderListFilterPanel, {
    EMPTY_VALUES as ORDER_FILTER_EMPTY_VALUES,
} from "@/components/common/OrderListFilterPanel";

export function DashboardPageContent({ dashboardApiBase = "/order" }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filters, setFilters] = useState({ ... ORDER_FILTER_EMPTY_VALUES });
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef(null);

    const handleOpenDrawer = (order) => {
        setSelectedOrder(order);
        setDrawerOpen(true);
    };

    const handleApplyFilters = (next) => {
        setFilters({ ...ORDER_FILTER_EMPTY_VALUES, ...(next || {}) });
        setFilterPanelOpen(false);
    };

    const handleClearFilters = () => {
        setFilters({ ...ORDER_FILTER_EMPTY_VALUES });
    };

    const handleOpenFilterFromTable = () => {
        setFilterPanelOpen(true);
        if (filterPanelRef.current) {
            filterPanelRef.current.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Main Content Container - 1440px max width constrained layout for enterprise standard check */}
            <div className="mx-auto max-w-[1440px] px-6 py-6 pb-20 space-y-6">

                {/* Header Title + Inline Filter Panel */}
                <div ref={filterPanelRef}>
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Operations Dashboard</h1>
                            <p className="text-sm text-slate-500 mt-1">
                                Enterprise view of solar pipeline, orders, and fulfillment.
                            </p>
                        </div>
                    </div>

                    <OrderListFilterPanel
                        open={filterPanelOpen}
                        onToggle={setFilterPanelOpen}
                        values={filters}
                        onApply={handleApplyFilters}
                        onClear={handleClearFilters}
                        defaultOpen={false}
                    />
                </div>

                {/* Section 3 - Critical Alert Panel (Placed high for visibility) */}
                <AlertPanel filters={filters} dashboardApiBase={dashboardApiBase} />

                {/* Section 1 - Top KPI Strip */}
                <KPICards filters={filters} dashboardApiBase={dashboardApiBase} />

                {/* Section 2 - Order Pipeline Board */}
                <div className="pt-2">
                    <PipelineBoard filters={filters} onOrderSelect={handleOpenDrawer} dashboardApiBase={dashboardApiBase} />
                </div>

                {/* CSS Grid for 12 columns layout to hold main content below */}
                {/* Section 5 & 4 */}
                <div className="grid grid-cols-12 gap-6 pt-2">

                    {/* Section 5 - Analytics Section (Spans 12 columns by default, nested grid inside) */}
                    <div className="col-span-12">
                        <AnalyticsCharts filters={filters} dashboardApiBase={dashboardApiBase} />
                    </div>

                    {/* Section 4 - Orders Table (Data Heavy) */}
                    <div className="col-span-12">
                        <OrdersTable
                            filters={filters}
                            onRowClick={handleOpenDrawer}
                            onOpenFilter={handleOpenFilterFromTable}
                            dashboardApiBase={dashboardApiBase}
                        />
                    </div>

                </div>
            </div>

            {/* Order Details Drawer */}
            <OrderDetailsDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                order={selectedOrder}
            />
        </div>
    );
}

export default function HomePage() {
    return <DashboardPageContent dashboardApiBase="/home" />;
}
