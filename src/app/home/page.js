"use client";

import React, { useMemo, useRef, useState } from "react";
import KPICards from "../erp-dashboard/components/KPICards";
import PipelineBoard from "../erp-dashboard/components/PipelineBoard";
import AlertPanel from "../erp-dashboard/components/AlertPanel";
import OrdersTable from "../erp-dashboard/components/OrdersTable";
import AnalyticsCharts from "../erp-dashboard/components/AnalyticsCharts";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import OrderListFilterPanel, {
    EMPTY_VALUES as ORDER_FILTER_EMPTY_VALUES,
} from "@/components/common/OrderListFilterPanel";
import { IconCalendar, IconRefresh, IconFilter } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DATE_PRESETS = [
    { label: "Today", fn: () => { const d = new Date().toISOString().split("T")[0]; return { order_date_from: d, order_date_to: d }; } },
    { label: "This Week", fn: () => { const n = new Date(), dy = n.getDay(), m = new Date(n); m.setDate(n.getDate() - (dy === 0 ? 6 : dy - 1)); const e = new Date(m); e.setDate(m.getDate() + 6); return { order_date_from: m.toISOString().split("T")[0], order_date_to: e.toISOString().split("T")[0] }; } },
    { label: "This Month", fn: () => { const n = new Date(); return { order_date_from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0], order_date_to: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0] }; } },
    { label: "Last 30 Days", fn: () => { const d = new Date(), p = new Date(); p.setDate(p.getDate() - 30); return { order_date_from: p.toISOString().split("T")[0], order_date_to: d.toISOString().split("T")[0] }; } },
    { label: "Last 6M", fn: () => { const n = new Date(), p = new Date(n); p.setMonth(n.getMonth() - 6); return { order_date_from: p.toISOString().split("T")[0], order_date_to: n.toISOString().split("T")[0] }; } },
    { label: "This Year", fn: () => { const n = new Date(); return { order_date_from: new Date(n.getFullYear(), 0, 1).toISOString().split("T")[0], order_date_to: new Date(n.getFullYear(), 11, 31).toISOString().split("T")[0] }; } },
];

const DEFAULT_DATE_PRESET_LABEL = "Last 6M";

function getInitialHomeFilters() {
    const preset = DATE_PRESETS.find((p) => p.label === DEFAULT_DATE_PRESET_LABEL);
    const dates = preset ? preset.fn() : { order_date_from: "", order_date_to: "" };
    return {
        ...ORDER_FILTER_EMPTY_VALUES,
        ...dates,
        status: "confirmed",
        current_stage_key: "",
    };
}

/** Maps dashboard filters to API `kpi_scope` and KPI strip layout. */
export function deriveHomeKpiScope(filters) {
    const stage = String(filters?.current_stage_key ?? "").trim();
    const st = filters?.status;
    if (stage === "payment_outstanding") return "completed";
    const customStage = stage && stage !== "order_completed";
    if (customStage) return "all";
    if (st === "pending" && !stage) return "pending";
    if (st === "confirmed" && !stage) return "active";
    if (st === "all" && stage === "order_completed") return "completed";
    if (st === "cancelled" && !stage) return "cancelled";
    if (st === "all" && !stage) return "all";
    return "all";
}

export function DashboardPageContent({ dashboardApiBase = "/order" }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filters, setFilters] = useState(getInitialHomeFilters());
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const [activePreset, setActivePreset] = useState(DEFAULT_DATE_PRESET_LABEL);
    const filterPanelRef = useRef(null);
    const ordersTableSectionRef = useRef(null);

    const handleOpenDrawer = (order) => {
        setSelectedOrder(order);
        setDrawerOpen(true);
    };

    const handleApplyFilters = (next) => {
        setFilters((prev) => ({ ...ORDER_FILTER_EMPTY_VALUES, ...prev, ...(next || {}) }));
        setFilterPanelOpen(false);
        setActivePreset(null);
    };

    const handleClearFilters = () => {
        setFilters(getInitialHomeFilters());
        setActivePreset(DEFAULT_DATE_PRESET_LABEL);
    };

    const handlePreset = (preset) => {
        const dates = preset.fn();
        setFilters((prev) => ({ ...prev, ...dates }));
        setActivePreset(preset.label);
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

    const handleCardClick = (payload) => {
        handleApplyFilters({ ...payload });
        if (payload?.current_stage_key === "payment_outstanding" && ordersTableSectionRef.current) {
            setTimeout(() => {
                ordersTableSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        }
    };

    const handleStageClick = (stageKey, payload) => {
        handleApplyFilters({ current_stage_key: stageKey });
    };

    const homeKpiScope = useMemo(() => deriveHomeKpiScope(filters), [filters]);
    const suppressPipelineAndAlerts =
        homeKpiScope === "pending" || homeKpiScope === "cancelled";

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Main Content Container - 1440px max width constrained layout for enterprise standard check */}
            <div className="mx-auto max-w-[1440px] px-3 py-3 pb-8 space-y-2.5">

                {/* Header Title + Inline Filter Panel */}
                <div ref={filterPanelRef}>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Operations Dashboard</h1>
                            <p className="text-[11px] text-slate-500">
                                Enterprise view of solar pipeline, orders, and fulfillment.
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                Status:
                            </span>
                            {[
                                {
                                    value: "pending",
                                    label: "Pending",
                                    payload: { status: "pending", current_stage_key: "" },
                                },
                                {
                                    value: "active",
                                    label: "Active",
                                    payload: { status: "confirmed", current_stage_key: "" },
                                },
                                {
                                    value: "completed",
                                    label: "Completed",
                                    payload: { status: "all", current_stage_key: "order_completed" },
                                },
                                {
                                    value: "cancelled",
                                    label: "Cancelled",
                                    payload: { status: "cancelled", current_stage_key: "" },
                                },
                                {
                                    value: "all",
                                    label: "All",
                                    payload: { status: "all", current_stage_key: "" },
                                },
                            ].map((s) => {
                                const stage = String(filters.current_stage_key ?? "").trim();
                                const st = filters.status;
                                const isAllTab = s.value === "all";
                                const isSelected = isAllTab
                                    ? st === "all" && !stage
                                    : s.value === "pending"
                                      ? st === "pending" && !stage
                                      : s.value === "active"
                                        ? st === "confirmed" && !stage
                                        : s.value === "cancelled"
                                          ? st === "cancelled" && !stage
                                          : st === "all" && stage === "order_completed";
                                return (
                                    <button
                                        key={s.value}
                                        onClick={() => handleApplyFilters(s.payload)}
                                        className={[
                                            "text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all",
                                            isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-white border-slate-200 text-slate-500 hover:border-primary hover:text-primary",
                                        ].join(" ")}
                                    >
                                        {s.label}
                                    </button>
                                );
                            })}
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 ml-1">
                                <IconCalendar size={11} /> Quick:
                            </span>
                            {DATE_PRESETS.map((p) => (
                                <button
                                    key={p.label}
                                    onClick={() => handlePreset(p)}
                                    className={[
                                        "text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all",
                                        activePreset === p.label
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-white border-slate-200 text-slate-500 hover:border-primary hover:text-primary",
                                    ].join(" ")}
                                >
                                    {p.label}
                                </button>
                            ))}
                            <div className="h-4 w-px bg-slate-200 mx-0.5" />
                            <Button size="sm" variant="outline" onClick={handleClearFilters} className="h-7 text-xs gap-1 px-2">
                                <IconRefresh size={11} /> Reset
                            </Button>
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

                {!suppressPipelineAndAlerts && (
                    <AlertPanel filters={filters} dashboardApiBase={dashboardApiBase} />
                )}

                <KPICards
                    filters={filters}
                    dashboardApiBase={dashboardApiBase}
                    onCardClick={handleCardClick}
                    kpiScope={homeKpiScope}
                />

                {!suppressPipelineAndAlerts && (
                    <div className="pt-1">
                        <PipelineBoard
                            filters={filters}
                            onOrderSelect={handleOpenDrawer}
                            onStageClick={handleStageClick}
                            dashboardApiBase={dashboardApiBase}
                        />
                    </div>
                )}

                {/* CSS Grid for 12 columns layout to hold main content below */}
                {/* Section 5 & 4 */}
                <div className="grid grid-cols-12 gap-3 pt-1">

                    {/* Section 5 - Analytics Section (Spans 12 columns by default, nested grid inside) */}
                    <div className="col-span-12">
                        <AnalyticsCharts filters={filters} dashboardApiBase={dashboardApiBase} />
                    </div>

                    {/* Section 4 - Orders Table (Data Heavy) */}
                    <div className="col-span-12" ref={ordersTableSectionRef}>
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
