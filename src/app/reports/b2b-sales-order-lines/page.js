"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import OrderListQuickSearch from "@/components/common/OrderListQuickSearch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
  IconFileAnalytics,
  IconFilter,
  IconRefresh,
  IconX,
  IconClock,
  IconTruck,
  IconCircleCheck,
  IconPackage,
} from "@tabler/icons-react";
import B2bSalesOrderLinesFilters, {
  LINE_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
} from "./components/B2bSalesOrderLinesFilters";
import B2bSalesOrderLinesReport from "./components/B2bSalesOrderLinesReport";

const getLast3MonthsDateRange = () => {
  const n = new Date();
  const start = new Date(n);
  start.setMonth(n.getMonth() - 3);
  return {
    order_date_from: start.toISOString().split("T")[0],
    order_date_to: n.toISOString().split("T")[0],
  };
};

const BASE_FILTERS = {
  q: "",
  order_date_from: "",
  order_date_to: "",
  status: null,
  line_fulfillment_status: null,
  client_id: "",
  ship_to_id: "",
  warehouse_id: "",
  product_type_id: "",
  product_make_id: "",
  product_id: "",
  user_id: "",
  order_no: "",
  model_number: "",
  hsn_code: "",
  pending_quantity_from: "",
  pending_quantity_to: "",
  fulfillment_percent_from: "",
  fulfillment_percent_to: "",
  total_amount_from: "",
  total_amount_to: "",
  pending_value_from: "",
  pending_value_to: "",
};

const DEFAULT_FILTERS = { ...BASE_FILTERS, ...getLast3MonthsDateRange() };

const DEFAULT_DATE_PRESET_LABEL = "Last 3M";

const DATE_PRESETS = [
  {
    label: "Today",
    fn: () => {
      const d = new Date().toISOString().split("T")[0];
      return { order_date_from: d, order_date_to: d };
    },
  },
  {
    label: "This Week",
    fn: () => {
      const n = new Date();
      const dy = n.getDay();
      const start = new Date(n);
      start.setDate(n.getDate() - (dy === 0 ? 6 : dy - 1));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return {
        order_date_from: start.toISOString().split("T")[0],
        order_date_to: end.toISOString().split("T")[0],
      };
    },
  },
  {
    label: "This Month",
    fn: () => {
      const n = new Date();
      return {
        order_date_from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0],
        order_date_to: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0],
      };
    },
  },
  {
    label: DEFAULT_DATE_PRESET_LABEL,
    fn: getLast3MonthsDateRange,
  },
  {
    label: "This Year",
    fn: () => {
      const n = new Date();
      return {
        order_date_from: new Date(n.getFullYear(), 0, 1).toISOString().split("T")[0],
        order_date_to: new Date(n.getFullYear(), 11, 31).toISOString().split("T")[0],
      };
    },
  },
];

const QUICK_TABS = [
  { key: "all", label: "All", icon: IconFileAnalytics, filters: {} },
  { key: "pending", label: "Pending Lines", icon: IconClock, filters: { line_fulfillment_status: ["PENDING"] } },
  { key: "partial", label: "Partial Lines", icon: IconTruck, filters: { line_fulfillment_status: ["PARTIAL"] } },
  { key: "completed", label: "Completed Lines", icon: IconCircleCheck, filters: { line_fulfillment_status: ["COMPLETED"] } },
  { key: "open-orders", label: "Open Orders", icon: IconPackage, filters: { status: ["CONFIRMED", "PARTIAL_SHIPPED"] } },
  { key: "done-orders", label: "Completed Orders", icon: IconCircleCheck, filters: { status: ["COMPLETED"] } },
];

const FILTER_LABELS = {
  q: "Quick",
  order_date_from: "Order From",
  order_date_to: "Order To",
  status: "Order Status",
  line_fulfillment_status: "Line Status",
  client_id: "Client",
  ship_to_id: "Ship To",
  warehouse_id: "Warehouse",
  product_type_id: "Product Type",
  product_make_id: "Product Make",
  product_id: "Product",
  user_id: "Created By",
  order_no: "Order No",
  model_number: "Model",
  hsn_code: "HSN",
  pending_quantity_from: "Pending From",
  pending_quantity_to: "Pending To",
  fulfillment_percent_from: "Fulfill From",
  fulfillment_percent_to: "Fulfill To",
  total_amount_from: "Value From",
  total_amount_to: "Value To",
  pending_value_from: "Pending Value From",
  pending_value_to: "Pending Value To",
};

const optionLabel = (value, options) =>
  (Array.isArray(value) ? value : [value])
    .filter(Boolean)
    .map((v) => options.find((o) => o.value === v)?.label || v)
    .join(", ");

const getChipValue = (key, value) => {
  if (key === "status") return optionLabel(value, ORDER_STATUS_OPTIONS);
  if (key === "line_fulfillment_status") return optionLabel(value, LINE_STATUS_OPTIONS);
  return String(value);
};

const countActive = (filters) =>
  Object.values(filters || {}).filter((v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)).length;

export default function B2bSalesOrderLinesReportPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(DEFAULT_DATE_PRESET_LABEL);
  const [activeTab, setActiveTab] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [quickSearch, setQuickSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const quickSearchDebounceRef = useRef(null);

  const activeCount = countActive(appliedFilters);
  const chips = useMemo(
    () =>
      Object.entries(appliedFilters)
        .filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0))
        .map(([key, value]) => ({
          key,
          label: FILTER_LABELS[key] || key,
          value: getChipValue(key, value),
        })),
    [appliedFilters]
  );

  useEffect(() => {
    return () => {
      if (quickSearchDebounceRef.current) clearTimeout(quickSearchDebounceRef.current);
    };
  }, []);

  const applyFilters = () => {
    const next = { ...filters, q: quickSearch };
    setFilters(next);
    setAppliedFilters(next);
    setActivePreset(null);
    setActiveTab("custom");
    setRefreshKey((k) => k + 1);
  };

  const resetFilters = () => {
    if (quickSearchDebounceRef.current) clearTimeout(quickSearchDebounceRef.current);
    setQuickSearch("");
    setIsSearching(false);
    const next = { ...BASE_FILTERS, ...getLast3MonthsDateRange() };
    setFilters(next);
    setAppliedFilters(next);
    setActivePreset(DEFAULT_DATE_PRESET_LABEL);
    setActiveTab("all");
    setRefreshKey((k) => k + 1);
  };

  const handleQuickSearchChange = useCallback((value) => {
    setQuickSearch(value);
    setIsSearching(true);
    setFilters((prev) => ({ ...prev, q: value }));

    if (quickSearchDebounceRef.current) clearTimeout(quickSearchDebounceRef.current);
    quickSearchDebounceRef.current = setTimeout(() => {
      setAppliedFilters((prev) => ({ ...prev, q: value }));
      if (value) setActiveTab("custom");
      setRefreshKey((k) => k + 1);
      setIsSearching(false);
      quickSearchDebounceRef.current = null;
    }, 500);
  }, []);

  const applyPreset = (preset) => {
    const next = { ...filters, ...preset.fn(), q: quickSearch };
    setFilters(next);
    setAppliedFilters(next);
    setActivePreset(preset.label);
    setActiveTab("custom");
    setRefreshKey((k) => k + 1);
  };

  const applyQuickTab = (tab) => {
    const next = { ...filters, q: quickSearch };
    if (tab.key === "all") {
      next.status = null;
      next.line_fulfillment_status = null;
    } else if (tab.filters.line_fulfillment_status) {
      next.line_fulfillment_status = tab.filters.line_fulfillment_status;
    } else if (tab.filters.status) {
      next.status = tab.filters.status;
      next.line_fulfillment_status = null;
    }
    setFilters(next);
    setAppliedFilters(next);
    setActivePreset(null);
    setActiveTab(tab.key);
    setRefreshKey((k) => k + 1);
  };

  const removeChip = (key) => {
    const next = { ...appliedFilters, [key]: BASE_FILTERS[key] };
    if (key === "product_type_id") {
      next.product_make_id = "";
      next.product_id = "";
    }
    if (key === "product_make_id") next.product_id = "";
    if (key === "client_id") next.ship_to_id = "";
    if (key === "q") {
      if (quickSearchDebounceRef.current) clearTimeout(quickSearchDebounceRef.current);
      setQuickSearch("");
      setIsSearching(false);
    }
    setFilters(next);
    setAppliedFilters(next);
    setActivePreset(null);
    setActiveTab("custom");
    setRefreshKey((k) => k + 1);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-slate-50 text-slate-900 font-sans">
        <div className="mx-auto max-w-[1500px] px-2 py-2 pb-6 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="bg-blue-500/10 p-1 rounded-lg">
                <IconFileAnalytics size={15} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-tight">
                  B2B Sales Order Lines Report
                </h1>
                <p className="text-[10px] text-slate-500">
                  Line level order value · shipment progress · pending insights
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="flex items-center gap-1 text-[9px] text-slate-400">
                <IconCalendar size={10} /> Quick:
              </span>
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={`text-[10px] px-1.5 py-0 rounded-full border font-medium transition-all ${
                    activePreset === preset.label
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => setRefreshKey((k) => k + 1)}>
                <IconRefresh size={12} className="mr-1" /> Refresh
              </Button>
            </div>
          </div>

          <Card className="rounded-xl border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-2 py-1.5 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                {QUICK_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => applyQuickTab(tab)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all ${
                        active
                          ? "bg-blue-50 border-blue-300 text-blue-700"
                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
                      }`}
                    >
                      <Icon size={11} /> {tab.label}
                    </button>
                  );
                })}
              </div>
              <OrderListQuickSearch
                value={quickSearch}
                onValueChange={handleQuickSearchChange}
                isSearching={isSearching}
                placeholder="Quick Search (Order / Client / Product / HSN)"
                className="w-full sm:w-80"
              />
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => setFiltersOpen((v) => !v)}>
                  <IconFilter size={12} className="mr-1" />
                  Filters
                  {activeCount > 0 && <Badge className="ml-1 h-4 px-1 text-[9px]">{activeCount}</Badge>}
                  {filtersOpen ? <IconChevronUp size={12} className="ml-1" /> : <IconChevronDown size={12} className="ml-1" />}
                </Button>
                <Button size="sm" className="h-7 px-2 text-[10px]" onClick={applyFilters}>
                  Apply Filters
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={resetFilters}>
                  Reset
                </Button>
              </div>
            </div>

            {filtersOpen && (
              <B2bSalesOrderLinesFilters filters={filters} onFiltersChange={setFilters} />
            )}

            {chips.length > 0 && (
              <div className="border-t border-slate-100 px-2 py-1 flex items-center gap-1 flex-wrap">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => removeChip(chip.key)}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-200"
                  >
                    <span className="font-semibold">{chip.label}:</span> {chip.value}
                    <IconX size={10} />
                  </button>
                ))}
              </div>
            )}
          </Card>

          <B2bSalesOrderLinesReport filters={appliedFilters} refreshKey={refreshKey} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
