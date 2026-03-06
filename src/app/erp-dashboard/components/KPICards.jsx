import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    IconShoppingCart,
    IconCurrencyRupee,
    IconTool,
    IconBolt,
    IconReceipt,
    IconTruckDelivery,
    IconCircleCheck,
    IconAlertTriangle,
} from "@tabler/icons-react";
import ordersDashboardService from "@/services/ordersDashboardService";

const formatLakh = (n) => `₹${(Number(n) / 100000).toFixed(2)} L`;

export default function KPICards({ filters, dashboardApiBase, onCardClick }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        ordersDashboardService
            .getOrdersDashboardKpis(filters || {}, dashboardApiBase)
            .then((res) => {
                if (!isMounted) return;
                setData(res?.result || res?.data || res || {});
            })
            .catch(() => {
                if (!isMounted) return;
                setData(null);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, [filters, dashboardApiBase]);

    const active = data?.active || {};
    const completed = data?.completed || {};
    const byStage = data?.by_stage || [];
    const byDelivery = data?.by_delivery_status || [];
    const redFlag = Number(data?.red_flag_payment_outstanding ?? 0);
    const netmeterPending = byStage.find((s) => s.current_stage_key === "netmeter_apply")?.count ?? 0;
    const subsidyPending = byStage.find((s) => s.current_stage_key === "subsidy_claim")?.count ?? 0;
    const deliveryPartial = byDelivery.find((d) => d.delivery_status === "partial")?.count ?? 0;

    const activeOrders = Number(active.total_orders ?? 0);
    const activeValue = Number(active.total_project_cost ?? 0);
    const activeCapacity = Number(active.total_capacity_kw ?? 0);
    const completedOrders = Number(completed.total_orders ?? 0);
    const completedValue = Number(completed.total_project_cost ?? 0);
    const completedCapacity = Number(completed.total_capacity_kw ?? 0);

    const cardClass = (clickable) =>
        `rounded-xl shadow-sm border-slate-200 bg-white transition-all ${clickable ? "cursor-pointer hover:shadow-md hover:border-primary/30" : ""} ${loading ? "animate-pulse" : ""}`;

    const handleClick = (filterPayload) => {
        if (onCardClick && filterPayload) onCardClick(filterPayload);
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 h-auto">
                <Card className={cardClass(!!onCardClick)} onClick={() => handleClick({ status: "active" })}>
                    <CardContent className="p-3 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-medium text-slate-500">Active Orders</span>
                            <div className="p-1 bg-blue-50 rounded-lg">
                                <IconShoppingCart className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                        <div className="mt-2">
                            <span className={`text-xl font-bold text-slate-900 ${loading ? "opacity-80" : ""}`}>
                                {loading ? "…" : String(activeOrders)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Card className={cardClass(!!onCardClick)} onClick={() => handleClick({ status: "active" })}>
                    <CardContent className="p-3 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-medium text-slate-500">Active Value</span>
                            <div className="p-1 bg-emerald-50 rounded-lg">
                                <IconCurrencyRupee className="w-5 h-5 text-emerald-600" />
                            </div>
                        </div>
                        <div className="mt-2">
                            <span className={`text-lg font-bold text-slate-900 ${loading ? "opacity-80" : ""}`}>
                                {loading ? "…" : formatLakh(activeValue)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Card className={cardClass(!!onCardClick)} onClick={() => handleClick({ status: "active" })}>
                    <CardContent className="p-3 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-medium text-slate-500">Active Capacity</span>
                            <div className="p-1 bg-amber-50 rounded-lg">
                                <IconTool className="w-5 h-5 text-amber-500" />
                            </div>
                        </div>
                        <div className="mt-2">
                            <span className={`text-xl font-bold text-slate-900 ${loading ? "opacity-80" : ""}`}>
                                {loading ? "…" : `${activeCapacity.toFixed(1)} kW`}
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Card className={cardClass(!!onCardClick)} onClick={() => handleClick({ status: "completed" })}>
                    <CardContent className="p-3 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-medium text-slate-500">Completed Orders</span>
                            <div className="p-1 bg-slate-100 rounded-lg">
                                <IconCircleCheck className="w-5 h-5 text-slate-600" />
                            </div>
                        </div>
                        <div className="mt-2">
                            <span className={`text-xl font-bold text-slate-900 ${loading ? "opacity-80" : ""}`}>
                                {loading ? "…" : String(completedOrders)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Card className={cardClass(!!onCardClick)} onClick={() => handleClick({ status: "completed" })}>
                    <CardContent className="p-3 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-medium text-slate-500">Completed Value</span>
                            <div className="p-1 bg-slate-100 rounded-lg">
                                <IconCurrencyRupee className="w-5 h-5 text-slate-600" />
                            </div>
                        </div>
                        <div className="mt-2">
                            <span className={`text-lg font-bold text-slate-900 ${loading ? "opacity-80" : ""}`}>
                                {loading ? "…" : formatLakh(completedValue)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Card className={cardClass(!!onCardClick)} onClick={() => handleClick({ status: "completed" })}>
                    <CardContent className="p-3 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-medium text-slate-500">Completed Capacity</span>
                            <div className="p-1 bg-slate-100 rounded-lg">
                                <IconTool className="w-5 h-5 text-slate-600" />
                            </div>
                        </div>
                        <div className="mt-2">
                            <span className={`text-xl font-bold text-slate-900 ${loading ? "opacity-80" : ""}`}>
                                {loading ? "…" : `${completedCapacity.toFixed(1)} kW`}
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Card className={cardClass(!!onCardClick)} onClick={() => handleClick({ current_stage_key: "payment_outstanding", status: "completed" })}>
                    <CardContent className="p-3 flex flex-col justify-between h-full border-l-4 border-l-red-400 bg-red-50/50">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-medium text-red-800">Payment Outstanding (Completed)</span>
                            <div className="p-1 bg-red-100 rounded-lg">
                                <IconAlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                        </div>
                        <div className="mt-2">
                            <span className={`text-xl font-bold text-red-900 ${loading ? "opacity-80" : ""}`}>
                                {loading ? "…" : String(redFlag)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <Card className={cardClass(false)}>
                    <CardContent className="p-2.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Netmeter Pending</span>
                        <span className="text-sm font-bold text-violet-700">{loading ? "…" : netmeterPending}</span>
                        <IconBolt className="w-4 h-4 text-violet-500" />
                    </CardContent>
                </Card>
                <Card className={cardClass(false)}>
                    <CardContent className="p-2.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Subsidy Pending</span>
                        <span className="text-sm font-bold text-rose-700">{loading ? "…" : subsidyPending}</span>
                        <IconReceipt className="w-4 h-4 text-rose-500" />
                    </CardContent>
                </Card>
                <Card className={cardClass(false)}>
                    <CardContent className="p-2.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Delivery Partial</span>
                        <span className="text-sm font-bold text-cyan-700">{loading ? "…" : deliveryPartial}</span>
                        <IconTruckDelivery className="w-4 h-4 text-cyan-500" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
