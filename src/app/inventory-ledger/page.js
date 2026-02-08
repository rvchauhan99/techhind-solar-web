"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import inventoryLedgerService from "@/services/inventoryLedgerService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/dataTableUtils";

const COLUMN_FILTER_KEYS = [
  "performed_at_from",
  "performed_at_to",
  "performed_at_op",
  "product_name",
  "product_name_op",
  "warehouse_name",
  "warehouse_name_op",
  "transaction_type",
  "movement_type",
  "quantity",
  "quantity_op",
  "quantity_to",
  "opening_quantity",
  "opening_quantity_op",
  "opening_quantity_to",
  "closing_quantity",
  "closing_quantity_op",
  "closing_quantity_to",
  "serial_number",
  "serial_number_op",
  "performed_by_name",
  "performed_by_name_op",
];

const TRANSACTION_TYPE_OPTIONS = [
  { value: "PO_INWARD", label: "PO Inward" },
  { value: "STOCK_ADJUSTMENT", label: "Stock Adjustment" },
  { value: "STOCK_TRANSFER_OUT", label: "Stock Transfer Out" },
  { value: "STOCK_TRANSFER_IN", label: "Stock Transfer In" },
];

const MOVEMENT_TYPE_OPTIONS = [
  { value: "IN", label: "IN" },
  { value: "OUT", label: "OUT" },
  { value: "ADJUST", label: "ADJUST" },
];

export default function InventoryLedgerPage() {
  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } =
    listingState;

  const [tableKey, setTableKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

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
      const blob = await inventoryLedgerService.exportLedgerEntries(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-ledger-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const handleOpenSidebar = useCallback((row) => {
    setSelectedRecord(row);
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRecord(null);
  }, []);

  const columns = useMemo(
    () => [
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        isActionColumn: true,
        render: (row) => (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="p-0 h-auto font-normal"
            onClick={() => handleOpenSidebar(row)}
            aria-label="View details"
          >
            View
          </Button>
        ),
      },
      {
        field: "performed_at",
        label: "Date",
        sortable: true,
        filterType: "date",
        filterKey: "performed_at_from",
        filterKeyTo: "performed_at_to",
        operatorKey: "performed_at_op",
        defaultFilterOperator: "inRange",
        render: (row) => (row.performed_at ? formatDate(row.performed_at) : "-"),
      },
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
        field: "transaction_type",
        label: "Transaction",
        sortable: true,
        filterType: "select",
        filterKey: "transaction_type",
        filterOptions: TRANSACTION_TYPE_OPTIONS,
        render: (row) => (
          <Badge variant="secondary" className="text-xs">
            {row.transaction_type || "-"}
          </Badge>
        ),
      },
      {
        field: "movement_type",
        label: "Movement",
        sortable: true,
        filterType: "select",
        filterKey: "movement_type",
        filterOptions: MOVEMENT_TYPE_OPTIONS,
        render: (row) => (
          <Badge
            variant={
              row.movement_type === "IN"
                ? "default"
                : row.movement_type === "OUT"
                ? "destructive"
                : "secondary"
            }
            className="text-xs"
          >
            {row.movement_type || "-"}
          </Badge>
        ),
      },
      {
        field: "quantity",
        label: "Quantity",
        sortable: true,
        filterType: "number",
        filterKey: "quantity",
        filterKeyTo: "quantity_to",
        operatorKey: "quantity_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "opening_quantity",
        label: "Opening",
        sortable: true,
        filterType: "number",
        filterKey: "opening_quantity",
        filterKeyTo: "opening_quantity_to",
        operatorKey: "opening_quantity_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "closing_quantity",
        label: "Closing",
        sortable: true,
        filterType: "number",
        filterKey: "closing_quantity",
        filterKeyTo: "closing_quantity_to",
        operatorKey: "closing_quantity_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "serial",
        label: "Serial",
        sortable: false,
        filterType: "text",
        filterKey: "serial_number",
        defaultFilterOperator: "contains",
        render: (row) => row.serial?.serial_number || "-",
      },
      {
        field: "performedBy",
        label: "Performed By",
        sortable: false,
        filterType: "text",
        filterKey: "performed_by_name",
        defaultFilterOperator: "contains",
        render: (row) => row.performedBy?.name || "-",
      },
    ],
    [handleOpenSidebar]
  );

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const response = await inventoryLedgerService.getLedgerEntries({
        page: p.page,
        limit: p.limit,
        product_id: p.product_id || undefined,
        warehouse_id: p.warehouse_id || undefined,
        product_name: p.product_name || undefined,
        warehouse_name: p.warehouse_name || undefined,
        transaction_type: p.transaction_type || undefined,
        movement_type: p.movement_type || undefined,
        start_date: p.performed_at_from ?? p.start_date ?? undefined,
        end_date: p.performed_at_to ?? p.end_date ?? undefined,
        quantity: p.quantity || undefined,
        quantity_op: p.quantity_op || undefined,
        quantity_to: p.quantity_to || undefined,
        opening_quantity: p.opening_quantity || undefined,
        opening_quantity_op: p.opening_quantity_op || undefined,
        opening_quantity_to: p.opening_quantity_to || undefined,
        closing_quantity: p.closing_quantity || undefined,
        closing_quantity_op: p.closing_quantity_op || undefined,
        closing_quantity_to: p.closing_quantity_to || undefined,
        serial_number: p.serial_number || undefined,
        performed_by_name: p.performed_by_name || undefined,
        sortBy: p.sortBy || "performed_at",
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

  const sidebarContent = useMemo(() => {
    if (!selectedRecord) return null;
    const r = selectedRecord;
    return (
      <div className="pr-1 space-y-3">
        <p className="font-semibold">{r.product?.product_name ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Date</p>
        <p className="text-sm">{r.performed_at ? formatDate(r.performed_at) : "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Warehouse</p>
        <p className="text-sm">{r.warehouse?.name ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Transaction</p>
        <p className="text-sm">{r.transaction_type ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Movement</p>
        <p className="text-sm">{r.movement_type ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Quantity</p>
        <p className="text-sm">{r.quantity ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Opening</p>
        <p className="text-sm">{r.opening_quantity ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Closing</p>
        <p className="text-sm">{r.closing_quantity ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Serial</p>
        <p className="text-sm">{r.serial?.serial_number ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Performed By</p>
        <p className="text-sm">{r.performedBy?.name ?? "-"}</p>
      </div>
    );
  }, [selectedRecord]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Inventory Ledger"
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <p className="text-sm text-muted-foreground">Complete audit trail of all inventory movements</p>
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
            sortBy={sortBy || "performed_at"}
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

        <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Ledger Entry Details">
          {sidebarContent}
        </DetailsSidebar>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
