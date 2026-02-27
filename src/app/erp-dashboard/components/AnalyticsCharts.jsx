"use client";

import React, { useEffect, useState } from "react";
import {
    AreaChart, Area,
    BarChart, Bar,
    LineChart, Line,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import ordersDashboardService from "@/services/ordersDashboardService";

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444']; // Emerald, Amber, Blue, Red

// Chart Container Component
const ChartWrapper = ({ title, children }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[300px]">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">{title}</h3>
        <div className="flex-grow w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                {children}
            </ResponsiveContainer>
        </div>
    </div>
);

export default function AnalyticsCharts({ filters, dashboardApiBase }) {
    const [trendPoints, setTrendPoints] = useState([]);
    const [pipelineByStage, setPipelineByStage] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        Promise.all([
            ordersDashboardService.getOrdersDashboardTrend(filters || {}, dashboardApiBase),
            ordersDashboardService.getOrdersDashboardPipeline(filters || {}, dashboardApiBase),
        ])
            .then(([trendRes, pipelineRes]) => {
                if (!isMounted) return;
                const trendPayload = trendRes?.result || trendRes?.data || trendRes || {};
                const pipelinePayload = pipelineRes?.result || pipelineRes?.data || pipelineRes || {};

                const points = Array.isArray(trendPayload.points) ? trendPayload.points : [];
                const byStage = Array.isArray(pipelinePayload.by_stage) ? pipelinePayload.by_stage : [];

                const revenueData = points.map((p) => {
                    const raw = Number(p.total_project_cost || 0) / 100000;
                    const rounded = Number.isFinite(raw) ? Number(raw.toFixed(2)) : 0;
                    return {
                        name: p.month
                            ? new Date(p.month).toLocaleDateString("en-IN", {
                                  month: "short",
                                  year: "2-digit",
                              })
                            : "",
                        revenue: rounded,
                    };
                });

                const capacityData = points.map((p) => {
                    const raw = Number(p.total_capacity_kw || 0);
                    const rounded = Number.isFinite(raw) ? Number(raw.toFixed(1)) : 0;
                    return {
                        name: p.month
                            ? new Date(p.month).toLocaleDateString("en-IN", { month: "short" })
                            : "",
                        capacity: rounded,
                    };
                });

                const stageNameMap = {
                    estimate_generated: "Estimate",
                    estimate_paid: "Estimate Paid",
                    planner: "Planner",
                    delivery: "Delivery",
                    fabrication: "Fabrication",
                    installation: "Installation",
                    netmeter_apply: "Netmeter Apply",
                    netmeter_installed: "Netmeter Installed",
                    subsidy_claim: "Subsidy Claim",
                    subsidy_disbursed: "Subsidy Disbursed",
                };

                const stageData = byStage.map((s) => ({
                    name: stageNameMap[s.current_stage_key] || s.current_stage_key || "Unknown",
                    count: Number(s.count || 0),
                }));

                setTrendPoints({
                    revenueData,
                    capacityData,
                });
                setPipelineByStage(stageData);
            })
            .catch(() => {
                if (!isMounted) return;
                setTrendPoints({ revenueData: [], capacityData: [] });
                setPipelineByStage([]);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [filters, dashboardApiBase]);

    const revenueData = trendPoints.revenueData || [];
    const capacityData = trendPoints.capacityData || [];
    const stageData = pipelineByStage;

    const subsidyData = [
        { name: "Claimed", value: 0 },
        { name: "Pending", value: 0 },
        { name: "Disbursed", value: 0 },
        { name: "Rejected", value: 0 },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full">

            {/* 1. Monthly Revenue Area Chart */}
            <ChartWrapper title="Revenue Trend (₹ Lakhs)">
                <AreaChart data={revenueData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
            </ChartWrapper>

            {/* 2. Orders by Stage Bar Chart */}
            <ChartWrapper title="Orders by Stage">
                <BarChart data={stageData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} interval={0} angle={-30} textAnchor="end" height={40} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
            </ChartWrapper>

            {/* 3. Capacity Installed Trend Line Chart */}
            <ChartWrapper title="Monthly Capacity Installed (kW)">
                <LineChart data={capacityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="capacity" stroke="#10b981" strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: 'white' }} activeDot={{ r: 6 }} />
                </LineChart>
            </ChartWrapper>

            {/* 4. Subsidy Status Pie Chart */}
            <ChartWrapper title="Subsidy Claim Status">
                <PieChart>
                    <Pie
                        data={subsidyData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                    >
                        {subsidyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b', bottom: 0 }} />
                </PieChart>
            </ChartWrapper>

        </div>
    );
}
