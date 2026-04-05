"use client";

import { useMemo, useCallback, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import purchaseOrderService from "@/services/purchaseOrderService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import PurchaseOrderLinesFilterPanel, {
  PO_LINES_FILTER_KEYS,
} from "@/components/common/PurchaseOrderLinesFilterPanel";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate, formatCurrency } from "@/utils/dataTableUtils";
import { Badge } from "@/components/ui/badge";

/** Resolve include_closed for API from URL filter state. */
function resolveIncludeClosed(filters) {
  if (filters.include_closed === "true") return true;
  if (filters.include_closed === "false") return false;
  return !filters.status;
}

/**
 * Build purchase-order-lines API query from URL-synced filters (adds fixed operators; strips include_closed from line keys).
 */
function poLinesFiltersToApiQuery(filters) {
  const picked = {};
  PO_LINES_FILTER_KEYS.forEach((key) => {
    const v = filters[key];
    if (v != null && v !== "") picked[key] = v;
  });
  const include_closed = resolveIncludeClosed(picked);
  const out = { ...picked };
  delete out.include_closed;
  if (out.po_number) out.po_number_op = "contains";
  if (out.po_date_from || out.po_date_to) out.po_date_op = "inRange";
  if (out.due_date_from || out.due_date_to) out.due_date_op = "inRange";
  return { query: out, include_closed };
}

function poLinesFetcherParamsToApiQuery(params) {
  const filters = {};
  PO_LINES_FILTER_KEYS.forEach((key) => {
    const v = params[key];
    if (v != null && v !== "") filters[key] = v;
  });
  return poLinesFiltersToApiQuery(filters);
}

export default function PurchaseOrderLinesPage() {
  const listingState = useListingQueryState({
    defaultLimit: 50,
    filterKeys: PO_LINES_FILTER_KEYS,
  });
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilters, setSort } =
    listingState;

  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  const handleClearFilters = useCallback(() => {
    const empty = PO_LINES_FILTER_KEYS.reduce((acc, k) => ({ ...acc, [k]: "" }), {});
    setFilters({ ...empty, q: "" }, true, false);
  }, [setFilters]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const { query, include_closed } = poLinesFiltersToApiQuery(filters);
      const blob = await purchaseOrderService.exportPurchaseOrderLines({
        ...query,
        q: q || undefined,
        sortBy: sortBy || "id",
        sortOrder: (sortOrder || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC",
        include_closed,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `purchase-order-lines-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }, [filters, q, sortBy, sortOrder]);

  const columns = useMemo(
    () => [
      {
        field: "po_number",
        label: "PO #",
        sortable: false,
        stickyLeft: true,
        stickyWidth: 100,
        render: (row) => (
          <Link
            href={`/purchase-orders?q=${encodeURIComponent(row.po_number || "")}`}
            className="text-primary font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.po_number || "—"}
          </Link>
        ),
      },
      { field: "po_date", label: "PO date", sortable: false, render: (r) => formatDate(r.po_date) },
      { field: "due_date", label: "Due", sortable: false, render: (r) => formatDate(r.due_date) },
      {
        field: "status",
        label: "Status",
        sortable: false,
        render: (row) => {
          const s = row.status || "";
          const label =
            s === "CLOSED" ? "Completed" : s === "PARTIAL_RECEIVED" ? "Partial Recv." : s || "—";
          return (
            <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[10px] font-semibold">
              {label}
            </Badge>
          );
        },
      },
      {
        field: "supplier",
        label: "Supplier",
        sortable: false,
        render: (r) => r.supplier?.supplier_name || "—",
      },
      {
        field: "shipTo",
        label: "Ship to",
        sortable: false,
        render: (r) => r.shipTo?.name || "—",
      },
      {
        field: "product",
        label: "Product",
        sortable: false,
        render: (r) => r.product?.product_name || "—",
      },
      {
        field: "product_type",
        label: "Type",
        sortable: false,
        render: (r) => r.product?.product_type?.name || "—",
      },
      {
        field: "product_make",
        label: "Make",
        sortable: false,
        render: (r) => r.product?.product_make?.name || "—",
      },
      { field: "hsn_code", label: "HSN", sortable: false },
      { field: "rate", label: "Rate", sortable: true, render: (r) => formatCurrency(r.rate) },
      { field: "quantity", label: "Qty", sortable: true },
      { field: "received_quantity", label: "Recv", sortable: true },
      { field: "returned_quantity", label: "Ret", sortable: true },
      { field: "open_quantity", label: "Open", sortable: false },
      { field: "gst_percent", label: "GST%", sortable: true },
      {
        field: "amount_excluding_gst",
        label: "Taxable",
        sortable: true,
        render: (r) => formatCurrency(r.amount_excluding_gst),
      },
      {
        field: "amount",
        label: "Line",
        sortable: true,
        render: (r) => formatCurrency(r.amount),
      },
      {
        field: "createdBy",
        label: "Created by",
        sortable: false,
        render: (r) => r.createdBy?.name || "—",
      },
    ],
    []
  );

  const fetcher = useMemo(
    () => async (params) => {
      const { page: p, limit: l, q: searchQ, sortBy: sBy, sortOrder: sOrder, ...rest } = params;
      const { query, include_closed } = poLinesFetcherParamsToApiQuery(rest);
      const response = await purchaseOrderService.getPurchaseOrderLines({
        page: p,
        limit: l,
        q: searchQ || undefined,
        sortBy: sBy || "id",
        sortOrder: (sOrder || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC",
        include_closed,
        ...query,
      });
      const result = response.result || response;
      return {
        data: result.data || [],
        meta: result.meta || { total: 0, page: p, pages: 0, limit: l },
      };
    },
    []
  );

  const filterParams = useMemo(() => {
    const fp = {};
    PO_LINES_FILTER_KEYS.forEach((key) => {
      const v = filters[key];
      if (v != null && v !== "") fp[key] = v;
    });
    return fp;
  }, [filters]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Purchase order lines"
        fullWidth
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
        exportLoading={exporting}
      >
        <PurchaseOrderLinesFilterPanel
          values={filters}
          q={q}
          onQuickSearch={(val) => setQ(val)}
          onApply={(next) => setFilters(next, true, false)}
          onClear={handleClearFilters}
        />
        <PaginatedTable
          columns={columns}
          fetcher={fetcher}
          moduleKey="purchase-orders"
          height="calc(100vh - 220px)"
          showSearch={false}
          showPagination={false}
          onTotalChange={setTotalCount}
          filterParams={{
            ...filterParams,
            q: q || undefined,
          }}
          page={page}
          limit={limit}
          q={q}
          sortBy={sortBy || "id"}
          sortOrder={sortOrder || "desc"}
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
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
