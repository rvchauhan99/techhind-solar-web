"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  IconBuildingWarehouse,
  IconChevronDown,
  IconChevronUp,
  IconFilter,
  IconPackage,
  IconRefresh,
  IconReportAnalytics,
} from "@tabler/icons-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import stockService from "@/services/stockService";
import mastersService, { getReferenceOptionsSearch } from "@/services/mastersService";
import productService from "@/services/productService";
import companyService from "@/services/companyService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import AutocompleteField from "@/components/common/AutocompleteField";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import StatCard from "@/components/common/StatCard";
import ChartCard from "@/components/common/ChartCard";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatCurrency } from "@/utils/dataTableUtils";

const COLUMN_FILTER_KEYS = [
  "product_id",
  "product_type_id",
  "warehouse_id",
  "quantity_reserved",
  "quantity_reserved_op",
  "quantity_reserved_to",
  "quantity_available",
  "quantity_available_op",
  "quantity_available_to",
  "tracking_type",
  "min_stock_quantity",
  "min_stock_quantity_op",
  "min_stock_quantity_to",
  "low_stock",
];

const TRACKING_OPTIONS = [
  { value: "LOT", label: "LOT" },
  { value: "SERIAL", label: "SERIAL" },
];

const LOW_STOCK_OPTIONS = [
  { value: "true", label: "Low Stock" },
  { value: "false", label: "OK" },
];

const HEALTH_COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

const EMPTY_SUMMARY = {
  totals: {
    total_products: 0,
    total_on_hand: 0,
    total_available: 0,
    total_reserved: 0,
    total_stock_value_excl_gst: 0,
    total_stock_value_incl_gst: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
  },
  by_product_type: [],
  by_warehouse: [],
  by_tracking_type: [],
};

const FILTER_LABELS = {
  product_id: "Product",
  product_type_id: "Product Type",
  warehouse_id: "Warehouse",
  tracking_type: "Tracking",
  low_stock: "Status",
  quantity_available: "Available",
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value || 0));

const toNum = (value) => Number(value || 0);

export default function StockPage() {
  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort, setFilters } =
    listingState;

  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [productTypeOptions, setProductTypeOptions] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [valueMode, setValueMode] = useState("excl");
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [selectedProductName, setSelectedProductName] = useState("");
  const [selectedWarehouseName, setSelectedWarehouseName] = useState("");

  useEffect(() => {
    mastersService
      .getReferenceOptions("product_type.model")
      .then((res) => {
        const data = res?.result || res?.data || res || [];
        const options = Array.isArray(data) ? data.map((t) => ({ value: String(t.id), label: t.name || String(t.id) })) : [];
        setProductTypeOptions(options);
      })
      .catch(() => setProductTypeOptions([]));
  }, []);

  const filterParams = useMemo(() => {
    const params = Object.fromEntries(
      Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
    );
    delete params.product_name;
    delete params.product_name_op;
    delete params.warehouse_name;
    delete params.warehouse_name_op;
    delete params.quantity_on_hand;
    delete params.quantity_on_hand_op;
    delete params.quantity_on_hand_to;
    return params;
  }, [filters]);

  useEffect(() => {
    let ignore = false;
    setSummaryLoading(true);
    stockService
      .getStockSummary(filterParams)
      .then((res) => {
        if (ignore) return;
        const result = res?.result || res || EMPTY_SUMMARY;
        setSummary({
          totals: { ...EMPTY_SUMMARY.totals, ...(result.totals || {}) },
          by_product_type: Array.isArray(result.by_product_type) ? result.by_product_type : [],
          by_warehouse: Array.isArray(result.by_warehouse) ? result.by_warehouse : [],
          by_tracking_type: Array.isArray(result.by_tracking_type) ? result.by_tracking_type : [],
        });
      })
      .catch((error) => {
        if (ignore) return;
        console.error("Stock summary error:", error);
        setSummary(EMPTY_SUMMARY);
      })
      .finally(() => {
        if (!ignore) setSummaryLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [filterParams]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await stockService.exportStocks(filterParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stocks-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export stocks");
    } finally {
      setExporting(false);
    }
  }, [filterParams]);

  const productTypeById = useMemo(() => {
    const map = new Map();
    productTypeOptions.forEach((item) => {
      map.set(String(item.value), item.label);
    });
    return map;
  }, [productTypeOptions]);

  const selectedProductTypeName = useMemo(
    () => productTypeById.get(String(filters.product_type_id || "")) || "",
    [productTypeById, filters.product_type_id]
  );

  const setProductTypeFilter = useCallback(
    (nextTypeId) => {
      const normalized = nextTypeId ? String(nextTypeId) : "";
      const current = String(filters.product_type_id || "");
      if (current !== normalized) {
        setFilter("product_id", "");
        setSelectedProductName("");
      }
      setFilter("product_type_id", normalized);
    },
    [filters.product_type_id, setFilter]
  );

  const loadProductOptions = useCallback(
    async (q) => {
      const res = await productService.getProducts({
        q: q || undefined,
        limit: 50,
        product_type_name: selectedProductTypeName || undefined,
      });
      const data = res?.result?.data || res?.data || [];
      const list = Array.isArray(data) ? data : [];
      return list.map((item) => ({
        id: item.id,
        product_name: item.product_name || item.name || String(item.id),
      }));
    },
    [selectedProductTypeName]
  );

  const loadWarehouseOptions = useCallback(async (q) => {
    const res = await companyService.listWarehouses();
    const data = res?.result ?? res?.data ?? res ?? [];
    const list = Array.isArray(data) ? data : [];
    const qNorm = (q || "").toLowerCase();
    const filtered = qNorm
      ? list.filter(
          (item) =>
            String(item?.name || "").toLowerCase().includes(qNorm) ||
            String(item?.label || "").toLowerCase().includes(qNorm)
        )
      : list;
    return filtered.slice(0, 50).map((item) => ({
      id: item.id,
      name: item.name || item.label || String(item.id),
    }));
  }, []);

  const activeFilterChips = useMemo(
    () =>
      Object.entries(filters || {})
        .filter(
          ([key, value]) =>
            !key.endsWith("_op") &&
            !key.endsWith("_to") &&
            value != null &&
            value !== "" &&
            !["product_name", "warehouse_name"].includes(key)
        )
        .map(([key, value]) => {
          let displayValue = String(value);
          if (key === "product_type_id") displayValue = productTypeById.get(String(value)) || String(value);
          if (key === "product_id") displayValue = selectedProductName || `Product #${value}`;
          if (key === "warehouse_id") displayValue = selectedWarehouseName || `Warehouse #${value}`;
          if (key === "tracking_type") displayValue = TRACKING_OPTIONS.find((o) => o.value === value)?.label || String(value);
          if (key === "low_stock") displayValue = LOW_STOCK_OPTIONS.find((o) => o.value === String(value))?.label || String(value);
          return {
            key,
            label: FILTER_LABELS[key] || key,
            value: displayValue,
          };
        }),
    [filters, productTypeById, selectedProductName, selectedWarehouseName]
  );

  const resetAllFilters = useCallback(() => {
    const emptyFilters = {
      ...Object.fromEntries(COLUMN_FILTER_KEYS.map((k) => [k, ""])),
      q: "",
      product_name: "",
      warehouse_name: "",
    };
    setFilters(emptyFilters, true, false);
    setSelectedProductName("");
    setSelectedWarehouseName("");
  }, [setFilters]);

  const removeFilterChip = useCallback(
    (key) => {
      setFilter(key, "");
      if (key === "product_type_id") {
        setFilter("product_id", "");
        setSelectedProductName("");
      }
      if (key === "product_id") setSelectedProductName("");
      if (key === "warehouse_id") setSelectedWarehouseName("");
      const operatorKey = `${key}_op`;
      const toKey = `${key}_to`;
      if (COLUMN_FILTER_KEYS.includes(operatorKey)) setFilter(operatorKey, "");
      if (COLUMN_FILTER_KEYS.includes(toKey)) setFilter(toKey, "");
    },
    [setFilter]
  );

  const setRangeFilter = useCallback(
    (field, from, to) => {
      const fromValue = from == null || from === "" ? "" : String(from);
      const toValue = to == null || to === "" ? "" : String(to);
      setFilter(field, fromValue);
      setFilter(`${field}_to`, toValue);
      if (fromValue && toValue) {
        setFilter(`${field}_op`, "between");
      } else if (fromValue) {
        setFilter(`${field}_op`, "gte");
      } else if (toValue) {
        setFilter(field, toValue);
        setFilter(`${field}_to`, "");
        setFilter(`${field}_op`, "lte");
      } else {
        setFilter(`${field}_op`, "");
      }
    },
    [setFilter]
  );

  const columns = useMemo(
    () => [
      {
        field: "product",
        label: "Product",
        sortable: false,
        render: (row) => row.product?.product_name || "-",
      },
      {
        field: "product_type_name",
        label: "Product Type",
        sortable: false,
        render: (row) => row.product_type_name || row.product?.productType?.name || "-",
      },
      {
        field: "warehouse",
        label: "Warehouse",
        sortable: false,
        render: (row) => row.warehouse?.name || "-",
      },
      {
        field: "quantity_on_hand",
        label: "On Hand",
        sortable: true,
      },
      {
        field: "quantity_reserved",
        label: "Reserved",
        sortable: true,
      },
      {
        field: "quantity_available",
        label: "Available",
        sortable: true,
      },
      {
        field: "avg_price_excl_gst",
        label: "Avg Price Excl GST",
        sortable: false,
        render: (row) =>
          row.avg_purchase_price != null ? formatCurrency(row.avg_purchase_price) : "-",
      },
      {
        field: "avg_price_incl_gst",
        label: "Avg Price Incl GST",
        sortable: false,
        render: (row) => {
          const avg = toNum(row.avg_purchase_price);
          const gst = toNum(row.gst_percent);
          return formatCurrency(avg * (1 + gst / 100));
        },
      },
      {
        field: "stock_value",
        label: "Stock Value Excl GST",
        sortable: false,
        render: (row) => (row.stock_value != null ? formatCurrency(row.stock_value) : "-"),
      },
      {
        field: "stock_value_incl_gst",
        label: "Stock Value Incl GST",
        sortable: false,
        render: (row) => {
          const stockValue = toNum(row.stock_value);
          const gst = toNum(row.gst_percent);
          return formatCurrency(stockValue * (1 + gst / 100));
        },
      },
      {
        field: "tracking_type",
        label: "Tracking",
        sortable: true,
        render: (row) => (
          <Badge variant={row.tracking_type === "SERIAL" ? "default" : "secondary"} className="text-xs">
            {row.tracking_type || "-"}
          </Badge>
        ),
      },
      {
        field: "min_stock_quantity",
        label: "Min Stock",
        sortable: true,
      },
      {
        field: "gst_percent",
        label: "GST %",
        sortable: false,
        render: (row) => `${toNum(row.gst_percent)}%`,
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => {
          const available = row.quantity_available || 0;
          const minStock = row.min_stock_quantity || 0;
          const isLow = available < minStock;
          return (
            <Badge variant={isLow ? "destructive" : "default"} className="text-xs">
              {isLow ? "Low Stock" : "OK"}
            </Badge>
          );
        },
      },
    ],
    [productTypeOptions]
  );

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const response = await stockService.getStocks({
        page: p.page,
        limit: p.limit,
        warehouse_id: p.warehouse_id || undefined,
        product_id: p.product_id || undefined,
        product_type_id: p.product_type_id || undefined,
        quantity_reserved: p.quantity_reserved || undefined,
        quantity_reserved_op: p.quantity_reserved_op || undefined,
        quantity_reserved_to: p.quantity_reserved_to || undefined,
        quantity_available: p.quantity_available || undefined,
        quantity_available_op: p.quantity_available_op || undefined,
        quantity_available_to: p.quantity_available_to || undefined,
        min_stock_quantity: p.min_stock_quantity || undefined,
        min_stock_quantity_op: p.min_stock_quantity_op || undefined,
        min_stock_quantity_to: p.min_stock_quantity_to || undefined,
        tracking_type: p.tracking_type || undefined,
        low_stock: p.low_stock !== undefined && p.low_stock !== "" ? p.low_stock : undefined,
        sortBy: p.sortBy || "id",
        sortOrder: p.sortOrder || "DESC",
      });
      const result = response?.result || response;
      return {
        data: result?.data || [],
        meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
      };
    },
    []
  );

  const totals = summary?.totals || EMPTY_SUMMARY.totals;
  const productTypeChartData = useMemo(
    () =>
      (summary?.by_product_type || []).slice(0, 8).map((row) => ({
        name: row.product_type_name || "Uncategorized",
        on_hand: toNum(row.total_on_hand),
        available: toNum(row.total_available),
        value_excl: toNum(row.total_value_excl_gst),
        value_incl: toNum(row.total_value_incl_gst),
      })),
    [summary]
  );

  const warehouseChartData = useMemo(
    () =>
      (summary?.by_warehouse || []).slice(0, 8).map((row) => ({
        name: row.warehouse_name || "Unknown",
        on_hand: toNum(row.total_on_hand),
        available: toNum(row.total_available),
        value_excl: toNum(row.total_value_excl_gst),
      })),
    [summary]
  );

  const healthChartData = useMemo(() => {
    const totalStockRows = (summary?.by_tracking_type || []).reduce((acc, item) => acc + toNum(item.count), 0);
    const out = toNum(totals.out_of_stock_count);
    const low = toNum(totals.low_stock_count);
    const lowOnly = Math.max(low - out, 0);
    const ok = Math.max(totalStockRows - low, 0);
    return [
      { name: "OK", value: ok },
      { name: "Low", value: lowOnly },
      { name: "Out", value: out },
    ];
  }, [summary, totals]);

  const productTypeTabs = useMemo(
    () => [{ value: "", label: "All" }, ...productTypeOptions],
    [productTypeOptions]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="iStock Dashboard"
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
          <div className="flex flex-col gap-2 p-1 pt-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-500/10 p-1.5 rounded-lg">
                <IconReportAnalytics size={16} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold leading-tight">Inventory Insights</h2>
                <p className="text-[11px] text-muted-foreground">Product Type focus with GST-aware valuation</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {activeFilterChips.length} active
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={resetAllFilters}
                className="h-7 text-xs gap-1 px-2"
              >
                <IconRefresh size={11} />
                Reset
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {productTypeTabs.map((option) => {
              const isActive = String(filters.product_type_id || "") === String(option.value || "");
              return (
                <button
                  key={`ptype-${option.value || "all"}`}
                  onClick={() => setProductTypeFilter(option.value || "")}
                  className={[
                    "px-2 py-0.5 rounded-full border text-[11px] font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary hover:text-primary",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <Card className="rounded-xl border border-border bg-card">
            <button
              onClick={() => setFiltersOpen((open) => !open)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-muted/30 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <IconFilter size={12} />
                Advanced Filters
              </span>
              {filtersOpen ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
            </button>
            {filtersOpen && (
              <div className="border-t border-border/50 p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                <AutocompleteField
                  name="product_type_id"
                  label="Product Type"
                  size="small"
                  asyncLoadOptions={(q) => getReferenceOptionsSearch("product_type.model", { q, limit: 20 })}
                  referenceModel="product_type.model"
                  getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                  value={
                    filters.product_type_id
                      ? {
                          id: filters.product_type_id,
                          name: productTypeById.get(String(filters.product_type_id)) || String(filters.product_type_id),
                        }
                      : null
                  }
                  onChange={(e, v) => setProductTypeFilter(v?.id ?? v?.value ?? "")}
                  placeholder="All Product Types"
                />
                <AutocompleteField
                  name="product_id"
                  label="Product"
                  size="small"
                  asyncLoadOptions={loadProductOptions}
                  getOptionLabel={(o) => o?.product_name ?? o?.name ?? ""}
                  value={
                    filters.product_id
                      ? {
                          id: filters.product_id,
                          product_name: selectedProductName || `Product #${filters.product_id}`,
                        }
                      : null
                  }
                  onChange={(e, v) => {
                    const nextId = v?.id ?? "";
                    setFilter("product_id", nextId ? String(nextId) : "");
                    setSelectedProductName(v?.product_name ?? v?.name ?? "");
                  }}
                  placeholder={selectedProductTypeName ? `Search ${selectedProductTypeName} products...` : "Search product..."}
                />
                <AutocompleteField
                  name="warehouse_id"
                  label="Warehouse"
                  size="small"
                  asyncLoadOptions={loadWarehouseOptions}
                  getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                  value={
                    filters.warehouse_id
                      ? {
                          id: filters.warehouse_id,
                          name: selectedWarehouseName || `Warehouse #${filters.warehouse_id}`,
                        }
                      : null
                  }
                  onChange={(e, v) => {
                    const nextId = v?.id ?? "";
                    setFilter("warehouse_id", nextId ? String(nextId) : "");
                    setSelectedWarehouseName(v?.name ?? v?.label ?? "");
                  }}
                  placeholder="Search warehouse..."
                />
                <Select
                  name="tracking_type"
                  label="Tracking"
                  size="small"
                  value={filters.tracking_type || ""}
                  onChange={(e) => setFilter("tracking_type", e.target.value)}
                  placeholder="All"
                >
                  <MenuItem value="">All</MenuItem>
                  {TRACKING_OPTIONS.map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
                <Select
                  name="low_stock"
                  label="Stock Status"
                  size="small"
                  value={filters.low_stock || ""}
                  onChange={(e) => setFilter("low_stock", e.target.value)}
                  placeholder="All"
                >
                  <MenuItem value="">All</MenuItem>
                  {LOW_STOCK_OPTIONS.map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
                <Input
                  name="quantity_available"
                  label="Available From"
                  type="number"
                  size="small"
                  value={filters.quantity_available ?? ""}
                  onChange={(e) => setRangeFilter("quantity_available", e.target.value, filters.quantity_available_to || "")}
                  placeholder="0"
                />
                <Input
                  name="quantity_available_to"
                  label="Available To"
                  type="number"
                  size="small"
                  value={filters.quantity_available_to ?? ""}
                  onChange={(e) => setRangeFilter("quantity_available", filters.quantity_available || "", e.target.value)}
                  placeholder="1000"
                />
              </div>
            )}
          </Card>

          {activeFilterChips.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => removeFilterChip(chip.key)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[10px] hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  {chip.label}: <span className="font-semibold">{chip.value}</span>
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
            <StatCard
              icon={<IconPackage size={16} />}
              label="Total Products"
              value={formatNumber(totals.total_products)}
              accentColor="#2563eb"
              subLabel="Distinct SKUs"
              loading={summaryLoading}
            />
            <StatCard
              icon={<IconPackage size={16} />}
              label="On Hand"
              value={formatNumber(totals.total_on_hand)}
              accentColor="#4f46e5"
              subLabel="Inventory units"
              loading={summaryLoading}
            />
            <StatCard
              icon={<IconPackage size={16} />}
              label="Available"
              value={formatNumber(totals.total_available)}
              accentColor="#10b981"
              subLabel={`Reserved: ${formatNumber(totals.total_reserved)}`}
              loading={summaryLoading}
            />
            <StatCard
              icon={<IconReportAnalytics size={16} />}
              label="Value Excl GST"
              value={formatCurrency(totals.total_stock_value_excl_gst)}
              accentColor="#f59e0b"
              subLabel={`Low Stock: ${formatNumber(totals.low_stock_count)}`}
              loading={summaryLoading}
            />
            <StatCard
              icon={<IconBuildingWarehouse size={16} />}
              label="Value Incl GST"
              value={formatCurrency(totals.total_stock_value_incl_gst)}
              accentColor="#f97316"
              subLabel={`Out of Stock: ${formatNumber(totals.out_of_stock_count)}`}
              loading={summaryLoading}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-2">
            <ChartCard
              title="By Product Type"
              subtitle="On hand and available quantities"
              className="xl:col-span-5"
              loading={summaryLoading}
              isEmpty={productTypeChartData.length === 0}
              action={
                <div className="flex items-center gap-1 rounded-full border border-border p-0.5">
                  <button
                    onClick={() => setValueMode("excl")}
                    className={[
                      "px-2 py-0.5 text-[10px] rounded-full transition-colors",
                      valueMode === "excl" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    Excl GST
                  </button>
                  <button
                    onClick={() => setValueMode("incl")}
                    className={[
                      "px-2 py-0.5 text-[10px] rounded-full transition-colors",
                      valueMode === "incl" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    Incl GST
                  </button>
                </div>
              }
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={productTypeChartData} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value, name, item) => {
                      if (name === "Value") {
                        return [formatCurrency(value), name];
                      }
                      return [formatNumber(value), name];
                    }}
                    labelFormatter={(label) => `Type: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="on_hand" name="On Hand" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="available" name="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="px-2 pb-1 grid grid-cols-2 gap-1">
                {productTypeChartData.slice(0, 4).map((item) => (
                  <div key={`ptype-value-${item.name}`} className="text-[10px] text-muted-foreground flex justify-between">
                    <span className="truncate mr-1">{item.name}</span>
                    <span className="font-semibold">
                      {formatCurrency(valueMode === "incl" ? item.value_incl : item.value_excl)}
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard
              title="Stock Health"
              subtitle="OK, low and out-of-stock lines"
              className="xl:col-span-3"
              loading={summaryLoading}
              isEmpty={healthChartData.every((item) => item.value === 0)}
            >
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={healthChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {healthChartData.map((entry, index) => (
                      <Cell key={`health-${entry.name}`} fill={HEALTH_COLORS[index % HEALTH_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [formatNumber(value), name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="By Warehouse"
              subtitle="Top warehouses by on-hand quantity"
              className="xl:col-span-4"
              loading={summaryLoading}
              isEmpty={warehouseChartData.length === 0}
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={warehouseChartData} layout="vertical" margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Bar dataKey="on_hand" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <Card className="rounded-xl border border-border bg-card">
            <button
              onClick={() => setSummaryExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-muted/30 transition-colors"
            >
              <span className="text-xs font-semibold">Product Type Summary</span>
              {summaryExpanded ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
            </button>
            {summaryExpanded && (
              <div className="border-t border-border/50">
                {(summary.by_product_type || []).length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">No summary rows found for selected filters.</div>
                ) : (
                  <div className="max-h-64 overflow-auto scrollbar-thin">
                    <div className="grid grid-cols-12 gap-2 px-3 py-1.5 bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 sticky top-0 z-10">
                      <div className="col-span-3">Product Type</div>
                      <div className="col-span-1 text-right">SKUs</div>
                      <div className="col-span-1 text-right">On Hand</div>
                      <div className="col-span-1 text-right">Available</div>
                      <div className="col-span-2 text-right">Value (Excl)</div>
                      <div className="col-span-2 text-right">Value (Incl)</div>
                      <div className="col-span-2 text-right">Health Status</div>
                    </div>
                    {(summary.by_product_type || []).map((row) => {
                      const isActive = String(filters.product_type_id || "") === String(row.product_type_id || "");
                      return (
                        <div
                          key={`summary-type-${row.product_type_id || row.product_type_name}`}
                          onClick={() => setProductTypeFilter(isActive ? "" : String(row.product_type_id || ""))}
                          className={[
                            "grid grid-cols-12 gap-2 px-3 py-2 text-[11px] border-b last:border-b-0 border-border/40 cursor-pointer transition-colors",
                            isActive ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/50",
                          ].join(" ")}
                        >
                          <div className="col-span-3 font-semibold truncate flex items-center gap-1.5">
                            <div className={cn("w-1 h-3 rounded-full", isActive ? "bg-primary" : "bg-transparent")} />
                            {row.product_type_name || "Uncategorized"}
                          </div>
                          <div className="col-span-1 text-right tabular-nums">{formatNumber(row.product_count)}</div>
                          <div className="col-span-1 text-right tabular-nums">{formatNumber(row.total_on_hand)}</div>
                          <div className="col-span-1 text-right tabular-nums">{formatNumber(row.total_available)}</div>
                          <div className="col-span-2 text-right tabular-nums font-medium">{formatCurrency(row.total_value_excl_gst)}</div>
                          <div className="col-span-2 text-right tabular-nums font-medium">{formatCurrency(row.total_value_incl_gst)}</div>
                          <div className="col-span-2 text-right">
                            <Badge
                              variant={toNum(row.low_stock_count) > 0 ? "destructive" : "default"}
                              className="text-[9px] h-4 px-1.5"
                            >
                              Low: {formatNumber(row.low_stock_count)}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>

          <PaginatedTable
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            showPagination={false}
            height="500px"
            onTotalChange={setTotalCount}
            filterParams={{ q: undefined, ...filterParams }}
            page={page}
            limit={limit}
            q={q}
            sortBy={sortBy || "id"}
            sortOrder={sortOrder || "DESC"}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            onQChange={setQ}
            onSortChange={setSort}
          />
          <PaginationControls
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            rowsPerPageOptions={[20, 50, 100, 200]}
          />
        </div>
      </div>
    </ListingPageContainer>
  </ProtectedRoute>
);
}
