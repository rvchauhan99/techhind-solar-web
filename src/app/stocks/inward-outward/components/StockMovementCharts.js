"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import ChartCard from "@/components/common/ChartCard";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#64748b", "#ec4899"];

const BUCKET_LABELS = {
  procurement_in: "Procure IN",
  procurement_out: "Procure OUT",
  sales_out: "Sales OUT",
  sales_in: "Sales IN",
  transfer: "Transfer",
  production: "Production",
  adjustment: "Adjustment",
  other: "Other",
};

export default function StockMovementCharts({ charts }) {
  const c = charts || {};
  const trend = (c.trend || []).map((r) => ({
    ...r,
    label: r.period
      ? String(r.period).slice(0, 10)
      : "",
  }));
  const bucketMix = (c.bucket_mix || []).map((r) => ({
    ...r,
    name: BUCKET_LABELS[r.flow_bucket] || r.flow_bucket,
  }));
  const warehouse = (c.warehouse_compare || []).map((r) => ({
    name: (r.warehouse_name || "").slice(0, 14),
    procurement_in_qty: Number(r.procurement_in_qty) || 0,
    sales_out_qty: Number(r.sales_out_qty) || 0,
  }));
  const productTypes = (c.product_type_mix || [])
    .filter((r) => Number(r.sales_out_qty) > 0)
    .slice(0, 8)
    .map((r) => ({
      name: r.product_type_name || "—",
      value: Number(r.sales_out_qty) || 0,
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
      <ChartCard title={`Trend (${c.trend_grain || "day"})`} height={200}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} width={36} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="procurement_in_qty" name="Procure IN" fill="#10b981" stackId="a" />
            <Bar dataKey="sales_out_qty" name="Sales OUT" fill="#f59e0b" stackId="b" />
            <Bar dataKey="shrinkage_qty" name="Shrinkage" fill="#ef4444" stackId="c" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Bucket mix (qty)" height={200}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bucketMix} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 9 }} />
            <YAxis type="category" dataKey="name" width={78} tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Bar dataKey="qty" name="Qty" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Warehouse: Procure IN vs Sales OUT" height={200}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={warehouse} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} width={36} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="procurement_in_qty" name="Procure IN" fill="#10b981" />
            <Bar dataKey="sales_out_qty" name="Sales OUT" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Sales OUT by product type" height={200}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={productTypes}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={({ name, percent }) =>
                `${String(name).slice(0, 10)} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {productTypes.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
