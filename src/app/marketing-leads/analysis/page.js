"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DateField from "@/components/common/DateField";
import Select, { MenuItem } from "@/components/common/Select";
import MultiSelect from "@/components/common/MultiSelect";
import marketingLeadsService from "@/services/marketingLeadsService";
import mastersService from "@/services/mastersService";
import companyService from "@/services/companyService";
import {
  IconChartBar,
  IconFilter,
  IconArrowUpRight,
  IconArrowDownRight,
  IconUsers,
  IconTarget,
  IconTrendingUp,
  IconAlertCircle,
  IconActivity,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconCalendar,
  IconMinus,
} from "@tabler/icons-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Label,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FILTERS = {
  from: "", to: "", branch_id: "", source_ids: [], status: [],
  priority: [], campaign_name: "", lead_segment: "", product_interest: "", assigned_to: "",
};

const STATUS_COLORS = {
  new: "#3b82f6", contacted: "#f59e0b", follow_up: "#8b5cf6",
  interested: "#10b981", converted: "#22c55e", not_interested: "#ef4444", junk: "#64748b",
};

const PRIORITY_COLORS = { hot: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#94a3b8" };

const PIE_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6", "#14b8a6"];

const DATE_PRESETS = [
  { label: "Today", fn: () => { const d = new Date().toISOString().split("T")[0]; return { from: d, to: d }; } },
  { label: "This Week", fn: () => { const n = new Date(), dy = n.getDay(), m = new Date(n); m.setDate(n.getDate() - (dy === 0 ? 6 : dy - 1)); const s = new Date(m); s.setDate(m.getDate() + 6); return { from: m.toISOString().split("T")[0], to: s.toISOString().split("T")[0] }; } },
  { label: "This Month", fn: () => { const n = new Date(); return { from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0], to: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0] }; } },
  { label: "Last 3M", fn: () => { const n = new Date(), p = new Date(n); p.setMonth(n.getMonth() - 3); return { from: p.toISOString().split("T")[0], to: n.toISOString().split("T")[0] }; } },
];

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1 rounded-full bg-slate-100 overflow-hidden w-full mt-1">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function TrendChip({ direction, label }) {
  const colorCls = direction === "up" ? "text-emerald-600 bg-emerald-50" : direction === "down" ? "text-red-500 bg-red-50" : "text-slate-500 bg-slate-100";
  const Icon = direction === "up" ? IconArrowUpRight : direction === "down" ? IconArrowDownRight : IconMinus;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${colorCls}`}>
      <Icon size={11} /> {label}
    </span>
  );
}

// Compact KPI card — matches KPICards.jsx ERP pattern exactly
function KpiCard({ icon, label, value, valueColor, sub, trend, loading, onClick }) {
  return (
    <Card
      onClick={onClick}
      className={`rounded-xl shadow-sm border-slate-200 bg-white transition-all hover:shadow-md ${onClick ? "cursor-pointer" : ""} ${loading ? "animate-pulse" : ""}`}
    >
      <CardContent className="p-3 flex flex-col justify-between h-full gap-1">
        <div className="flex justify-between items-start">
          <span className="text-xs font-medium text-slate-500 leading-tight">{label}</span>
          {icon && <div className="p-1 bg-slate-50 rounded-lg shrink-0">{icon}</div>}
        </div>
        <div className="flex items-baseline justify-between gap-1 mt-1">
          <span className="text-xl font-bold text-slate-900" style={valueColor ? { color: valueColor } : {}}>
            {loading ? "…" : value ?? "—"}
          </span>
          {trend && <TrendChip {...trend} />}
        </div>
        {sub && <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// Compact chart panel header
function PanelHeader({ title, subtitle }) {
  return (
    <div className="px-3 pt-2.5 pb-1.5 border-b border-slate-100">
      <h3 className="text-xs font-semibold text-slate-700 leading-tight">{title}</h3>
      {subtitle && <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{subtitle}</p>}
    </div>
  );
}

// Empty state
function EmptyState({ text = "No data" }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-6">
      <IconChartBar size={24} className="text-slate-300 mb-1.5" />
      <p className="text-xs text-slate-400 max-w-[160px] leading-snug">{text}</p>
    </div>
  );
}

// Donut center label
function CenterLabel({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight={700} fill="#1e293b">
      {total}
    </text>
  );
}

const TT_STYLE = { borderRadius: 6, border: "none", boxShadow: "0 4px 12px rgb(0 0 0 / 0.12)", fontSize: 11 };

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MarketingLeadAnalysisPage() {
  const router = useRouter();

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  const [branchOptions, setBranchOptions] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);

  useEffect(() => {
    Promise.all([
      companyService.listBranches().then((r) => { const d = r?.result ?? r?.data ?? r; return Array.isArray(d) ? d : []; }),
      mastersService.getReferenceOptions("inquiry_source.model").then((r) => { const d = r?.result ?? r?.data ?? r; return Array.isArray(d) ? d : []; }),
      mastersService.getReferenceOptions("user.model").then((r) => { const d = r?.result ?? r?.data ?? r; return Array.isArray(d) ? d : []; }),
    ]).then(([b, s, u]) => { setBranchOptions(b); setSourceOptions(s); setUserOptions(u); }).catch(() => { });
  }, []);

  const loadSummary = useCallback(async (overrideFilters) => {
    try {
      setLoading(true);
      const f = overrideFilters ?? filters;
      const params = {
        from: f.from || undefined, to: f.to || undefined, branch_id: f.branch_id || undefined,
        source_ids: f.source_ids?.length ? f.source_ids.join(",") : undefined,
        status: f.status?.length ? f.status.join(",") : undefined,
        priority: f.priority?.length ? f.priority.join(",") : undefined,
        campaign_name: f.campaign_name || undefined, lead_segment: f.lead_segment || undefined,
        product_interest: f.product_interest || undefined, assigned_to: f.assigned_to || undefined,
      };
      const res = await marketingLeadsService.getMarketingLeadsSummary(params);
      setSummary(res?.result || res?.data || res);
    } catch { setSummary(null); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { loadSummary(); }, []); // eslint-disable-line

  const fc = (key, val) => setFilters((p) => ({ ...p, [key]: val }));

  const applyPreset = (preset) => {
    const dates = preset.fn();
    const next = { ...filters, ...dates };
    setFilters(next); setActivePreset(preset.label); loadSummary(next);
  };

  // ─── Derived ───────────────────────────────────────────────────────────────

  const totalLeadsAll = typeof summary?.total_leads_all === "number" ? summary.total_leads_all
    : (summary?.status_breakdown_all || []).reduce((s, r) => s + Number(r.count || 0), 0);

  const convertedLeads = typeof summary?.converted_count === "number" ? summary.converted_count
    : Number((summary?.status_breakdown_all || []).find((r) => r.status === "converted")?.count || 0);

  const pipelineLeads = (summary?.funnel || []).reduce((s, r) => s + Number(r.count || 0), 0);

  const conversionRateRaw = typeof summary?.conversion_rate === "number" ? summary.conversion_rate
    : totalLeadsAll ? (convertedLeads / totalLeadsAll) * 100 : 0;
  const conversionRate = Number.isFinite(conversionRateRaw) ? conversionRateRaw.toFixed(1) : "0.0";

  const notInterested = Number((summary?.status_breakdown_all || []).find((r) => r.status === "not_interested")?.count || 0);
  const junk = Number((summary?.status_breakdown_all || []).find((r) => r.status === "junk")?.count || 0);
  const overdue = summary?.aging_sla?.overdue ?? 0;
  const totalSla = pipelineLeads || totalLeadsAll || 1;

  const funnelData = (summary?.funnel || [])
    .map((r) => ({ name: (r.status || "").replace(/_/g, " ").toUpperCase(), value: Number(r.count || 0), fill: STATUS_COLORS[r.status] || "#3b82f6", pct: pipelineLeads > 0 ? ((Number(r.count || 0) / pipelineLeads) * 100).toFixed(0) : 0 }))
    .sort((a, b) => b.value - a.value);

  const statusTiles = (summary?.status_breakdown_all || [])
    .map((r) => ({ key: r.status || "unknown", name: (r.status || "").replace(/_/g, " "), value: Number(r.count || 0), fill: STATUS_COLORS[r.status] || "#3b82f6", pct: totalLeadsAll > 0 ? ((Number(r.count || 0) / totalLeadsAll) * 100).toFixed(0) : 0 }))
    .sort((a, b) => b.value - a.value);

  const agentData = (summary?.agent_performance || [])
    .map((r) => ({ name: r.name || `User #${r.created_by}`, created_by: r.created_by, followUps: Number(r.follow_up_count || 0), leads: Number(r.lead_count || 0), converted: Number(r.converted_count || 0), convRate: Number(r.lead_count || 0) > 0 ? ((Number(r.converted_count || 0) / Number(r.lead_count)) * 100).toFixed(0) : 0 }))
    .sort((a, b) => b.followUps - a.followUps);

  const sourceData = (summary?.source_branch || []).reduce((acc, curr) => {
    const n = sourceOptions.find((s) => String(s.id) === String(curr.inquiry_source_id))?.source_name || `Src #${curr.inquiry_source_id}`;
    const ex = acc.find((i) => i.name === n);
    if (ex) ex.value += Number(curr.total || 0);
    else acc.push({ name: n, value: Number(curr.total || 0) });
    return acc;
  }, []).sort((a, b) => b.value - a.value);
  const totalSource = sourceData.reduce((s, r) => s + r.value, 0);

  const priorityData = (summary?.priority_breakdown || []).map((r) => ({ name: (r.priority || "").toUpperCase(), value: Number(r.count || 0), fill: PRIORITY_COLORS[r.priority] || "#94a3b8" }));
  const productData = (summary?.product_breakdown || []).map((r) => ({ name: (r.product_interest || "Unknown").replace(/_/g, " "), value: Number(r.count || 0) }));
  const segmentData = (summary?.segment_breakdown || []).map((r) => ({ name: (r.lead_segment || "unknown"), value: Number(r.count || 0) }));
  const totalSegment = segmentData.reduce((s, r) => s + r.value, 0);
  const trendData = (summary?.daily_trend || []).map((r) => ({ date: r.date?.slice(5) || r.date, Leads: Number(r.count || 0) }));

  const activeFilterCount = [filters.from, filters.to, filters.branch_id, filters.source_ids?.length > 0, filters.status?.length > 0, filters.priority?.length > 0, filters.lead_segment, filters.product_interest, filters.assigned_to].filter(Boolean).length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-slate-50 text-slate-900 font-sans">
        <div className="mx-auto max-w-[1440px] px-3 py-3 pb-8 space-y-2.5">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <IconChartBar size={16} stroke={1.8} className="text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">Marketing Analysis</h1>
                <p className="text-[11px] text-slate-500">Pipeline · Performance · Insights</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Date presets */}
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <IconCalendar size={11} /> Quick:
              </span>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  disabled={loading}
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
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}</Badge>
              )}
              <div className="h-4 w-px bg-slate-200 mx-0.5" />
              <Button size="sm" variant="outline" onClick={() => { setFilters(INITIAL_FILTERS); setActivePreset(null); loadSummary(INITIAL_FILTERS); }} disabled={loading} className="h-7 text-xs gap-1 px-2">
                <IconRefresh size={11} /> Reset
              </Button>
              <Button size="sm" onClick={() => { setActivePreset(null); loadSummary(); }} disabled={loading} className="h-7 text-xs gap-1 px-2">
                <IconFilter size={11} /> Apply
              </Button>
            </div>
          </div>

          {/* ── Collapsible Filters ─────────────────────────────────────────── */}
          <Card className="rounded-xl shadow-sm border-slate-200 bg-white">
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors rounded-xl"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <IconFilter size={12} /> Advanced Filters
                {activeFilterCount > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1">{activeFilterCount}</Badge>}
              </span>
              {filtersOpen ? <IconChevronUp size={13} className="text-slate-400" /> : <IconChevronDown size={13} className="text-slate-400" />}
            </button>
            {filtersOpen && (
              <div className="border-t border-slate-100 px-3 py-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                <DateField label="From Date" name="from" fullWidth value={filters.from} onChange={(e) => fc("from", e.target.value)} />
                <DateField label="To Date" name="to" fullWidth value={filters.to} onChange={(e) => fc("to", e.target.value)} />
                <Select name="branch_id" label="Branch" fullWidth value={filters.branch_id} onChange={(e) => fc("branch_id", e.target.value)}>
                  <MenuItem value="">All Branches</MenuItem>
                  {branchOptions.map((b) => <MenuItem key={b.id} value={String(b.id)}>{b.name ?? b.label ?? b.id}</MenuItem>)}
                </Select>
                <MultiSelect name="source_ids" label="Sources" fullWidth placeholder="Sources…" options={sourceOptions.map((s) => ({ value: String(s.id), label: s.source_name || s.name || String(s.id) }))} value={filters.source_ids} onChange={(e) => fc("source_ids", e.target.value)} />
                <MultiSelect name="status" label="Status" fullWidth placeholder="Status…" options={[{ value: "new", label: "New" }, { value: "contacted", label: "Contacted" }, { value: "follow_up", label: "Follow Up" }, { value: "interested", label: "Interested" }, { value: "converted", label: "Converted" }, { value: "not_interested", label: "Not Interested" }, { value: "junk", label: "Junk" }]} value={filters.status} onChange={(e) => fc("status", e.target.value)} />
                <MultiSelect name="priority" label="Priority" fullWidth placeholder="Priority…" options={[{ value: "hot", label: "🔴 Hot" }, { value: "high", label: "🟠 High" }, { value: "medium", label: "🟡 Medium" }, { value: "low", label: "⚪ Low" }]} value={filters.priority} onChange={(e) => fc("priority", e.target.value)} />
                <Select name="lead_segment" label="Segment" fullWidth value={filters.lead_segment} onChange={(e) => fc("lead_segment", e.target.value)}>
                  <MenuItem value="">All Segments</MenuItem>
                  <MenuItem value="residential">Residential</MenuItem>
                  <MenuItem value="commercial">Commercial</MenuItem>
                  <MenuItem value="industrial">Industrial</MenuItem>
                </Select>
                <Select name="product_interest" label="Product" fullWidth value={filters.product_interest} onChange={(e) => fc("product_interest", e.target.value)}>
                  <MenuItem value="">All Products</MenuItem>
                  <MenuItem value="rooftop_solar">Rooftop Solar</MenuItem>
                  <MenuItem value="ground_mount">Ground Mount</MenuItem>
                  <MenuItem value="solar_water_heater">Water Heater</MenuItem>
                  <MenuItem value="solar_pump">Solar Pump</MenuItem>
                </Select>
                <Select name="assigned_to" label="Assigned To" fullWidth value={filters.assigned_to} onChange={(e) => fc("assigned_to", e.target.value)}>
                  <MenuItem value="">All Users</MenuItem>
                  {userOptions.map((u) => <MenuItem key={u.id} value={String(u.id)}>{u.name ?? u.label ?? `User #${u.id}`}</MenuItem>)}
                </Select>
              </div>
            )}
          </Card>

          {/* ── KPI Strip ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 h-auto lg:h-[100px]">
            <KpiCard icon={<IconUsers size={16} className="text-blue-600" />} label="Total Leads (All)" value={totalLeadsAll} trend={{ direction: "neutral", label: "All time" }} loading={loading} onClick={() => router.push("/marketing-leads")} />
            <KpiCard icon={<IconActivity size={16} className="text-amber-500" />} label="In Pipeline" value={pipelineLeads} trend={{ direction: "neutral", label: "Active stages" }} sub="Excl. converted & junk" loading={loading} onClick={() => router.push("/marketing-leads")} />
            <KpiCard icon={<IconTarget size={16} className="text-emerald-600" />} label="Converted" value={convertedLeads} valueColor="#16a34a" trend={{ direction: "up", label: `${conversionRate}% rate` }} loading={loading} onClick={() => router.push("/marketing-leads?status=converted")} />
            <KpiCard icon={<IconTrendingUp size={16} className="text-indigo-500" />} label="Conversion Rate" value={`${conversionRate}%`} trend={{ direction: Number(conversionRate) >= 10 ? "up" : "down", label: Number(conversionRate) >= 10 ? "Healthy" : "Low" }} loading={loading} />
            <KpiCard icon={<IconAlertCircle size={16} className={overdue > 0 ? "text-red-500" : "text-emerald-600"} />} label="Overdue Follow-ups" value={overdue} valueColor={overdue > 0 ? "#dc2626" : undefined} trend={{ direction: overdue > 0 ? "down" : "up", label: overdue > 0 ? "Action Required" : "On Track" }} loading={loading} onClick={() => { const t = new Date().toISOString().split("T")[0]; router.push(`/marketing-leads?next_follow_up_to=${t}`); }} />
            <KpiCard icon={<IconMinus size={16} className="text-slate-400" />} label="Not Int. / Junk" value={notInterested + junk} sub={`${notInterested} not int. · ${junk} junk`} trend={{ direction: "neutral", label: "Closed" }} loading={loading} />
          </div>

          {/* ── Status Breakdown ───────────────────────────────────────────── */}
          {statusTiles.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Status Breakdown</p>
              <div className="flex gap-2 flex-wrap">
                {statusTiles.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => router.push(`/marketing-leads?status=${item.key}`)}
                    className="flex flex-col items-start px-2.5 py-1.5 rounded-lg border bg-white hover:shadow-sm transition-all min-w-[90px]"
                    style={{ borderLeftWidth: 3, borderLeftColor: item.fill, borderTop: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}
                  >
                    <span className="text-[10px] font-semibold uppercase" style={{ color: item.fill }}>{item.name}</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-sm font-bold text-slate-900">{item.value}</span>
                      <span className="text-[10px] text-slate-400">{item.pct}%</span>
                    </div>
                    <MiniBar value={item.value} max={totalLeadsAll} color={item.fill} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Trend Chart (only if data) ─────────────────────────────────── */}
          {trendData.length > 0 && (
            <Card className="rounded-xl shadow-sm border-slate-200 bg-white">
              <PanelHeader title="Lead Trend Over Time" subtitle="Daily lead creation within selected period" />
              <div className="px-2 pb-2" style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={22} />
                    <RTooltip contentStyle={TT_STYLE} cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "3 2" }} />
                    <Area dataKey="Leads" stroke="#3b82f6" strokeWidth={1.5} fill="url(#trendGrad)" dot={false} activeDot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* ── Row 1: Funnel + SLA ───────────────────────────────────────── */}
          <div className="grid grid-cols-12 gap-3">

            {/* Funnel */}
            <div className="col-span-12 lg:col-span-8">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Lead Pipeline Funnel" subtitle="Active stages by volume — click to drill down" />
                <div className="flex px-2 pb-2 gap-3">
                  {/* Chart */}
                  <div className="flex-1" style={{ height: 220 }}>
                    {funnelData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                          <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`${v} leads`]} />
                          <Funnel dataKey="value" data={funnelData} isAnimationActive onClick={(d) => { const s = (d?.payload?.name || "").toLowerCase().replace(/ /g, "_"); if (s) router.push(`/marketing-leads?status=${s}`); }} style={{ cursor: "pointer" }}>
                            <LabelList position="right" fill="#475569" stroke="none" dataKey="name" fontSize={10} />
                          </Funnel>
                        </FunnelChart>
                      </ResponsiveContainer>
                    ) : <EmptyState text="No funnel data for applied filters" />}
                  </div>
                  {/* Legend */}
                  {funnelData.length > 0 && (
                    <div className="flex flex-col justify-center gap-1.5 border-l border-slate-100 pl-3 min-w-[130px]">
                      {funnelData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                            <span className="text-slate-500">{item.name}</span>
                          </div>
                          <span className="font-semibold text-slate-800">{item.value} <span className="text-slate-400 font-normal">({item.pct}%)</span></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* SLA */}
            <div className="col-span-12 lg:col-span-4">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Aging & SLA Overview" subtitle="Follow-up urgency — click to view leads" />
                <CardContent className="p-2 space-y-1">
                  {[
                    { label: "Overdue", val: overdue, color: "#ef4444", onClick: () => { const t = new Date().toISOString().split("T")[0]; router.push(`/marketing-leads?next_follow_up_to=${t}&not_status=converted,junk,not_interested`); } },
                    { label: "Due Today", val: summary?.aging_sla?.due_today ?? 0, color: "#3b82f6", onClick: () => { const t = new Date().toISOString().split("T")[0]; router.push(`/marketing-leads?next_follow_up_from=${t}&next_follow_up_to=${t}`); } },
                    { label: "Due This Week", val: summary?.aging_sla?.due_this_week ?? 0, color: "#8b5cf6", onClick: () => { const t = new Date(), nw = new Date(t); nw.setDate(nw.getDate() + 7); router.push(`/marketing-leads?next_follow_up_from=${t.toISOString().split("T")[0]}&next_follow_up_to=${nw.toISOString().split("T")[0]}`); } },
                    { label: "Stale (7+ days)", val: summary?.aging_sla?.stale_7_plus ?? 0, color: "#94a3b8", onClick: () => { const t = new Date(), s = new Date(t); s.setDate(s.getDate() - 7); router.push(`/marketing-leads?created_to=${s.toISOString().split("T")[0]}&not_status=converted,junk,not_interested`); } },
                  ].map(({ label, val, color, onClick }) => (
                    <div key={label} onClick={onClick} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-50 cursor-pointer transition-colors">
                      <span className="text-xs text-slate-600 flex-1 font-medium">{label}</span>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color, backgroundColor: `${color}18` }}>{val}</span>
                      <div className="w-16">
                        <MiniBar value={val} max={totalSla} color={color} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-1 mt-1 border-t border-slate-100 grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <span className="text-[10px] text-slate-400">Pipeline total</span>
                    <span className="text-[10px] font-semibold text-right text-slate-700">{pipelineLeads} leads</span>
                    <span className="text-[10px] text-slate-400">Avg. days in pipeline</span>
                    <span className="text-[10px] font-semibold text-right text-slate-700">{summary?.aging_sla?.avg_days_in_pipeline != null ? `${Number(summary.aging_sla.avg_days_in_pipeline).toFixed(1)}d` : "—"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Row 2: Priority + Product + Segment ───────────────────────── */}
          <div className="grid grid-cols-12 gap-3">

            {/* Priority */}
            <div className="col-span-12 md:col-span-4">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Priority Distribution" subtitle="Lead volume by priority level" />
                <div className="px-2 pb-2" style={{ height: 180 }}>
                  {priorityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priorityData} layout="vertical" margin={{ top: 2, right: 16, left: 4, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" width={50} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <RTooltip contentStyle={TT_STYLE} cursor={{ fill: "#f8fafc" }} />
                        <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={20}>{priorityData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState text="No priority data from API" />}
                </div>
              </Card>
            </div>

            {/* Product Interest */}
            <div className="col-span-12 md:col-span-4">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Product Interest" subtitle="Solar product type — click to filter" />
                <div className="px-2 pb-2" style={{ height: 180 }}>
                  {productData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productData} layout="vertical" margin={{ top: 2, right: 16, left: 4, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                        <RTooltip contentStyle={TT_STYLE} cursor={{ fill: "#f8fafc" }} />
                        <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={20} onClick={(d) => { const raw = (d?.name || "").toLowerCase().replace(/ /g, "_"); if (raw) router.push(`/marketing-leads?product_interest=${raw}`); }} style={{ cursor: "pointer" }}>
                          {productData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState text="No product data from API" />}
                </div>
              </Card>
            </div>

            {/* Segment */}
            <div className="col-span-12 md:col-span-4">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Lead Segment" subtitle="Residential · Commercial · Industrial" />
                {segmentData.length > 0 ? (
                  <div className="flex items-center px-2 pb-2 gap-2">
                    <div style={{ width: 130, minWidth: 130, height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={segmentData} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={3} dataKey="value" onClick={(d) => { const v = (d?.payload?.name || "").toLowerCase(); if (v) router.push(`/marketing-leads?lead_segment=${v}`); }} style={{ cursor: "pointer" }}>
                            {segmentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            <Label content={<CenterLabel total={totalSegment} />} position="center" />
                          </Pie>
                          <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`${v} leads`]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      {segmentData.map((s, i) => (
                        <button key={s.name} onClick={() => router.push(`/marketing-leads?lead_segment=${s.name.toLowerCase()}`)} className="flex items-center justify-between gap-1 hover:bg-slate-50 px-1 py-0.5 rounded text-left transition-colors">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-xs text-slate-600 capitalize">{s.name}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-800">{s.value} <span className="text-[10px] text-slate-400 font-normal">({totalSegment > 0 ? `${((s.value / totalSegment) * 100).toFixed(0)}%` : "—"})</span></span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : <div className="px-2 pb-2" style={{ height: 180 }}><EmptyState text="No segment data from API" /></div>}
              </Card>
            </div>
          </div>

          {/* ── Row 3: Agent Leaderboard + Source Effectiveness ───────────── */}
          <div className="grid grid-cols-12 gap-3">

            {/* Agent Leaderboard */}
            <div className="col-span-12 lg:col-span-7">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Agent Leaderboard" subtitle="Follow-up activity & conversion — click to filter" />
                {agentData.length > 0 ? (
                  <div className="flex flex-col">
                    {/* Bar chart */}
                    <div className="px-2" style={{ height: 130 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={agentData.slice(0, 8)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={22} />
                          <RTooltip contentStyle={TT_STYLE} cursor={{ fill: "#f8fafc" }} />
                          <Bar dataKey="followUps" name="Follow-ups" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={30} onClick={(d) => { if (d?.payload?.created_by) router.push(`/marketing-leads?assigned_to=${d.payload.created_by}`); }} style={{ cursor: "pointer" }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Rank table */}
                    <div className="overflow-auto border-t border-slate-100">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400">
                            <th className="text-left px-2 py-1 font-semibold w-5">#</th>
                            <th className="text-left px-2 py-1 font-semibold">Agent</th>
                            <th className="text-right px-2 py-1 font-semibold">F/U</th>
                            <th className="text-right px-2 py-1 font-semibold">Leads</th>
                            <th className="text-right px-2 py-1 font-semibold">Conv%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentData.slice(0, 5).map((a, i) => (
                            <tr key={a.created_by} className="border-t border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/marketing-leads?assigned_to=${a.created_by}`)}>
                              <td className="px-2 py-1 font-bold" style={{ color: i === 0 ? "#eab308" : i === 1 ? "#94a3b8" : i === 2 ? "#f97316" : "#cbd5e1" }}>{i + 1}</td>
                              <td className="px-2 py-1 font-medium text-slate-700">{a.name}</td>
                              <td className="px-2 py-1 text-right font-semibold text-slate-800">{a.followUps}</td>
                              <td className="px-2 py-1 text-right text-slate-500">{a.leads || "—"}</td>
                              <td className="px-2 py-1 text-right">
                                <span className={`text-[10px] px-1 py-0.5 rounded font-semibold ${Number(a.convRate) >= 10 ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                                  {a.leads > 0 ? `${a.convRate}%` : "—"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : <div style={{ height: 200 }}><EmptyState text="No agent data available" /></div>}
              </Card>
            </div>

            {/* Source Effectiveness */}
            <div className="col-span-12 lg:col-span-5">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Lead Source Effectiveness" subtitle="Volume by inquiry source — click to filter" />
                {sourceData.length > 0 ? (
                  <div className="flex flex-col">
                    <div className="px-2" style={{ height: 150 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sourceData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value" onClick={(d) => { const m = sourceOptions.find((s) => s.source_name === d?.payload?.name); if (m) router.push(`/marketing-leads?inquiry_source_id=${m.id}`); }} style={{ cursor: "pointer" }}>
                            {sourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`${v} leads`]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="border-t border-slate-100 overflow-auto">
                      <table className="w-full text-[11px]">
                        <tbody>
                          {sourceData.slice(0, 6).map((s, i) => (
                            <tr key={s.name} className="border-t border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => { const m = sourceOptions.find((src) => src.source_name === s.name); if (m) router.push(`/marketing-leads?inquiry_source_id=${m.id}`); }}>
                              <td className="px-2 py-1 w-3"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} /></td>
                              <td className="px-2 py-1 text-slate-600">{s.name}</td>
                              <td className="px-2 py-1 text-right font-semibold text-slate-800">{s.value}</td>
                              <td className="px-2 py-1 text-right text-slate-400">{totalSource > 0 ? `${((s.value / totalSource) * 100).toFixed(0)}%` : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : <div style={{ height: 200 }}><EmptyState text="No source data available" /></div>}
              </Card>
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
