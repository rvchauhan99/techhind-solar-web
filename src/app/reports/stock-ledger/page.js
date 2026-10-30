"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  IconBook2,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
  IconCalendar,
  IconDownload,
  IconArrowLeft,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import StockLedgerFilters from "./components/StockLedgerFilters";
import StockLedgerTable from "./components/StockLedgerTable";
import StockLedgerProductSection from "./components/StockLedgerProductSection";
import StockLedgerKpis from "./components/StockLedgerKpis";
import stockLedgerReportService from "@/services/stockLedgerReportService";
import { TRANSACTION_TYPE_LABELS } from "@/utils/inventoryTransactionLabels";
import { FLOW_BUCKET_LABELS, STOCK_LEDGER_ROUTE } from "@/utils/stockLedgerLinks";
import { getSafeReturnPath } from "@/utils/listNavigation";
import Loader from "@/components/common/Loader";

const PAGE_LIMIT = 25;
const DEFAULT_EXPANDED = 3;

function defaultLast30Days() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    start_date: start.toISOString().split("T")[0],
    end_date: end.toISOString().split("T")[0],
  };
}

const DATE_DEFAULTS = defaultLast30Days();

const INITIAL_FILTERS = {
  product_id: "",
  warehouse_id: "",
  product_type_id: "",
  product_make_id: "",
  flow_bucket: "",
  sales_channel: "",
  shrinkage_only: "",
  transaction_type: "",
  start_date: DATE_DEFAULTS.start_date,
  end_date: DATE_DEFAULTS.end_date,
};

const DATE_PRESETS = [
  {
    label: "Today",
    fn: () => {
      const d = new Date().toISOString().split("T")[0];
      return { start_date: d, end_date: d };
    },
  },
  {
    label: "Last 30d",
    fn: () => defaultLast30Days(),
  },
  {
    label: "This Month",
    fn: () => {
      const n = new Date();
      return {
        start_date: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0],
        end_date: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0],
      };
    },
  },
  {
    label: "This Year",
    fn: () => {
      const n = new Date();
      return {
        start_date: new Date(n.getFullYear(), 0, 1).toISOString().split("T")[0],
        end_date: new Date(n.getFullYear(), 11, 31).toISOString().split("T")[0],
      };
    },
  },
];

function buildQueryParams(f) {
  const params = {};
  for (const key of Object.keys(INITIAL_FILTERS)) {
    if (f[key] != null && f[key] !== "") params[key] = f[key];
  }
  return params;
}

function returnLabel(path) {
  if (!path) return "Back";
  if (path.startsWith("/stocks/inward-outward")) return "Back to Inward / Outward";
  return "Back";
}

function StockLedgerReportInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = useMemo(
    () => getSafeReturnPath(searchParams.get("returnTo"), ""),
    [searchParams]
  );

  const filtersFromUrl = useMemo(() => {
    const next = { ...INITIAL_FILTERS };
    for (const key of Object.keys(INITIAL_FILTERS)) {
      const v = searchParams.get(key);
      if (v != null && v !== "") next[key] = v;
    }
    return next;
  }, [searchParams]);

  const [filters, setFilters] = useState(filtersFromUrl);
  const [appliedFilters, setAppliedFilters] = useState(filtersFromUrl);
  const [page, setPage] = useState(() => Math.max(parseInt(searchParams.get("page"), 10) || 1, 1));
  const [productOption, setProductOption] = useState(null);
  const [warehouseOption, setWarehouseOption] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(!filtersFromUrl.product_id && !returnTo);
  const [activePreset, setActivePreset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());

  const syncUrl = useCallback(
    (f, nextPage = 1) => {
      const params = new URLSearchParams();
      Object.entries(buildQueryParams(f)).forEach(([k, v]) => params.set(k, String(v)));
      if (!f.product_id && nextPage > 1) params.set("page", String(nextPage));
      if (returnTo) params.set("returnTo", returnTo);
      const qs = params.toString();
      router.replace(qs ? `${STOCK_LEDGER_ROUTE}?${qs}` : STOCK_LEDGER_ROUTE, {
        scroll: false,
      });
    },
    [router, returnTo]
  );

  const loadReport = useCallback(async (f, nextPage = 1) => {
    if (!f.start_date || !f.end_date) {
      setReport(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = buildQueryParams(f);
      if (!f.product_id) {
        params.page = nextPage;
        params.limit = PAGE_LIMIT;
      }
      const res = await stockLedgerReportService.getStockLedgerReport(params);
      const data = res?.result ?? res?.data ?? res;
      setReport(data);
      if (data?.mode === "multi") {
        setExpanded(
          new Set((data.products || []).slice(0, DEFAULT_EXPANDED).map((s) => s.product?.id))
        );
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load stock ledger";
      setError(msg);
      setReport(null);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setFilters(filtersFromUrl);
    setAppliedFilters(filtersFromUrl);
    loadReport(filtersFromUrl, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from URL
  }, []);

  useEffect(() => {
    if (report?.product && !productOption && appliedFilters.product_id) {
      setProductOption({ id: report.product.id, product_name: report.product.name });
    }
    if (report?.warehouse && !warehouseOption && appliedFilters.warehouse_id) {
      setWarehouseOption({ id: report.warehouse.id, name: report.warehouse.name });
    }
  }, [report, productOption, warehouseOption, appliedFilters]);

  const runWith = (next, nextPage = 1) => {
    setFilters(next);
    setAppliedFilters(next);
    setPage(nextPage);
    syncUrl(next, nextPage);
    loadReport(next, nextPage);
  };

  const handleApply = () => {
    if (!filters.start_date || !filters.end_date) {
      toast.warning("Select a date range.");
      return;
    }
    setActivePreset(null);
    runWith(filters, 1);
  };

  const handleReset = () => {
    const next = { ...INITIAL_FILTERS, ...defaultLast30Days() };
    setProductOption(null);
    setWarehouseOption(null);
    setActivePreset(null);
    runWith(next, 1);
  };

  const handlePreset = (preset) => {
    setActivePreset(preset.label);
    runWith({ ...filters, ...preset.fn() }, 1);
  };

  const handlePage = (nextPage) => {
    runWith(appliedFilters, nextPage);
  };

  const handleOpenProduct = (product) => {
    if (!product?.id) return;
    setProductOption({ id: product.id, product_name: product.name });
    runWith({ ...appliedFilters, product_id: String(product.id) }, 1);
  };

  const handleExport = async (format) => {
    if (!report) {
      toast.warning("Apply filters before export.");
      return;
    }
    setExporting(true);
    try {
      await stockLedgerReportService.exportStockLedgerReport(
        buildQueryParams(appliedFilters),
        format
      );
      toast.success(`Exported ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  // Filters are staged: editing an input does not re-fetch until Apply is pressed.
  // Flag pending edits so the panel never looks like it refreshed when it did not.
  const pendingChangeCount = useMemo(() => {
    let n = 0;
    for (const key of Object.keys(INITIAL_FILTERS)) {
      if (String(filters[key] ?? "") !== String(appliedFilters[key] ?? "")) n += 1;
    }
    return n;
  }, [filters, appliedFilters]);
  const hasPendingChanges = pendingChangeCount > 0;

  const chips = useMemo(() => {
    const f = appliedFilters;
    const rf = report?.filters || {};
    const list = [];
    if (f.product_id) {
      list.push({
        key: "product_id",
        label: "Product",
        value: productOption?.product_name || report?.product?.name || f.product_id,
      });
    }
    if (f.warehouse_id) {
      list.push({
        key: "warehouse_id",
        label: "Warehouse",
        value: warehouseOption?.name || report?.warehouse?.name || f.warehouse_id,
      });
    }
    if (f.start_date) list.push({ key: "start_date", label: "From", value: f.start_date });
    if (f.end_date) list.push({ key: "end_date", label: "To", value: f.end_date });
    if (f.product_type_id) {
      list.push({
        key: "product_type_id",
        label: "Type",
        value: rf.product_type_name || f.product_type_id,
      });
    }
    if (f.product_make_id) {
      list.push({
        key: "product_make_id",
        label: "Make",
        value: rf.product_make_name || f.product_make_id,
      });
    }
    if (f.flow_bucket) {
      list.push({
        key: "flow_bucket",
        label: "Bucket",
        value: f.flow_bucket
          .split(",")
          .map((b) => FLOW_BUCKET_LABELS[b] || b)
          .join(" + "),
      });
    }
    if (f.sales_channel) {
      list.push({ key: "sales_channel", label: "Channel", value: f.sales_channel.toUpperCase() });
    }
    if (f.shrinkage_only) {
      list.push({ key: "shrinkage_only", label: "Shrinkage", value: "Damage / Loss" });
    }
    if (f.transaction_type) {
      list.push({
        key: "transaction_type",
        label: "Txn",
        value: TRANSACTION_TYPE_LABELS[f.transaction_type] || f.transaction_type,
      });
    }
    return list;
  }, [appliedFilters, productOption, warehouseOption, report]);

  const removeChip = (key) => {
    const next = { ...appliedFilters, [key]: "" };
    if (key === "start_date" || key === "end_date") return;
    if (key === "product_id") setProductOption(null);
    if (key === "warehouse_id") setWarehouseOption(null);
    if (key === "product_type_id") next.product_make_id = "";
    runWith(next, 1);
  };

  const isMulti = report?.mode === "multi";
  const sections = isMulti ? report.products || [] : [];
  const pagination = report?.pagination;
  const typeRestricted = !!report?.filters?.type_restricted;

  const toggleSection = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const allExpanded = sections.length > 0 && sections.every((s) => expanded.has(s.product?.id));

  const kpis = isMulti
    ? [
        { label: "Products", value: report.totals?.products },
        { label: "Opening", value: report.totals?.opening_quantity },
        { label: "Period In", value: report.totals?.period_in, cls: "text-emerald-700" },
        { label: "Period Out", value: report.totals?.period_out, cls: "text-red-700" },
        { label: "Closing", value: report.totals?.closing_quantity },
      ]
    : report
      ? [
          { label: "Opening", value: report.opening_quantity },
          { label: "Period In", value: report.period_in, cls: "text-emerald-700" },
          { label: "Period Out", value: report.period_out, cls: "text-red-700" },
          { label: "Closing", value: report.closing_quantity },
        ]
      : [];

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 font-sans">
      <div className="mx-auto max-w-[1440px] px-2 py-2 pb-6 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {returnTo ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(returnTo)}
                className="h-6 text-[10px] gap-1 px-1.5"
              >
                <IconArrowLeft size={10} /> {returnLabel(returnTo)}
              </Button>
            ) : null}
            <div className="bg-emerald-500/10 p-1 rounded-lg">
              <IconBook2 size={14} stroke={2} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-tight">
                Stock Ledger
              </h1>
              <p className="text-[10px] text-slate-500">
                {isMulti
                  ? "Product-wise passbook · Opening · Movements · Running balance"
                  : "Passbook · Opening · Movements · Running balance"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="flex items-center gap-1 text-[9px] text-slate-400">
              <IconCalendar size={10} /> Quick:
            </span>
            {DATE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p)}
                className={[
                  "text-[10px] px-1.5 py-0 rounded-full border font-medium transition-all",
                  activePreset === p.label
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white border-slate-200 text-slate-500 hover:border-primary hover:text-primary",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
            <div className="h-3 w-px bg-slate-200 mx-0.5" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport("csv")}
              disabled={exporting || !report}
              className="h-6 text-[10px] gap-1 px-1.5"
            >
              <IconDownload size={10} /> CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport("excel")}
              disabled={exporting || !report}
              className="h-6 text-[10px] gap-1 px-1.5"
            >
              <IconDownload size={10} /> Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="h-6 text-[10px] gap-1 px-1.5"
            >
              <IconRefresh size={10} /> Reset
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              title={
                hasPendingChanges
                  ? `${pendingChangeCount} filter change${pendingChangeCount === 1 ? "" : "s"} not applied yet — the report below still shows the previous filters`
                  : "Apply filters"
              }
              className={`h-6 text-[10px] gap-1 px-1.5 ${
                hasPendingChanges ? "ring-2 ring-amber-400 ring-offset-1" : ""
              }`}
            >
              <IconFilter size={10} />
              {hasPendingChanges ? "Apply changes" : "Apply"}
              {hasPendingChanges ? (
                <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-400 px-0.5 text-[8px] font-bold text-amber-950">
                  {pendingChangeCount}
                </span>
              ) : null}
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-slate-200 shadow-none">
          <button
            type="button"
            className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <span className="flex items-center gap-1">
              <IconFilter size={12} /> Filters
              {chips.length > 0 && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1">
                  {chips.length}
                </Badge>
              )}
              {hasPendingChanges ? (
                <span className="text-[9px] font-medium text-amber-600">
                  · {pendingChangeCount} unapplied
                </span>
              ) : null}
            </span>
            {filtersOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </button>
          {filtersOpen && (
            <StockLedgerFilters
              filters={filters}
              onFiltersChange={setFilters}
              productOption={productOption}
              warehouseOption={warehouseOption}
              onProductOptionChange={setProductOption}
              onWarehouseOptionChange={setWarehouseOption}
            />
          )}
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 px-2 py-1">
              {chips.map((c) => (
                <span
                  key={c.key}
                  className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] text-slate-600"
                >
                  <span className="font-semibold text-slate-500">{c.label}:</span> {c.value}
                  {c.key !== "start_date" && c.key !== "end_date" ? (
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-700"
                      onClick={() => removeChip(c.key)}
                      aria-label={`Remove ${c.label} filter`}
                    >
                      <IconX size={10} />
                    </button>
                  ) : null}
                </span>
              ))}
              {typeRestricted ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-700">
                  <IconInfoCircle size={10} /> Opening/closing include only selected movement
                  types.
                </span>
              ) : null}
            </div>
          )}
        </Card>

        {report && kpis.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {kpis.map((kpi) => (
              <Card key={kpi.label} className="border-slate-200 shadow-none px-2 py-1.5">
                <div className="text-[9px] uppercase tracking-wide text-slate-500">
                  {kpi.label}
                </div>
                <div className={`text-sm font-bold tabular-nums ${kpi.cls || "text-slate-900"}`}>
                  {kpi.value ?? "—"}
                </div>
              </Card>
            ))}
          </div>
        )}

        {report?.summary ? (
          <StockLedgerKpis
            summary={report.summary}
            dataQuality={report.data_quality}
            totals={isMulti ? report.totals : null}
          />
        ) : null}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader />
          </div>
        ) : error ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-4 text-center text-xs text-red-700">
            {error}
          </div>
        ) : !report ? (
          <div className="rounded border border-slate-200 bg-white px-3 py-8 text-center text-xs text-slate-500">
            Select a date range (and optionally a product), then Apply.
          </div>
        ) : isMulti ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>
                {pagination?.total || 0} product{pagination?.total === 1 ? "" : "s"} with movement
                {pagination?.total_pages > 1
                  ? ` · page ${pagination.page} of ${pagination.total_pages}`
                  : ""}
              </span>
              <div className="flex items-center gap-1">
                {sections.length > 0 ? (
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() =>
                      setExpanded(
                        allExpanded ? new Set() : new Set(sections.map((s) => s.product?.id))
                      )
                    }
                  >
                    {allExpanded ? "Collapse all" : "Expand all"}
                  </button>
                ) : null}
                {pagination?.total_pages > 1 ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0"
                      disabled={pagination.page <= 1}
                      onClick={() => handlePage(pagination.page - 1)}
                      aria-label="Previous page"
                    >
                      <IconChevronLeft size={12} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0"
                      disabled={pagination.page >= pagination.total_pages}
                      onClick={() => handlePage(pagination.page + 1)}
                      aria-label="Next page"
                    >
                      <IconChevronRight size={12} />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            {sections.length === 0 ? (
              <div className="rounded border border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-500">
                No stock movement for the selected filters.
              </div>
            ) : (
              sections.map((section) => (
                <StockLedgerProductSection
                  key={section.product?.id}
                  section={section}
                  open={expanded.has(section.product?.id)}
                  onToggle={() => toggleSection(section.product?.id)}
                  onOpenProduct={handleOpenProduct}
                />
              ))
            )}
          </div>
        ) : (
          <StockLedgerTable rows={report?.rows || []} />
        )}
      </div>
    </div>
  );
}

export default function StockLedgerReportPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader />
          </div>
        }
      >
        <StockLedgerReportInner />
      </Suspense>
    </ProtectedRoute>
  );
}
