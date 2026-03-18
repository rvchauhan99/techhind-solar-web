"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { IconCash, IconTrendingDown, IconChartLine, IconDownload, IconNotes, IconFilter, IconRefresh, IconCalendar, IconX } from "@tabler/icons-react";
import OrderListFilterPanel, { EMPTY_VALUES as ORDER_FILTER_EMPTY_VALUES, ORDER_STAGE_OPTIONS } from "@/components/common/OrderListFilterPanel";
import PaginatedTable from "@/components/common/PaginatedTable";
import paymentOutstandingService from "@/services/paymentOutstandingService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import PaymentFollowUpForm from "./components/PaymentFollowUpForm";
import PaymentFollowUpHistory from "./components/PaymentFollowUpHistory";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from "recharts";

const INR = (v) => Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const TT_STYLE = { borderRadius: 6, border: "none", boxShadow: "0 4px 12px rgb(0 0 0/0.12)", fontSize: 11 };

function getInitialFilters() {
  const n = new Date(); const p = new Date(n); p.setDate(n.getDate() - 30);
  return { ...ORDER_FILTER_EMPTY_VALUES, payment_type: "", order_date_from: p.toISOString().split("T")[0], order_date_to: n.toISOString().split("T")[0] };
}

const DATE_PRESETS = [
  { label: "Today", fn: () => { const d = new Date().toISOString().split("T")[0]; return { order_date_from: d, order_date_to: d }; } },
  { label: "This Week", fn: () => { const n = new Date(), dy = n.getDay(), m = new Date(n); m.setDate(n.getDate() - (dy === 0 ? 6 : dy - 1)); const e = new Date(m); e.setDate(m.getDate() + 6); return { order_date_from: m.toISOString().split("T")[0], order_date_to: e.toISOString().split("T")[0] }; } },
  { label: "This Month", fn: () => { const n = new Date(); return { order_date_from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0], order_date_to: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0] }; } },
  { label: "Last 30D", fn: () => { const n = new Date(), p = new Date(n); p.setDate(n.getDate() - 30); return { order_date_from: p.toISOString().split("T")[0], order_date_to: n.toISOString().split("T")[0] }; } },
  { label: "Last 3M", fn: () => { const n = new Date(), p = new Date(n); p.setMonth(n.getMonth() - 3); return { order_date_from: p.toISOString().split("T")[0], order_date_to: n.toISOString().split("T")[0] }; } },
  { label: "This Year", fn: () => { const n = new Date(); return { order_date_from: new Date(n.getFullYear(), 0, 1).toISOString().split("T")[0], order_date_to: new Date(n.getFullYear(), 11, 31).toISOString().split("T")[0] }; } },
];

const PAYMENT_TYPE_TABS = [
  { value: "", label: "All", cls: "text-slate-600 border-slate-200 hover:border-slate-400", activeCls: "bg-slate-100 border-slate-400 text-slate-700" },
  { value: "Direct Payment", label: "Direct", cls: "text-sky-600 border-sky-200 hover:border-sky-400", activeCls: "bg-sky-50 border-sky-400 text-sky-700" },
  { value: "Loan", label: "Loan", cls: "text-indigo-600 border-indigo-200 hover:border-indigo-400", activeCls: "bg-indigo-50 border-indigo-400 text-indigo-700" },
  { value: "PDC", label: "PDC", cls: "text-rose-600 border-rose-200 hover:border-rose-400", activeCls: "bg-rose-50 border-rose-400 text-rose-700" },
];

const FILTER_LABELS = {
  order_date_from: "Date From", order_date_to: "Date To", payment_type: "Payment Type",
  branch_id: "Branch", handled_by: "Handled By", customer_name: "Customer", mobile_number: "Mobile",
  order_number: "Order #", consumer_no: "Consumer No", application_no: "Application No",
  reference_from: "Reference", current_stage_key: "Stage", inquiry_source_id: "Source", q: "Search",
};

function getChips(filters) {
  return Object.entries(filters || {})
    .filter(([k, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0))
    .map(([key, value]) => ({
      key,
      label: FILTER_LABELS[key] || key,
      value: key === "payment_type"
        ? (PAYMENT_TYPE_TABS.find((o) => o.value === value)?.label || value)
        : key === "current_stage_key"
          ? (ORDER_STAGE_OPTIONS.find((o) => o.value === value)?.label || value)
          : String(value),
    }));
}

function countActive(f) {
  if (!f) return 0;
  return Object.entries(f).filter(([k, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)).length;
}

export default function PaymentOutstandingPage() {
  const [filters, setFilters] = useState(getInitialFilters());
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [activePaymentTypeTab, setActivePaymentTypeTab] = useState("");
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpOrder, setFollowUpOrder] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const activeCount = countActive(filters);
  const chips = getChips(filters);

  const handleApplyFilters = (next) => {
    setFilters((prev) => ({ ...ORDER_FILTER_EMPTY_VALUES, ...prev, ...(next || {}) }));
    setFilterPanelOpen(false);
  };
  const handleClearFilters = () => {
    setFilters(getInitialFilters());
    setActivePreset(null);
    setActivePaymentTypeTab("");
  };

  const handlePreset = (preset) => {
    const dates = preset.fn();
    setFilters((prev) => ({ ...prev, ...dates }));
    setActivePreset(preset.label);
  };

  const handlePaymentTypeTab = (value) => {
    setActivePaymentTypeTab(value);
    setFilters((prev) => ({ ...prev, payment_type: value || "" }));
  };

  const removeChip = (key) => {
    const empty = getInitialFilters();
    setFilters((prev) => ({ ...prev, [key]: empty[key] ?? "" }));
    if (key === "order_date_from" || key === "order_date_to") setActivePreset(null);
    if (key === "payment_type") setActivePaymentTypeTab("");
  };

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await paymentOutstandingService.kpis(filters);
        const t = await paymentOutstandingService.trend(filters);
        if (mounted) { setSummary(s || {}); setTrend(Array.isArray(t) ? t : (t?.data || [])); }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [filters]);

  const fetcher = useCallback(async (params) => {
    const resp = await paymentOutstandingService.list({ ...filters, ...params });
    const rows = resp?.data || resp?.rows || [];
    const total = resp?.total || resp?.count || rows.length;
    return { data: rows, meta: { total } };
  }, [filters]);

  const columns = useMemo(() => ([
    {
      field: "actions", label: "Actions", isActionColumn: true,
      render: (row) => (
        <div className="flex items-center gap-1">
          <Link href={`/order/view?id=${row.id}&tab=2`} target="_blank" className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 hover:border-primary hover:text-primary">Add Payment</Link>
          <Link href={`/order/view?id=${row.id}&tab=3`} target="_blank" className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 hover:border-primary hover:text-primary">Previous</Link>
          <button onClick={() => { setFollowUpOrder(row); setFollowUpOpen(true); }} className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 hover:border-primary hover:text-primary">
            Follow Up
          </button>
        </div>
      ),
    },
    {
      field: "order_number", label: "Order #", sortable: true,
      render: (row) => <Link href={`/order/view?id=${row.id}`} className="text-primary hover:underline text-[11px] font-medium">{row.order_number || row.id}</Link>,
    },
    { field: "capacity", label: "Cap.", sortable: true },
    {
      field: "customer", label: "Customer",
      render: (row) => <span className="text-[11px]">{row.customer?.name}</span>,
    },
    {
      field: "mobile", label: "Mobile",
      render: (row) => <span className="text-[11px] text-slate-500">{row.customer?.mobile_number || "-"}</span>,
    },
    {
      field: "project_cost", label: "Project Cost", sortable: true,
      render: (row) => <span className="text-[11px] font-semibold text-slate-800">₹{INR(row.project_cost)}</span>,
    },
    {
      field: "total_paid", label: "Paid", sortable: true,
      render: (row) => <span className="text-[11px] text-emerald-700 font-semibold">₹{INR(row.dataValues?.total_paid ?? row.total_paid)}</span>,
    },
    {
      field: "outstanding", label: "Outstanding", sortable: true,
      render: (row) => <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200">₹{INR(row.dataValues?.outstanding ?? row.outstanding)}</span>,
    },
    { field: "payment_type", label: "Payment Type" },
    { field: "loanType.name", label: "Loan Type", render: (row) => <span className="text-[11px]">{row.loanType?.name || "-"}</span> },
    { field: "order_date", label: "Order Date", render: (row) => row.order_date ? new Date(row.order_date).toLocaleDateString("en-IN") : "-" },
    { field: "current_stage_key", label: "Stage", render: (row) => {
      const key = row.current_stage_key;
      const label = ORDER_STAGE_OPTIONS.find((o) => o.value === key)?.label;
      return <span className="text-[11px]">{label || key || "-"}</span>;
    } },
    { field: "branch.name", label: "Branch", render: (row) => <span className="text-[11px] text-slate-500">{row.branch?.name || "-"}</span> },
    { field: "handledBy.name", label: "Handled By", render: (row) => <span className="text-[11px] text-slate-500">{row.handledBy?.name || "-"}</span> },
  ]), []);

  const total = Number(summary?.total_outstanding || 0);
  const totalDirect = Number(summary?.direct_outstanding || 0);
  const totalLoan = Number(summary?.loan_outstanding || 0);
  const totalPdc = Number(summary?.pdc_outstanding || 0);

  const exportCsv = async () => {
    const { blob, filename } = await paymentOutstandingService.exportCsv(filters);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-[1440px] px-3 py-2 space-y-2">
        {/* Header + Quick Filters */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/10 p-1.5 rounded-lg">
              <IconCash size={16} stroke={2} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">Payment Outstanding</h1>
              <p className="text-[11px] text-slate-500">All orders with pending payment and quick actions.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <IconCalendar size={11} /> Quick:
            </span>
            {DATE_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                className={[
                  "text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all",
                  activePreset === p.label
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white border-slate-200 text-slate-500 hover:border-primary hover:text-primary",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
            {activeCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{activeCount} active</Badge>
            )}
            <div className="h-4 w-px bg-slate-200 mx-0.5" />
            <Button size="sm" variant="outline" onClick={handleClearFilters} className="h-7 text-xs gap-1 px-2">
              <IconRefresh size={11} /> Reset
            </Button>
            <Button size="sm" onClick={() => setFilterPanelOpen((o) => !o)} className="h-7 text-xs gap-1 px-2">
              <IconFilter size={11} /> {filterPanelOpen ? "Hide" : "Filters"}
            </Button>
          </div>
        </div>

        {/* Payment Type Quick Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PAYMENT_TYPE_TABS.map((tab) => {
            const isActive = activePaymentTypeTab === tab.value;
            return (
              <button
                key={tab.value || "all"}
                onClick={() => handlePaymentTypeTab(tab.value)}
                className={[
                  "flex items-center gap-1 text-[11px] font-semibold px-3 py-1 rounded-full border transition-all",
                  isActive
                    ? (tab.activeCls || "bg-primary text-primary-foreground border-primary")
                    : `bg-white ${tab.cls}`,
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Collapsible Advanced Filters */}
        {filterPanelOpen && (
          <OrderListFilterPanel
            open
            onToggle={() => setFilterPanelOpen(false)}
            values={filters}
            onApply={(next) => { handleApplyFilters(next); setFilterPanelOpen(false); }}
            onClear={handleClearFilters}
            defaultOpen
          />
        )}

        {/* Active Filter Chips */}
        {chips.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Filters:</span>
            {chips.map(({ key, label, value }) => (
              <button
                key={key}
                onClick={() => removeChip(key)}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/8 border border-primary/20 text-primary/80 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
              >
                {label}: <span className="font-semibold">{value}</span>
                <IconX size={9} />
              </button>
            ))}
            <button
              onClick={handleClearFilters}
              className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card><CardContent className="p-2 flex items-center justify-between"><div><div className="text-[10px] text-slate-500">Total Outstanding</div><div className="text-lg font-bold">₹{INR(total)}</div></div><IconCash size={18} className="text-emerald-600" /></CardContent></Card>
          <Card><CardContent className="p-2 flex items-center justify-between"><div><div className="text-[10px] text-slate-500">Direct Payment</div><div className="text-lg font-bold">₹{INR(totalDirect)}</div></div><IconCash size={18} className="text-sky-600" /></CardContent></Card>
          <Card><CardContent className="p-2 flex items-center justify-between"><div><div className="text-[10px] text-slate-500">Loan</div><div className="text-lg font-bold">₹{INR(totalLoan)}</div></div><IconCash size={18} className="text-indigo-600" /></CardContent></Card>
          <Card><CardContent className="p-2 flex items-center justify-between"><div><div className="text-[10px] text-slate-500">PDC</div><div className="text-lg font-bold">₹{INR(totalPdc)}</div></div><IconTrendingDown size={18} className="text-rose-600" /></CardContent></Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-12 gap-2">
          <Card className="col-span-12 md:col-span-8">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold">Outstanding Trend</div>
                <IconChartLine size={14} className="text-slate-400" />
              </div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend.map((t) => ({ month: (t.month || "").toString().slice(0, 10), outstanding: Number(t.outstanding || 0) }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={40} tickFormatter={(v) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v} />
                    <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`₹${INR(v)}`, "Outstanding"]} />
                    <Line dataKey="outstanding" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-12 md:col-span-4">
            <CardContent className="p-2 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold">Actions</div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={exportCsv}><IconDownload size={12} /> CSV</Button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Use table actions to add payment or log follow-ups.</p>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <PaginatedTable
          columns={columns}
          fetcher={fetcher}
          initialPage={1}
          initialLimit={25}
          showSearch={false}
          height="calc(100vh - 420px)"
          moduleKey="/order"
        />
      </div>

      {/* Follow Up Dialog */}
      <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Payment Follow-Up — {followUpOrder?.order_number || followUpOrder?.id}</DialogTitle>
          </DialogHeader>
          {followUpOrder && (
            <div className="space-y-2">
              <PaymentFollowUpForm
                orderId={followUpOrder.id}
                onSaved={() => setHistoryRefreshKey((k) => k + 1)}
              />
              <PaymentFollowUpHistory orderId={followUpOrder.id} refreshKey={historyRefreshKey} />
              <div className="text-[10px] text-muted-foreground flex items-center gap-1"><IconNotes size={11} /> All entries are visible on the order view as well.</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
