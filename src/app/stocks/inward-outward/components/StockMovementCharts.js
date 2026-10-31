"use client";

import { useRouter } from "next/navigation";
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
import { LEDGER_DRILL, trendPeriodRange } from "@/utils/stockLedgerLinks";

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

export default function StockMovementCharts({ charts, filters, ledgerHref }) {
  const router = useRouter();
  const c = charts || {};
  const canDrill = typeof ledgerHref === "function" && !!ledgerHref(LEDGER_DRILL.all);
  const cursor = canDrill ? "pointer" : undefined;

  const go = (drill, qty) => {
    if (!canDrill || !Number(qty)) return;
    const href = ledgerHref(drill);
    if (href) router.push(href);
  };

  const trend = (c.trend || []).map((r) => ({
    ...r,
    label: r.period ? String(r.period).slice(0, 10) : "",
  }));
  const bucketMix = (c.bucket_mix || []).map((r) => ({
    ...r,
    name: BUCKET_LABELS[r.flow_bucket] || r.flow_bucket,
  }));
  const warehouse = (c.warehouse_compare || []).map((r) => ({
    warehouse_id: r.warehouse_id,
    name: (r.warehouse_name || "").slice(0, 14),
    procurement_in_qty: Number(r.procurement_in_qty) || 0,
    sales_out_qty: Number(r.sales_out_qty) || 0,
  }));
  const productTypes = (c.product_type_mix || [])
    .filter((r) => Number(r.sales_out_qty) > 0)
    .slice(0, 8)
    .map((r) => ({
      product_type_id: r.product_type_id,
      name: r.product_type_name || "—",
      value: Number(r.sales_out_qty) || 0,
    }));

  const trendClick = (scope, key) => (entry) => {
    const row = entry?.payload || entry;
    const range = trendPeriodRange(row?.period, c.trend_grain || "day", filters || {});
    if (!range) return;
    go({ ...scope, ...range }, row?.[key]);
  };

  const warehouseClick = (scope, key) => (entry) => {
    const row = entry?.payload || entry;
    if (!row?.warehouse_id) return;
    go({ ...scope, warehouse_id: row.warehouse_id }, row?.[key]);
  };

  const bucketClick = (entry) => {
    const row = entry?.payload || entry;
    if (!row?.flow_bucket || row.flow_bucket === "other") return;
    go({ flow_bucket: [row.flow_bucket] }, row?.qty);
  };

  const typeClick = (entry) => {
    const row = entry?.payload || entry;
    if (!row?.product_type_id) return;
    go({ ...LEDGER_DRILL.salesOut, product_type_id: row.product_type_id }, row?.value);
  };

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
            <Bar
              dataKey="procurement_in_qty"
              name="Procure IN"
              fill="#10b981"
              stackId="a"
              cursor={cursor}
              onClick={trendClick(LEDGER_DRILL.procurementIn, "procurement_in_qty")}
            />
            <Bar
              dataKey="sales_out_qty"
              name="Sales OUT"
              fill="#f59e0b"
              stackId="b"
              cursor={cursor}
              onClick={trendClick(LEDGER_DRILL.salesOut, "sales_out_qty")}
            />
            <Bar
              dataKey="shrinkage_qty"
              name="Shrinkage"
              fill="#ef4444"
              stackId="c"
              cursor={cursor}
              onClick={trendClick(LEDGER_DRILL.shrinkage, "shrinkage_qty")}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Bucket mix (qty)" height={200}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={bucketMix}
            layout="vertical"
            margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 9 }} />
            <YAxis type="category" dataKey="name" width={78} tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Bar dataKey="qty" name="Qty" fill="#3b82f6" cursor={cursor} onClick={bucketClick} />
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
            <Bar
              dataKey="procurement_in_qty"
              name="Procure IN"
              fill="#10b981"
              cursor={cursor}
              onClick={warehouseClick(LEDGER_DRILL.procurementIn, "procurement_in_qty")}
            />
            <Bar
              dataKey="sales_out_qty"
              name="Sales OUT"
              fill="#f59e0b"
              cursor={cursor}
              onClick={warehouseClick(LEDGER_DRILL.salesOut, "sales_out_qty")}
            />
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
              cursor={cursor}
              onClick={typeClick}
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
