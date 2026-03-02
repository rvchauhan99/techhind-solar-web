"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  IconCurrencyRupee, IconCircleCheck, IconClock, IconX,
  IconDownload, IconPrinter, IconArrowUpRight, IconArrowDownRight,
  IconChartBar, IconBuildingBank, IconUser, IconChartPie,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PaginatedTable from "@/components/common/PaginatedTable";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import paymentsReportService from "@/services/paymentsReportService";
import orderService from "@/services/orderService";
import orderPaymentsService from "@/services/orderPaymentsService";
import { toastError } from "@/utils/toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR = (v) =>
  Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const INR2 = (v) =>
  Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function buildParams(filters, page, limit) {
  const status =
    filters?.status && Array.isArray(filters.status)
      ? filters.status.join(",")
      : filters?.status;
  return { page, limit, ...filters, status: status ?? undefined };
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
const TT_STYLE = { borderRadius: 6, border: "none", boxShadow: "0 4px 12px rgb(0 0 0/0.12)", fontSize: 11 };

// ─── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, iconColor, label, value, sub, badge, badgeVariant = "up", loading }) {
  return (
    <Card className={`rounded-xl shadow-sm border-slate-200 bg-white transition-all hover:shadow-md ${loading ? "animate-pulse" : ""}`}>
      <CardContent className="p-3 flex flex-col justify-between h-full gap-1.5">
        <div className="flex justify-between items-start">
          <span className="text-xs font-medium text-slate-500 leading-tight">{label}</span>
          {Icon && (
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
              <Icon size={15} />
            </div>
          )}
        </div>
        <div className="text-xl font-bold text-slate-900 leading-tight">
          {loading ? "…" : <span className="text-[11px] text-slate-400 font-normal mr-0.5">₹</span>}
          {!loading && value}
        </div>
        {(sub || badge) && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {badge && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badgeVariant === "up" ? "bg-emerald-50 text-emerald-600" : badgeVariant === "down" ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-500"}`}>
                {badgeVariant === "up" ? <IconArrowUpRight size={10} /> : badgeVariant === "down" ? <IconArrowDownRight size={10} /> : null}
                {badge}
              </span>
            )}
            {sub && <span className="text-[10px] text-slate-400 leading-tight">{sub}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PanelHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-1.5 border-b border-slate-100 shrink-0">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-slate-400 shrink-0" />}
        <div>
          <h3 className="text-xs font-semibold text-slate-700 leading-tight">{title}</h3>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
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

// Compact horizontal bar with label
function BreakdownRow({ label, amount, max, color }) {
  const pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 group hover:bg-slate-50 px-2 py-1 rounded transition-colors">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[11px] text-slate-600 flex-1 truncate">{label}</span>
      <span className="text-[11px] font-semibold text-slate-800 whitespace-nowrap">₹{INR(amount)}</span>
      <div className="w-16 shrink-0">
        <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function PaymentsReportView({ filters }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const setErrorRef = useRef(() => { });
  setErrorRef.current = setError;

  const handleOpenDetails = (row) => {
    if (!row?.order_id) return;
    setSelectedOrder({ id: row.order_id });
    setDetailsOpen(true);
  };

  const handlePrintOrder = async (resolvedOrder) => {
    try {
      const file = await orderService.downloadOrderPDF(resolvedOrder?.id);
      const blob = file?.blob || file;
      const filename = file?.filename || `order-${resolvedOrder?.order_number || resolvedOrder?.id}.pdf`;
      if (!blob) throw new Error("PDF download failed");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) { toastError(err?.response?.data?.message || err?.message || "Failed to download PDF"); }
  };

  const handlePrintReceipt = async (e, paymentId) => {
    e?.stopPropagation?.();
    try {
      const { blob, filename } = await orderPaymentsService.downloadReceiptPDF(paymentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { toastError(err?.response?.data?.message || err?.message || "Failed to download receipt"); }
  };

  const handleExport = async (format = "csv") => {
    try {
      const params = buildParams(filters, 1, 999999);
      const blob = await paymentsReportService.exportPaymentsReport(params, format);
      const filename = `payments-report-${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xlsx" : "csv"}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { toastError(err?.response?.data?.message || "Failed to export"); }
  };

  const filterParams = useCallback(() => {
    const status = filters?.status && Array.isArray(filters.status)
      ? filters.status.join(",") : filters?.status;
    return { ...filters, status: status ?? undefined };
  }, [filters]);

  const fetcher = useCallback(async (params) => {
    setError(null);
    setLoading(true);
    try {
      const apiParams = buildParams(filters, params.page ?? 1, params.limit ?? 25);
      const response = await paymentsReportService.getPaymentsReport(apiParams);
      const result = response.result || response;
      setSummary(result.summary || null);
      return { data: result.data || [], meta: { total: result.meta?.total ?? 0 } };
    } catch (err) {
      setErrorRef.current(err?.response?.data?.message || "Failed to load payments report");
      return { data: [], meta: { total: 0 } };
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ─── Derived ────────────────────────────────────────────────────────────────

  const totalApproved = Number(summary?.by_status?.approved || 0);
  const totalPending = Number(summary?.by_status?.pending_approval || 0);
  const totalRejected = Number(summary?.by_status?.rejected || 0);
  const grandTotal = Number(summary?.total_amount || 0);
  const approvedPct = grandTotal > 0 ? ((totalApproved / grandTotal) * 100).toFixed(1) : "0.0";

  // by_mode → array sorted by amount desc
  const modeData = summary?.by_mode
    ? Object.entries(summary.by_mode).map(([name, amount]) => ({ name, amount: Number(amount || 0) })).sort((a, b) => b.amount - a.amount)
    : [];
  const maxMode = modeData[0]?.amount || 1;

  // by_branch → array sorted by amount desc
  const branchData = summary?.by_branch
    ? Object.entries(summary.by_branch).map(([name, amount]) => ({ name, amount: Number(amount || 0) })).sort((a, b) => b.amount - a.amount)
    : [];
  const maxBranch = branchData[0]?.amount || 1;

  // by_user → array sorted by amount desc
  const userData = summary?.by_user
    ? Object.entries(summary.by_user).map(([name, amount]) => ({ name, amount: Number(amount || 0) })).sort((a, b) => b.amount - a.amount)
    : [];
  const maxUser = userData[0]?.amount || 1;

  // by_period → for AreaChart
  const periodData = Array.isArray(summary?.by_period)
    ? summary.by_period.map((p) => ({ period: p.period?.slice(-7) || p.period, amount: Number(p.amount || 0), count: Number(p.count || 0) }))
    : [];

  // Status pie data
  const statusPieData = [
    { name: "Approved", value: totalApproved, color: "#10b981" },
    { name: "Pending", value: totalPending, color: "#f59e0b" },
    { name: "Rejected", value: totalRejected, color: "#ef4444" },
  ].filter((s) => s.value > 0);

  // Table columns
  const columns = [
    {
      field: "date_of_payment", label: "Date", sortable: true,
      render: (row) => row.date_of_payment ? new Date(row.date_of_payment).toLocaleDateString("en-IN") : "-",
    },
    {
      field: "receipt_number", label: "Receipt #",
      render: (row) => <span className="text-[11px] font-medium text-slate-600">{row.receipt_number || "-"}</span>,
    },
    {
      field: "order_number", label: "Order #",
      render: (row) => row.order_id
        ? <Link href={`/order/view?id=${row.order_id}`} className="text-primary hover:underline text-[11px] font-medium">{row.order_number || row.order_id}</Link>
        : <span className="text-[11px]">{row.order_number || "-"}</span>,
    },
    {
      field: "customer_name", label: "Customer",
      render: (row) => <span className="text-[11px]">{row.customer_name || "-"}</span>,
    },
    {
      field: "branch_name", label: "Branch",
      render: (row) => <span className="text-[11px] text-slate-500">{row.branch_name || "-"}</span>,
    },
    {
      field: "handled_by_name", label: "Handled By",
      render: (row) => <span className="text-[11px] text-slate-500">{row.handled_by_name || "-"}</span>,
    },
    {
      field: "payment_amount", label: "Amount", sortable: true,
      render: (row) => <span className="text-[11px] font-semibold text-slate-800">₹{INR2(row.payment_amount)}</span>,
    },
    {
      field: "payment_mode_name", label: "Mode",
      render: (row) => <span className="text-[11px] text-slate-500">{row.payment_mode_name || "-"}</span>,
    },
    {
      field: "status", label: "Status",
      render: (row) => (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[row.status] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
          {STATUS_LABEL[row.status] || row.status || "-"}
        </span>
      ),
    },
    {
      field: "print", label: "", isActionColumn: true,
      render: (row) => row.status === "approved" && row.id
        ? (
          <button
            onClick={(e) => handlePrintReceipt(e, row.id)}
            className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-colors"
          >
            <IconPrinter size={10} /> Receipt
          </button>
        ) : null,
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2.5">

      {/* ── KPI Strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:h-[100px]">
        <KpiCard
          icon={IconCurrencyRupee} iconColor="bg-emerald-100 text-emerald-600"
          label="Total Collected" value={INR(grandTotal)}
          badge={`${approvedPct}% approved`} badgeVariant="up"
          loading={loading && !summary}
        />
        <KpiCard
          icon={IconCircleCheck} iconColor="bg-emerald-100 text-emerald-600"
          label="Approved" value={INR(totalApproved)}
          badge={grandTotal > 0 ? `${((totalApproved / grandTotal) * 100).toFixed(0)}%` : "0%"} badgeVariant="up"
          loading={loading && !summary}
        />
        <KpiCard
          icon={IconClock} iconColor="bg-amber-100 text-amber-600"
          label="Pending Approval" value={INR(totalPending)}
          badge={grandTotal > 0 ? `${((totalPending / grandTotal) * 100).toFixed(0)}%` : "0%"} badgeVariant="neutral"
          sub="Awaiting review"
          loading={loading && !summary}
        />
        <KpiCard
          icon={IconX} iconColor="bg-red-100 text-red-500"
          label="Rejected" value={INR(totalRejected)}
          badge={grandTotal > 0 ? `${((totalRejected / grandTotal) * 100).toFixed(0)}%` : "0%"} badgeVariant="down"
          loading={loading && !summary}
        />
      </div>

      {/* ── Collection Trend + Status Pie ─────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-3">

        {/* Trend (AreaChart) */}
        <div className="col-span-12 lg:col-span-8">
          <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
            <PanelHeader icon={IconChartBar} title="Collection Trend" subtitle="Monthly payment amount (₹)" />
            <div className="px-2 pb-2" style={{ height: 200 }}>
              {periodData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={periodData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="amtGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis
                      allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={40}
                      tickFormatter={(v) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                    />
                    <RTooltip
                      contentStyle={TT_STYLE}
                      cursor={{ stroke: "#10b981", strokeWidth: 1, strokeDasharray: "3 2" }}
                      formatter={(v, name) => [`₹${INR(v)}`, name === "amount" ? "Amount" : "Count"]}
                    />
                    <Area dataKey="amount" name="amount" stroke="#10b981" strokeWidth={2} fill="url(#amtGrad)" dot={false} activeDot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyState text="No period data available" />}
            </div>
          </Card>
        </div>

        {/* Status Donut */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
            <PanelHeader icon={IconChartPie} title="Status Breakdown" subtitle="Approved · Pending · Rejected" />
            {statusPieData.length > 0 ? (
              <div className="flex items-center px-2 pb-2 gap-2">
                <div style={{ width: 130, minWidth: 130, height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                        {statusPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`₹${INR(v)}`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 flex-1">
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
            ) : <div style={{ height: 200 }}><EmptyState text="No status data yet" /></div>}
          </Card>
        </div>
      </div>

      {/* ── Breakdowns Row: Mode + Branch + User ──────────────────────────── */}
      <div className="grid grid-cols-12 gap-3">

        {/* Payment Mode breakdown */}
        <div className="col-span-12 md:col-span-4">
          <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
            <PanelHeader icon={IconBuildingBank} title="By Payment Mode" subtitle="Collection amount per mode" />
            <div className="px-1 pb-2" style={{ minHeight: 140 }}>
              {modeData.length > 0 ? (
                <>
                  <div className="px-2 pb-1" style={{ height: 140 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={modeData.slice(0, 6)} layout="vertical" margin={{ top: 2, right: 16, left: 4, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`} />
                        <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`₹${INR(v)}`]} cursor={{ fill: "#f8fafc" }} />
                        <Bar dataKey="amount" radius={[0, 3, 3, 0]} maxBarSize={18}>
                          {modeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-0.5 border-t border-slate-100 pt-1">
                    {modeData.slice(0, 5).map((m, i) => (
                      <BreakdownRow key={m.name} label={m.name} amount={m.amount} max={maxMode} color={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </div>
                </>
              ) : <EmptyState text="No payment mode data from API" />}
            </div>
          </Card>
        </div>

        {/* Branch breakdown */}
        <div className="col-span-12 md:col-span-4">
          <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
            <PanelHeader icon={IconBuildingBank} title="By Branch" subtitle="Collection amount per branch" />
            <div className="px-1 pb-2" style={{ minHeight: 140 }}>
              {branchData.length > 0 ? (
                <>
                  <div className="px-2" style={{ height: 140 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={branchData.slice(0, 6)} layout="vertical" margin={{ top: 2, right: 16, left: 4, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`} />
                        <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`₹${INR(v)}`]} cursor={{ fill: "#f8fafc" }} />
                        <Bar dataKey="amount" fill="#3b82f6" radius={[0, 3, 3, 0]} maxBarSize={18}>
                          {branchData.map((_, i) => <Cell key={i} fill={["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"][i % 5]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-0.5 border-t border-slate-100 pt-1">
                    {branchData.slice(0, 5).map((b, i) => (
                      <BreakdownRow key={b.name} label={b.name} amount={b.amount} max={maxBranch} color={["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"][i % 5]} />
                    ))}
                  </div>
                </>
              ) : <EmptyState text="No branch data from API" />}
            </div>
          </Card>
        </div>

        {/* User/Staff breakdown */}
        <div className="col-span-12 md:col-span-4">
          <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
            <PanelHeader icon={IconUser} title="By Staff / Handler" subtitle="Collections handled per user" />
            <div className="px-1 pb-2" style={{ minHeight: 140 }}>
              {userData.length > 0 ? (
                <>
                  <div className="px-2" style={{ height: 140 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={userData.slice(0, 6)} layout="vertical" margin={{ top: 2, right: 16, left: 4, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`} />
                        <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`₹${INR(v)}`]} cursor={{ fill: "#f8fafc" }} />
                        <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 3, 3, 0]} maxBarSize={18}>
                          {userData.map((_, i) => <Cell key={i} fill={["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"][i % 5]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-0.5 border-t border-slate-100 pt-1">
                    {userData.slice(0, 5).map((u, i) => (
                      <BreakdownRow key={u.name} label={u.name} amount={u.amount} max={maxUser} color={["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"][i % 5]} />
                    ))}
                  </div>
                </>
              ) : <EmptyState text="No user data from API" />}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Payments Table ─────────────────────────────────────────────────── */}
      <Card className="rounded-xl shadow-sm border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-semibold text-slate-700">Payment Transactions</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Click a row to view order details</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Export:</span>
            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-colors"
            >
              <IconDownload size={11} /> CSV
            </button>
            <button
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
          height="calc(100vh - 420px)"
          getRowKey={(row) => row.id ?? row.order_id ?? Math.random()}
          onRowClick={(row) => handleOpenDetails(row)}
        />
      </Card>

      <OrderDetailsDrawer
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setSelectedOrder(null); }}
        order={selectedOrder}
        onPrint={handlePrintOrder}
        showPrint
      />
    </div>
  );
}
