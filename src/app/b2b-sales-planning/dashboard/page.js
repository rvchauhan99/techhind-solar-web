"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconAlertTriangle,
  IconCalendarDue,
  IconCalendarEvent,
  IconCircleCheck,
  IconClock,
  IconRefresh,
  IconTruck,
  IconChartBar,
  IconInfoCircle,
} from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import StatCard from "@/components/common/StatCard";
import ChartCard from "@/components/common/ChartCard";
import SalesPlanningFilterPanel, {
  DEFAULT_PIPELINE_FILTERS,
  filtersToApiParams,
} from "@/components/common/SalesPlanningFilterPanel";
import SalesPlanningQuickToolbar, {
  applyDatePreset,
  applyQuickStatus,
  QUICK_STATUS_TABS,
} from "../components/SalesPlanningQuickToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/dataTableUtils";
import b2bSalesPlanningService from "@/services/b2bSalesPlanningService";
import { renderPlanStatusBadge } from "../page";
import { useB2bSalesOrderSidebar } from "../components/useB2bSalesOrderSidebar";
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

const PIE_COLORS = ["#1b365d", "#00823b", "#f37021", "#dc2626", "#64748b", "#b91c1c"];
const TT_STYLE = {
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.08)",
  fontSize: 11,
};

const STATUS_LABEL = {
  DUE_TODAY: "Due Today",
  UPCOMING: "Upcoming",
  OVERDUE: "Overdue",
  PIPELINE: "Pipeline",
  PIPELINE_OVERDUE: "Pipeline Overdue",
  COMPLETED: "Completed",
};

const STAT_STATUS_TAB = Object.fromEntries(
  QUICK_STATUS_TABS.filter((t) => t.key !== "all").map((t) => [t.key, t])
);

const FOCUS_TABLE_HEIGHT = "min(360px, 40vh)";

export default function B2bSalesPlanningDashboardPage() {
  const router = useRouter();
  const { openOrderSidebar, sidebar } = useB2bSalesOrderSidebar();
  const worklistRef = useRef(null);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_PIPELINE_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const apiParams = useMemo(() => filtersToApiParams(appliedFilters), [appliedFilters]);

  const scrollToWorklist = useCallback(() => {
    setTimeout(() => {
      worklistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, []);

  const loadStats = useCallback(() => {
    setLoadingStats(true);
    b2bSalesPlanningService
      .getB2bSalesPlanningDashboard(apiParams)
      .then((res) => setStats(res?.result ?? res))
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  }, [apiParams]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const fetcher = useCallback(async ({ page, limit, q, sortBy, sortOrder, ...rest }) => {
    const res = await b2bSalesPlanningService.getB2bSalesPlans({
      page,
      limit,
      q: q || undefined,
      sortBy: sortBy || "pipeline_since",
      sortOrder: sortOrder || "ASC",
      ...rest,
    });
    const result = res?.result ?? res;
    return { data: result?.rows || [], total: result?.count ?? 0 };
  }, []);

  const columns = useMemo(
    () => [
      {
        field: "plan_no",
        label: "Plan No",
        render: (row) => (
          <button
            type="button"
            className="text-[#1b365d] font-medium hover:underline"
            onClick={() => router.push(`/b2b-sales-planning/${row.id}`)}
          >
            {row.plan_no}
          </button>
        ),
      },
      {
        field: "plan_date",
        label: "Plan Date",
        sortable: true,
        render: (row) => formatDate(row.plan_date),
      },
      {
        field: "client",
        label: "Client",
        render: (row) => row.client?.client_name || "—",
      },
      {
        field: "status",
        label: "Status",
        sortable: true,
        render: (row) => renderPlanStatusBadge(row.status),
      },
      {
        field: "active_pipeline",
        label: "Pipeline Ref",
        render: (row) =>
          row.active_sales_order_id ? (
            <button
              type="button"
              className="text-[#00823b] hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                openOrderSidebar({
                  id: row.active_sales_order_id,
                  order_no: row.active_pipeline_reference || String(row.active_sales_order_id),
                });
              }}
            >
              {row.active_pipeline_reference || row.active_sales_order_id}
            </button>
          ) : (
            "—"
          ),
      },
      {
        field: "pipeline_since",
        label: "Pipeline Since",
        sortable: true,
        render: (row) => (row.pipeline_since ? formatDate(row.pipeline_since) : "—"),
      },
      {
        field: "pipeline_age",
        label: "Age",
        render: (row) =>
          row.pipeline_age_days != null ? `${row.pipeline_age_days}d` : "—",
      },
      {
        field: "pipeline_reason",
        label: "Reason",
        render: (row) => row.pipeline_reason || "—",
      },
      {
        field: "assigned",
        label: "Assigned",
        render: (row) => row.assignedToUser?.name || "—",
      },
    ],
    [router, openOrderSidebar]
  );

  const kpis = stats?.kpis ?? stats ?? {};

  const applyStatFilter = (statusKey) => {
    const tab = STAT_STATUS_TAB[statusKey];
    if (!tab) return;
    setAppliedFilters((prev) => applyQuickStatus(prev, tab));
    setActivePreset(null);
    scrollToWorklist();
  };

  const handleQuickStatus = (tab) => {
    setAppliedFilters((prev) => applyQuickStatus(prev, tab));
    setActivePreset(null);
  };

  const handleDateFieldChange = (value) => {
    setAppliedFilters((prev) => ({
      ...prev,
      date_filter_field: value || "plan_date",
    }));
    setActivePreset(null);
  };

  const handleDatePreset = (preset) => {
    setAppliedFilters((prev) => applyDatePreset(prev, preset));
    setActivePreset(preset.label);
  };

  const handleReset = () => {
    setAppliedFilters({ ...DEFAULT_PIPELINE_FILTERS });
    setActivePreset(null);
  };

  const handleApplyFilters = (next) => {
    setAppliedFilters(next);
    setActivePreset(null);
  };

  const handleClearFilters = () => {
    setAppliedFilters({ ...DEFAULT_PIPELINE_FILTERS });
    setActivePreset(null);
  };

  const statusChartData = (stats?.by_status || []).map((r) => ({
    name: STATUS_LABEL[r.status] || r.status,
    count: r.count,
  }));

  const assigneeChartData = (stats?.by_assignee || []).slice(0, 8).map((r) => ({
    name: r.name?.length > 14 ? `${r.name.slice(0, 12)}…` : r.name,
    count: r.count,
    pipeline: r.pipeline_count,
  }));

  const reasonChartData = (stats?.by_pipeline_reason || []).slice(0, 8).map((r) => ({
    name: r.pipeline_reason?.length > 16 ? `${r.pipeline_reason.slice(0, 14)}…` : r.pipeline_reason,
    count: r.count,
  }));

  const monthChartData = (stats?.by_plan_date_month || []).map((r) => ({
    month: r.month,
    count: r.count,
  }));

  const statusFilterLabel =
    appliedFilters.status?.length > 0
      ? appliedFilters.status.map((s) => STATUS_LABEL[s] || s).join(", ")
      : "All";

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Sales Planning Analysis"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => loadStats()}
            >
              <IconRefresh size={14} className="mr-1" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => router.push("/b2b-sales-planning")}
            >
              All Plans
            </Button>
          </div>
        }
      >
        <div className="max-w-[1440px] mx-auto px-0 py-0 space-y-2.5">
          <SalesPlanningQuickToolbar
            filters={appliedFilters}
            activePreset={activePreset}
            onStatusChange={handleQuickStatus}
            onDateFieldChange={handleDateFieldChange}
            onPresetChange={handleDatePreset}
            onReset={handleReset}
          />

          <SalesPlanningFilterPanel
            open={filtersOpen}
            onToggle={setFiltersOpen}
            values={appliedFilters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
          />

          {(stats?.insights?.length > 0 || loadingStats) && (
            <div className="flex flex-wrap items-center gap-1.5 px-0.5">
              <IconInfoCircle size={14} className="text-slate-400 shrink-0" />
              {loadingStats ? (
                <span className="text-xs text-muted-foreground">Loading insights…</span>
              ) : (
                stats.insights.map((text) => (
                  <Badge
                    key={text}
                    variant="outline"
                    className="text-[10px] font-normal h-5 px-1.5 bg-slate-50"
                  >
                    {text}
                  </Badge>
                ))
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-1.5">
            <StatCard
              icon={<IconCalendarDue size={16} />}
              label="Due Today"
              value={kpis.due_today ?? 0}
              accentColor="#f37021"
              loading={loadingStats}
              onClick={() => applyStatFilter("DUE_TODAY")}
            />
            <StatCard
              icon={<IconCalendarEvent size={16} />}
              label="Upcoming"
              value={kpis.upcoming ?? 0}
              accentColor="#1b365d"
              loading={loadingStats}
              onClick={() => applyStatFilter("UPCOMING")}
            />
            <StatCard
              icon={<IconAlertTriangle size={16} />}
              label="Overdue"
              value={kpis.overdue ?? 0}
              accentColor="#dc2626"
              loading={loadingStats}
              onClick={() => applyStatFilter("OVERDUE")}
            />
            <StatCard
              icon={<IconTruck size={16} />}
              label="Pipeline"
              value={kpis.pipeline ?? 0}
              accentColor="#64748b"
              loading={loadingStats}
              onClick={() => applyStatFilter("PIPELINE")}
            />
            <StatCard
              icon={<IconClock size={16} />}
              label="Pipeline Overdue"
              value={kpis.pipeline_overdue ?? 0}
              accentColor="#b91c1c"
              loading={loadingStats}
              onClick={() => applyStatFilter("PIPELINE_OVERDUE")}
            />
            <StatCard
              icon={<IconCircleCheck size={16} />}
              label="Completed (month)"
              value={kpis.completed_this_month ?? 0}
              accentColor="#00823b"
              loading={loadingStats}
              onClick={() => applyStatFilter("COMPLETED")}
            />
            <StatCard
              icon={<IconChartBar size={16} />}
              label="Open Total"
              value={kpis.open_total ?? 0}
              accentColor="#334155"
              loading={loadingStats}
            />
            <StatCard
              icon={<IconClock size={16} />}
              label="Avg Pipeline Age"
              value={kpis.avg_pipeline_age_days != null ? `${kpis.avg_pipeline_age_days}d` : "—"}
              accentColor="#0ea5e9"
              loading={loadingStats}
            />
            <StatCard
              icon={<IconInfoCircle size={16} />}
              label="Missing Reason"
              value={kpis.pipeline_without_reason ?? 0}
              accentColor="#d97706"
              loading={loadingStats}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            <ChartCard
              title="Status Distribution"
              height={200}
              isEmpty={!statusChartData.length}
              loading={loadingStats}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, count }) => `${name}: ${count}`}
                    labelLine={false}
                  >
                    {statusChartData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip contentStyle={TT_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Pipeline Aging"
              height={200}
              isEmpty={!(stats?.pipeline_aging || []).some((b) => b.count > 0)}
              loading={loadingStats}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.pipeline_aging || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <RTooltip contentStyle={TT_STYLE} />
                  <Bar dataKey="count" fill="#1b365d" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="By Assignee"
              height={200}
              isEmpty={!assigneeChartData.length}
              loading={loadingStats}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assigneeChartData} layout="vertical" margin={{ left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 9 }} />
                  <RTooltip contentStyle={TT_STYLE} />
                  <Bar dataKey="count" fill="#00823b" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Pipeline Reason"
              height={200}
              isEmpty={!reasonChartData.length}
              loading={loadingStats}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasonChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={48} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <RTooltip contentStyle={TT_STYLE} />
                  <Bar dataKey="count" fill="#f37021" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {monthChartData.length > 0 && (
              <ChartCard
                title="Plans by Month"
                height={200}
                loading={loadingStats}
                className="md:col-span-2"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <RTooltip contentStyle={TT_STYLE} />
                    <Area type="monotone" dataKey="count" stroke="#1b365d" fill="#1b365d33" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          <div ref={worklistRef} className="flex items-center justify-between scroll-mt-2">
            <h2 className="text-sm font-semibold text-[#1b365d]">
              Focus worklist
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({statusFilterLabel})
              </span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleClearFilters}
            >
              Reset to Pipeline
            </Button>
          </div>

          <PaginatedTable
            columns={columns}
            fetcher={fetcher}
            filterParams={apiParams}
            showSearch={false}
            height={FOCUS_TABLE_HEIGHT}
            moduleKey="b2b-sales-planning"
            initialLimit={20}
          />
        </div>
      </ListingPageContainer>
      {sidebar}
    </ProtectedRoute>
  );
}
