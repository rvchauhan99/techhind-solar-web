import React, { useEffect, useState } from "react";
import { IconFilter, IconDownload } from "@tabler/icons-react";
import ordersDashboardService from "@/services/ordersDashboardService";
import Loader from "@/components/common/Loader";

const getStageBadgeColor = (stage) => {
    if (!stage) return "bg-slate-100 text-slate-700 border-slate-200";
    if (stage === "order_completed" || String(stage).includes("order_completed")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (stage.includes("Estimate")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (stage.includes("Netmeter") || stage.includes("Subsidy")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (stage.includes("Install") || stage.includes("Fabric")) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
};

const formatStageLabel = (key) => {
    if (key === "order_completed") return "Order Completed";
    if (!key) return "—";
    return key
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
};

const getDeliveryBadgeColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "complete" || s === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "partial") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
};

const formatDeliveryStatus = (value) => {
    const s = String(value || "").trim().toLowerCase();
    if (!s) return "Pending";
    return s.charAt(0).toUpperCase() + s.slice(1);
};

const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN");
};

const PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 25, 50, 100];

function SortableTh({ label, column, sortBy, sortOrder, onSort, align = "left" }) {
    const active = sortBy === column;
    return (
        <th
            onClick={() => onSort(column)}
            className={[
                "px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700",
                align === "right" ? "text-right" : "text-left",
            ].join(" ")}
        >
            <span className={`inline-flex items-center gap-1 ${align === "right" ? "w-full justify-end" : ""}`}>
                {label}
                <span className={`text-[10px] ${active ? "text-slate-700" : "text-slate-300"}`}>
                    {active ? (sortOrder === "ASC" ? "▲" : "▼") : "⇅"}
                </span>
            </span>
        </th>
    );
}

export default function OrdersTable({ filters, onRowClick, onOpenFilter, dashboardApiBase }) {
    const [orders, setOrders] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
    const [loading, setLoading] = useState(false);
    const [limit, setLimit] = useState(PAGE_SIZE);
    const [sortBy, setSortBy] = useState("id");
    const [sortOrder, setSortOrder] = useState("DESC");

    const loadOrders = (page = 1, overrides = {}) => {
        const activeLimit = overrides.limit ?? limit;
        const activeSortBy = overrides.sortBy ?? sortBy;
        const activeSortOrder = overrides.sortOrder ?? sortOrder;
        setLoading(true);
        ordersDashboardService
            .getOrdersDashboardOrders(
                {
                    ...filters,
                    page,
                    limit: activeLimit,
                    sortBy: activeSortBy,
                    sortOrder: activeSortOrder,
                },
                dashboardApiBase
            )
            .then((res) => {
                const payload = res?.result || res?.data || res || {};
                const rows = Array.isArray(payload.data) ? payload.data : payload.rows || [];
                const m = payload.meta || {};
                setOrders(rows);
                setMeta({
                    page: m.page || page,
                    limit: m.limit || activeLimit,
                    total: m.total ?? rows.length,
                    pages: m.pages ?? 1,
                });
            })
            .catch(() => {
                setOrders([]);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        loadOrders(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(filters), dashboardApiBase]);

    const handleSort = (column) => {
        const nextSortOrder = sortBy === column && sortOrder === "ASC" ? "DESC" : "ASC";
        setSortBy(column);
        setSortOrder(nextSortOrder);
        setMeta((prev) => ({ ...prev, page: 1 }));
        loadOrders(1, { sortBy: column, sortOrder: nextSortOrder });
    };

    const handlePageSizeChange = (value) => {
        const nextLimit = Number(value) || PAGE_SIZE;
        setLimit(nextLimit);
        setMeta((prev) => ({ ...prev, page: 1, limit: nextLimit }));
        loadOrders(1, { limit: nextLimit });
    };

    const goToPage = (nextPage) => {
        if (nextPage < 1 || nextPage > (meta.pages || 1) || nextPage === meta.page) return;
        setMeta((prev) => ({ ...prev, page: nextPage }));
        loadOrders(nextPage);
    };

    const handleExport = async () => {
        try {
            const params = {
                ...filters,
                sortBy,
                sortOrder,
            };
            const blob = await ordersDashboardService.exportOrders(params);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const a = document.createElement("a");
            const today = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `orders-${today}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            // silenced; can be wired to toast if available
            // eslint-disable-next-line no-console
            console.error("Failed to export orders", err);
        }
    };
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full w-full">
            {/* Table Header Controls */}
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Active Orders</h2>
                    <p className="text-sm text-slate-500 hidden sm:block">Manage and track all ongoing solar projects</p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        onClick={() => onOpenFilter?.()}
                    >
                        <IconFilter className="w-4 h-4" />
                        <span>Filter</span>
                    </button>
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        onClick={handleExport}
                        disabled={loading || meta.total === 0}
                    >
                        <IconDownload className="w-4 h-4" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Table Container - Handle overflow carefully */}
            <div className="relative overflow-x-auto w-full min-h-[200px]">
                {loading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80">
                        <Loader />
                    </div>
                )}
                <table className="w-full text-left border-collapse min-w-[1150px]">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                            <SortableTh label="Order No" column="order_number" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch</th>
                            <SortableTh label="Capacity" column="capacity" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} align="right" />
                            <SortableTh label="Project Cost" column="project_cost" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} align="right" />
                            <SortableTh label="Current Stage" column="current_stage_key" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                            <SortableTh label="Delivery" column="delivery_status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                            <SortableTh label="Order Date" column="order_date" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                            <SortableTh label="Last Action Date" column="updated_at" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {(orders || []).map((order) => {
                            const stageLabel = order.current_stage_key || "—";
                            const displayStageLabel = formatStageLabel(order.current_stage_key) || "—";
                            const deliveryStatus = formatDeliveryStatus(order.delivery_status);

                            return (
                            <tr
                                key={order.id}
                                className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                onClick={() => onRowClick(order)}
                            >
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className="font-semibold text-blue-600 text-sm">
                                        {order.order_number}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-sm font-medium text-slate-800">
                                        {order.customer_name || "—"}
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                                    {order.branch_name || "—"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-700 text-right">
                                    {order.capacity != null
                                        ? `${Number(order.capacity).toFixed(1)} kW`
                                        : "—"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 text-right">
                                    {order.project_cost != null
                                        ? `₹${(order.project_cost / 100000).toFixed(2)} L`
                                        : "—"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${getStageBadgeColor(stageLabel)}`}>
                                        {displayStageLabel}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border uppercase tracking-wide ${getDeliveryBadgeColor(deliveryStatus)}`}>
                                        {deliveryStatus}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-slate-600">{formatDate(order.order_date)}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-slate-600">{formatDate(order.updated_at)}</div>
                                </td>
                            </tr>
                            );
                        })}
                        {!loading && (orders || []).length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">
                                    No orders found for the selected filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap mt-auto">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                    <label className="flex items-center gap-1.5">
                        <span>Show</span>
                        <select
                            value={limit}
                            onChange={(e) => handlePageSizeChange(e.target.value)}
                            className="border border-slate-200 rounded-md bg-white px-2 py-1 text-sm text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {PAGE_SIZE_OPTIONS.map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <span>entries</span>
                    </label>
                    <span className="hidden sm:inline">
                        {meta.total === 0
                            ? "0 of 0 entries"
                            : `Showing ${(meta.page - 1) * meta.limit + 1} to ${Math.min(
                                  meta.page * meta.limit,
                                  meta.total
                              )} of ${meta.total} entries`}
                    </span>
                </div>
                <div className="flex gap-1">
                    <button
                        className="px-3 py-1 text-sm border border-slate-200 rounded-md bg-white text-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"
                        disabled={meta.page <= 1}
                        onClick={() => goToPage(meta.page - 1)}
                    >
                        Prev
                    </button>
                    <button className="px-3 py-1 text-sm border border-blue-600 rounded-md bg-blue-600 text-white font-medium">
                        {meta.page}
                    </button>
                    <button
                        className="px-3 py-1 text-sm border border-slate-200 rounded-md bg-white text-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"
                        disabled={meta.page >= (meta.pages || 1)}
                        onClick={() => goToPage(meta.page + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
