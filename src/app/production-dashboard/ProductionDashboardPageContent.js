"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconDownload, IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ProductionDashboardFilterPanel from "@/components/common/ProductionDashboardFilterPanel";
import { Button } from "@/components/ui/button";
import productionDashboardService from "@/services/productionDashboardService";
import { getApiErrorMessage } from "@/utils/toast";
import ProductionKPICards from "./components/ProductionKPICards";
import WorkOrderPipelineBoard from "./components/WorkOrderPipelineBoard";
import ProductionAlertPanel from "./components/ProductionAlertPanel";
import ProductionAnalyticsCharts from "./components/ProductionAnalyticsCharts";
import WorkOrdersWorklist from "./components/WorkOrdersWorklist";
import BookingsWorklist from "./components/BookingsWorklist";
import SerialGenealogyPanel from "./components/SerialGenealogyPanel";
import {
  AP,
  DATE_PRESETS,
  DEFAULT_DATE_PRESET,
  STATUS_QUICK_TABS,
  getInitialDashboardFilters,
  pickDashboardParams,
  money,
  formatQty,
} from "./components/productionDashboardUi";

export default function ProductionDashboardPageContent() {
  const [filters, setFilters] = useState(getInitialDashboardFilters);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(DEFAULT_DATE_PRESET);
  const [activeStatusTab, setActiveStatusTab] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [kpi, setKpi] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [pipeline, setPipeline] = useState([]);

  const filterPanelRef = useRef(null);
  const workOrdersRef = useRef(null);
  const bookingsRef = useRef(null);
  const chartsRef = useRef(null);
  const varianceRef = useRef(null);

  const scrollToTarget = useCallback((target) => {
    const map = {
      "work-orders": workOrdersRef,
      bookings: bookingsRef,
      charts: chartsRef,
      variance: varianceRef,
    };
    map[target]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const refreshMeta = useCallback(async () => {
    const params = pickDashboardParams(filters);
    try {
      const [kpiRes, analyticsRes, pipelineRes] = await Promise.all([
        productionDashboardService.getProductionDashboardKpis(params),
        productionDashboardService.getProductionDashboardAnalytics({ ...params, limit: 10 }),
        productionDashboardService.getProductionDashboardPipeline(params),
      ]);
      setKpi(kpiRes?.result?.kpi || kpiRes?.kpi || null);
      setAnalytics(analyticsRes?.result || analyticsRes || null);
      setPipeline(pipelineRes?.result?.by_status || pipelineRes?.by_status || []);
    } catch {
      setKpi(null);
      setAnalytics(null);
      setPipeline([]);
    }
  }, [filters]);

  useEffect(() => {
    refreshMeta();
  }, [refreshMeta]);

  const handleApplyFilters = useCallback((next) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setFilterPanelOpen(false);
    setActivePreset(null);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(getInitialDashboardFilters());
    setActivePreset(DEFAULT_DATE_PRESET);
    setActiveStatusTab("all");
  }, []);

  const handlePreset = useCallback((preset) => {
    setFilters((prev) => ({ ...prev, ...preset.fn() }));
    setActivePreset(preset.label);
  }, []);

  const handleStatusTab = useCallback((tab) => {
    setActiveStatusTab(tab.key);
    setFilters((prev) => ({ ...prev, ...tab.filter }));
  }, []);

  const handleCardOrAlertClick = useCallback(
    (patch) => {
      const { scrollTarget, ...filterPatch } = patch || {};
      if (Object.keys(filterPatch).length) {
        setFilters((prev) => ({ ...prev, ...filterPatch }));
      }
      if (scrollTarget) scrollToTarget(scrollTarget);
    },
    [scrollToTarget]
  );

  const handleStageClick = useCallback(
    (status) => {
      setFilters((prev) => ({
        ...prev,
        status,
        open_only: "",
        kpi_scope: status === "APPROVED" || status === "IN_PROGRESS" ? "open" : status.toLowerCase(),
      }));
      setActiveStatusTab(status);
      scrollToTarget("work-orders");
    },
    [scrollToTarget]
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await productionDashboardService.exportProductionDashboard(pickDashboardParams(filters));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `production-dashboard-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Dashboard export completed");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to export dashboard"));
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const pipelineForCharts = useMemo(
    () =>
      pipeline.map((row) => ({
        ...row,
        id: row.status,
        label: row.status?.replace(/_/g, " "),
      })),
    [pipeline]
  );

  const varianceRows = analytics?.component_variance || [];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1440px] space-y-2.5 px-3 py-3">
          <div className="mb-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-lg font-semibold leading-tight text-slate-900">{AP.dashboard.title}</h1>
                <p className="text-[11px] text-slate-500">
                  Operations console for posted bookings, work-order pipeline, variance and traceability.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2 text-[10px]" onClick={refreshMeta}>
                  <IconRefresh className="size-3.5" /> Refresh
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 gap-1 px-2 text-[10px]"
                  onClick={handleExport}
                  disabled={exporting}
                  loading={exporting}
                >
                  <IconDownload className="size-3.5" /> Export All
                </Button>
              </div>
            </div>

            <div className="flex w-full flex-nowrap items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
              <span className="shrink-0 text-[10px] font-medium text-slate-400">Status:</span>
              {STATUS_QUICK_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleStatusTab(tab)}
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${
                    activeStatusTab === tab.key
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-green-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <span className="ml-0.5 shrink-0 border-l border-slate-200 pl-1.5 text-[10px] font-medium text-slate-400">
                Quick:
              </span>
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                    activePreset === preset.label
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:bg-green-50"
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 px-2 text-[10px]"
                onClick={handleClearFilters}
              >
                Reset
              </Button>
            </div>
          </div>

          <div ref={filterPanelRef}>
            <ProductionDashboardFilterPanel
              open={filterPanelOpen}
              onToggle={setFilterPanelOpen}
              values={filters}
              onApply={handleApplyFilters}
              onClear={handleClearFilters}
            />
          </div>

          <ProductionAlertPanel kpi={kpi} analytics={analytics} onAlertClick={handleCardOrAlertClick} />

          <ProductionKPICards filters={filters} onCardClick={handleCardOrAlertClick} />

          <WorkOrderPipelineBoard filters={filters} onStageClick={handleStageClick} />

          <div ref={chartsRef}>
            <ProductionAnalyticsCharts filters={filters} pipeline={pipelineForCharts} />
          </div>

          <div ref={varianceRef} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
            <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-tight text-slate-700">
              Component Consumption Variance
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold">Component</th>
                    <th className="px-2 py-1 text-right font-semibold">Standard</th>
                    <th className="px-2 py-1 text-right font-semibold">Consumed</th>
                    <th className="px-2 py-1 text-right font-semibold">Scrap</th>
                    <th className="px-2 py-1 text-right font-semibold">Variance Qty</th>
                    <th className="px-2 py-1 text-right font-semibold">Variance Value</th>
                  </tr>
                </thead>
                <tbody>
                  {varianceRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-2 py-4 text-center text-muted-foreground">
                        No variance rows for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    varianceRows.map((row) => (
                      <tr key={row.product_id} className="border-t border-border">
                        <td className="px-2 py-1">{row.product_name}</td>
                        <td className="px-2 py-1 text-right">{formatQty(row.standard_quantity, 4)}</td>
                        <td className="px-2 py-1 text-right">{formatQty(row.consumed_quantity)}</td>
                        <td className="px-2 py-1 text-right">{formatQty(row.scrap_quantity)}</td>
                        <td className="px-2 py-1 text-right">{formatQty(row.variance_quantity, 4)}</td>
                        <td className="px-2 py-1 text-right">{money(row.variance_value)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div ref={workOrdersRef}>
            <WorkOrdersWorklist
              filters={filters}
              onOpenFilter={() => {
                setFilterPanelOpen(true);
                filterPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          </div>

          <div ref={bookingsRef}>
            <BookingsWorklist filters={filters} />
          </div>

          <SerialGenealogyPanel />
        </div>
      </div>
    </ProtectedRoute>
  );
}
