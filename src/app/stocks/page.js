"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconAlertTriangle,
  IconBuildingWarehouse,
  IconChevronDown,
  IconChevronUp,
  IconFilter,
  IconPackage,
  IconRefresh,
  IconReportAnalytics,
  IconX,
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
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";
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
import Checkbox from "@/components/common/Checkbox";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatCurrency } from "@/utils/dataTableUtils";


const COLUMN_FILTER_KEYS = [
  "product_id",
  "product_type_id",
  "product_make_id",
  "warehouse_id",
  "quantity_on_hand",
  "quantity_on_hand_op",
  "quantity_on_hand_to",
  "quantity_reserved",
  "quantity_reserved_op",
  "quantity_reserved_to",
  "after_reserve",
  "after_reserve_op",
  "after_reserve_to",
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
  { value: "true", label: "Less Stock" },
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
    total_damaged: 0,
  },
  by_product_type: [],
  by_warehouse: [],
  by_tracking_type: [],
};

const FILTER_LABELS = {
  product_id: "Product",
  product_type_id: "Product Type",
  product_make_id: "Product Make",
  warehouse_id: "Warehouse",
  tracking_type: "Tracking",
  low_stock: "Less Stock",
  quantity_on_hand: "Total AVL",
  quantity_reserved: "Reserved",
  after_reserve: "After Reserve",
  quantity_available: "Available",
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value || 0));

const toNum = (value) => Number(value || 0);
const getAvailableAfterReserved = (onHand, reserved) => toNum(onHand) - toNum(reserved);

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
  const [productMakeOptions, setProductMakeOptions] = useState([]);
  const [reservedDetailsOpen, setReservedDetailsOpen] = useState(false);
  const [reservedDetailsLoading, setReservedDetailsLoading] = useState(false);
  const [reservedDetailsExporting, setReservedDetailsExporting] = useState(false);
  const [reservedDetailsRows, setReservedDetailsRows] = useState([]);
  const [reservedDetailsContext, setReservedDetailsContext] = useState(null);

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

  useEffect(() => {
    mastersService
      .getReferenceOptions("product_make.model")
      .then((res) => {
        const data = res?.result || res?.data || res || [];
        const options = Array.isArray(data) ? data.map((m) => ({ value: String(m.id), label: m.name || String(m.id) })) : [];
        setProductMakeOptions(options);
      })
      .catch(() => setProductMakeOptions([]));
  }, []);

  const filterParams = useMemo(() => {
    const params = Object.fromEntries(
      Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
    );
    delete params.product_name;
    delete params.product_name_op;
    delete params.warehouse_name;
    delete params.warehouse_name_op;
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

  // Scroll lock when modal is open
  useEffect(() => {
    if (reservedDetailsOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [reservedDetailsOpen]);

  // Escape key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && reservedDetailsOpen) {
        setReservedDetailsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reservedDetailsOpen]);

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

  const handleOpenReservedDetails = useCallback(async (row) => {
    const productId = Number(row?.product_id || 0);
    const warehouseId = Number(row?.warehouse_id || 0);
    if (productId <= 0 || warehouseId <= 0) return;
    setReservedDetailsOpen(true);
    setReservedDetailsLoading(true);
    setReservedDetailsRows([]);
    setReservedDetailsContext({
      product_id: productId,
      warehouse_id: warehouseId,
      product_name: row?.product?.product_name || "-",
      warehouse_name: row?.warehouse?.name || "-",
    });
    try {
      const res = await stockService.getReservationDetails({
        product_id: productId,
        warehouse_id: warehouseId,
      });
      const list = res?.result || res?.data || [];
      setReservedDetailsRows(Array.isArray(list) ? list : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch reserved details");
    } finally {
      setReservedDetailsLoading(false);
    }
  }, []);

  const handleExportReservedDetails = useCallback(async () => {
    const productId = Number(reservedDetailsContext?.product_id || 0);
    const warehouseId = Number(reservedDetailsContext?.warehouse_id || 0);
    if (productId <= 0 || warehouseId <= 0) return;
    setReservedDetailsExporting(true);
    try {
      const blob = await stockService.exportReservationDetails({
        product_id: productId,
        warehouse_id: warehouseId,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reserved-details-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Reserved details export completed");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to export reserved details");
    } finally {
      setReservedDetailsExporting(false);
    }
  }, [reservedDetailsContext]);

  const productTypeById = useMemo(() => {
    const map = new Map();
    productTypeOptions.forEach((item) => {
      map.set(String(item.value), item.label);
    });
    return map;
  }, [productTypeOptions]);

  const productMakeById = useMemo(() => {
    const map = new Map();
    productMakeOptions.forEach((item) => {
      map.set(String(item.value), item.label);
    });
    return map;
  }, [productMakeOptions]);

  const selectedProductTypeName = useMemo(
    () => productTypeById.get(String(filters.product_type_id || "")) || "",
    [productTypeById, filters.product_type_id]
  );

  const setProductTypeFilter = useCallback(
    (nextTypeId) => {
      const normalized = nextTypeId ? String(nextTypeId) : "";
      const current = String(filters.product_type_id || "");
      if (current !== normalized) {
        setFilters(
          {
            ...filters,
            product_type_id: normalized,
            product_make_id: "",
            product_id: "",
          },
          true,
          false
        );
        setSelectedProductName("");
      } else {
        setFilter("product_type_id", normalized);
      }
    },
    [filters, setFilter, setFilters]
  );

  const loadProductOptions = useCallback(
    async (q) => {
      const res = await productService.getProducts({
        q: q || undefined,
        limit: 50,
        product_type_id: filters.product_type_id || undefined,
        product_make_id: filters.product_make_id || undefined,
        visibility: "all",
      });
      const data = res?.result?.data || res?.data || [];
      const list = Array.isArray(data) ? data : [];
      return list.map((item) => ({
        ...item,
        id: item.id,
        product_name: item.product_name || item.name || String(item.id),
      }));
    },
    [filters.product_type_id, filters.product_make_id]
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
          if (key === "product_make_id") displayValue = productMakeById.get(String(value)) || String(value);
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
    [filters, productTypeById, productMakeById, selectedProductName, selectedWarehouseName]
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
      const nextFilters = { ...filters, [key]: "" };
      if (key === "product_type_id") {
        nextFilters.product_make_id = "";
        nextFilters.product_id = "";
        setSelectedProductName("");
      }
      if (key === "product_make_id") {
        nextFilters.product_id = "";
        setSelectedProductName("");
      }
      if (key === "product_id") setSelectedProductName("");
      if (key === "warehouse_id") setSelectedWarehouseName("");
      const operatorKey = `${key}_op`;
      const toKey = `${key}_to`;
      if (COLUMN_FILTER_KEYS.includes(operatorKey)) nextFilters[operatorKey] = "";
      if (COLUMN_FILTER_KEYS.includes(toKey)) nextFilters[toKey] = "";
      
      setFilters(nextFilters, true, false);
    },
    [filters, setFilters]
  );

  const setRangeFilter = useCallback(
    (field, from, to) => {
      const fromValue = from == null || from === "" ? "" : String(from);
      const toValue = to == null || to === "" ? "" : String(to);
      const nextFilters = { ...filters, [field]: fromValue, [`${field}_to`]: toValue };

      if (fromValue && toValue) {
        nextFilters[`${field}_op`] = "between";
      } else if (fromValue) {
        nextFilters[`${field}_op`] = "gte";
      } else if (toValue) {
        nextFilters[field] = toValue;
        nextFilters[`${field}_to`] = "";
        nextFilters[`${field}_op`] = "lte";
      } else {
        nextFilters[`${field}_op`] = "";
      }
      setFilters(nextFilters, true, false);
    },
    [filters, setFilters]
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
        field: "product_make_name",
        label: "Make",
        sortable: false,
        render: (row) => row.product_make_name || row.product?.productMake?.name || "-",
      },
      {
        field: "warehouse",
        label: "Warehouse",
        sortable: false,
        render: (row) => row.warehouse?.name || "-",
      },
      {
        field: "total_available_display",
        label: "Total AVL",
        sortable: true,
        render: (row) => formatNumber(row.total_available_display),
      },
      {
        field: "reserved_display",
        label: "Reserved",
        sortable: true,
        render: (row) =>
          toNum(row.reserved_display) > 0 ? (
            <button
              type="button"
              className="text-primary underline underline-offset-2 font-medium tabular-nums"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenReservedDetails(row);
              }}
            >
              {formatNumber(row.reserved_display)}
            </button>
          ) : (
            <span className="tabular-nums">{formatNumber(row.reserved_display)}</span>
          ),
      },
      {
        field: "available_after_reserved_display",
        label: "After Reserve",
        sortable: true,
        render: (row) => formatNumber(row.available_after_reserved_display),
      },
      {
        field: "quantity_damaged",
        label: "Damaged",
        sortable: false,
        render: (row) =>
          toNum(row.quantity_damaged) > 0 ? (
            <span className="text-red-600 font-semibold tabular-nums">
              {formatNumber(row.quantity_damaged)}
            </span>
          ) : (
            <span className="text-muted-foreground tabular-nums">0</span>
          ),
      },
      {
        field: "last_purchase_price_excl_gst",
        label: "Last Purchase Excl GST",
        sortable: false,
        render: (row) =>
          row.last_purchase_price != null ? formatCurrency(row.last_purchase_price) : "-",
      },
      {
        field: "last_purchase_price_incl_gst",
        label: "Last Purchase Incl GST",
        sortable: false,
        render: (row) => {
          if (row.last_purchase_price == null) return "-";
          const last = toNum(row.last_purchase_price);
          const gst = toNum(row.gst_percent);
          return formatCurrency(last * (1 + gst / 100));
        },
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
          const availableAfterReserve = getAvailableAfterReserved(row.quantity_on_hand, row.quantity_reserved);
          const minStock = row.min_stock_quantity || 0;
          const isLow = availableAfterReserve <= minStock;
          return (
            <Badge variant={isLow ? "destructive" : "default"} className="text-xs">
              {isLow ? "Less Stock" : "OK"}
            </Badge>
          );
        },
      },
    ],
    [handleOpenReservedDetails]
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
        product_make_id: p.product_make_id || undefined,
        quantity_on_hand: p.quantity_on_hand || undefined,
        quantity_on_hand_op: p.quantity_on_hand_op || undefined,
        quantity_on_hand_to: p.quantity_on_hand_to || undefined,
        quantity_reserved: p.quantity_reserved || undefined,
        quantity_reserved_op: p.quantity_reserved_op || undefined,
        quantity_reserved_to: p.quantity_reserved_to || undefined,
        after_reserve: p.after_reserve || undefined,
        after_reserve_op: p.after_reserve_op || undefined,
        after_reserve_to: p.after_reserve_to || undefined,
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
        data: (result?.data || []).map((row) => ({
          ...row,
          total_available_display: toNum(row.quantity_on_hand),
          reserved_display: toNum(row.quantity_reserved),
          available_after_reserved_display: getAvailableAfterReserved(
            row.quantity_on_hand,
            row.quantity_reserved
          ),
        })),
        meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
      };
    },
    []
  );

  const totals = summary?.totals || EMPTY_SUMMARY.totals;
  const totalAvailableDisplay = toNum(totals.total_on_hand);
  const totalReservedDisplay = toNum(totals.total_reserved);
  const totalAvailableAfterReservedDisplay = getAvailableAfterReserved(
    totals.total_on_hand,
    totals.total_reserved
  );
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
    const out = toNum(totals.out_of_stock_count);
    const lessStock = toNum(totals.less_stock_count);
    const ok = toNum(totals.ok_count);
    return [
      { name: "OK", value: ok },
      { name: "Less Stock", value: lessStock },
      { name: "Out", value: out },
    ];
  }, [totals]);

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
                <p className="text-[11px] text-muted-foreground">
                  After Reserve = Total AVL - Reserved
                </p>
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
            <Checkbox
              name="quick_less_stock"
              label="Less Stock"
              checked={String(filters.low_stock || "") === "true"}
              onChange={(e) => setFilter("low_stock", e.target.checked ? "true" : "")}
              className="w-auto"
            />
          </div>

          <Card className="rounded-xl border border-border bg-card overflow-visible">
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
                  usePortal
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
                  usePortal
                  name="product_make_id"
                  label="Product Make"
                  size="small"
                  asyncLoadOptions={(q) => getReferenceOptionsSearch("product_make.model", { q, limit: 20, product_type_id: filters.product_type_id || undefined })}
                  referenceModel="product_make.model"
                  getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                  value={
                    filters.product_make_id
                      ? {
                          id: filters.product_make_id,
                          name: productMakeById.get(String(filters.product_make_id)) || String(filters.product_make_id),
                        }
                      : null
                  }
                  onChange={(e, v) => {
                    const id = v?.id ?? v?.value;
                    const typeId = v?.product_type_id;
                    if (id != null && id !== "") {
                      const next = { ...filters, product_make_id: String(id) };
                      if (typeId) next.product_type_id = String(typeId);
                      setFilters(next, true, false);
                    } else {
                      setFilters({ ...filters, product_make_id: "", product_id: "" }, true, false);
                      setSelectedProductName("");
                    }
                  }}
                  placeholder="All Makes"
                />
                <AutocompleteField
                  usePortal
                  name="product_id"
                  label="Product"
                  size="small"
                  asyncLoadOptions={loadProductOptions}
                  getOptionLabel={(o) => formatProductAutocompleteLabel(o) || o?.product_name || o?.name || ""}
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
                    if (nextId) {
                      const next = { ...filters, product_id: String(nextId) };
                      if (v?.product_type_id) next.product_type_id = String(v.product_type_id);
                      if (v?.product_make_id) next.product_make_id = String(v.product_make_id);
                      setFilters(next, true, false);
                      setSelectedProductName(formatProductAutocompleteLabel(v) || v?.product_name || v?.name || "");
                    } else {
                      setFilters({ ...filters, product_id: "" }, true, false);
                      setSelectedProductName("");
                    }
                  }}
                  placeholder={selectedProductTypeName ? `Search ${selectedProductTypeName} products...` : "Search product..."}
                />
                <AutocompleteField
                  usePortal
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
                  label="Less Stock (After Reserve <= Min Stock)"
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
                  name="quantity_on_hand"
                  label="Total AVL From"
                  type="number"
                  size="small"
                  value={filters.quantity_on_hand ?? ""}
                  onChange={(e) =>
                    setRangeFilter("quantity_on_hand", e.target.value, filters.quantity_on_hand_to || "")
                  }
                  placeholder="0"
                />
                <Input
                  name="quantity_on_hand_to"
                  label="Total AVL To"
                  type="number"
                  size="small"
                  value={filters.quantity_on_hand_to ?? ""}
                  onChange={(e) =>
                    setRangeFilter("quantity_on_hand", filters.quantity_on_hand || "", e.target.value)
                  }
                  placeholder="1000"
                />
                <Input
                  name="quantity_reserved"
                  label="Reserved From"
                  type="number"
                  size="small"
                  value={filters.quantity_reserved ?? ""}
                  onChange={(e) =>
                    setRangeFilter("quantity_reserved", e.target.value, filters.quantity_reserved_to || "")
                  }
                  placeholder="0"
                />
                <Input
                  name="quantity_reserved_to"
                  label="Reserved To"
                  type="number"
                  size="small"
                  value={filters.quantity_reserved_to ?? ""}
                  onChange={(e) =>
                    setRangeFilter("quantity_reserved", filters.quantity_reserved || "", e.target.value)
                  }
                  placeholder="1000"
                />
                <Input
                  name="after_reserve"
                  label="After Reserve From"
                  type="number"
                  size="small"
                  value={filters.after_reserve ?? ""}
                  onChange={(e) =>
                    setRangeFilter("after_reserve", e.target.value, filters.after_reserve_to || "")
                  }
                  placeholder="0"
                />
                <Input
                  name="after_reserve_to"
                  label="After Reserve To"
                  type="number"
                  size="small"
                  value={filters.after_reserve_to ?? ""}
                  onChange={(e) =>
                    setRangeFilter("after_reserve", filters.after_reserve || "", e.target.value)
                  }
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

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
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
              label="Total AVL"
              value={formatNumber(totalAvailableDisplay)}
              accentColor="#4f46e5"
              subLabel="Physical stock"
              loading={summaryLoading}
            />
            <StatCard
              icon={<IconPackage size={16} />}
              label="Reserved"
              value={formatNumber(totalReservedDisplay)}
              accentColor="#f59e0b"
              subLabel="Reserved stock"
              loading={summaryLoading}
            />
            <StatCard
              icon={<IconPackage size={16} />}
              label="After Reserve"
              value={formatNumber(totalAvailableAfterReservedDisplay)}
              accentColor="#10b981"
              subLabel="Total AVL - Reserved"
              loading={summaryLoading}
            />
            <StatCard
              icon={<IconAlertTriangle size={16} />}
              label="Damaged"
              value={formatNumber(totals.total_damaged)}
              accentColor="#ef4444"
              subLabel="Posted DAMAGE adjustments"
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
              subtitle="On hand and system available quantities"
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
                  <Bar dataKey="on_hand" name="Total AVL" fill="#4f46e5" radius={[4, 4, 0, 0]} />
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
              subtitle="OK, less stock and out lines (After Reserve based)"
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
              subtitle="Top warehouses by total available (on hand)"
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

          <Card className="rounded-xl border border-border bg-card overflow-visible">
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
                    <div className="grid grid-cols-12 gap-1 px-3 py-1.5 bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 sticky top-0 z-10">
                      <div className="col-span-3">Product Type</div>
                      <div className="col-span-1 text-right">SKUs</div>
                      <div className="col-span-1 text-right">Total AVL</div>
                      <div className="col-span-1 text-right">Available</div>
                      <div className="col-span-1 text-right">Damaged</div>
                      <div className="col-span-2 text-right">Value (Excl)</div>
                      <div className="col-span-2 text-right">Value (Incl)</div>
                      <div className="col-span-1 text-right">Health</div>
                    </div>
                    {(summary.by_product_type || []).map((row) => {
                      const isActive = String(filters.product_type_id || "") === String(row.product_type_id || "");
                      return (
                        <div
                          key={`summary-type-${row.product_type_id || row.product_type_name}`}
                          onClick={() => setProductTypeFilter(isActive ? "" : String(row.product_type_id || ""))}
                          className={[
                            "grid grid-cols-12 gap-1 px-3 py-2 text-[11px] border-b last:border-b-0 border-border/40 cursor-pointer transition-colors",
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
                          <div className="col-span-1 text-right tabular-nums">
                            {toNum(row.damaged_count) > 0 ? (
                              <span className="text-red-600 font-semibold">{formatNumber(row.damaged_count)}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </div>
                          <div className="col-span-2 text-right tabular-nums font-medium">{formatCurrency(row.total_value_excl_gst)}</div>
                          <div className="col-span-2 text-right tabular-nums font-medium">{formatCurrency(row.total_value_incl_gst)}</div>
                          <div className="col-span-1 text-right">
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
            getRowClassName={(row) =>
              toNum(row.available_after_reserved_display) < 0
                ? "[&_td]:!bg-red-100 hover:[&_td]:!bg-red-100 dark:[&_td]:!bg-red-950/35"
                : ""
            }
          />
          <PaginationControls
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            rowsPerPageOptions={[20, 50, 100, 200]}
          />
          {reservedDetailsOpen && createPortal(
            <div className="fixed inset-0 z-9999 flex items-center justify-center">
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in-0"
                onClick={() => setReservedDetailsOpen(false)}
              />
              {/* Centered Modal Content Card */}
              <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-border overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 z-10 p-0 m-4">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-base font-bold tracking-tight text-foreground">
                      Reserved Qty Details
                    </h3>
                    {reservedDetailsContext && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          {reservedDetailsContext.product_name}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-900">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                          {reservedDetailsContext.warehouse_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium tabular-nums ml-1">
                          {reservedDetailsRows.length} reservation{reservedDetailsRows.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Close button in header */}
                  <button
                    onClick={() => setReservedDetailsOpen(false)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <IconX size={18} />
                  </button>
                </div>

                {/* Table Body Container */}
                <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                  <div className="overflow-x-auto rounded-xl border border-border shadow-sm max-h-[55vh]">
                    {reservedDetailsLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span className="text-sm text-muted-foreground font-medium">Loading reservation details…</span>
                      </div>
                    ) : reservedDetailsRows.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          <IconPackage size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">No reservations found</p>
                          <p className="text-xs text-muted-foreground mt-0.5">All reservations may have been cleared or released</p>
                        </div>
                      </div>
                    ) : (() => {
                      // Compute totals for footer
                      const totActive = reservedDetailsRows.reduce((s, r) => s + Number(r.active_reserved_quantity || 0), 0);

                      const getStatusBadge = (status) => {
                        const s = (status || "").toUpperCase();
                        if (s === "CONFIRMED" || s === "RESERVED")
                          return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 uppercase tracking-wide">{status}</span>;
                        if (s === "PARTIAL_SHIPPED")
                          return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900 uppercase tracking-wide">{status}</span>;
                        if (s === "RELEASED" || s === "CANCELLED")
                          return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border uppercase tracking-wide">{status}</span>;
                        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border uppercase tracking-wide">{status || "-"}</span>;
                      };

                      const getRowClass = (row) => {
                        const active = Number(row.active_reserved_quantity || 0);
                        if (active > 0) return "bg-amber-50/40 dark:bg-amber-950/10";
                        return "";
                      };

                      return (
                        <table className="w-full table-auto text-xs border-collapse">
                          <thead className="bg-muted/80 sticky top-0 z-10 backdrop-blur-sm">
                            <tr className="border-b border-border">
                              <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Order No.</th>
                              <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Type</th>
                              <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Customer / Party</th>
                              <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Warehouse</th>
                              <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Product</th>
                              <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Status</th>
                              <th className="text-right px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 whitespace-nowrap">Active Qty</th>
                              <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Created</th>
                              <th className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reservedDetailsRows.map((row) => {
                              const activeQty = Number(row.active_reserved_quantity || 0);
                              return (
                                <tr
                                  key={row.reservation_id}
                                  className={cn(
                                    "border-t border-border/50 transition-colors hover:bg-muted/40",
                                    getRowClass(row)
                                  )}
                                >
                                  <td className="px-4 py-2.5 font-medium whitespace-nowrap text-foreground">{row.order_number || "-"}</td>
                                  <td className="px-4 py-2.5 whitespace-nowrap">
                                    <span className={cn(
                                      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                                      row.order_type === "B2B"
                                        ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200 dark:border-violet-900"
                                        : "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-900"
                                    )}>
                                      {row.order_type || "-"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 max-w-[200px] truncate text-foreground/90" title={row.customer_party_name}>{row.customer_party_name || "-"}</td>
                                  <td className="px-4 py-2.5 whitespace-nowrap text-foreground/90">{row.warehouse_name || "-"}</td>
                                  <td className="px-4 py-2.5 max-w-[180px] truncate text-foreground/90" title={row.product_name}>{row.product_name || "-"}</td>
                                  <td className="px-4 py-2.5 whitespace-nowrap">{getStatusBadge(row.status)}</td>
                                  <td className="px-4 py-2.5 text-right tabular-nums font-bold whitespace-nowrap">
                                    {activeQty > 0 ? (
                                      <span className="text-amber-600 dark:text-amber-400">{formatNumber(activeQty)}</span>
                                    ) : (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatNumber(activeQty)}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground text-[11px]">
                                    {row.created_at ? new Date(row.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                                  </td>
                                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{row.created_by_name || "-"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {/* Totals footer */}
                          <tfoot className="bg-muted/70 border-t-2 border-border sticky bottom-0 backdrop-blur-sm">
                            <tr>
                              <td colSpan={6} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Totals ({reservedDetailsRows.length} rows)
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums font-bold text-[12px]">
                                {totActive > 0 ? (
                                  <span className="text-amber-600 dark:text-amber-400">{formatNumber(totActive)}</span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400">{formatNumber(totActive)}</span>
                                )}
                              </td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
                        </table>
                      );
                    })()}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end items-center gap-3">
                  <Button size="sm" variant="outline" onClick={() => setReservedDetailsOpen(false)}>
                    Close
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleExportReservedDetails}
                    disabled={reservedDetailsLoading || reservedDetailsExporting || !reservedDetailsRows.length}
                  >
                    {reservedDetailsExporting ? "Exporting…" : "Export"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>
    </ListingPageContainer>
  </ProtectedRoute>
);
}
