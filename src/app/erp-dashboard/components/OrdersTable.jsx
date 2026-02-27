import React, { useEffect, useState } from "react";
import { IconFilter, IconDownload } from "@tabler/icons-react";
import ordersDashboardService from "@/services/ordersDashboardService";

const getStageBadgeColor = (stage) => {
    if (stage.includes("Estimate")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (stage.includes("Netmeter") || stage.includes("Subsidy")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (stage.includes("Install") || stage.includes("Fabric")) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
};

const getDeliveryBadgeColor = (status) => {
    if (status === "Complete") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "Partial") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-red-50 text-red-700 border-red-200";
};

const PAGE_SIZE = 10;

export default function OrdersTable({ filters, onRowClick, onOpenFilter }) {
    const [orders, setOrders] = useState([]);
    const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
    const [loading, setLoading] = useState(false);

    const loadOrders = (page = 1) => {
        setLoading(true);
        ordersDashboardService
            .getOrdersDashboardOrders({
                ...filters,
                page,
                limit: meta.limit,
            })
            .then((res) => {
                const payload = res?.result || res?.data || res || {};
                const rows = Array.isArray(payload.data) ? payload.data : payload.rows || [];
                const m = payload.meta || {};
                setOrders(rows);
                setMeta({
                    page: m.page || page,
                    limit: m.limit || meta.limit,
                    total: m.total || rows.length,
                    pages: m.pages || 1,
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
    }, [JSON.stringify(filters)]);

    const handleExport = async () => {
        try {
            const params = {
                ...filters,
                page: meta.page,
                limit: meta.limit,
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
            <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order No</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Capacity</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Project Cost</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Stage</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {(orders || []).map((order) => {
                            const stageLabel = order.current_stage_key || "—";
                            const deliveryStatus =
                                (order.delivery_status || "").charAt(0).toUpperCase() +
                                (order.delivery_status || "").slice(1);
                            const dueDate = order.estimate_due_date || order.order_date || null;

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
                                        {stageLabel}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border uppercase tracking-wide ${getDeliveryBadgeColor(deliveryStatus)}`}>
                                        {deliveryStatus || "Pending"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-slate-600">
                                        {dueDate
                                            ? new Date(dueDate).toLocaleDateString("en-IN")
                                            : "—"}
                                    </div>
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between mt-auto">
                <span className="text-sm text-slate-500">
                    {meta.total === 0
                        ? "0 of 0 entries"
                        : `Showing ${(meta.page - 1) * meta.limit + 1} to ${Math.min(
                              meta.page * meta.limit,
                              meta.total
                          )} of ${meta.total} entries`}
                </span>
                <div className="flex gap-1">
                    <button
                        className="px-3 py-1 text-sm border border-slate-200 rounded-md bg-white text-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"
                        disabled={meta.page <= 1}
                        onClick={() => meta.page > 1 && loadOrders(meta.page - 1)}
                    >
                        Prev
                    </button>
                    <button className="px-3 py-1 text-sm border border-blue-600 rounded-md bg-blue-600 text-white font-medium">
                        {meta.page}
                    </button>
                    <button
                        className="px-3 py-1 text-sm border border-slate-200 rounded-md bg-white text-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"
                        disabled={meta.page >= meta.pages}
                        onClick={() => meta.page < meta.pages && loadOrders(meta.page + 1)}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
