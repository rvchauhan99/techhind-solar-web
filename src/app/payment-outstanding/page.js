"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { IconCash, IconTrendingDown, IconChartLine, IconDownload, IconNotes } from "@tabler/icons-react";
import OrderListFilterPanel, { EMPTY_VALUES as ORDER_FILTER_EMPTY_VALUES } from "@/components/common/OrderListFilterPanel";
import PaginatedTable from "@/components/common/PaginatedTable";
import paymentOutstandingService from "@/services/paymentOutstandingService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PaymentFollowUpForm from "./components/PaymentFollowUpForm";
import PaymentFollowUpHistory from "./components/PaymentFollowUpHistory";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from "recharts";

const INR = (v) => Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const TT_STYLE = { borderRadius: 6, border: "none", boxShadow: "0 4px 12px rgb(0 0 0/0.12)", fontSize: 11 };

function getInitialFilters() {
  const n = new Date(); const p = new Date(n); p.setDate(n.getDate() - 30);
  return { ...ORDER_FILTER_EMPTY_VALUES, order_date_from: p.toISOString().split("T")[0], order_date_to: n.toISOString().split("T")[0] };
}

export default function PaymentOutstandingPage() {
  const [filters, setFilters] = useState(getInitialFilters());
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpOrder, setFollowUpOrder] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const handleApplyFilters = (next) => {
    setFilters((prev) => ({ ...ORDER_FILTER_EMPTY_VALUES, ...prev, ...(next || {}) }));
    setFilterPanelOpen(false);
  };
  const handleClearFilters = () => setFilters(getInitialFilters());

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
        <div>
          <h1 className="text-xl font-bold leading-tight">Payment Outstanding</h1>
          <p className="text-[11px] text-slate-500">All orders with pending payment and quick actions.</p>
        </div>

        <OrderListFilterPanel
          open={filterPanelOpen}
          onToggle={setFilterPanelOpen}
          values={filters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          defaultOpen
        />

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
          showSearch
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
