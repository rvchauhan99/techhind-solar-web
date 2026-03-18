"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { IconChartBar, IconChartPie, IconActivity, IconUsers, IconBuilding, IconTarget } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import paymentOutstandingService from "@/services/paymentOutstandingService";
import { ORDER_STAGE_OPTIONS } from "@/components/common/OrderListFilterPanel";

const INR = (v) =>
  Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const TT_STYLE = { borderRadius: 6, border: "none", boxShadow: "0 4px 12px rgb(0 0 0/0.12)", fontSize: 11 };

const PIE_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6", "#14b8a6"];

function PanelHeader({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-2 px-2.5 pt-2 pb-1.5 border-b border-slate-100">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-slate-400 shrink-0" />}
        <div>
          <div className="text-xs font-semibold text-slate-700 leading-tight">{title}</div>
          {subtitle && <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{subtitle}</div>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

function EmptyState({ text = "No data" }) {
  return (
    <div className="flex items-center justify-center py-10 text-[11px] text-slate-400">
      {text}
    </div>
  );
}

function BreakdownRow({ label, amount, count, max, color }) {
  const pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 group hover:bg-slate-50 px-2 py-1 rounded transition-colors">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-slate-600 truncate leading-tight">{label}</div>
        {typeof count === "number" && (
          <div className="text-[10px] text-slate-400 leading-tight">{count} orders</div>
        )}
      </div>
      <div className="text-right">
        <div className="text-[11px] font-semibold text-slate-800 leading-tight">₹{INR(amount)}</div>
      </div>
      <div className="w-16 shrink-0">
        <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

function labelStage(stageKey) {
  const opt = ORDER_STAGE_OPTIONS?.find((o) => String(o.value) === String(stageKey));
  return opt?.label || stageKey || "Unknown";
}

function topNMap(mapObj, n = 8) {
  const rows = Object.entries(mapObj || {})
    .map(([key, v]) => ({ key, amount: Number(v?.amount || 0), count: Number(v?.count || 0) }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  return rows.slice(0, n);
}

function pct(part, total) {
  if (!total || total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10; // 1 decimal
}

export default function PaymentOutstandingAnalysis({ filters }) {
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    paymentOutstandingService
      .analysis(filters || {})
      .then((res) => {
        if (!mounted) return;
        setData(res || {});
      })
      .catch(() => {
        if (!mounted) return;
        setData(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [filters]);

  const total = Number(data?.total_outstanding || 0);
  const direct = Number(data?.direct_outstanding || 0);
  const loan = Number(data?.loan_outstanding || 0);
  const pdc = Number(data?.pdc_outstanding || 0);
  const orderCount = Number(data?.order_count || 0);

  const periodData = Array.isArray(data?.by_period)
    ? data.by_period.map((p) => ({ period: p.period, amount: Number(p.amount || 0), count: Number(p.count || 0) }))
    : [];

  const byPaymentType = data?.by_payment_type || {};
  const payTypePie = Object.entries(byPaymentType)
    .map(([name, amount]) => ({ name, amount: Number(amount || 0) }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const branchRows = topNMap(data?.by_branch, 10);
  const maxBranch = branchRows[0]?.amount || 1;

  const handlerRows = topNMap(data?.by_handled_by, 10);
  const maxHandler = handlerRows[0]?.amount || 1;

  const stageRowsRaw = Object.entries(data?.by_stage || {})
    .map(([key, v]) => ({ key, amount: Number(v?.amount || 0), count: Number(v?.count || 0) }))
    .filter((r) => r.amount > 0 || r.count > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
  const stageBar = stageRowsRaw.map((r) => ({ name: labelStage(r.key), amount: r.amount, count: r.count }));

  const bestBranch = branchRows[0];
  const bestHandler = handlerRows[0];
  const bestStage = stageRowsRaw[0];

  const insights = [
    bestBranch && total > 0
      ? { icon: IconBuilding, label: "Top branch", value: `${bestBranch.key}`, sub: `₹${INR(bestBranch.amount)} • ${pct(bestBranch.amount, total)}%` }
      : null,
    bestHandler && total > 0
      ? { icon: IconUsers, label: "Top handler", value: `${bestHandler.key}`, sub: `₹${INR(bestHandler.amount)} • ${pct(bestHandler.amount, total)}%` }
      : null,
    bestStage
      ? { icon: IconTarget, label: "Most outstanding stage", value: labelStage(bestStage.key), sub: `₹${INR(bestStage.amount)} • ${bestStage.count} orders` }
      : null,
    total > 0
      ? { icon: IconActivity, label: "Total outstanding", value: `₹${INR(total)}`, sub: `${orderCount} orders` }
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-2">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className={loading && !data ? "animate-pulse" : ""}>
          <CardContent className="p-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500">Total Outstanding</div>
              <div className="text-lg font-bold leading-tight">₹{INR(total)}</div>
              <div className="text-[10px] text-slate-400">{orderCount} orders</div>
            </div>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">All</Badge>
          </CardContent>
        </Card>
        <Card className={loading && !data ? "animate-pulse" : ""}>
          <CardContent className="p-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500">Direct</div>
              <div className="text-lg font-bold leading-tight">₹{INR(direct)}</div>
              <div className="text-[10px] text-slate-400">{pct(direct, total)}%</div>
            </div>
            <Badge className="bg-sky-50 text-sky-700 border border-sky-200 text-[10px] h-5 px-1.5" variant="secondary">Direct</Badge>
          </CardContent>
        </Card>
        <Card className={loading && !data ? "animate-pulse" : ""}>
          <CardContent className="p-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500">Loan</div>
              <div className="text-lg font-bold leading-tight">₹{INR(loan)}</div>
              <div className="text-[10px] text-slate-400">{pct(loan, total)}%</div>
            </div>
            <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] h-5 px-1.5" variant="secondary">Loan</Badge>
          </CardContent>
        </Card>
        <Card className={loading && !data ? "animate-pulse" : ""}>
          <CardContent className="p-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500">PDC</div>
              <div className="text-lg font-bold leading-tight">₹{INR(pdc)}</div>
              <div className="text-[10px] text-slate-400">{pct(pdc, total)}%</div>
            </div>
            <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] h-5 px-1.5" variant="secondary">PDC</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {insights.map((ins) => {
          const Icon = ins.icon;
          return (
            <Card key={ins.label} className="bg-white">
              <CardContent className="p-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Icon size={11} className="text-slate-400" /> {ins.label}
                  </div>
                  <div className="text-[12px] font-semibold text-slate-800 truncate">{ins.value}</div>
                  {ins.sub && <div className="text-[10px] text-slate-400 truncate">{ins.sub}</div>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-12 gap-2">
        <Card className="col-span-12 lg:col-span-8 overflow-hidden">
          <PanelHeader icon={IconChartBar} title="Outstanding Trend" subtitle="Monthly outstanding amount (₹)" />
          <div className="px-2 pb-2" style={{ height: 220 }}>
            {periodData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={periodData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
                  />
                  <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`₹${INR(v)}`, "Outstanding"]} />
                  <Area dataKey="amount" stroke="#ef4444" strokeWidth={2} fill="url(#outGrad)" dot={false} activeDot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text={loading ? "Loading…" : "No trend data"} />
            )}
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-4 overflow-hidden">
          <PanelHeader icon={IconChartPie} title="By Payment Type" subtitle="Outstanding split" />
          <div className="px-2 pb-2" style={{ height: 220 }}>
            {payTypePie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={payTypePie} cx="50%" cy="48%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="amount" nameKey="name">
                    {payTypePie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                  <RTooltip contentStyle={TT_STYLE} formatter={(v, _, p) => [`₹${INR(v)}`, p?.payload?.name || ""]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text={loading ? "Loading…" : "No payment type data"} />
            )}
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-12 gap-2">
        <Card className="col-span-12 md:col-span-6 overflow-hidden">
          <PanelHeader icon={IconBuilding} title="By Branch" subtitle="Outstanding amount per branch" />
          <div className="px-2 pb-2" style={{ minHeight: 210 }}>
            {branchRows.length > 0 ? (
              <>
                <div style={{ height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchRows.slice(0, 6).map((r) => ({ name: r.key, amount: r.amount }))} layout="vertical" margin={{ top: 2, right: 16, left: 4, bottom: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`)} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`₹${INR(v)}`, "Outstanding"]} cursor={{ fill: "#f8fafc" }} />
                      <Bar dataKey="amount" radius={[0, 3, 3, 0]} maxBarSize={18}>
                        {branchRows.slice(0, 6).map((_, i) => (
                          <Cell key={i} fill={["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"][i % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-0.5 border-t border-slate-100 pt-1">
                  {branchRows.slice(0, 5).map((b, i) => (
                    <BreakdownRow
                      key={b.key}
                      label={b.key}
                      amount={b.amount}
                      count={b.count}
                      max={maxBranch}
                      color={["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"][i % 5]}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState text={loading ? "Loading…" : "No branch data"} />
            )}
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-6 overflow-hidden">
          <PanelHeader icon={IconUsers} title="By Handled By" subtitle="Outstanding amount per staff" />
          <div className="px-2 pb-2" style={{ minHeight: 210 }}>
            {handlerRows.length > 0 ? (
              <>
                <div style={{ height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={handlerRows.slice(0, 6).map((r) => ({ name: r.key, amount: r.amount }))} layout="vertical" margin={{ top: 2, right: 16, left: 4, bottom: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`)} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`₹${INR(v)}`, "Outstanding"]} cursor={{ fill: "#f8fafc" }} />
                      <Bar dataKey="amount" radius={[0, 3, 3, 0]} maxBarSize={18}>
                        {handlerRows.slice(0, 6).map((_, i) => (
                          <Cell key={i} fill={["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"][i % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-0.5 border-t border-slate-100 pt-1">
                  {handlerRows.slice(0, 5).map((u, i) => (
                    <BreakdownRow
                      key={u.key}
                      label={u.key}
                      amount={u.amount}
                      count={u.count}
                      max={maxHandler}
                      color={["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"][i % 5]}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState text={loading ? "Loading…" : "No handler data"} />
            )}
          </div>
        </Card>
      </div>

      {/* Stage */}
      <Card className="overflow-hidden">
        <PanelHeader icon={IconTarget} title="By Stage" subtitle="Outstanding concentration by current stage" />
        <div className="px-2 pb-2" style={{ height: 240 }}>
          {stageBar.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageBar} margin={{ top: 10, right: 12, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
                <YAxis
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v) => (v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
                />
                <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`₹${INR(v)}`, "Outstanding"]} />
                <Bar dataKey="amount" fill="#f97316" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text={loading ? "Loading…" : "No stage data"} />
          )}
        </div>
      </Card>
    </div>
  );
}

