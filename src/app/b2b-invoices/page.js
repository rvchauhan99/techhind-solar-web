"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { IconFileDescription, IconFileTypePdf, IconDotsVertical } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import b2bInvoiceService from "@/services/b2bInvoiceService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate, formatCurrency } from "@/utils/dataTableUtils";
import { Badge } from "@/components/ui/badge";

const COLUMN_FILTER_KEYS = [
  "invoice_no",
  "invoice_no_op",
  "invoice_date",
  "invoice_date_op",
  "invoice_date_to",
  "status",
  "client_name",
  "client_name_op",
  "shipment_no",
  "shipment_no_op",
  "order_no",
  "order_no_op",
  "grand_total",
  "grand_total_op",
  "grand_total_to",
];

const STATUS_OPTIONS = [
  { value: "POSTED", label: "Posted" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function B2bInvoicesPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
  };

  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter } = listingState;

  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null); // row from list (light)
  const [invoiceDetails, setInvoiceDetails] = useState(null); // full invoice (with items + snapshot)
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);

  const filterParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      ),
    [filters]
  );

  const fetcher = useCallback(
    async (params) => {
      const response = await b2bInvoiceService.getB2bInvoices({
        ...params,
        ...filterParams,
      });
      const result = response?.result ?? response;
      return {
        data: result?.data ?? [],
        meta: result?.meta ?? { total: 0, page: params.page, pages: 0, limit: params.limit },
      };
    },
    [filterParams, reloadTrigger]
  );

  const safeText = useCallback((v) => {
    if (v == null) return "-";
    const s = String(v).trim();
    return s === "" ? "-" : s;
  }, []);

  const fetchInvoiceDetails = useCallback(async (id) => {
    setLoadingDetails(true);
    try {
      const res = await b2bInvoiceService.getB2bInvoiceById(id);
      const inv = res?.result ?? res;
      setInvoiceDetails(inv || null);
    } catch (err) {
      setInvoiceDetails(null);
      toast.error(err.response?.data?.message || "Failed to load invoice details");
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const handleOpenSidebar = useCallback((row) => {
    setSelectedRecord(row);
    setInvoiceDetails(null);
    setSidebarOpen(true);
    if (row?.id) fetchInvoiceDetails(row.id);
  }, [fetchInvoiceDetails]);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRecord(null);
    setInvoiceDetails(null);
  }, []);

  const handlePdfDownload = useCallback(async (id) => {
    try {
      const { blob, filename } = await b2bInvoiceService.downloadB2bInvoicePDF(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download PDF");
    }
  }, []);

  const columns = useMemo(
    () => [
      {
        field: "invoice_no",
        label: "Invoice #",
        sortable: true,
        filterType: "text",
        filterKey: "invoice_no",
        defaultFilterOperator: "contains",
        render: (row) => (
          <Button
            type="button"
            variant="link"
            className="text-sm p-0 h-auto text-left font-normal"
            onClick={() => handleOpenSidebar(row)}
          >
            {row.invoice_no || row.id}
          </Button>
        ),
      },
      {
        field: "invoice_date",
        label: "Date",
        sortable: true,
        filterType: "date",
        filterKey: "invoice_date",
        filterKeyTo: "invoice_date_to",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.invoice_date) || "-",
      },
      {
        field: "status",
        label: "Status",
        filterType: "select",
        filterKey: "status",
        filterOptions: STATUS_OPTIONS,
        render: (row) => (
          <Badge variant={row.status === "CANCELLED" ? "secondary" : "default"} className="text-xs">
            {row.status || "POSTED"}
          </Badge>
        ),
      },
      {
        field: "shipment",
        label: "Shipment",
        filterType: "text",
        filterKey: "shipment_no",
        defaultFilterOperator: "contains",
        render: (row) => row.shipment?.shipment_no || row.shipment_no || "-",
      },
      {
        field: "order_no",
        label: "Order",
        filterType: "text",
        filterKey: "order_no",
        defaultFilterOperator: "contains",
        render: (row) => row.order_no || row.salesOrder?.order_no || row.shipment?.salesOrder?.order_no || "-",
      },
      {
        field: "client",
        label: "Client",
        filterType: "text",
        filterKey: "client_name",
        defaultFilterOperator: "contains",
        render: (row) => row.client?.client_name || "-",
      },
      {
        field: "grand_total",
        label: "Total",
        sortable: true,
        filterType: "number",
        filterKey: "grand_total",
        filterKeyTo: "grand_total_to",
        defaultFilterOperator: "equals",
        render: (row) => formatCurrency(row.grand_total) || "-",
      },
      {
        field: "actions",
        label: "Actions",
        isActionColumn: true,
        render: (row) => (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => handleOpenSidebar(row)}
              title="View details"
            >
              <IconFileDescription className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md hover:bg-accent h-8 w-8 shrink-0">
                <IconDotsVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handlePdfDownload(row.id)}>
                  <IconFileTypePdf className="size-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [handleOpenSidebar, handlePdfDownload]
  );

  const headerActions = useMemo(() => {
    const id = invoiceDetails?.id || selectedRecord?.id;
    if (!id) return null;
    return (
      <Button size="sm" variant="outline" onClick={() => handlePdfDownload(id)}>
        <IconFileTypePdf className="size-4 mr-1" />
        Download PDF
      </Button>
    );
  }, [handlePdfDownload, invoiceDetails?.id, selectedRecord?.id]);

  const sidebarContent = useMemo(() => {
    if (!selectedRecord) return null;
    const r = invoiceDetails || selectedRecord;
    const gstType = String(r.gst_type || "").toUpperCase();
    const isIGST = gstType === "IGST";
    const items = Array.isArray(r.items) ? r.items : [];

    const billToName = r.bill_to_name || r.client?.client_name || "-";
    const billToAddr =
      r.bill_to_address ||
      r.client?.billing_address ||
      [r.client?.billing_city, r.client?.billing_state, r.client?.billing_pincode].filter(Boolean).join(", ");
    const shipToName = r.ship_to_name || r.shipTo?.ship_to_name || r.client?.client_name || "-";
    const shipToAddr =
      r.ship_to_address ||
      r.shipTo?.address ||
      [r.shipTo?.city, r.shipTo?.state, r.shipTo?.pincode].filter(Boolean).join(", ");

    return (
      <div className="pr-1 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{safeText(r.invoice_no || r.id)}</p>
            <p className="text-xs text-muted-foreground">
              {loadingDetails ? "Loading full details..." : "Tax Invoice"}
            </p>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            <div>Date: {formatDate(r.invoice_date) ?? "-"}</div>
            <div>GST Type: {safeText(r.gst_type)}</div>
            <div>Order: {safeText(r.order_no || r.salesOrder?.order_no || r.shipment?.salesOrder?.order_no)}</div>
            <div>Shipment: {safeText(r.shipment_no || r.shipment?.shipment_no)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="border rounded-md p-2">
            <p className="text-xs font-semibold text-muted-foreground">Bill To</p>
            <p className="text-sm font-medium">{safeText(billToName)}</p>
            <p className="text-xs text-muted-foreground">{safeText(billToAddr)}</p>
            <p className="text-xs text-muted-foreground">GSTIN: {safeText(r.bill_to_gstin || r.billing_gstin || r.client?.gstin)}</p>
            <p className="text-xs text-muted-foreground">PAN: {safeText(r.bill_to_pan || r.client?.pan_number)}</p>
          </div>
          <div className="border rounded-md p-2">
            <p className="text-xs font-semibold text-muted-foreground">Ship To</p>
            <p className="text-sm font-medium">{safeText(shipToName)}</p>
            <p className="text-xs text-muted-foreground">{safeText(shipToAddr)}</p>
            <p className="text-xs text-muted-foreground">State: {safeText(r.ship_to_state || r.shipTo?.state || r.client?.billing_state)}</p>
            <p className="text-xs text-muted-foreground">Place of Supply: {safeText(r.place_of_supply)}</p>
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <div className="px-2 py-1 bg-muted/40 flex items-center justify-between">
            <p className="text-xs font-semibold">Items</p>
            <p className="text-xs text-muted-foreground">{items.length} line(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr className="text-left">
                  <th className="p-2 w-10">#</th>
                  <th className="p-2">Product</th>
                  <th className="p-2 w-20">HSN</th>
                  <th className="p-2 w-16 text-right">Qty</th>
                  <th className="p-2 w-20 text-right">Rate</th>
                  <th className="p-2 w-16 text-right">Disc%</th>
                  <th className="p-2 w-24 text-right">Taxable</th>
                  {isIGST ? (
                    <>
                      <th className="p-2 w-16 text-right">IGST%</th>
                      <th className="p-2 w-24 text-right">IGST</th>
                    </>
                  ) : (
                    <>
                      <th className="p-2 w-16 text-right">CGST</th>
                      <th className="p-2 w-16 text-right">SGST</th>
                    </>
                  )}
                  <th className="p-2 w-24 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const name = it.product_name || it.product?.product_name || "-";
                  const hsn = it.hsn_code || it.product?.hsn_ssn_code || "-";
                  return (
                    <tr key={it.id || idx} className="border-t">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2">
                        <div className="font-medium">{safeText(name)}</div>
                        {it.product_type_name ? (
                          <div className="text-[10px] text-muted-foreground">{safeText(it.product_type_name)}</div>
                        ) : null}
                      </td>
                      <td className="p-2">{safeText(hsn)}</td>
                      <td className="p-2 text-right">{safeText(it.quantity)}</td>
                      <td className="p-2 text-right">{formatCurrency(it.unit_price)}</td>
                      <td className="p-2 text-right">{safeText(it.discount_percent ?? 0)}</td>
                      <td className="p-2 text-right">{formatCurrency(it.taxable_amount)}</td>
                      {isIGST ? (
                        <>
                          <td className="p-2 text-right">{safeText(it.gst_percent)}</td>
                          <td className="p-2 text-right">{formatCurrency(it.igst_amount ?? it.gst_amount)}</td>
                        </>
                      ) : (
                        <>
                          <td className="p-2 text-right">{formatCurrency(it.cgst_amount ?? (Number(it.gst_amount || 0) / 2))}</td>
                          <td className="p-2 text-right">{formatCurrency(it.sgst_amount ?? (Number(it.gst_amount || 0) / 2))}</td>
                        </>
                      )}
                      <td className="p-2 text-right">{formatCurrency(it.total_amount)}</td>
                    </tr>
                  );
                })}
                {items.length === 0 ? (
                  <tr className="border-t">
                    <td className="p-3 text-muted-foreground" colSpan={isIGST ? 10 : 10}>
                      {loadingDetails ? "Loading items..." : "No items found"}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="border rounded-md p-2">
            <p className="text-xs font-semibold text-muted-foreground">Status</p>
            <p className="text-sm">{safeText(r.status)}</p>
            {String(r.status || "").toUpperCase() === "CANCELLED" ? (
              <>
                <p className="text-xs text-muted-foreground mt-1">Reason: {safeText(r.cancel_reason)}</p>
                <p className="text-xs text-muted-foreground">Cancelled At: {safeText(r.cancelled_at ? formatDate(r.cancelled_at) : "-")}</p>
              </>
            ) : null}
          </div>
          <div className="border rounded-md p-2">
            <p className="text-xs font-semibold text-muted-foreground">Totals</p>
            <div className="text-xs flex justify-between"><span>Taxable</span><span className="font-medium">{formatCurrency(r.taxable_amount)}</span></div>
            {isIGST ? (
              <div className="text-xs flex justify-between"><span>IGST</span><span className="font-medium">{formatCurrency(r.igst_amount_total ?? r.total_gst_amount)}</span></div>
            ) : (
              <>
                <div className="text-xs flex justify-between"><span>CGST</span><span className="font-medium">{formatCurrency(r.cgst_amount_total ?? (Number(r.total_gst_amount || 0) / 2))}</span></div>
                <div className="text-xs flex justify-between"><span>SGST</span><span className="font-medium">{formatCurrency(r.sgst_amount_total ?? (Number(r.total_gst_amount || 0) / 2))}</span></div>
              </>
            )}
            <div className="text-xs flex justify-between"><span>Total GST</span><span className="font-medium">{formatCurrency(r.total_gst_amount)}</span></div>
            <div className="text-xs flex justify-between"><span>Round Off</span><span className="font-medium">{formatCurrency(r.round_off)}</span></div>
            <div className="text-sm flex justify-between mt-1"><span className="font-semibold">Grand Total</span><span className="font-semibold">{formatCurrency(r.grand_total)}</span></div>
          </div>
        </div>
      </div>
    );
  }, [selectedRecord, invoiceDetails, loadingDetails, safeText]);

  return (
    <ProtectedRoute>
      <ListingPageContainer title="B2B Invoices">
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <PaginatedTable
            key={reloadTrigger}
            columns={columns}
            fetcher={fetcher}
            showSearch={false}
            showPagination={false}
            height="calc(100vh - 150px)"
            onTotalChange={setTotalCount}
            columnFilterValues={columnFilterValues}
            onColumnFilterChange={handleColumnFilterChange}
            filterParams={filterParams}
            page={page}
            limit={limit}
            sortBy={sortBy || "id"}
            sortOrder={sortOrder || "DESC"}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
          />
          <PaginationControls
            page={page - 1}
            rowsPerPage={limit}
            totalCount={totalCount}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
            rowsPerPageOptions={[20, 50, 100]}
          />
        </div>

        <DetailsSidebar
          open={sidebarOpen}
          onClose={handleCloseSidebar}
          title="Invoice Details"
          headerActions={headerActions}
        >
          {sidebarContent}
        </DetailsSidebar>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
