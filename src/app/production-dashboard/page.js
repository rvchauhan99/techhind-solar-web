"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    IconAlertTriangle,
    IconClipboardList,
    IconCoin,
    IconPackage,
    IconRecycle,
    IconTool,
} from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ChartCard from "@/components/common/ChartCard";
import StatCard from "@/components/common/StatCard";
import Loader from "@/components/common/Loader";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import { Button } from "@/components/ui/button";
import companyService from "@/services/companyService";
import productService from "@/services/productService";
import productionDashboardService from "@/services/productionDashboardService";
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";
import { getApiErrorMessage } from "@/utils/toast";
import SerialGenealogyPanel from "./components/SerialGenealogyPanel";

const REJECTION_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#a3a3a3", "#6366f1"];

const money = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const firstDayOfMonthsAgo = (months) => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    date.setDate(1);
    return date.toISOString().split("T")[0];
};

const today = () => new Date().toISOString().split("T")[0];

function ProductionDashboardContent() {
    const [filters, setFilters] = useState({
        warehouse_id: "",
        fg_product_id: "",
        start_date: firstDayOfMonthsAgo(5),
        end_date: today(),
    });
    const [warehouses, setWarehouses] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadWarehouses = async () => {
            try {
                const profileRes = await companyService.getCompanyProfile();
                const companyId = (profileRes?.result || profileRes?.data || profileRes)?.id;
                if (!companyId) return;
                const res = await companyService.listWarehouses(parseInt(companyId, 10));
                const list = res?.result || res?.data || res || [];
                setWarehouses(Array.isArray(list) ? list : []);
            } catch (err) {
                console.error("Failed to load warehouses", err);
            }
        };
        loadWarehouses();
    }, []);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await productionDashboardService.getProductionDashboard({
                warehouse_id: filters.warehouse_id || undefined,
                fg_product_id: filters.fg_product_id || undefined,
                start_date: filters.start_date || undefined,
                end_date: filters.end_date || undefined,
            });
            setDashboard(response?.result || response);
        } catch (err) {
            setError(getApiErrorMessage(err, "Failed to load the production dashboard"));
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const handleFilterChange = (name, value) => {
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const kpi = dashboard?.kpi || {};

    const warehouseChartData = useMemo(
        () =>
            (dashboard?.warehouse_wise || []).map((row) => ({
                name: row.warehouse_name,
                Good: row.good_quantity,
                Rejected: row.rejected_quantity,
                Value: row.production_value,
            })),
        [dashboard]
    );

    const topProductData = useMemo(
        () =>
            (dashboard?.top_products || []).map((row) => ({
                name: row.product_name,
                Good: row.good_quantity,
                Rejected: row.rejected_quantity,
            })),
        [dashboard]
    );

    const rejectionData = useMemo(
        () =>
            (dashboard?.rejection_reasons || []).map((row) => ({
                name: row.reason,
                value: row.rejected_quantity,
            })),
        [dashboard]
    );

    const trendData = useMemo(
        () =>
            (dashboard?.monthly_trend || []).map((row) => ({
                name: row.period,
                Good: row.good_quantity,
                Rejected: row.rejected_quantity,
                Value: row.production_value,
            })),
        [dashboard]
    );

    const varianceRows = dashboard?.component_variance || [];

    return (
        <div className="flex flex-col gap-2 p-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="text-lg font-semibold leading-tight">Production Dashboard</h1>
                    <p className="text-xs text-muted-foreground">
                        Warehouse-wise output, rejection analysis and consumption variance from posted bookings.
                    </p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4 sm:min-w-[720px]">
                    <AutocompleteField
                        label="Warehouse"
                        placeholder="All warehouses"
                        options={warehouses}
                        getOptionLabel={(w) => w?.name ?? String(w?.id ?? "")}
                        value={warehouses.find((w) => w.id === parseInt(filters.warehouse_id, 10)) || null}
                        onChange={(e, newValue) => handleFilterChange("warehouse_id", newValue?.id ?? "")}
                    />
                    <AutocompleteField
                        label="Finished Good"
                        placeholder="All products"
                        options={[]}
                        usePortal
                        asyncLoadOptions={async (q) => {
                            const res = await productService.getProducts({
                                q: q || undefined,
                                limit: 20,
                                visibility: "active",
                            });
                            const data = res?.result?.data ?? res?.data ?? [];
                            return Array.isArray(data) ? data : [];
                        }}
                        getOptionLabel={(p) => formatProductAutocompleteLabel(p) || String(p?.id ?? "")}
                        value={filters.fg_product_id ? { id: parseInt(filters.fg_product_id, 10) } : null}
                        onChange={(e, newValue) => handleFilterChange("fg_product_id", newValue?.id ?? "")}
                    />
                    <DateField
                        name="start_date"
                        label="From"
                        value={filters.start_date}
                        onChange={(e) => handleFilterChange("start_date", e.target.value)}
                    />
                    <DateField
                        name="end_date"
                        label="To"
                        value={filters.end_date}
                        onChange={(e) => handleFilterChange("end_date", e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                    {error}
                    <Button type="button" size="sm" variant="outline" className="ml-2 h-7" onClick={loadDashboard}>
                        Retry
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
                <StatCard
                    icon={<IconClipboardList size={18} />}
                    label="Open Orders"
                    value={kpi.open_orders ?? 0}
                    accentColor="#3b82f6"
                    subLabel={`${kpi.draft_orders ?? 0} draft · ${kpi.completed_orders ?? 0} completed`}
                    loading={loading}
                />
                <StatCard
                    icon={<IconTool size={18} />}
                    label="WIP Quantity"
                    value={kpi.wip_quantity ?? 0}
                    accentColor="#8b5cf6"
                    subLabel={`Planned ${kpi.planned_quantity ?? 0}`}
                    loading={loading}
                />
                <StatCard
                    icon={<IconPackage size={18} />}
                    label="Good Produced"
                    value={kpi.good_quantity ?? 0}
                    accentColor="#10b981"
                    subLabel={`${kpi.booking_count ?? 0} posted bookings`}
                    loading={loading}
                />
                <StatCard
                    icon={<IconAlertTriangle size={18} />}
                    label="Rejected"
                    value={kpi.rejected_quantity ?? 0}
                    accentColor="#ef4444"
                    valueColor={kpi.rejected_quantity > 0 ? "#dc2626" : undefined}
                    subLabel={`${kpi.rejection_percent ?? 0}% of output`}
                    loading={loading}
                />
                <StatCard
                    icon={<IconCoin size={18} />}
                    label="Production Value"
                    value={money(kpi.production_value)}
                    accentColor="#f59e0b"
                    subLabel={`Avg unit cost ${money(kpi.avg_unit_cost)}`}
                    loading={loading}
                />
                <StatCard
                    icon={<IconRecycle size={18} />}
                    label="Component Scrap"
                    value={kpi.scrap_quantity ?? 0}
                    accentColor="#64748b"
                    subLabel={`Value ${money(kpi.scrap_value)}`}
                    loading={loading}
                />
            </div>

            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                <ChartCard
                    title="Warehouse-wise Output"
                    subtitle="Good vs rejected quantity per production warehouse"
                    height={260}
                    loading={loading}
                    isEmpty={!loading && warehouseChartData.length === 0}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={warehouseChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="Good" fill="#10b981" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Rejected" fill="#ef4444" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                    title="Warehouse-wise Production Value"
                    subtitle="Total cost of finished goods received"
                    height={260}
                    loading={loading}
                    isEmpty={!loading && warehouseChartData.length === 0}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={warehouseChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value) => money(value)} />
                            <Bar dataKey="Value" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                    title="Top Finished Goods Produced"
                    subtitle="Highest good quantity in the selected period"
                    height={260}
                    loading={loading}
                    isEmpty={!loading && topProductData.length === 0}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={topProductData}
                            layout="vertical"
                            margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="Good" fill="#10b981" radius={[0, 3, 3, 0]} />
                            <Bar dataKey="Rejected" fill="#ef4444" radius={[0, 3, 3, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                    title="Rejection Reasons"
                    subtitle="Rejected quantity grouped by reason"
                    height={260}
                    loading={loading}
                    isEmpty={!loading && rejectionData.length === 0}
                    emptyText="No rejections recorded for the selected filters."
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={rejectionData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={(entry) => `${entry.name}: ${entry.value}`}
                                labelLine={false}
                            >
                                {rejectionData.map((entry, index) => (
                                    <Cell
                                        key={entry.name}
                                        fill={REJECTION_COLORS[index % REJECTION_COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                    title="Monthly Production Trend"
                    subtitle="Output quantity and production value by month"
                    height={260}
                    loading={loading}
                    isEmpty={!loading && trendData.length === 0}
                    className="xl:col-span-2"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="qty" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="value" orientation="right" tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line yAxisId="qty" type="monotone" dataKey="Good" stroke="#10b981" strokeWidth={2} />
                            <Line
                                yAxisId="qty"
                                type="monotone"
                                dataKey="Rejected"
                                stroke="#ef4444"
                                strokeWidth={2}
                            />
                            <Line
                                yAxisId="value"
                                type="monotone"
                                dataKey="Value"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <h3 className="text-sm font-semibold leading-tight">Component Consumption Variance</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    Standard backflushed quantity versus what was actually consumed, valued at the issue rate.
                </p>
                {varianceRows.length === 0 ? (
                    <p className="py-3 text-xs text-muted-foreground">
                        No posted bookings for the selected filters.
                    </p>
                ) : (
                    <div className="mt-2 overflow-hidden rounded-md border border-border">
                        <table className="w-full text-xs">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-2 py-1 text-left font-semibold">Component</th>
                                    <th className="px-2 py-1 text-right font-semibold">Standard</th>
                                    <th className="px-2 py-1 text-right font-semibold">Consumed</th>
                                    <th className="px-2 py-1 text-right font-semibold">Scrap</th>
                                    <th className="px-2 py-1 text-right font-semibold">Variance Qty</th>
                                    <th className="px-2 py-1 text-right font-semibold">Variance Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {varianceRows.map((row) => (
                                    <tr key={row.product_id} className="border-t border-border">
                                        <td className="px-2 py-1">{row.product_name}</td>
                                        <td className="px-2 py-1 text-right">{row.standard_quantity}</td>
                                        <td className="px-2 py-1 text-right">{row.consumed_quantity}</td>
                                        <td className="px-2 py-1 text-right">{row.scrap_quantity}</td>
                                        <td className="px-2 py-1 text-right">
                                            <span
                                                className={
                                                    row.variance_quantity > 0
                                                        ? "font-semibold text-destructive"
                                                        : row.variance_quantity < 0
                                                            ? "font-semibold text-emerald-600"
                                                            : undefined
                                                }
                                            >
                                                {row.variance_quantity}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1 text-right">{money(row.variance_value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <SerialGenealogyPanel />
        </div>
    );
}

export default function ProductionDashboardPage() {
    return (
        <ProtectedRoute>
            <Suspense
                fallback={
                    <div className="flex min-h-[100vh] items-center justify-center">
                        <Loader />
                    </div>
                }
            >
                <ProductionDashboardContent />
            </Suspense>
        </ProtectedRoute>
    );
}
