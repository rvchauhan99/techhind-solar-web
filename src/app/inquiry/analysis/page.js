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
import inquiryService from "@/services/inquiryService";
import mastersService from "@/services/mastersService";
import companyService from "@/services/companyService";
import { formatInrCompact } from "@/utils/currencyFormatters";
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
  IconX,
  IconBolt,
  IconCurrencyRupee,
  IconBan,
  IconChartPie,
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
  from: "",
  to: "",
  branch_id: "",
  source_ids: [],
  status: [],
  handled_by: "",
  project_scheme_id: "",
  is_dead: "",
};

const FUNNEL_ORDER = [
  "New",
  "Connected",
  "Site Visit Done",
  "Quotation",
  "Under Discussion",
];

const STATUS_COLORS = {
  New: "#3b82f6",
  Connected: "#0ea5e9",
  "Site Visit Done": "#8b5cf6",
  Quotation: "#f59e0b",
  "Under Discussion": "#f97316",
  Converted: "#22c55e",
};

const PIE_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6", "#14b8a6", "#ef4444"];

const DATE_PRESETS = [
  {
    label: "Today",
    fn: () => {
      const d = new Date().toISOString().split("T")[0];
      return { from: d, to: d };
    },
  },
  {
    label: "This Week",
    fn: () => {
      const n = new Date();
      const dy = n.getDay();
      const m = new Date(n);
      m.setDate(n.getDate() - (dy === 0 ? 6 : dy - 1));
      const s = new Date(m);
      s.setDate(m.getDate() + 6);
      return { from: m.toISOString().split("T")[0], to: s.toISOString().split("T")[0] };
    },
  },
  {
    label: "This Month",
    fn: () => {
      const n = new Date();
      return {
        from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0],
        to: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0],
      };
    },
  },
  {
    label: "Last 3M",
    fn: () => {
      const n = new Date();
      const p = new Date(n);
      p.setMonth(n.getMonth() - 3);
      return { from: p.toISOString().split("T")[0], to: n.toISOString().split("T")[0] };
    },
  },
];

const STATUS_TABS = [
  { value: null, label: "All", cls: "text-slate-600 border-slate-200 hover:border-slate-400" },
  { value: "New", label: "New", cls: "text-blue-600 border-blue-200 hover:border-blue-400", activeCls: "bg-blue-50 border-blue-400 text-blue-700" },
  { value: "Connected", label: "Connected", cls: "text-sky-600 border-sky-200 hover:border-sky-400", activeCls: "bg-sky-50 border-sky-400 text-sky-700" },
  { value: "Site Visit Done", label: "Site Visit", cls: "text-purple-600 border-purple-200 hover:border-purple-400", activeCls: "bg-purple-50 border-purple-400 text-purple-700" },
  { value: "Quotation", label: "Quotation", cls: "text-amber-600 border-amber-200 hover:border-amber-400", activeCls: "bg-amber-50 border-amber-400 text-amber-700" },
  { value: "Under Discussion", label: "Discussion", cls: "text-orange-600 border-orange-200 hover:border-orange-400", activeCls: "bg-orange-50 border-orange-400 text-orange-700" },
  { value: "Converted", label: "Converted", cls: "text-green-600 border-green-200 hover:border-green-400", activeCls: "bg-green-50 border-green-400 text-green-700" },
];

const STATUS_OPTIONS = [
  { value: "New", label: "New" },
  { value: "Connected", label: "Connected" },
  { value: "Site Visit Done", label: "Site Visit Done" },
  { value: "Quotation", label: "Quotation" },
  { value: "Under Discussion", label: "Under Discussion" },
  { value: "Converted", label: "Converted" },
];

const FILTER_LABELS = {
  from: "Date From",
  to: "Date To",
  branch_id: "Branch",
  source_ids: "Sources",
  status: "Status",
  handled_by: "Handled By",
  project_scheme_id: "Scheme",
  is_dead: "Dead",
};

function buildInquiryHref(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v == null || v === "") return;
    qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `/inquiry?${s}` : "/inquiry";
}

function getChips(filters, branches, sources, users, schemes) {
  return Object.entries(filters)
    .filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0))
    .map(([key, value]) => {
      let valStr = String(value);
      if (key === "branch_id") valStr = branches.find((b) => String(b.id) === String(value))?.name || value;
      if (key === "handled_by") valStr = users.find((u) => String(u.id) === String(value))?.name || value;
      if (key === "project_scheme_id") valStr = schemes.find((s) => String(s.id) === String(value))?.name || value;
      if (key === "status") valStr = (Array.isArray(value) ? value : [value]).join(", ");
      if (key === "source_ids") {
        valStr = (Array.isArray(value) ? value : [value])
          .map((s) => sources.find((src) => String(src.id) === String(s))?.source_name || s)
          .join(", ");
      }
      if (key === "is_dead") valStr = value === "true" ? "Dead only" : value === "false" ? "Live only" : value;
      return { key, label: FILTER_LABELS[key] || key, value: valStr };
    });
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
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${colorCls}`}>
      <Icon size={11} /> {label}
    </span>
  );
}

function KpiCard({ icon, label, value, valueColor, sub, trend, loading, onClick }) {
  return (
    <Card
      onClick={onClick}
      className={`rounded-lg shadow-sm border-slate-200 bg-white transition-all hover:shadow-md ${onClick ? "cursor-pointer" : ""} ${loading ? "animate-pulse" : ""}`}
    >
      <CardContent className="p-3 flex flex-col justify-center h-full gap-0.5">
        <div className="flex items-center gap-1.5 mb-1">
          {icon && <div className="text-slate-500 [&>svg]:w-4 [&>svg]:h-4">{icon}</div>}
          <span className="text-[11px] font-semibold text-slate-500 leading-none">{label}</span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-1.5">
          <span className="text-lg font-bold text-slate-900 leading-none" style={valueColor ? { color: valueColor } : {}}>
            {loading ? "…" : value ?? "—"}
          </span>
          {trend && <TrendChip {...trend} />}
        </div>
        {sub && <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function PanelHeader({ title, subtitle }) {
  return (
    <div className="px-3 pt-2.5 pb-1.5 border-b border-slate-100">
      <h3 className="text-xs font-semibold text-slate-700 leading-tight">{title}</h3>
      {subtitle && <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{subtitle}</p>}
    </div>
  );
}

function EmptyState({ text = "No data" }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-6">
      <IconChartBar size={24} className="text-slate-300 mb-1.5" />
      <p className="text-xs text-slate-400 max-w-[160px] leading-snug">{text}</p>
    </div>
  );
}

function CenterLabel({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight={700} fill="#1e293b">
      {total}
    </text>
  );
}

const TT_STYLE = { borderRadius: 6, border: "none", boxShadow: "0 4px 12px rgb(0 0 0 / 0.12)", fontSize: 11 };

function formatKw(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "—";
  if (v >= 1000) return `${(v / 1000).toFixed(1)} MW`;
  return `${v.toFixed(v >= 10 ? 0 : 1)} kW`;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function InquiryAnalysisPage() {
  const router = useRouter();

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [activeStatusTab, setActiveStatusTab] = useState(null);

  const [branchOptions, setBranchOptions] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [schemeOptions, setSchemeOptions] = useState([]);

  useEffect(() => {
    Promise.all([
      companyService.listBranches().then((r) => {
        const d = r?.result ?? r?.data ?? r;
        return Array.isArray(d) ? d : [];
      }),
      mastersService.getReferenceOptions("inquiry_source.model").then((r) => {
        const d = r?.result ?? r?.data ?? r;
        return Array.isArray(d) ? d : [];
      }),
      mastersService.getReferenceOptions("user.model", { status_in: "active,inactive" }).then((r) => {
        const d = r?.result ?? r?.data ?? r;
        return Array.isArray(d) ? d : [];
      }),
      mastersService.getReferenceOptions("project_scheme.model").then((r) => {
        const d = r?.result ?? r?.data ?? r;
        return Array.isArray(d) ? d : [];
      }),
    ])
      .then(([b, s, u, sch]) => {
        setBranchOptions(b);
        setSourceOptions(s);
        setUserOptions(u);
        setSchemeOptions(sch);
      })
      .catch(() => {});
  }, []);

  const loadSummary = useCallback(
    async (overrideFilters) => {
      try {
        setLoading(true);
        const f = overrideFilters ?? filters;
        const params = {
          from: f.from || undefined,
          to: f.to || undefined,
          branch_id: f.branch_id || undefined,
          source_ids: f.source_ids?.length ? f.source_ids.join(",") : undefined,
          status: f.status?.length ? f.status.join(",") : undefined,
          handled_by: f.handled_by || undefined,
          project_scheme_id: f.project_scheme_id || undefined,
          is_dead: f.is_dead || undefined,
        };
        const res = await inquiryService.getInquirySummary(params);
        setSummary(res?.result || res?.data || res);
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    loadSummary();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fc = (key, val) => setFilters((p) => ({ ...p, [key]: val }));

  const applyPreset = (preset) => {
    const dates = preset.fn();
    const next = { ...filters, ...dates };
    setFilters(next);
    setActivePreset(preset.label);
    loadSummary(next);
  };

  const handleStatusTab = (statusValue) => {
    setActiveStatusTab(statusValue);
    const next = { ...filters, status: statusValue ? [statusValue] : [] };
    setFilters(next);
    loadSummary(next);
  };

  const removeChip = (key) => {
    const next = { ...filters, [key]: INITIAL_FILTERS[key] };
    setFilters(next);
    if (key === "status") setActiveStatusTab(null);
    if (key === "from" || key === "to") setActivePreset(null);
    loadSummary(next);
  };

  // ─── Derived ───────────────────────────────────────────────────────────────

  const totalAll =
    typeof summary?.total_inquiries_all === "number"
      ? summary.total_inquiries_all
      : (summary?.status_breakdown_all || []).reduce((s, r) => s + Number(r.count || 0), 0);

  const convertedCount =
    typeof summary?.converted_count === "number"
      ? summary.converted_count
      : Number((summary?.status_breakdown_all || []).find((r) => r.status === "Converted")?.count || 0);

  const pipelineCount = (summary?.funnel || []).reduce((s, r) => s + Number(r.count || 0), 0);

  const conversionRateRaw =
    typeof summary?.conversion_rate === "number"
      ? summary.conversion_rate
      : totalAll
        ? (convertedCount / totalAll) * 100
        : 0;
  const conversionRate = Number.isFinite(conversionRateRaw) ? conversionRateRaw.toFixed(1) : "0.0";

  const deadCount = Number(summary?.dead_count || 0);
  const overdue = summary?.aging_sla?.overdue ?? 0;
  const totalSla = pipelineCount || totalAll || 1;

  const totalKw = summary?.capacity_summary?.total_kw ?? 0;
  const pipelineValue = summary?.value_summary?.pipeline_estimated_cost ?? 0;

  const funnelByStatus = Object.fromEntries(
    (summary?.funnel || []).map((r) => [r.status, Number(r.count || 0)])
  );
  const funnelData = FUNNEL_ORDER.map((status) => {
    const value = funnelByStatus[status] || 0;
    return {
      name: status,
      value,
      fill: STATUS_COLORS[status] || "#3b82f6",
      pct: pipelineCount > 0 ? ((value / pipelineCount) * 100).toFixed(0) : 0,
    };
  }).filter((r) => r.value > 0);

  const statusTiles = (summary?.status_breakdown_all || [])
    .map((r) => ({
      key: r.status || "unknown",
      name: r.status || "unknown",
      value: Number(r.count || 0),
      fill: STATUS_COLORS[r.status] || "#94a3b8",
      pct: totalAll > 0 ? ((Number(r.count || 0) / totalAll) * 100).toFixed(0) : 0,
    }))
    .sort((a, b) => {
      const ai = FUNNEL_ORDER.indexOf(a.key);
      const bi = FUNNEL_ORDER.indexOf(b.key);
      if (a.key === "Converted") return 1;
      if (b.key === "Converted") return -1;
      if (ai >= 0 && bi >= 0) return ai - bi;
      return b.value - a.value;
    });

  const handlerData = (summary?.handler_performance || [])
    .map((r) => ({
      name: r.name || `User #${r.handled_by}`,
      handled_by: r.handled_by,
      inquiries: Number(r.inquiry_count || 0),
      converted: Number(r.converted_count || 0),
      capacity: Number(r.total_capacity || 0),
      convRate:
        Number(r.inquiry_count || 0) > 0
          ? ((Number(r.converted_count || 0) / Number(r.inquiry_count)) * 100).toFixed(0)
          : 0,
    }))
    .sort((a, b) => b.inquiries - a.inquiries);

  const sourceData = (summary?.source_breakdown || []).map((r) => ({
    name: r.name,
    value: Number(r.total || 0),
    converted: Number(r.converted || 0),
    inquiry_source_id: r.inquiry_source_id,
  }));
  const totalSource = sourceData.reduce((s, r) => s + r.value, 0);

  const schemeData = (summary?.scheme_breakdown || []).map((r) => ({
    name: r.name,
    value: Number(r.count || 0),
    project_scheme_id: r.project_scheme_id,
  }));

  const orderTypeData = (summary?.order_type_breakdown || []).map((r) => ({
    name: r.name,
    value: Number(r.count || 0),
  }));

  const branchData = (summary?.branch_breakdown || []).map((r) => ({
    name: r.name,
    value: Number(r.count || 0),
    branch_id: r.branch_id,
  }));

  const deadReasonData = (summary?.dead_reason_breakdown || []).map((r) => ({
    name: r.name,
    value: Number(r.count || 0),
  }));

  const trendData = (summary?.daily_trend || []).map((r) => ({
    date: r.date?.slice(5) || r.date,
    Inquiries: Number(r.count || 0),
  }));

  const activeFilterCount = [
    filters.from,
    filters.to,
    filters.branch_id,
    filters.source_ids?.length > 0,
    filters.status?.length > 0,
    filters.handled_by,
    filters.project_scheme_id,
    filters.is_dead,
  ].filter(Boolean).length;

  const chips = getChips(filters, branchOptions, sourceOptions, userOptions, schemeOptions);

  const todayStr = () => new Date().toISOString().split("T")[0];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-slate-50/50 text-slate-900 font-sans">
        <div className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8 space-y-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl">
                <IconChartPie size={20} stroke={1.8} className="text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Inquiry Analysis</h1>
                <p className="text-xs text-slate-500 mt-0.5">Pipeline · Capacity · Value · Performance</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                </Badge>
              )}
              <div className="h-4 w-px bg-slate-200 mx-0.5" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFilters(INITIAL_FILTERS);
                  setActivePreset(null);
                  setActiveStatusTab(null);
                  loadSummary(INITIAL_FILTERS);
                }}
                disabled={loading}
                className="h-7 text-xs gap-1 px-2"
              >
                <IconRefresh size={11} /> Reset
              </Button>
              <Button size="sm" onClick={() => { setActivePreset(null); loadSummary(); }} disabled={loading} className="h-7 text-xs gap-1 px-2">
                <IconFilter size={11} /> Apply
              </Button>
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_TABS.map((tab) => {
              const isActive = activeStatusTab === tab.value;
              return (
                <button
                  key={String(tab.value)}
                  onClick={() => handleStatusTab(tab.value)}
                  className={[
                    "flex items-center gap-1 text-[11px] font-semibold px-3 py-1 rounded-full border transition-all",
                    isActive ? tab.activeCls || "bg-primary text-primary-foreground border-primary" : `bg-white ${tab.cls}`,
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Advanced filters */}
          <Card className="rounded-xl shadow-sm border-slate-200 bg-white">
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors rounded-xl"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <IconFilter size={12} /> Advanced Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </span>
              {filtersOpen ? <IconChevronUp size={13} className="text-slate-400" /> : <IconChevronDown size={13} className="text-slate-400" />}
            </button>
            {filtersOpen && (
              <div className="border-t border-slate-100 px-3 py-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                <DateField label="From Date" name="from" fullWidth value={filters.from} onChange={(e) => fc("from", e.target.value)} />
                <DateField label="To Date" name="to" fullWidth value={filters.to} onChange={(e) => fc("to", e.target.value)} />
                <Select name="branch_id" label="Branch" fullWidth value={filters.branch_id} onChange={(e) => fc("branch_id", e.target.value)}>
                  <MenuItem value="">All Branches</MenuItem>
                  {branchOptions.map((b) => (
                    <MenuItem key={b.id} value={String(b.id)}>
                      {b.name ?? b.label ?? b.id}
                    </MenuItem>
                  ))}
                </Select>
                <MultiSelect
                  name="source_ids"
                  label="Sources"
                  fullWidth
                  placeholder="Sources…"
                  options={sourceOptions.map((s) => ({
                    value: String(s.id),
                    label: s.source_name || s.name || String(s.id),
                  }))}
                  value={filters.source_ids}
                  onChange={(e) => fc("source_ids", e.target.value)}
                />
                <MultiSelect
                  name="status"
                  label="Status"
                  fullWidth
                  placeholder="Status…"
                  options={STATUS_OPTIONS}
                  value={filters.status}
                  onChange={(e) => {
                    fc("status", e.target.value);
                    setActiveStatusTab(null);
                  }}
                />
                <Select name="handled_by" label="Handled By" fullWidth value={filters.handled_by} onChange={(e) => fc("handled_by", e.target.value)}>
                  <MenuItem value="">All Users</MenuItem>
                  {userOptions.map((u) => (
                    <MenuItem key={u.id} value={String(u.id)}>
                      {u.name ?? u.label ?? `User #${u.id}`}
                    </MenuItem>
                  ))}
                </Select>
                <Select
                  name="project_scheme_id"
                  label="Project Scheme"
                  fullWidth
                  value={filters.project_scheme_id}
                  onChange={(e) => fc("project_scheme_id", e.target.value)}
                >
                  <MenuItem value="">All Schemes</MenuItem>
                  {schemeOptions.map((s) => (
                    <MenuItem key={s.id} value={String(s.id)}>
                      {s.name ?? s.label ?? s.id}
                    </MenuItem>
                  ))}
                </Select>
                <Select name="is_dead" label="Dead Filter" fullWidth value={filters.is_dead} onChange={(e) => fc("is_dead", e.target.value)}>
                  <MenuItem value="">All (Live + Dead)</MenuItem>
                  <MenuItem value="false">Live only</MenuItem>
                  <MenuItem value="true">Dead only</MenuItem>
                </Select>
              </div>
            )}
          </Card>

          {/* Chips */}
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
                onClick={() => {
                  setFilters(INITIAL_FILTERS);
                  setActivePreset(null);
                  setActiveStatusTab(null);
                  loadSummary(INITIAL_FILTERS);
                }}
                className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          {/* KPI strip — 8 cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            <KpiCard
              icon={<IconUsers size={16} className="text-blue-600" />}
              label="Total Inquiries"
              value={totalAll}
              trend={{ direction: "neutral", label: "All" }}
              loading={loading}
              onClick={() => router.push(buildInquiryHref({ status: "all" }))}
            />
            <KpiCard
              icon={<IconActivity size={16} className="text-amber-500" />}
              label="In Pipeline"
              value={pipelineCount}
              sub="Excl. converted"
              trend={{ direction: "neutral", label: "Active" }}
              loading={loading}
              onClick={() => router.push("/inquiry")}
            />
            <KpiCard
              icon={<IconTarget size={16} className="text-emerald-600" />}
              label="Converted"
              value={convertedCount}
              valueColor="#16a34a"
              trend={{ direction: "up", label: `${conversionRate}%` }}
              loading={loading}
              onClick={() => router.push(buildInquiryHref({ status: "Converted" }))}
            />
            <KpiCard
              icon={<IconTrendingUp size={16} className="text-indigo-500" />}
              label="Conversion Rate"
              value={`${conversionRate}%`}
              trend={{
                direction: Number(conversionRate) >= 10 ? "up" : "down",
                label: Number(conversionRate) >= 10 ? "Healthy" : "Low",
              }}
              loading={loading}
            />
            <KpiCard
              icon={<IconAlertCircle size={16} className={overdue > 0 ? "text-red-500" : "text-emerald-600"} />}
              label="Overdue Reminders"
              value={overdue}
              valueColor={overdue > 0 ? "#dc2626" : undefined}
              trend={{ direction: overdue > 0 ? "down" : "up", label: overdue > 0 ? "Action" : "OK" }}
              loading={loading}
              onClick={() => router.push(buildInquiryHref({ next_reminder_date_to: todayStr() }))}
            />
            <KpiCard
              icon={<IconBan size={16} className="text-slate-500" />}
              label="Dead Inquiries"
              value={deadCount}
              sub={`${Number(summary?.dead_rate || 0).toFixed(1)}% of total`}
              trend={{ direction: "neutral", label: "Closed" }}
              loading={loading}
              onClick={() => router.push(buildInquiryHref({ is_dead: "true" }))}
            />
            <KpiCard
              icon={<IconBolt size={16} className="text-yellow-600" />}
              label="Total Capacity"
              value={formatKw(totalKw)}
              sub={`Avg ${formatKw(summary?.capacity_summary?.avg_kw)}`}
              trend={{ direction: "neutral", label: "kW" }}
              loading={loading}
            />
            <KpiCard
              icon={<IconCurrencyRupee size={16} className="text-teal-600" />}
              label="Pipeline Value"
              value={formatInrCompact(pipelineValue)}
              sub={`Conv ${formatInrCompact(summary?.value_summary?.converted_estimated_cost)}`}
              trend={{ direction: "neutral", label: "Est." }}
              loading={loading}
            />
          </div>

          {/* Status breakdown */}
          {statusTiles.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Status Breakdown</p>
              <div className="flex gap-2 flex-wrap">
                {statusTiles.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => router.push(buildInquiryHref({ status: item.key }))}
                    className="flex flex-col items-start px-2.5 py-1.5 rounded-lg border bg-white hover:shadow-sm transition-all min-w-[90px]"
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: item.fill,
                      borderTop: "1px solid #e2e8f0",
                      borderRight: "1px solid #e2e8f0",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    <span className="text-[10px] font-semibold uppercase" style={{ color: item.fill }}>
                      {item.name}
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-sm font-bold text-slate-900">{item.value}</span>
                      <span className="text-[10px] text-slate-400">{item.pct}%</span>
                    </div>
                    <MiniBar value={item.value} max={totalAll} color={item.fill} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trend */}
          {trendData.length > 0 && (
            <Card className="rounded-xl shadow-sm border-slate-200 bg-white">
              <PanelHeader title="Inquiry Trend Over Time" subtitle="Daily inquiries by date of inquiry" />
              <div className="px-2 pb-2" style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="inqTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={22} />
                    <RTooltip contentStyle={TT_STYLE} cursor={{ stroke: "#0ea5e9", strokeWidth: 1, strokeDasharray: "3 2" }} />
                    <Area dataKey="Inquiries" stroke="#0ea5e9" strokeWidth={1.5} fill="url(#inqTrendGrad)" dot={false} activeDot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Funnel + SLA */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-8">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Inquiry Pipeline Funnel" subtitle="Active stages by volume — click to drill down" />
                <div className="flex px-2 pb-2 gap-3">
                  <div className="flex-1" style={{ height: 220 }}>
                    {funnelData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                          <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`${v} inquiries`]} />
                          <Funnel
                            dataKey="value"
                            data={funnelData}
                            isAnimationActive
                            onClick={(d) => {
                              const s = d?.payload?.name;
                              if (s) router.push(buildInquiryHref({ status: s }));
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            <LabelList position="right" fill="#475569" stroke="none" dataKey="name" fontSize={10} />
                          </Funnel>
                        </FunnelChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState text="No funnel data for applied filters" />
                    )}
                  </div>
                  {funnelData.length > 0 && (
                    <div className="flex flex-col justify-center gap-1.5 border-l border-slate-100 pl-3 min-w-[140px]">
                      {funnelData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                            <span className="text-slate-500">{item.name}</span>
                          </div>
                          <span className="font-semibold text-slate-800">
                            {item.value} <span className="text-slate-400 font-normal">({item.pct}%)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="col-span-12 lg:col-span-4">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Reminder SLA Overview" subtitle="Next reminder urgency" />
                <CardContent className="p-2 space-y-1">
                  {[
                    {
                      label: "Overdue",
                      val: overdue,
                      color: "#ef4444",
                      onClick: () => router.push(buildInquiryHref({ next_reminder_date_to: todayStr() })),
                    },
                    {
                      label: "Due Today",
                      val: summary?.aging_sla?.due_today ?? 0,
                      color: "#3b82f6",
                      onClick: () => {
                        const t = todayStr();
                        router.push(buildInquiryHref({ next_reminder_date_from: t, next_reminder_date_to: t }));
                      },
                    },
                    {
                      label: "Due This Week",
                      val: summary?.aging_sla?.due_this_week ?? 0,
                      color: "#8b5cf6",
                      onClick: () => {
                        const t = new Date();
                        const nw = new Date(t);
                        nw.setDate(nw.getDate() + 7);
                        router.push(
                          buildInquiryHref({
                            next_reminder_date_from: t.toISOString().split("T")[0],
                            next_reminder_date_to: nw.toISOString().split("T")[0],
                          })
                        );
                      },
                    },
                    {
                      label: "Stale (7+ days)",
                      val: summary?.aging_sla?.stale_7_plus ?? 0,
                      color: "#94a3b8",
                      onClick: () => {
                        const t = new Date();
                        const s = new Date(t);
                        s.setDate(s.getDate() - 7);
                        router.push(buildInquiryHref({ created_at_to: s.toISOString().split("T")[0] }));
                      },
                    },
                  ].map(({ label, val, color, onClick }) => (
                    <div
                      key={label}
                      onClick={onClick}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <span className="text-xs text-slate-600 flex-1 font-medium">{label}</span>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color, backgroundColor: `${color}18` }}>
                        {val}
                      </span>
                      <div className="w-16">
                        <MiniBar value={val} max={totalSla} color={color} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-1 mt-1 border-t border-slate-100 grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <span className="text-[10px] text-slate-400">Pipeline total</span>
                    <span className="text-[10px] font-semibold text-right text-slate-700">{pipelineCount}</span>
                    <span className="text-[10px] text-slate-400">Avg. days in pipeline</span>
                    <span className="text-[10px] font-semibold text-right text-slate-700">
                      {summary?.aging_sla?.avg_days_in_pipeline != null
                        ? `${Number(summary.aging_sla.avg_days_in_pipeline).toFixed(1)}d`
                        : "—"}
                    </span>
                    <span className="text-[10px] text-slate-400">Pipeline capacity</span>
                    <span className="text-[10px] font-semibold text-right text-slate-700">
                      {formatKw(summary?.capacity_summary?.pipeline_kw)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Scheme + Order type + Branch */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-4">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Project Scheme" subtitle="Volume by scheme" />
                <div className="px-2 pb-2" style={{ height: 180 }}>
                  {schemeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={schemeData.slice(0, 8)} layout="vertical" margin={{ top: 2, right: 16, left: 4, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                        <RTooltip contentStyle={TT_STYLE} cursor={{ fill: "#f8fafc" }} />
                        <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={20}>
                          {schemeData.slice(0, 8).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text="No scheme data" />
                  )}
                </div>
              </Card>
            </div>

            <div className="col-span-12 md:col-span-4">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Order Type" subtitle="Volume by order type" />
                <div className="px-2 pb-2" style={{ height: 180 }}>
                  {orderTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={orderTypeData.slice(0, 8)} layout="vertical" margin={{ top: 2, right: 16, left: 4, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                        <RTooltip contentStyle={TT_STYLE} cursor={{ fill: "#f8fafc" }} />
                        <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={20}>
                          {orderTypeData.slice(0, 8).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text="No order type data" />
                  )}
                </div>
              </Card>
            </div>

            <div className="col-span-12 md:col-span-4">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Branch Distribution" subtitle="Inquiries by branch" />
                {branchData.length > 0 ? (
                  <div className="flex items-center px-2 pb-2 gap-2">
                    <div style={{ width: 130, minWidth: 130, height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={branchData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={60}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {branchData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                            <Label content={<CenterLabel total={branchData.reduce((s, r) => s + r.value, 0)} />} position="center" />
                          </Pie>
                          <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`${v} inquiries`]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1 max-h-[180px] overflow-auto">
                      {branchData.slice(0, 6).map((s, i) => (
                        <div key={s.name} className="flex items-center justify-between gap-1 px-1 py-0.5 rounded text-left">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-xs text-slate-600 truncate">{s.name}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-800 shrink-0">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="px-2 pb-2" style={{ height: 180 }}>
                    <EmptyState text="No branch data" />
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Handler + Source */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-7">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Handler Leaderboard" subtitle="Inquiries · conversion · capacity — click to filter" />
                {handlerData.length > 0 ? (
                  <div className="flex flex-col">
                    <div className="px-2" style={{ height: 130 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={handlerData.slice(0, 8)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={22} />
                          <RTooltip contentStyle={TT_STYLE} cursor={{ fill: "#f8fafc" }} />
                          <Bar
                            dataKey="inquiries"
                            name="Inquiries"
                            fill="#0ea5e9"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={30}
                            onClick={(d) => {
                              const name = d?.payload?.name;
                              if (name && name !== "Unassigned") router.push(buildInquiryHref({ handled_by: name }));
                            }}
                            style={{ cursor: "pointer" }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="overflow-auto border-t border-slate-100">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400">
                            <th className="text-left px-2 py-1 font-semibold w-5">#</th>
                            <th className="text-left px-2 py-1 font-semibold">Handler</th>
                            <th className="text-right px-2 py-1 font-semibold">Inq</th>
                            <th className="text-right px-2 py-1 font-semibold">Conv</th>
                            <th className="text-right px-2 py-1 font-semibold">kW</th>
                            <th className="text-right px-2 py-1 font-semibold">Conv%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {handlerData.slice(0, 6).map((a, i) => (
                            <tr
                              key={a.handled_by ?? a.name}
                              className="border-t border-slate-50 hover:bg-slate-50 cursor-pointer"
                              onClick={() => {
                                if (a.name && a.name !== "Unassigned") router.push(buildInquiryHref({ handled_by: a.name }));
                              }}
                            >
                              <td
                                className="px-2 py-1 font-bold"
                                style={{ color: i === 0 ? "#eab308" : i === 1 ? "#94a3b8" : i === 2 ? "#f97316" : "#cbd5e1" }}
                              >
                                {i + 1}
                              </td>
                              <td className="px-2 py-1 font-medium text-slate-700">{a.name}</td>
                              <td className="px-2 py-1 text-right font-semibold text-slate-800">{a.inquiries}</td>
                              <td className="px-2 py-1 text-right text-slate-500">{a.converted}</td>
                              <td className="px-2 py-1 text-right text-slate-500">{a.capacity.toFixed(1)}</td>
                              <td className="px-2 py-1 text-right">
                                <span
                                  className={`text-[10px] px-1 py-0.5 rounded font-semibold ${
                                    Number(a.convRate) >= 10 ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {a.inquiries > 0 ? `${a.convRate}%` : "—"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: 200 }}>
                    <EmptyState text="No handler data available" />
                  </div>
                )}
              </Card>
            </div>

            <div className="col-span-12 lg:col-span-5">
              <Card className="rounded-xl shadow-sm border-slate-200 bg-white h-full">
                <PanelHeader title="Source Effectiveness" subtitle="Volume & conversion by source" />
                {sourceData.length > 0 ? (
                  <div className="flex flex-col">
                    <div className="px-2" style={{ height: 150 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sourceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={62}
                            paddingAngle={3}
                            dataKey="value"
                            onClick={(d) => {
                              const name = d?.payload?.name;
                              if (name) router.push(buildInquiryHref({ inquiry_source: name }));
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            {sourceData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <RTooltip contentStyle={TT_STYLE} formatter={(v) => [`${v} inquiries`]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="border-t border-slate-100 overflow-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400">
                            <th className="text-left px-2 py-1 font-semibold" colSpan={2}>
                              Source
                            </th>
                            <th className="text-right px-2 py-1 font-semibold">Total</th>
                            <th className="text-right px-2 py-1 font-semibold">Conv%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sourceData.slice(0, 6).map((s, i) => {
                            const convPct = s.value > 0 ? ((s.converted / s.value) * 100).toFixed(0) : "0";
                            return (
                              <tr
                                key={s.name}
                                className="border-t border-slate-50 hover:bg-slate-50 cursor-pointer"
                                onClick={() => router.push(buildInquiryHref({ inquiry_source: s.name }))}
                              >
                                <td className="px-2 py-1 w-3">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                </td>
                                <td className="px-2 py-1 text-slate-600">{s.name}</td>
                                <td className="px-2 py-1 text-right font-semibold text-slate-800">{s.value}</td>
                                <td className="px-2 py-1 text-right text-slate-400">
                                  {convPct}%
                                  <span className="text-slate-300 ml-1">
                                    ({totalSource > 0 ? `${((s.value / totalSource) * 100).toFixed(0)}%` : "—"})
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: 200 }}>
                    <EmptyState text="No source data available" />
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Dead reasons */}
          {deadReasonData.length > 0 && (
            <Card className="rounded-xl shadow-sm border-slate-200 bg-white">
              <PanelHeader title="Dead Reason Breakdown" subtitle="Why inquiries were marked dead" />
              <div className="px-2 pb-2" style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deadReasonData.slice(0, 10)} layout="vertical" margin={{ top: 2, right: 16, left: 4, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <RTooltip contentStyle={TT_STYLE} cursor={{ fill: "#f8fafc" }} />
                    <Bar
                      dataKey="value"
                      radius={[0, 3, 3, 0]}
                      maxBarSize={18}
                      fill="#ef4444"
                      onClick={() => router.push(buildInquiryHref({ is_dead: "true" }))}
                      style={{ cursor: "pointer" }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
