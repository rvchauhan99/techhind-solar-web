"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import stockService from "@/services/stockService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useListingQueryState } from "@/hooks/useListingQueryState";

const COLUMN_FILTER_KEYS = [
  "product_name",
  "product_name_op",
  "warehouse_name",
  "warehouse_name_op",
  "quantity_on_hand",
  "quantity_on_hand_op",
  "quantity_on_hand_to",
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

export default function StockPage() {
  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } =
    listingState;

  const [tableKey, setTableKey] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback(
    (key, value) => setFilter(key, value),
    [setFilter]
  );

  const filterParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      ),
    [filters]
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      const blob = await stockService.exportStocks(exportParams);
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
  }, [filters]);

  const columns = useMemo(
    () => [
      {
        field: "product",
        label: "Product",
        sortable: false,
        filterType: "text",
        filterKey: "product_name",
        defaultFilterOperator: "contains",
        render: (row) => row.product?.product_name || "-",
      },
      {
        field: "warehouse",
        label: "Warehouse",
        sortable: false,
        filterType: "text",
        filterKey: "warehouse_name",
        defaultFilterOperator: "contains",
        render: (row) => row.warehouse?.name || "-",
      },
      {
        field: "quantity_on_hand",
        label: "On Hand",
        sortable: true,
        filterType: "number",
        filterKey: "quantity_on_hand",
        filterKeyTo: "quantity_on_hand_to",
        operatorKey: "quantity_on_hand_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "quantity_reserved",
        label: "Reserved",
        sortable: true,
        filterType: "number",
        filterKey: "quantity_reserved",
        filterKeyTo: "quantity_reserved_to",
        operatorKey: "quantity_reserved_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "quantity_available",
        label: "Available",
        sortable: true,
        filterType: "number",
        filterKey: "quantity_available",
        filterKeyTo: "quantity_available_to",
        operatorKey: "quantity_available_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "tracking_type",
        label: "Tracking",
        sortable: true,
        filterType: "select",
        filterKey: "tracking_type",
        filterOptions: TRACKING_OPTIONS,
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
        filterType: "number",
        filterKey: "min_stock_quantity",
        filterKeyTo: "min_stock_quantity_to",
        operatorKey: "min_stock_quantity_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "status",
        label: "Status",
        sortable: false,
        filterType: "select",
        filterKey: "low_stock",
        filterOptions: LOW_STOCK_OPTIONS,
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
    []
  );

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const response = await stockService.getStocks({
        page: p.page,
        limit: p.limit,
        warehouse_id: p.warehouse_id || undefined,
        product_id: p.product_id || undefined,
        warehouse_name: p.warehouse_name || undefined,
        product_name: p.product_name || undefined,
        quantity_on_hand: p.quantity_on_hand || undefined,
        quantity_on_hand_op: p.quantity_on_hand_op || undefined,
        quantity_on_hand_to: p.quantity_on_hand_to || undefined,
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
        sortBy: p.sortBy || "created_at",
        sortOrder: p.sortOrder || "DESC",
      });
      const result = response?.result || response;
      return {
        data: result?.data || [],
        meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
      };
    },
    [tableKey]
  );

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Stock Management"
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <PaginatedTable
            key={tableKey}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            showPagination={false}
            height="calc(100vh - 200px)"
            onTotalChange={setTotalCount}
            columnFilterValues={columnFilterValues}
            onColumnFilterChange={handleColumnFilterChange}
            filterParams={{ q: undefined, ...filterParams }}
            page={page}
            limit={limit}
            q={q}
            sortBy={sortBy || "created_at"}
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
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
