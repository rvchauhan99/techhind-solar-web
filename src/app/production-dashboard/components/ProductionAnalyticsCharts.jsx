"use client";

import { useEffect, useMemo, useState } from "react";
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
import ChartCard from "@/components/common/ChartCard";
import productionDashboardService from "@/services/productionDashboardService";
import { money, pickDashboardParams } from "./productionDashboardUi";

const REJECTION_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#a3a3a3", "#6366f1"];
const STATUS_COLORS = {
  DRAFT: "#94a3b8",
  APPROVED: "#3b82f6",
  IN_PROGRESS: "#f59e0b",
  COMPLETED: "#10b981",
  SHORT_CLOSED: "#8b5cf6",
  CANCELLED: "#ef4444",
};

export default function ProductionAnalyticsCharts({ filters, pipeline }) {
  const [analytics, setAnalytics] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const params = pickDashboardParams(filters);
    Promise.all([
      productionDashboardService.getProductionDashboardAnalytics({ ...params, limit: 10 }),
      productionDashboardService.getProductionDashboardTrend(params),
    ])
      .then(([analyticsRes, trendRes]) => {
        if (!mounted) return;
        setAnalytics(analyticsRes?.result || analyticsRes || null);
        setTrend(trendRes?.result?.trend || trendRes?.trend || []);
      })
      .catch(() => {
        if (mounted) {
          setAnalytics(null);
          setTrend([]);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [filters]);

  const warehouseChartData = useMemo(
    () =>
      (analytics?.warehouse_wise || []).map((row) => ({
        name: row.warehouse_name,
        Good: row.good_quantity,
        Rejected: row.rejected_quantity,
        Value: row.production_value,
      })),
    [analytics]
  );

  const topProductData = useMemo(
    () =>
      (analytics?.top_products || []).map((row) => ({
        name: row.product_name,
        Good: row.good_quantity,
        Rejected: row.rejected_quantity,
      })),
    [analytics]
  );

  const rejectionData = useMemo(
    () =>
      (analytics?.rejection_reasons || []).map((row) => ({
        name: row.reason,
        value: row.rejected_quantity,
      })),
    [analytics]
  );

  const trendData = useMemo(
    () =>
      trend.map((row) => ({
        name: row.period,
        Good: row.good_quantity,
        Rejected: row.rejected_quantity,
        Value: row.production_value,
        Material: row.material_cost,
        Operation: row.operation_cost,
        Yield: row.yield_percent,
      })),
    [trend]
  );

  const statusMixData = useMemo(
    () =>
      (pipeline || [])
        .filter((s) => s.order_count > 0)
        .map((s) => ({ name: s.label || s.status, value: s.order_count, status: s.status || s.id })),
    [pipeline]
  );

  const costTrendData = useMemo(
    () =>
      trend.map((row) => ({
        name: row.period,
        Material: row.material_cost,
        Operation: row.operation_cost,
      })),
    [trend]
  );

  return (
    <div id="dashboard-charts" className="grid grid-cols-1 gap-2 xl:grid-cols-2">
      <ChartCard title="Work Order Status Mix" subtitle="Open pipeline distribution" height={240} loading={loading} isEmpty={!loading && statusMixData.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={statusMixData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={78} paddingAngle={2}>
              {statusMixData.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#64748b"} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Yield % Trend" subtitle="Good output share by period" height={240} loading={loading} isEmpty={!loading && trendData.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Line type="monotone" dataKey="Yield" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Warehouse-wise Output" subtitle="Good vs rejected quantity" height={240} loading={loading} isEmpty={!loading && warehouseChartData.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={warehouseChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Good" fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Rejected" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Material vs Operation Cost" subtitle="Cost split by period" height={240} loading={loading} isEmpty={!loading && costTrendData.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={costTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v) => money(v)} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Material" stackId="cost" fill="#3b82f6" />
            <Bar dataKey="Operation" stackId="cost" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top Finished Goods" subtitle="Highest good quantity" height={240} loading={loading} isEmpty={!loading && topProductData.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topProductData} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9 }} />
            <Tooltip />
            <Bar dataKey="Good" fill="#10b981" radius={[0, 3, 3, 0]} />
            <Bar dataKey="Rejected" fill="#ef4444" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Rejection Reasons" subtitle="Rejected quantity by reason" height={240} loading={loading} isEmpty={!loading && rejectionData.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rejectionData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={2}>
              {rejectionData.map((_, i) => (
                <Cell key={i} fill={REJECTION_COLORS[i % REJECTION_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Monthly Production Trend" subtitle="Output quantity and value" height={240} loading={loading} isEmpty={!loading && trendData.length === 0} className="xl:col-span-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="qty" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="val" orientation="right" tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v, name) => (name === "Value" ? money(v) : v)} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line yAxisId="qty" type="monotone" dataKey="Good" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line yAxisId="qty" type="monotone" dataKey="Rejected" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line yAxisId="val" type="monotone" dataKey="Value" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
