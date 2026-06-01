"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconCurrencyRupee,
  IconDownload,
  IconUsers,
  IconShoppingCart,
  IconChartBar,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import commissionSettlementService from "@/services/commissionSettlementService";
import { toast } from "sonner";
import { stripReferenceLabelsFromFilters } from "../../utils/filterChips";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const INR = (v) =>
  Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const INR2 = (v) =>
  Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PIE_COLORS = ["#00823b", "#1b365d", "#f59e0b", "#6366f1"];
const PERMISSION_MODULE_KEY = "/commission-settlements/history";

function buildApiParams(filters, page, limit, extra = {}) {
  const p = { page, limit, ...extra };
  Object.entries(stripReferenceLabelsFromFilters(filters) || {}).forEach(([k, v]) => {
    if (v != null && v !== "") p[k] = v;
  });
  return p;
}

function KpiCard({ icon: Icon, iconColor, label, value, sub }) {
  return (
    <Card className="rounded-xl border-slate-200 shadow-sm">
      <CardContent className="flex flex-col gap-1 p-3">
        <div className="flex justify-between items-start">
          <span className="text-xs text-slate-500">{label}</span>
          {Icon && (
            <div className={`flex size-7 items-center justify-center rounded-lg ${iconColor}`}>
              <Icon size={14} />
            </div>
          )}
        </div>
        <div className="text-lg font-bold text-slate-900 leading-tight">{value}</div>
        {sub && <span className="text-[10px] text-slate-400">{sub}</span>}
      </CardContent>
    </Card>
  );
}

function stripEmpty(obj) {
  const out = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v != null && v !== "") out[k] = v;
  });
  return out;
}

export default function SettledCommissionHistoryView({ filters, refreshKey, onViewOrderLines }) {
  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [tab, setTab] = useState("lines");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [tableKey, setTableKey] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderFilter, setOrderFilter] = useState(null);

  const effectiveFilters = useMemo(
    () =>
      stripEmpty(
        stripReferenceLabelsFromFilters({
          ...filters,
          ...(orderFilter ? { order_id: orderFilter } : {}),
        })
      ),
    [filters, orderFilter]
  );

  useEffect(() => {
    setPage(1);
    setOrderFilter(null);
    setTableKey((k) => k + 1);
  }, [refreshKey, filters]);

  useEffect(() => {
    let cancelled = false;
    setDashLoading(true);
    commissionSettlementService
      .getSettledHistoryDashboard(effectiveFilters)
      .then((res) => {
        if (!cancelled) setDashboard(res?.result ?? res);
      })
      .catch(() => {
        if (!cancelled) setDashboard(null);
      })
      .finally(() => {
        if (!cancelled) setDashLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveFilters, refreshKey]);

  const filterParams = useMemo(() => effectiveFilters, [effectiveFilters]);

  const linesFetcher = useCallback(
    async (params) => {
      const response = await commissionSettlementService.listSettledHistoryLines(
        buildApiParams(effectiveFilters, params.page, params.limit)
      );
      const result = response?.result || response;
      return {
        data: result?.data || [],
        meta: result?.meta || { total: 0, page: params.page, limit: params.limit },
      };
    },
    [effectiveFilters, tableKey]
  );

  const ordersFetcher = useCallback(
    async (params) => {
      const response = await commissionSettlementService.listSettledHistoryByOrder(
        buildApiParams(effectiveFilters, params.page, params.limit)
      );
      const result = response?.result || response;
      return {
        data: result?.data || [],
        meta: result?.meta || { total: 0, page: params.page, limit: params.limit },
      };
    },
    [effectiveFilters, tableKey]
  );

  const handleDownload = async (layout) => {
    try {
      const blob = await commissionSettlementService.downloadSettledLedgerCsv({
        ...effectiveFilters,
        layout,
      });
      const suffix = layout === "flat" ? "flat-lines" : "user-ledger";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `commission-settled-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Export failed");
    }
  };

  const openOrder = (orderId) => {
    if (!orderId) return;
    setSelectedOrder({ id: orderId });
    setDrawerOpen(true);
  };

  const viewLinesForOrder = (orderId) => {
    setOrderFilter(orderId);
    setTab("lines");
    setPage(1);
    setTableKey((k) => k + 1);
    onViewOrderLines?.(orderId);
  };

  const totals = dashboard?.totals || {};
  const payoutSummary = dashboard?.payout_summary;
  const timeseriesLabel =
    dashboard?.timeseries_by === "payout_date" ? "Settled by payout date" : "Settled by approval date";
  const rolePie = (dashboard?.by_role || []).map((r, i) => ({
    name: r.role || "—",
    value: Number(r.amount) || 0,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));
  const periodData = (dashboard?.timeseries || []).map((p) => ({
    period: p.period ? String(p.period).slice(0, 10) : "",
    amount: Number(p.amount) || 0,
  }));

  const lineColumns = useMemo(
    () => [
      {
        field: "approved_at",
        label: "Approved",
        sortable: false,
        render: (r) => (r.approved_at ? String(r.approved_at).slice(0, 10) : "—"),
      },
      { field: "settlement_number", label: "Settlement", sortable: false, render: (r) => r.settlement_number || "—" },
      { field: "payout_number", label: "Payout #", sortable: false, render: (r) => r.payout_number || "—" },
      {
        field: "bank_reference",
        label: "UTR / Ref",
        sortable: false,
        render: (r) => (
          <span className="text-[10px] font-mono">{r.bank_reference || "—"}</span>
        ),
      },
      {
        field: "payout_paid_at",
        label: "Paid on",
        sortable: false,
        render: (r) => (r.payout_paid_at ? String(r.payout_paid_at).slice(0, 10) : "—"),
      },
      {
        field: "order_number",
        label: "Order",
        sortable: false,
        render: (r) => (
          <button
            type="button"
            className="text-primary text-[11px] font-medium hover:underline"
            onClick={() => openOrder(r.order_id)}
          >
            {r.order_number || r.order_id}
          </button>
        ),
      },
      { field: "beneficiary_name", label: "Beneficiary", sortable: false, render: (r) => r.beneficiary_name || "—" },
      { field: "role", label: "Role", sortable: false, render: (r) => r.role || "—" },
      {
        field: "amount",
        label: "Amount",
        sortable: false,
        render: (r) => <span className="font-semibold">₹{INR2(r.amount)}</span>,
      },
      { field: "branch_name", label: "Branch", sortable: false, render: (r) => r.branch_name || "—" },
      {
        field: "accrued_at",
        label: "Accrued",
        sortable: false,
        render: (r) => (r.accrued_at ? String(r.accrued_at).slice(0, 10) : "—"),
      },
    ],
    []
  );

  const orderColumns = useMemo(
    () => [
      {
        field: "order_number",
        label: "Order",
        sortable: false,
        render: (r) => (
          <button
            type="button"
            className="text-primary text-[11px] font-medium hover:underline"
            onClick={() => openOrder(r.order_id)}
          >
            {r.order_number || r.order_id}
          </button>
        ),
      },
      {
        field: "order_date",
        label: "Order date",
        sortable: false,
        render: (r) => (r.order_date ? String(r.order_date).slice(0, 10) : "—"),
      },
      { field: "branch_name", label: "Branch", sortable: false, render: (r) => r.branch_name || "—" },
      { field: "line_count", label: "Lines", sortable: false, render: (r) => r.line_count },
      {
        field: "total_commission_amount",
        label: "Total",
        sortable: false,
        render: (r) => <span className="font-semibold">₹{INR2(r.total_commission_amount)}</span>,
      },
      {
        field: "settlement_numbers",
        label: "Settlements",
        sortable: false,
        render: (r) => <span className="text-[10px] text-slate-500">{r.settlement_numbers || "—"}</span>,
      },
      {
        field: "actions",
        label: "",
        sortable: false,
        isActionColumn: true,
        render: (r) => (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => viewLinesForOrder(r.order_id)}>
            Lines
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-2.5">
      <div
        className={`grid grid-cols-2 gap-2 ${payoutSummary ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-4"}`}
      >
        <KpiCard
          icon={IconCurrencyRupee}
          iconColor="bg-emerald-500/10 text-emerald-600"
          label="Settled total"
          value={dashLoading ? "…" : `₹${INR(totals.total_amount)}`}
        />
        {payoutSummary ? (
          <KpiCard
            icon={IconCurrencyRupee}
            iconColor="bg-primary/10 text-primary"
            label="Payouts (period)"
            value={dashLoading ? "…" : payoutSummary.payout_count ?? 0}
            sub={dashLoading ? null : `₹${INR(payoutSummary.payout_total)}`}
          />
        ) : null}
        <KpiCard
          icon={IconChartBar}
          iconColor="bg-slate-500/10 text-slate-600"
          label="Ledger lines"
          value={dashLoading ? "…" : totals.line_count ?? 0}
        />
        <KpiCard
          icon={IconShoppingCart}
          iconColor="bg-blue-500/10 text-blue-600"
          label="Orders"
          value={dashLoading ? "…" : totals.order_count ?? 0}
        />
        <KpiCard
          icon={IconUsers}
          iconColor="bg-violet-500/10 text-violet-600"
          label="Beneficiaries"
          value={dashLoading ? "…" : totals.beneficiary_count ?? 0}
        />
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        <Card className="rounded-xl border-slate-200 lg:col-span-2">
          <CardContent className="p-2">
            <p className="text-xs font-semibold text-slate-700 px-1 pb-1">{timeseriesLabel}</p>
            <div className="h-40">
              {periodData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={periodData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <RTooltip formatter={(v) => [`₹${INR(v)}`, "Amount"]} />
                    <Area type="monotone" dataKey="amount" stroke="#00823b" fill="#00823b22" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-[11px] text-slate-400 py-8">No trend data</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200">
          <CardContent className="p-2">
            <p className="text-xs font-semibold text-slate-700 px-1 pb-1">By role</p>
            <div className="h-40">
              {rolePie.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={rolePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={false}>
                      {rolePie.map((e, i) => (
                        <Cell key={e.name} fill={e.color} />
                      ))}
                    </Pie>
                    <RTooltip formatter={(v) => `₹${INR(v)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-[11px] text-slate-400 py-8">No data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {(dashboard?.by_branch?.length > 0 || dashboard?.by_beneficiary?.length > 0) && (
        <div className="grid gap-2 md:grid-cols-2">
          {dashboard?.by_branch?.length > 0 && (
            <Card className="rounded-xl border-slate-200">
              <CardContent className="p-2 max-h-36 overflow-y-auto">
                <p className="text-xs font-semibold text-slate-700 mb-1">Top branches</p>
                {dashboard.by_branch.map((b) => (
                  <div key={b.name} className="flex justify-between text-[11px] py-0.5 border-b border-slate-50">
                    <span className="truncate">{b.name}</span>
                    <span className="font-medium shrink-0 ml-2">₹{INR(b.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {dashboard?.by_beneficiary?.length > 0 && (
            <Card className="rounded-xl border-slate-200">
              <CardContent className="p-2 max-h-36 overflow-y-auto">
                <p className="text-xs font-semibold text-slate-700 mb-1">Top beneficiaries</p>
                {dashboard.by_beneficiary.map((b) => (
                  <div
                    key={b.beneficiary_user_id}
                    className="flex justify-between text-[11px] py-0.5 border-b border-slate-50"
                  >
                    <span className="truncate">{b.beneficiary_name || b.beneficiary_user_id}</span>
                    <span className="font-medium shrink-0 ml-2">₹{INR(b.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="h-8 text-xs gap-1" variant="outline" onClick={() => handleDownload("user")}>
          <IconDownload size={14} /> User-wise ledger (CSV)
        </Button>
        <Button size="sm" className="h-8 text-xs gap-1" variant="outline" onClick={() => handleDownload("flat")}>
          <IconDownload size={14} /> Flat lines (CSV)
        </Button>
        {orderFilter && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => {
              setOrderFilter(null);
              setTableKey((k) => k + 1);
            }}
          >
            Clear order filter
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
          <TabsTrigger value="lines" className="text-xs px-3">
            Line items
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-xs px-3">
            By order
          </TabsTrigger>
        </TabsList>
        <TabsContent value="lines" className="mt-2 space-y-2">
          <PaginatedTable
            key={`lines-${tableKey}`}
            moduleKey={PERMISSION_MODULE_KEY}
            columns={lineColumns}
            fetcher={linesFetcher}
            filterParams={filterParams}
            showSearch={false}
            showPagination={false}
            height="calc(100vh - 520px)"
            onTotalChange={setTotalCount}
            page={page}
            limit={limit}
            onPageChange={(z) => setPage(z + 1)}
            onRowsPerPageChange={setLimit}
            onQChange={() => {}}
            onSortChange={() => {}}
            onRowClick={(row) => openOrder(row.order_id)}
          />
          <PaginationControls
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(z) => setPage(z + 1)}
            onRowsPerPageChange={setLimit}
          />
        </TabsContent>
        <TabsContent value="orders" className="mt-2 space-y-2">
          <PaginatedTable
            key={`orders-${tableKey}`}
            moduleKey={PERMISSION_MODULE_KEY}
            columns={orderColumns}
            fetcher={ordersFetcher}
            filterParams={effectiveFilters}
            showSearch={false}
            showPagination={false}
            height="calc(100vh - 520px)"
            onTotalChange={setTotalCount}
            page={page}
            limit={limit}
            onPageChange={(z) => setPage(z + 1)}
            onRowsPerPageChange={setLimit}
            onQChange={() => {}}
            onSortChange={() => {}}
          />
          <PaginationControls
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(z) => setPage(z + 1)}
            onRowsPerPageChange={setLimit}
          />
        </TabsContent>
      </Tabs>

      <OrderDetailsDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        showPrint={false}
      />
    </div>
  );
}
