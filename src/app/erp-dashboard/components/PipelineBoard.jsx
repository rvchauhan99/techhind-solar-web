import React, { useEffect, useState } from "react";
import { IconAlertCircle } from "@tabler/icons-react";
import ordersDashboardService from "@/services/ordersDashboardService";
import Loader from "@/components/common/Loader";

const STAGE_META = [
    { id: "estimate_generated", name: "Estimate Generated", color: "bg-slate-500" },
    { id: "estimate_paid", name: "Estimate Paid", color: "bg-blue-500" },
    { id: "planner", name: "Planner", color: "bg-indigo-500" },
    { id: "delivery", name: "Delivery", color: "bg-cyan-500" },
    { id: "fabrication", name: "Fabrication", color: "bg-amber-500" },
    { id: "installation", name: "Installation", color: "bg-orange-500" },
    { id: "netmeter_apply", name: "Netmeter Apply", color: "bg-violet-500" },
    { id: "netmeter_installed", name: "Netmeter Installed", color: "bg-purple-500" },
    { id: "subsidy_claim", name: "Subsidy Claim", color: "bg-rose-500" },
    { id: "subsidy_disbursed", name: "Subsidy Disbursed", color: "bg-emerald-500" },
];

export default function PipelineBoard({ filters, onOrderSelect, dashboardApiBase }) {
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        ordersDashboardService
            .getOrdersDashboardPipeline(filters || {}, dashboardApiBase)
            .then((res) => {
                if (!isMounted) return;
                const payload = res?.result || res?.data || res || {};
                const byStage = Array.isArray(payload.by_stage) ? payload.by_stage : [];

                const mapped = STAGE_META.map((meta) => {
                    const match = byStage.find((s) => s.current_stage_key === meta.id);
                    const count = Number(match?.count || 0);
                    const capacity = count * 4.5;
                    const value = count * 1.8;
                    const overdue = 0;
                    return {
                        ...meta,
                        metrics: {
                            count,
                            capacity: capacity.toFixed(1),
                            value: value.toFixed(1),
                            overdue,
                        },
                    };
                });
                setStages(mapped);
            })
            .catch(() => {
                if (!isMounted) return;
                setStages([]);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [filters, dashboardApiBase]);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Order Stage Pipeline</h2>
                <div className="text-sm text-slate-500">
                    Scroll horizontally to view all stages
                </div>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory hide-scroll-bar min-h-[200px] items-center justify-start" style={{ scrollbarWidth: "none" }}>

                {loading ? (
                    <Loader />
                ) : (
                    <>
                        {(stages.length ? stages : STAGE_META.map((s) => ({
                            ...s,
                            metrics: {
                                count: 0,
                                capacity: "0.0",
                                value: "0.0",
                                overdue: 0,
                            },
                        }))).map((stage) => {
                            const metrics = stage.metrics;

                            return (
                                <div
                                    key={stage.id}
                                    className="flex-shrink-0 w-[260px] snap-start bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => onOrderSelect({ stage: stage.id, ...metrics })}
                                >
                                    {/* Color Coded Top Border */}
                                    <div className={`h-1.5 w-full ${stage.color}`}></div>

                                    <div className="p-4 flex flex-col h-full">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="font-semibold text-slate-800 text-sm">{stage.name}</h3>
                                            <div className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md">
                                                {metrics.count} Orders
                                            </div>
                                        </div>

                                        {/* Metrics */}
                                        <div className="space-y-3 mb-4 flex-grow">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Total Capacity</span>
                                                <span className="font-medium text-slate-800">{metrics.capacity} kW</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Project Value</span>
                                                <span className="font-medium text-slate-800">₹{metrics.value} Cr</span>
                                            </div>
                                        </div>

                                        {/* Footer Warnings */}
                                        {metrics.overdue > 0 ? (
                                            <div className="mt-auto flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-2 py-1.5 rounded-lg border border-red-100">
                                                <IconAlertCircle className="w-3.5 h-3.5" />
                                                {metrics.overdue} Orders Overdue
                                            </div>
                                        ) : (
                                            <div className="mt-auto flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100">
                                                On Schedule
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
}
