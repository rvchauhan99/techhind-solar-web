"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconCurrencyRupee,
  IconCircleCheck,
  IconClock,
  IconX,
  IconDownload,
  IconPrinter,
  IconArrowUpRight,
  IconArrowDownRight,
  IconChartBar,
  IconBuildingBank,
  IconUser,
  IconChartPie,
  IconBuildingWarehouse,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import PaginatedTable from "@/components/common/PaginatedTable";
import b2bPaymentsReportService from "@/services/b2bPaymentsReportService";
import b2bOrderPaymentsService from "@/services/b2bOrderPaymentsService";
import { toastError } from "@/utils/toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const INR = (v) =>
  Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const INR2 = (v) =>
  Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function buildParams(filters, page, limit) {
  const { client_label: _clientLabel, ...rest } = filters || {};
  const status =
    rest?.status && Array.isArray(rest.status) ? rest.status.join(",") : rest?.status;
  return { page, limit, ...rest, status: status ?? undefined };
}

const STATUS_BADGE = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_LABEL = {
  approved: "Approved",
  rejected: "Rejected",
  pending_approval: "Pending",
};

const PIE_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6", "#14b8a6"];
const TT_STYLE = {
  borderRadius: "8px",
  border: "none",
  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
  fontSize: "11px",
  backgroundColor: "#0f172a",
  color: "#f8fafc",
};

function KpiCard({ icon: Icon, iconColor, label, value, sub, badge, badgeVariant = "up", loading }) {
  return (
    <Card
      className={`rounded-lg shadow-sm border-slate-200 bg-white transition-all hover:shadow-md ${loading ? "animate-pulse" : ""}`}
    >
      <CardContent className="p-2.5 flex flex-col justify-between h-full gap-0.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
          {Icon && (
            <div className={`w-5.5 h-5.5 rounded flex items-center justify-center shrink-0 ${iconColor}`}>
              <Icon size={12} />
            </div>
          )}
        </div>
        <div className="text-base font-bold text-slate-900 leading-tight">
          {loading ? "…" : <span className="text-[10px] text-slate-400 font-normal mr-0.5">₹</span>}
          {!loading && value}
        </div>
        {(sub || badge) && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {badge && (
              <span
                className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.5 rounded-full ${
                  badgeVariant === "up"
                    ? "bg-emerald-50 text-emerald-600"
                    : badgeVariant === "down"
                      ? "bg-red-50 text-red-500"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {badgeVariant === "up" ? (
                  <IconArrowUpRight size={9} />
                ) : badgeVariant === "down" ? (
                  <IconArrowDownRight size={9} />
                ) : null}
                {badge}
              </span>
            )}
            {sub && <span className="text-[9px] text-slate-400 leading-tight">{sub}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PanelHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start justify-between gap-2 px-2.5 py-1.5 border-b border-slate-100 shrink-0">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-slate-400 shrink-0" />}
        <div>
          <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
          {subtitle && <p className="text-[9px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text = "No data available" }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-6">
      <IconChartBar size={22} className="text-slate-200 mb-1.5" />
      <p className="text-[11px] text-slate-400 max-w-[160px] leading-snug">{text}</p>
    </div>
  );
}

function BreakdownRow({ label, amount, max, color }) {
  const pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 group hover:bg-slate-50 px-2 py-1 rounded transition-colors">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[11px] text-slate-600 flex-1 truncate">{label}</span>
      <span className="text-[11px] font-semibold text-slate-800 whitespace-nowrap">₹{INR(amount)}</span>
      <div className="w-16 shrink-0">
        <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

export default function B2bPaymentsReportView({ filters }) {
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const setErrorRef = useRef(() => {});
  setErrorRef.current = setError;

  const handlePrintReceipt = async (e, paymentId) => {
    e?.stopPropagation?.();
    try {
      const { blob, filename } = await b2bOrderPaymentsService.downloadReceiptPDF(paymentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "Failed to download receipt");
    }
  };

  const handleExport = async (format = "csv") => {
    try {
      const params = buildParams(filters, 1, 999999);
      const blob = await b2bPaymentsReportService.exportReport(params, format);
      const filename = `b2b-payments-report-${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xlsx" : "csv"}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to export");
    }
  };

  const filterParams = useCallback(() => buildParams(filters, 1, 25), [filters]);

  const fetcher = useCallback(
    async (params) => {
      setError(null);
      setLoading(true);
      try {
        const response = await b2bPaymentsReportService.getReport(
          buildParams(filters, params.page ?? 1, params.limit ?? 25)
        );
        const result = response?.result ?? response;
        setSummary(result.summary || null);
        return { data: result.data || [], meta: { total: result.meta?.total ?? 0 } };
      } catch (err) {
        setErrorRef.current(err?.response?.data?.message || "Failed to load B2B payments report");
        return { data: [], meta: { total: 0 } };
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  const totalApproved = Number(summary?.by_status?.approved || 0);
  const totalPending = Number(summary?.by_status?.pending_approval || 0);
  const totalRejected = Number(summary?.by_status?.rejected || 0);
  const grandTotal = Number(summary?.total_amount || 0);
  const approvedPct = grandTotal > 0 ? ((totalApproved / grandTotal) * 100).toFixed(1) : "0.0";

  const modeData = summary?.by_mode
    ? Object.entries(summary.by_mode)
        .map(([name, amount]) => ({ name, amount: Number(amount || 0) }))
        .sort((a, b) => b.amount - a.amount)
    : [];
  const maxMode = modeData[0]?.amount || 1;

  const warehouseData = summary?.by_warehouse
    ? Object.entries(summary.by_warehouse)
        .map(([name, amount]) => ({ name, amount: Number(amount || 0) }))
        .sort((a, b) => b.amount - a.amount)
    : [];
  const maxWarehouse = warehouseData[0]?.amount || 1;

  const clientData = summary?.by_client
    ? Object.entries(summary.by_client)
        .map(([name, amount]) => ({ name, amount: Number(amount || 0) }))
        .sort((a, b) => b.amount - a.amount)
    : [];
  const maxClient = clientData[0]?.amount || 1;

  const periodData = Array.isArray(summary?.by_period)
    ? summary.by_period.map((p) => ({
        period: p.period?.slice(-7) || p.period,
        amount: Number(p.amount || 0),
      }))
    : [];

  const statusPieData = [
    { name: "Approved", value: totalApproved, color: "#10b981" },
    { name: "Pending", value: totalPending, color: "#f59e0b" },
    { name: "Rejected", value: totalRejected, color: "#ef4444" },
  ].filter((s) => s.value > 0);

  const columns = [
    {
      field: "date_of_payment",
      label: "Date",
      sortable: true,
      render: (row) =>
        row.date_of_payment ? new Date(row.date_of_payment).toLocaleDateString("en-IN") : "-",
    },
    {
      field: "receipt_number",
      label: "Receipt #",
      render: (row) => (
        <span className="text-[11px] font-medium text-slate-600">{row.receipt_number || "-"}</span>
      ),
    },
    {
      field: "order_no",
      label: "Order #",
      render: (row) =>
        row.b2b_sales_order_id ? (
          <Link
            href={`/b2b-sales-orders/view?id=${row.b2b_sales_order_id}`}
            className="text-primary hover:underline text-[11px] font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {row.order_no || row.b2b_sales_order_id}
          </Link>
        ) : (
          <span className="text-[11px]">{row.order_no || "-"}</span>
        ),
    },
    {
      field: "client_name",
      label: "Client",
      render: (row) => <span className="text-[11px]">{row.client_name || "-"}</span>,
    },
    {
      field: "warehouse_name",
      label: "Warehouse",
      render: (row) => <span className="text-[11px] text-slate-500">{row.warehouse_name || "-"}</span>,
    },
    {
      field: "payment_amount",
      label: "Amount",
      sortable: true,
      headerRender: () => <span className="ml-auto">Amount</span>,
      render: (row) => (
        <div className="text-right text-[11px] font-semibold text-slate-800 w-full select-none">
          ₹{INR2(row.payment_amount)}
        </div>
      ),
    },
    {
      field: "payment_mode_name",
      label: "Mode",
      render: (row) => <span className="text-[11px] text-slate-500">{row.payment_mode_name || "-"}</span>,
    },
    {
      field: "status",
      label: "Status",
      render: (row) => (
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[row.status] || "bg-slate-50 text-slate-500 border-slate-200"}`}
        >
          {STATUS_LABEL[row.status] || row.status || "-"}
        </span>
      ),
    },
    {
      field: "print",
      label: "",
      isActionColumn: true,
      render: (row) =>
        row.status === "approved" && row.id ? (
          <button
            type="button"
            onClick={(e) => handlePrintReceipt(e, row.id)}
            className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-colors"
          >
            <IconPrinter size={10} /> Receipt
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard
          icon={IconCurrencyRupee}
          iconColor="bg-emerald-100 text-emerald-600"
          label="Total Collected"
          value={INR(grandTotal)}
          badge={`${approvedPct}% approved`}
          badgeVariant="up"
          loading={loading && !summary}
        />
        <KpiCard
          icon={IconCircleCheck}
          iconColor="bg-emerald-100 text-emerald-600"
          label="Approved"
          value={INR(totalApproved)}
          badge={grandTotal > 0 ? `${((totalApproved / grandTotal) * 100).toFixed(0)}%` : "0%"}
          badgeVariant="up"
          loading={loading && !summary}
        />
        <KpiCard
          icon={IconClock}
          iconColor="bg-amber-100 text-amber-600"
          label="Pending Approval"
          value={INR(totalPending)}
          badge={grandTotal > 0 ? `${((totalPending / grandTotal) * 100).toFixed(0)}%` : "0%"}
          badgeVariant="neutral"
          sub="Awaiting review"
          loading={loading && !summary}
        />
        <KpiCard
          icon={IconX}
          iconColor="bg-red-100 text-red-500"
          label="Rejected"
          value={INR(totalRejected)}
          badge={grandTotal > 0 ? `${((totalRejected / grandTotal) * 100).toFixed(0)}%` : "0%"}
          badgeVariant="down"
          loading={loading && !summary}
        />
      </div>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12 lg:col-span-8">
          <Card className="rounded-lg shadow-sm border-slate-200 bg-white h-full">
            <PanelHeader icon={IconChartBar} title="Collection Trend" subtitle="Monthly payment amount (₹)" />
            <div className="px-2 pb-1" style={{ height: 160 }}>
              {periodData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={periodData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="b2bAmtGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      tickFormatter={(v) =>
                        v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v
                      }
                    />
                    <RTooltip
                      contentStyle={TT_STYLE}
                      itemStyle={{ color: "#f8fafc" }}
                      labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
                      cursor={{ stroke: "#10b981", strokeWidth: 1, strokeDasharray: "3 2" }}
                      formatter={(v) => [`₹${INR(v)}`, "Amount"]}
                    />
                    <Area
                      dataKey="amount"
                      name="amount"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#b2bAmtGrad)"
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="No period data available" />
              )}
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <Card className="rounded-lg shadow-sm border-slate-200 bg-white h-full">
            <PanelHeader icon={IconChartPie} title="Status Breakdown" subtitle="Approved · Pending · Rejected" />
            {statusPieData.length > 0 ? (
              <div className="flex items-center px-2 pb-1.5 gap-2">
                <div style={{ width: 100, minWidth: 100, height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={45}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusPieData.map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                      <RTooltip
                        contentStyle={TT_STYLE}
                        itemStyle={{ color: "#f8fafc" }}
                        labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
                        formatter={(v) => [`₹${INR(v)}`]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  {statusPieData.map((s) => (
                    <div key={s.name} className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-[11px] text-slate-600">{s.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-bold text-slate-800">₹{INR(s.value)}</div>
                        <div className="text-[10px] text-slate-400">
                          {grandTotal > 0 ? `${((s.value / grandTotal) * 100).toFixed(0)}%` : "—"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ height: 140 }}>
                <EmptyState text="No status data yet" />
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12 md:col-span-4">
          <Card className="rounded-lg shadow-sm border-slate-200 bg-white h-full">
            <PanelHeader icon={IconBuildingBank} title="By Payment Mode" subtitle="Collection amount per mode" />
            <div className="px-1 pb-1.5" style={{ minHeight: 110 }}>
              {modeData.length > 0 ? (
                <>
                  <div className="px-2 pb-1" style={{ height: 110 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={modeData.slice(0, 6)}
                        layout="vertical"
                        margin={{ top: 2, right: 16, left: 4, bottom: 2 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) =>
                            v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`
                          }
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={70}
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RTooltip
                          contentStyle={TT_STYLE}
                          itemStyle={{ color: "#f8fafc" }}
                          labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
                          formatter={(v) => [`₹${INR(v)}`]}
                          cursor={{ fill: "#f8fafc" }}
                        />
                        <Bar dataKey="amount" radius={[0, 3, 3, 0]} maxBarSize={18}>
                          {modeData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-0.5 border-t border-slate-100 pt-1">
                    {modeData.slice(0, 5).map((m, i) => (
                      <BreakdownRow
                        key={m.name}
                        label={m.name}
                        amount={m.amount}
                        max={maxMode}
                        color={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState text="No payment mode data" />
              )}
            </div>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-4">
          <Card className="rounded-lg shadow-sm border-slate-200 bg-white h-full">
            <PanelHeader
              icon={IconBuildingWarehouse}
              title="By Warehouse"
              subtitle="Collection amount per warehouse"
            />
            <div className="px-1 pb-1.5" style={{ minHeight: 110 }}>
              {warehouseData.length > 0 ? (
                <>
                  <div className="px-2" style={{ height: 110 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={warehouseData.slice(0, 6)}
                        layout="vertical"
                        margin={{ top: 2, right: 16, left: 4, bottom: 2 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) =>
                            v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`
                          }
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={70}
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RTooltip
                          contentStyle={TT_STYLE}
                          itemStyle={{ color: "#f8fafc" }}
                          labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
                          formatter={(v) => [`₹${INR(v)}`]}
                          cursor={{ fill: "#f8fafc" }}
                        />
                        <Bar dataKey="amount" fill="#3b82f6" radius={[0, 3, 3, 0]} maxBarSize={18}>
                          {warehouseData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"][i % 5]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-0.5 border-t border-slate-100 pt-1">
                    {warehouseData.slice(0, 5).map((w, i) => (
                      <BreakdownRow
                        key={w.name}
                        label={w.name}
                        amount={w.amount}
                        max={maxWarehouse}
                        color={["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"][i % 5]}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState text="No warehouse data" />
              )}
            </div>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-4">
          <Card className="rounded-lg shadow-sm border-slate-200 bg-white h-full">
            <PanelHeader icon={IconUser} title="By Client" subtitle="Collection amount per client" />
            <div className="px-1 pb-1.5" style={{ minHeight: 110 }}>
              {clientData.length > 0 ? (
                <>
                  <div className="px-2" style={{ height: 110 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={clientData.slice(0, 6)}
                        layout="vertical"
                        margin={{ top: 2, right: 16, left: 4, bottom: 2 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) =>
                            v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`
                          }
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={70}
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RTooltip
                          contentStyle={TT_STYLE}
                          itemStyle={{ color: "#f8fafc" }}
                          labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
                          formatter={(v) => [`₹${INR(v)}`]}
                          cursor={{ fill: "#f8fafc" }}
                        />
                        <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 3, 3, 0]} maxBarSize={18}>
                          {clientData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"][i % 5]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-0.5 border-t border-slate-100 pt-1">
                    {clientData.slice(0, 5).map((c, i) => (
                      <BreakdownRow
                        key={c.name}
                        label={c.name}
                        amount={c.amount}
                        max={maxClient}
                        color={["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"][i % 5]}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState text="No client data" />
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card className="rounded-lg shadow-sm border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-semibold text-slate-700">Payment Transactions</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Click a row to open B2B order</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Export:</span>
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-colors"
            >
              <IconDownload size={11} /> CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport("excel")}
              className="flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-colors"
            >
              <IconDownload size={11} /> Excel
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-3 my-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}

        <PaginatedTable
          columns={columns}
          fetcher={fetcher}
          filterParams={filterParams()}
          initialPage={1}
          initialLimit={25}
          showSearch={false}
          height="calc(100vh - 350px)"
          getRowKey={(row) => row.id}
          onRowClick={(row) => {
            if (row.b2b_sales_order_id) {
              router.push(`/b2b-sales-orders/view?id=${row.b2b_sales_order_id}`);
            }
          }}
        />
      </Card>
    </div>
  );
}
