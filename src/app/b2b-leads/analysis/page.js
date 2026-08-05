"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DateField from "@/components/common/DateField";
import Select, { MenuItem } from "@/components/common/Select";
import MultiSelect from "@/components/common/MultiSelect";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsForFilter } from "@/services/mastersService";
import ChartCard from "@/components/common/ChartCard";
import b2bLeadService from "@/services/b2bLeadService";
import mastersService from "@/services/mastersService";
import { toast } from "sonner";
import {
  B2B_STATUS_OPTIONS,
  B2B_PRIORITY_OPTIONS,
  B2B_PIPELINE_STAGE_OPTIONS,
  B2B_STAGE_COLORS,
} from "../b2bLeadFilterOptions";
import {
  buildB2bDrilldownHref,
  formatInrCompact,
  formatDelta,
} from "./analysisDrilldown";
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
  IconDownload,
  IconClock,
  IconCurrencyRupee,
  IconInfoCircle,
} from "@tabler/icons-react";
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
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";

const EMPTY_FILTERS = {
  from: "",
  to: "",
  status: [],
  pipeline_stage: [],
  priority: [],
  inquiry_source_id: [],
  assigned_to: "",
  business_type: "",
  industry: "",
  city: "",
  state: "",
};

const last30DayRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
};

/** Default dashboard window: last 30 days */
const DEFAULT_FILTERS = () => ({
  ...EMPTY_FILTERS,
  ...last30DayRange(),
});

const DATE_PRESETS = [
  {
    label: "Today",
    fn: () => {
      const d = new Date().toISOString().split("T")[0];
      return { from: d, to: d };
    },
  },
  {
    label: "7D",
    fn: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 6);
      return { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] };
    },
  },
  {
    label: "30D",
    fn: last30DayRange,
  },
  {
    label: "Quarter",
    fn: () => {
      const n = new Date();
      const q = Math.floor(n.getMonth() / 3);
      const from = new Date(n.getFullYear(), q * 3, 1);
      const to = new Date(n.getFullYear(), q * 3 + 3, 0);
      return { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] };
    },
  },
  {
    label: "Year",
    fn: () => {
      const n = new Date();
      return {
        from: `${n.getFullYear()}-01-01`,
        to: n.toISOString().split("T")[0],
      };
    },
  },
];

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#ef4444"];
const TT_STYLE = {
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.2)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
  fontSize: 11,
  backgroundColor: "rgba(255, 255, 255, 0.85)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

function filtersFromSearchParams(sp) {
  const arr = (k) => {
    const v = sp.get(k);
    if (!v) return [];
    return v.split(",").map((x) => x.trim()).filter(Boolean);
  };
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";
  const defaults = last30DayRange();
  return {
    from: from || defaults.from,
    to: to || defaults.to,
    status: arr("status"),
    pipeline_stage: arr("pipeline_stage"),
    priority: arr("priority"),
    inquiry_source_id: arr("inquiry_source_id"),
    assigned_to: sp.get("assigned_to") || "",
    business_type: sp.get("business_type") || "",
    industry: sp.get("industry") || "",
    city: sp.get("city") || "",
    state: sp.get("state") || "",
  };
}

function resolveActivePreset(filters) {
  if (!filters?.from || !filters?.to) return "30D";
  for (const preset of DATE_PRESETS) {
    const range = preset.fn();
    if (range.from === filters.from && range.to === filters.to) return preset.label;
  }
  return null;
}

function filtersToParams(f) {
  const params = {};
  if (f.from) params.from = f.from;
  if (f.to) params.to = f.to;
  if (f.status?.length) params.status = f.status.join(",");
  if (f.pipeline_stage?.length) params.pipeline_stage = f.pipeline_stage.join(",");
  if (f.priority?.length) params.priority = f.priority.join(",");
  if (f.inquiry_source_id?.length) params.inquiry_source_id = f.inquiry_source_id.join(",");
  if (f.assigned_to) params.assigned_to = f.assigned_to;
  if (f.business_type) params.business_type = f.business_type;
  if (f.industry) params.industry = f.industry;
  if (f.city) params.city = f.city;
  if (f.state) params.state = f.state;
  return params;
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1 rounded-full bg-slate-100 overflow-hidden w-full mt-1">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function TrendChip({ direction, label }) {
  const colorCls =
    direction === "up"
      ? "text-emerald-600 bg-emerald-50"
      : direction === "down"
        ? "text-red-500 bg-red-50"
        : "text-slate-500 bg-slate-100";
  const Icon = direction === "up" ? IconArrowUpRight : direction === "down" ? IconArrowDownRight : IconMinus;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colorCls}`}>
      <Icon size={11} /> {label}
    </span>
  );
}

function KpiCard({ icon, label, value, sub, trend, loading, onClick, definition }) {
  return (
    <Card
      onClick={onClick}
      title={definition || undefined}
      className={`rounded-2xl shadow-sm border-slate-200/60 bg-white/80 backdrop-blur-sm transition-all duration-300 ${onClick ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-slate-300/80" : ""} ${loading ? "animate-pulse" : ""}`}
    >
      <CardContent className="p-2.5 flex flex-col justify-between h-full min-h-[96px]">
        <div className="flex justify-between items-start gap-1">
          <span className="text-[10px] font-bold text-slate-500 leading-snug uppercase tracking-wide line-clamp-2">{label}</span>
          {icon && <div className="p-1 bg-gradient-to-br from-slate-50 to-slate-100/80 rounded-md border border-slate-100 shadow-sm shrink-0 flex items-center justify-center">{icon}</div>}
        </div>
        <div className="mt-2">
          <div className="flex items-end justify-between gap-1 w-full">
            <span className="text-xl font-extrabold text-slate-800 tracking-tight tabular-nums leading-none truncate">{loading ? "…" : value ?? "—"}</span>
            {trend && <div className="shrink-0 mb-0.5"><TrendChip {...trend} /></div>}
          </div>
          {sub && <p className="text-[9px] text-slate-400 font-medium leading-tight mt-1 truncate" title={sub}>{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PanelHeader({ title, subtitle, action }) {
  return (
    <div className="px-3 pt-2.5 pb-1.5 border-b border-slate-100 flex items-start justify-between gap-2">
      <div>
        <h3 className="text-xs font-semibold text-slate-700 leading-tight">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ text = "No data" }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-6">
      <IconChartBar size={22} className="text-slate-300 mb-1" />
      <p className="text-xs text-slate-400 max-w-[180px]">{text}</p>
    </div>
  );
}

function severityCls(severity) {
  if (severity === "critical") return "border-red-300 bg-red-50 text-red-900 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse border-[1.5px]";
  if (severity === "warning") return "border-amber-300 bg-amber-50 text-amber-900 hover:shadow-sm";
  return "border-slate-200/60 bg-white/80 backdrop-blur-sm text-slate-700 hover:shadow-sm";
}

export default function B2bLeadsAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState(() => filtersFromSearchParams(searchParams));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(() =>
    resolveActivePreset(filtersFromSearchParams(searchParams))
  );
  const [sourceOptions, setSourceOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);

  useEffect(() => {
    Promise.all([
      mastersService
        .getReferenceOptions("inquiry_source.model", { visibility: "all" })
        .then((r) => {
          const d = r?.result ?? r?.data ?? r;
          return Array.isArray(d) ? d : [];
        }),
      mastersService
        .getReferenceOptions("user.model", { status_in: "active,inactive" })
        .then((r) => {
          const d = r?.result ?? r?.data ?? r;
          return Array.isArray(d) ? d : [];
        }),
    ])
      .then(([s, u]) => {
        setSourceOptions(s);
        setUserOptions(u);
      })
      .catch(() => {});
  }, []);

  const syncUrl = useCallback(
    (next) => {
      const params = filtersToParams(next);
      const qs = new URLSearchParams(params).toString();
      router.replace(qs ? `/b2b-leads/analysis?${qs}` : "/b2b-leads/analysis");
    },
    [router]
  );

  const loadReport = useCallback(
    async (override) => {
      const f = override ?? filters;
      try {
        setLoading(true);
        const res = await b2bLeadService.getB2bLeadsAnalysis(filtersToParams(f));
        setReport(res?.result ?? res?.data ?? res);
      } catch (err) {
        setReport(null);
        toast.error(err?.response?.data?.message || "Failed to load analysis");
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    const initial = filtersFromSearchParams(searchParams);
    const hadDates = Boolean(searchParams.get("from") || searchParams.get("to"));
    setFilters(initial);
    setActivePreset(resolveActivePreset(initial));
    if (!hadDates) syncUrl(initial);
    loadReport(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fc = (key, val) => setFilters((p) => ({ ...p, [key]: val }));

  const applyPreset = (preset) => {
    const dates = preset.fn();
    const next = { ...filters, ...dates };
    setFilters(next);
    setActivePreset(preset.label);
    syncUrl(next);
    loadReport(next);
  };

  const applyFilters = () => {
    setActivePreset(resolveActivePreset(filters));
    syncUrl(filters);
    loadReport(filters);
  };

  const resetFilters = () => {
    const next = DEFAULT_FILTERS();
    setFilters(next);
    setActivePreset("30D");
    syncUrl(next);
    loadReport(next);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await b2bLeadService.exportB2bLeadsAnalysis(filtersToParams(filters));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `b2b-leads-analysis-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const drill = (drilldown = {}, target = "leads") => {
    const base = target === "followup" ? "/b2b-lead-followup" : "/b2b-leads";
    router.push(buildB2bDrilldownHref(base, drilldown, report?.meta?.period));
  };

  const kpis = report?.kpis || {};
  const funnelData = (report?.funnel || []).map((r) => ({
    name: String(r.stage || "").replace(/_/g, " ").toUpperCase(),
    stage: r.stage,
    value: Number(r.count) || 0,
    fill: B2B_STAGE_COLORS[r.stage] || "#3b82f6",
    conv: r.conversion_from_prev,
  }));
  const trendData = (report?.trends?.daily || []).map((r) => ({
    date: String(r.date || "").slice(5),
    Leads: Number(r.leads) || 0,
    Conversions: Number(r.conversions) || 0,
  }));
  const sourceData = report?.sources || [];
  const execData = report?.executives || [];
  const priorityData = (report?.segments?.priority || []).map((r) => ({
    name: String(r.priority || "").toUpperCase(),
    value: Number(r.count) || 0,
  }));
  const productData = (report?.segments?.products || []).slice(0, 8);
  const lossData = report?.loss_reasons || [];
  const insights = report?.insights || [];
  const health = report?.followup_health || {};
  const aging = report?.aging || {};
  const defs = report?.meta?.metric_definitions || {};

  const activeFilterCount = Object.entries(filters).filter(([, v]) =>
    Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== ""
  ).length;

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-50 via-slate-50 to-indigo-50/40 text-slate-900">
        <div className="mx-auto max-w-[1440px] px-3 py-4 pb-12 space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2 rounded-xl shadow-sm border border-indigo-400/20">
                <IconChartBar size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent leading-tight">
                  B2B Leads Analysis
                </h1>
                <p className="text-[11px] text-slate-500">
                  Pipeline · Velocity · Risks · Tenant growth
                  {report?.meta?.visibility === "my_team" ? " · My team scope" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <IconCalendar size={11} /> Quick:
              </span>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  disabled={loading}
                  className={[
                    "text-[11px] px-2.5 py-0.5 border font-semibold transition-all shadow-sm first:rounded-l-full last:rounded-r-full -ml-[1px] first:ml-0 relative",
                    activePreset === p.label
                      ? "bg-slate-800 text-white border-slate-800 z-10 hover:bg-slate-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 z-0",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {activeFilterCount} filters
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={resetFilters} disabled={loading} className="h-7 text-xs gap-1 px-2">
                <IconRefresh size={11} /> Reset
              </Button>
              <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting} className="h-7 text-xs gap-1 px-2">
                <IconDownload size={11} /> {exporting ? "…" : "Export"}
              </Button>
              <Button size="sm" onClick={applyFilters} disabled={loading} className="h-7 text-xs gap-1 px-2">
                <IconFilter size={11} /> Apply
              </Button>
              <Button size="sm" variant="ghost" onClick={() => router.push("/b2b-leads")} className="h-7 text-xs px-2">
                Back
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="rounded-xl shadow-sm border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-xl"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <IconFilter size={12} /> Advanced Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </span>
              {filtersOpen ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
            </button>
            {filtersOpen && (
              <div className="border-t border-slate-100 px-3 py-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                <DateField label="From" name="from" fullWidth value={filters.from} onChange={(e) => fc("from", e.target.value)} />
                <DateField label="To" name="to" fullWidth value={filters.to} onChange={(e) => fc("to", e.target.value)} />
                <MultiSelect
                  name="status"
                  label="Status"
                  fullWidth
                  options={B2B_STATUS_OPTIONS}
                  value={filters.status}
                  onChange={(e) => fc("status", e.target.value)}
                />
                <MultiSelect
                  name="pipeline_stage"
                  label="Pipeline Stage"
                  fullWidth
                  options={B2B_PIPELINE_STAGE_OPTIONS}
                  value={filters.pipeline_stage}
                  onChange={(e) => fc("pipeline_stage", e.target.value)}
                />
                <MultiSelect
                  name="priority"
                  label="Priority"
                  fullWidth
                  options={B2B_PRIORITY_OPTIONS}
                  value={filters.priority}
                  onChange={(e) => fc("priority", e.target.value)}
                />
                <MultiSelect
                  name="inquiry_source_id"
                  label="Sources"
                  fullWidth
                  options={sourceOptions.map((s) => ({
                    value: String(s.id),
                    label: s.source_name || s.name || String(s.id),
                  }))}
                  value={filters.inquiry_source_id}
                  onChange={(e) => fc("inquiry_source_id", e.target.value)}
                />
                <Select
                  name="assigned_to"
                  label="Executive"
                  fullWidth
                  value={filters.assigned_to}
                  onChange={(e) => fc("assigned_to", e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {userOptions.map((u) => (
                    <MenuItem key={u.id} value={String(u.id)}>
                      {u.name || `User #${u.id}`}
                    </MenuItem>
                  ))}
                </Select>
                <Input label="Business Type" value={filters.business_type} onChange={(e) => fc("business_type", e.target.value)} />
                <Input label="Industry" value={filters.industry} onChange={(e) => fc("industry", e.target.value)} />
                <Input label="City" value={filters.city} onChange={(e) => fc("city", e.target.value)} />
                <AutocompleteField
                  label="State"
                  asyncLoadOptions={(q) => getReferenceOptionsForFilter("state.model", { q, limit: 40 })}
                  getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                  value={filters.state ? { name: filters.state } : null}
                  onChange={(_e, newValue) =>
                    fc("state", newValue?.name ?? newValue?.label ?? "")
                  }
                  placeholder="Type to search..."
                  clearable
                />
              </div>
            )}
          </Card>

          {/* Insights / Warnings */}
          {insights.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Insights & Warnings (rule-based)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {insights.slice(0, 6).map((ins) => (
                  <button
                    key={ins.id}
                    type="button"
                    onClick={() => drill(ins.drilldown || {})}
                    className={`text-left rounded-lg border px-2.5 py-2 ${severityCls(ins.severity)} hover:shadow-sm transition-shadow`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold leading-tight">{ins.title}</span>
                      <Badge variant="outline" className="text-[9px] h-4 capitalize shrink-0">
                        {ins.severity}
                      </Badge>
                    </div>
                    <p className="text-[10px] mt-1 leading-snug opacity-90">{ins.evidence}</p>
                    <p className="text-[9px] mt-1 opacity-70">Threshold: {ins.threshold}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
            <KpiCard
              icon={<IconUsers size={15} className="text-blue-600" />}
              label="New Leads"
              value={kpis.new_leads?.value}
              trend={formatDelta(kpis.new_leads?.delta_pct)}
              definition={defs.new_leads}
              loading={loading}
              onClick={() => drill({})}
            />
            <KpiCard
              icon={<IconActivity size={15} className="text-amber-500" />}
              label="Active Pipeline"
              value={kpis.active_pipeline?.value}
              definition={defs.active_pipeline}
              loading={loading}
              onClick={() => drill({ not_status: "converted,not_interested" })}
            />
            <KpiCard
              icon={<IconCurrencyRupee size={15} className="text-emerald-600" />}
              label="Pipeline Value"
              value={formatInrCompact(kpis.pipeline_value?.value)}
              sub={
                kpis.pipeline_value?.budget_coverage_pct != null
                  ? `Budget coverage ${kpis.pipeline_value.budget_coverage_pct}%`
                  : undefined
              }
              definition={defs.pipeline_value}
              loading={loading}
              onClick={() => drill({ not_status: "converted,not_interested" })}
            />
            <KpiCard
              icon={<IconTarget size={15} className="text-emerald-600" />}
              label="Conversions"
              value={kpis.conversions?.value}
              trend={formatDelta(kpis.conversions?.delta_pct)}
              definition={defs.conversions}
              loading={loading}
              onClick={() => drill({ status: "converted" })}
            />
            <KpiCard
              icon={<IconTrendingUp size={15} className="text-indigo-500" />}
              label="Conversion %"
              value={kpis.conversion_rate?.value != null ? `${kpis.conversion_rate.value}%` : "—"}
              sub={
                kpis.conversion_rate?.target != null
                  ? `Target ${kpis.conversion_rate.target}%`
                  : undefined
              }
              trend={formatDelta(kpis.conversion_rate?.delta_pct)}
              definition={defs.conversion_rate}
              loading={loading}
            />
            <KpiCard
              icon={<IconClock size={15} className="text-sky-600" />}
              label="Avg 1st Response"
              value={
                kpis.avg_first_response_hours?.insufficient_data
                  ? "n/a"
                  : kpis.avg_first_response_hours?.value != null
                    ? `${kpis.avg_first_response_hours.value}h`
                    : "—"
              }
              sub={
                kpis.avg_first_response_hours?.target
                  ? `SLA ${kpis.avg_first_response_hours.target}h`
                  : kpis.avg_first_response_hours?.missing_reason || undefined
              }
              definition={defs.avg_first_response_hours}
              loading={loading}
            />
            <KpiCard
              icon={<IconActivity size={15} className="text-violet-500" />}
              label="Avg Cycle"
              value={
                kpis.avg_sales_cycle_days?.insufficient_data
                  ? "n/a"
                  : kpis.avg_sales_cycle_days?.value != null
                    ? `${kpis.avg_sales_cycle_days.value}d`
                    : "—"
              }
              sub={kpis.avg_sales_cycle_days?.missing_reason || undefined}
              definition={defs.avg_sales_cycle_days}
              loading={loading}
              onClick={() => drill({ status: "converted" })}
            />
            <KpiCard
              icon={
                <IconAlertCircle
                  size={15}
                  className={(kpis.overdue_at_risk?.value || 0) > 0 ? "text-red-500" : "text-emerald-600"}
                />
              }
              label="Overdue / At Risk"
              value={kpis.overdue_at_risk?.value}
              trend={
                (kpis.overdue_at_risk?.value || 0) > 0
                  ? { direction: "down", label: "Action" }
                  : { direction: "up", label: "OK" }
              }
              definition={defs.overdue_at_risk}
              loading={loading}
              onClick={() => drill({ risk: "overdue" }, "followup")}
            />
          </div>

          {/* Trend */}
          <ChartCard title="Lead & Conversion Trend" subtitle="Daily within selected period" height={150} loading={loading} isEmpty={!trendData.length}>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="b2bLeadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="b2bConvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} width={22} />
                <RTooltip contentStyle={TT_STYLE} />
                <Area type="monotone" dataKey="Leads" stroke="#3b82f6" strokeWidth={2.5} fill="url(#b2bLeadGrad)" />
                <Area type="monotone" dataKey="Conversions" stroke="#10b981" strokeWidth={2.5} fill="url(#b2bConvGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Funnel + Health */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 lg:col-span-8">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader
                  title="Lifecycle Funnel"
                  subtitle="pipeline_stage counts — click to drill"
                />
                <div className="flex px-2 pb-2 gap-3">
                  <div className="flex-1" style={{ height: 220 }}>
                    {funnelData.some((d) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                          <RTooltip contentStyle={TT_STYLE} />
                          <Funnel
                            dataKey="value"
                            data={funnelData.filter((d) => d.value > 0)}
                            isAnimationActive
                            onClick={(d) => {
                              const stage = d?.payload?.stage;
                              if (stage) drill({ pipeline_stage: stage });
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            <LabelList position="right" fill="#475569" stroke="none" dataKey="name" fontSize={10} />
                          </Funnel>
                        </FunnelChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState text="Insufficient stage data" />
                    )}
                  </div>
                  <div className="flex flex-col justify-center gap-1 border-l border-slate-100 pl-3 min-w-[140px]">
                    {funnelData.map((item) => (
                      <button
                        key={item.stage}
                        type="button"
                        onClick={() => drill({ pipeline_stage: item.stage })}
                        className="flex items-center justify-between gap-2 text-[11px] hover:bg-slate-50 rounded px-1 py-0.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                          <span className="text-slate-500 capitalize">{String(item.stage).replace(/_/g, " ")}</span>
                        </div>
                        <span className="font-semibold">{item.value}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {report?.data_quality?.stage_history_note && (
                  <p className="text-[9px] text-slate-400 px-3 pb-2 flex gap-1">
                    <IconInfoCircle size={11} className="shrink-0 mt-0.5" />
                    {report.data_quality.stage_history_note}
                  </p>
                )}
              </Card>
            </div>

            <div className="col-span-12 lg:col-span-4">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Follow-up Health" subtitle="Click rows to open queue" />
                <CardContent className="p-2 space-y-1">
                  {[
                    { label: "Overdue", val: health.overdue || 0, color: "#ef4444", risk: "overdue", target: "followup" },
                    { label: "Due Today", val: health.due_today || 0, color: "#3b82f6", risk: null, target: "followup" },
                    { label: "Due This Week", val: health.due_this_week || 0, color: "#8b5cf6", risk: null, target: "followup" },
                    { label: "Unscheduled", val: health.unscheduled || 0, color: "#f59e0b", risk: "unscheduled", target: "leads" },
                    { label: "Stale", val: aging.stale || 0, color: "#94a3b8", risk: "stale", target: "leads" },
                    { label: "High-value stale", val: aging.high_value_stale || 0, color: "#dc2626", risk: "high_value", target: "leads" },
                    { label: "Purchase slipped", val: aging.purchase_slipped || 0, color: "#ea580c", risk: "purchase_slipped", target: "leads" },
                    { label: "Unassigned", val: aging.unassigned || 0, color: "#64748b", risk: "unassigned", target: "leads" },
                  ].map((row) => (
                    <button
                      key={row.label}
                      type="button"
                      onClick={() => drill(row.risk ? { risk: row.risk } : {}, row.target)}
                      className="w-full flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-50"
                    >
                      <span className="text-xs text-slate-600 flex-1 text-left font-medium">{row.label}</span>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: row.color, backgroundColor: `${row.color}18` }}>
                        {row.val}
                      </span>
                      <div className="w-14">
                        <MiniBar value={row.val} max={Math.max(kpis.active_pipeline?.value || 1, 1)} color={row.color} />
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Performance row */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 lg:col-span-5">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Source Effectiveness" subtitle="Volume · conversion · budget" />
                <div className="px-2" style={{ height: 160 }}>
                  {sourceData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={sourceData} dataKey="count" nameKey="source_name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2}
                          onClick={(d) => {
                            const id = d?.payload?.inquiry_source_id;
                            if (id) drill({ inquiry_source_id: id });
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          {sourceData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RTooltip contentStyle={TT_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState />
                  )}
                </div>
                <div className="border-t border-slate-100 overflow-auto max-h-[140px]">
                  <table className="w-full text-[11px]">
                    <tbody>
                      {sourceData.slice(0, 8).map((s, i) => (
                        <tr
                          key={s.source_name + i}
                          className="border-t border-slate-50 hover:bg-slate-50 cursor-pointer"
                          onClick={() => s.inquiry_source_id && drill({ inquiry_source_id: s.inquiry_source_id })}
                        >
                          <td className="px-2 py-1 w-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          </td>
                          <td className="px-2 py-1 text-slate-600">{s.source_name}</td>
                          <td className="px-2 py-1 text-right font-semibold">{s.count}</td>
                          <td className="px-2 py-1 text-right text-slate-400">
                            {s.conversion_rate != null ? `${s.conversion_rate}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="col-span-12 lg:col-span-7">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Executive Leaderboard" subtitle="Assigned volume · open · wins · overdue" />
                <div className="px-2" style={{ height: 130 }}>
                  {execData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={execData.slice(0, 8)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="assigned_to_name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={40} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 9 }} width={22} tickLine={false} axisLine={false} />
                        <RTooltip contentStyle={TT_STYLE} />
                        <Bar
                          dataKey="count"
                          name="Leads"
                          fill="#3b82f6"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={28}
                          onClick={(d) => d?.payload?.assigned_to && drill({ assigned_to: d.payload.assigned_to })}
                          style={{ cursor: "pointer" }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState />
                  )}
                </div>
                <div className="overflow-auto border-t border-slate-100 max-h-[160px]">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400">
                        <th className="text-left px-2 py-1">#</th>
                        <th className="text-left px-2 py-1">Executive</th>
                        <th className="text-right px-2 py-1">Leads</th>
                        <th className="text-right px-2 py-1">Open</th>
                        <th className="text-right px-2 py-1">Won</th>
                        <th className="text-right px-2 py-1">Overdue</th>
                        <th className="text-right px-2 py-1">Conv%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {execData.slice(0, 10).map((a, i) => (
                        <tr
                          key={String(a.assigned_to) + i}
                          className="border-t border-slate-50 hover:bg-slate-50 cursor-pointer"
                          onClick={() => a.assigned_to && drill({ assigned_to: a.assigned_to })}
                        >
                          <td className="px-2 py-1 font-bold text-slate-400">{i + 1}</td>
                          <td className="px-2 py-1 font-medium text-slate-700">{a.assigned_to_name}</td>
                          <td className="px-2 py-1 text-right">{a.count}</td>
                          <td className="px-2 py-1 text-right">{a.open_count}</td>
                          <td className="px-2 py-1 text-right text-emerald-600">{a.converted_count}</td>
                          <td className="px-2 py-1 text-right text-red-500">{a.overdue_count}</td>
                          <td className="px-2 py-1 text-right">
                            {a.conversion_rate != null ? `${a.conversion_rate}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>

          {/* Segments */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 md:col-span-4">
              <ChartCard title="Priority Mix" height={180} loading={loading} isEmpty={!priorityData.length}>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={priorityData} layout="vertical" margin={{ top: 2, right: 12, left: 4, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" width={50} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <RTooltip contentStyle={TT_STYLE} />
                    <Bar dataKey="value" fill="#f59e0b" radius={[0, 3, 3, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <div className="col-span-12 md:col-span-4">
              <ChartCard title="Product Demand" height={180} loading={loading} isEmpty={!productData.length}>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={productData.map((p) => ({ name: p.product_name, value: p.lead_count }))} layout="vertical" margin={{ top: 2, right: 12, left: 4, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <RTooltip contentStyle={TT_STYLE} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 3, 3, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <div className="col-span-12 md:col-span-4">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Loss Reasons" subtitle="pipeline_stage = lost" />
                <CardContent className="p-2 space-y-1 max-h-[200px] overflow-auto">
                  {lossData.length ? (
                    lossData.map((r) => (
                      <div key={r.lost_reason} className="flex justify-between text-xs px-1 py-0.5">
                        <span className="text-slate-600 capitalize">{String(r.lost_reason).replace(/_/g, " ")}</span>
                        <span className="font-semibold">{r.count}</span>
                      </div>
                    ))
                  ) : (
                    <EmptyState text="No lost-reason data" />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Market pulse */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 lg:col-span-8">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white">
                <PanelHeader
                  title="Market Pulse (Tenant Growth)"
                  subtitle="Current vs prior equal-length period — not external AI forecasts"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2">
                  {[
                    { title: "Sources", rows: report?.market_pulse?.source_growth || [] },
                    { title: "Industries", rows: report?.market_pulse?.industry_growth || [] },
                    { title: "Cities", rows: report?.market_pulse?.city_growth || [] },
                  ].map((col) => (
                    <div key={col.title} className="border rounded-lg p-2">
                      <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">{col.title}</p>
                      {(col.rows || []).slice(0, 5).map((r) => (
                        <div key={r.name} className="flex justify-between text-[11px] py-0.5 gap-2">
                          <span className="truncate text-slate-600">{r.name}</span>
                          <span className={`font-semibold tabular-nums ${r.growth_pct > 0 ? "text-emerald-600" : r.growth_pct < 0 ? "text-red-500" : "text-slate-500"}`}>
                            {r.growth_pct == null ? "—" : `${r.growth_pct > 0 ? "+" : ""}${r.growth_pct}%`}
                          </span>
                        </div>
                      ))}
                      {!col.rows?.length && <p className="text-[10px] text-slate-400">No data</p>}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="col-span-12 lg:col-span-4">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="India Solar Context" subtitle="Labelled external references" />
                <CardContent className="p-2 space-y-2">
                  {(report?.market_pulse?.context || []).map((c, i) => (
                    <div key={i} className="rounded border border-slate-100 bg-slate-50 p-2">
                      <p className="text-[11px] font-semibold text-slate-700">{c.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{c.detail}</p>
                      <p className="text-[9px] text-slate-400 mt-1">Source: {c.source}</p>
                    </div>
                  ))}
                  <p className="text-[9px] text-slate-400">{report?.market_pulse?.note}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Metric definitions */}
          <Card className="rounded-xl shadow-sm border-slate-200 bg-white">
            <PanelHeader title="Metric Definitions" subtitle="Stable formulas used by this dashboard" />
            <CardContent className="p-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              {Object.entries(defs).map(([k, v]) => (
                <div key={k} className="text-[10px] border rounded p-2 bg-slate-50">
                  <p className="font-semibold text-slate-700 mb-0.5">{k.replace(/_/g, " ")}</p>
                  <p className="text-slate-500 leading-snug">{v}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
