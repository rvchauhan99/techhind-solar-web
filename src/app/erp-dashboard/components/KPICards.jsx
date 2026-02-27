import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    IconShoppingCart,
    IconCurrencyRupee,
    IconTool,
    IconBolt,
    IconReceipt,
    IconTruckDelivery
} from "@tabler/icons-react";
import ordersDashboardService from "@/services/ordersDashboardService";

export default function KPICards({ filters }) {
    const [kpis, setKpis] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        ordersDashboardService
            .getOrdersDashboardKpis(filters || {})
            .then((res) => {
                if (!isMounted) return;
                const payload = res?.result || res?.data || res || {};
                const totals = payload.totals || {};
                const byStatus = payload.by_status || [];
                const byDelivery = payload.by_delivery_status || [];

                const totalOrders = totals.total_orders ?? 0;
                const totalCapacity = totals.total_capacity_kw ?? 0;
                const totalProjectCost = totals.total_project_cost ?? 0;
                const installationPending =
                    byStatus.find((s) => s.status === "confirmed")?.count ?? 0;
                const deliveryPartial =
                    byDelivery.find((d) => d.delivery_status === "partial")?.count ?? 0;
                const netmeterPending =
                    byStatus.find((s) => s.status === "netmeter_pending")?.count ?? 0;
                const subsidyPending =
                    byStatus.find((s) => s.status === "subsidy_pending")?.count ?? 0;

                const nextKpis = [
                    {
                        title: "Active Orders (30 days)",
                        value: String(totalOrders),
                        trend: "",
                        isPositive: true,
                        icon: <IconShoppingCart className="w-5 h-5 text-blue-600" />,
                    },
                    {
                        title: "Project Value (₹)",
                        value: `₹${(totalProjectCost / 100000).toFixed(2)} L`,
                        trend: "",
                        isPositive: true,
                        icon: <IconCurrencyRupee className="w-5 h-5 text-emerald-600" />,
                    },
                    {
                        title: "Capacity (kW)",
                        value: totalCapacity.toFixed(1),
                        trend: "",
                        isPositive: true,
                        icon: <IconTool className="w-5 h-5 text-amber-500" />,
                    },
                    {
                        title: "Netmeter Pending",
                        value: String(netmeterPending),
                        trend: "",
                        isPositive: false,
                        icon: <IconBolt className="w-5 h-5 text-violet-600" />,
                    },
                    {
                        title: "Subsidy Pending",
                        value: String(subsidyPending),
                        trend: "",
                        isPositive: false,
                        icon: <IconReceipt className="w-5 h-5 text-rose-500" />,
                    },
                    {
                        title: "Delivery Partial",
                        value: String(deliveryPartial),
                        trend: "",
                        isPositive: deliveryPartial === 0,
                        icon: <IconTruckDelivery className="w-5 h-5 text-cyan-600" />,
                    },
                ];
                setKpis(nextKpis);
            })
            .catch(() => {
                if (!isMounted) return;
                setKpis([]);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, [filters]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 h-auto lg:h-[110px]">
            {(kpis.length ? kpis : [
                {
                    title: "Active Orders (30 days)",
                    value: loading ? "…" : "0",
                    trend: "",
                    isPositive: true,
                    icon: <IconShoppingCart className="w-5 h-5 text-blue-600" />,
                },
            ]).map((kpi, index) => (
                <Card key={index} className="rounded-2xl shadow-sm border-slate-200 bg-white transition-all hover:shadow-md">
                    <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-medium text-slate-500">{kpi.title}</span>
                            <div className="p-1.5 bg-slate-50 rounded-lg">
                                {kpi.icon}
                            </div>
                        </div>

                        <div className="mt-3 flex items-baseline justify-between">
                            <span className="text-xl font-bold text-slate-900">{kpi.value}</span>
                            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${kpi.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {kpi.trend}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
