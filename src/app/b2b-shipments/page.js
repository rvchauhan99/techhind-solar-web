"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconFileDescription,
  IconFileTypePdf,
  IconDotsVertical,
  IconReceipt,
  IconArrowBackUp,
  IconFileSpreadsheet,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import b2bShipmentService from "@/services/b2bShipmentService";
import b2bInvoiceService from "@/services/b2bInvoiceService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate } from "@/utils/dataTableUtils";

const COLUMN_FILTER_KEYS = [
  "shipment_no",
  "shipment_no_op",
  "shipment_date",
  "shipment_date_op",
  "shipment_date_to",
  "order_no",
  "order_no_op",
  "client_name",
  "client_name_op",
  "warehouse_name",
  "warehouse_name_op",
  "invoice_no",
  "invoice_no_op",
];

function splitSerials(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function trackingLabel(item) {
  const serials = splitSerials(item?.serials);
  const tracking = String(
    item?.product?.tracking_type ||
      (item?.product?.serial_required || serials.length > 0 ? "SERIAL" : "LOT")
  ).toUpperCase();
  if (tracking === "SERIAL" || serials.length > 0) {
    return `SERIAL (${serials.length} serials)`;
  }
  return "LOT";
}

export default function B2bShipmentsPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
  };

  const router = useRouter();
  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter } = listingState;

  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [creatingInvoice, setCreatingInvoice] = useState(null);
  const [confirmGenerateInvoiceShipmentId, setConfirmGenerateInvoiceShipmentId] = useState(null);
  const [detailExporting, setDetailExporting] = useState(false);

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
      const response = await b2bShipmentService.getB2bShipments({
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

  const handleOpenSidebar = useCallback(async (rowOrId) => {
    const id = typeof rowOrId === "object" ? rowOrId?.id : rowOrId;
    if (!id) return;
    setLoadingRecord(true);
    setSidebarOpen(true);
    try {
      const response = await b2bShipmentService.getB2bShipmentById(id);
      const result = response?.result || response;
      setSelectedRecord(result);
    } catch (error) {
      console.error("Error fetching shipment:", error);
      toast.error(error.response?.data?.message || "Failed to load shipment");
      setSidebarOpen(false);
      setSelectedRecord(null);
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRecord(null);
  }, []);

  const handleAdd = useCallback(() => router.push("/b2b-shipments/add"), [router]);

  const goToInvoice = useCallback((inv) => {
    const invoiceNo = inv?.invoice_no;
    if (invoiceNo) {
      router.push(`/b2b-invoices?invoice_no=${encodeURIComponent(invoiceNo)}&invoice_no_op=contains`);
    } else {
      router.push("/b2b-invoices");
    }
  }, [router]);

  const handleGenerateInvoice = useCallback(async (shipmentId) => {
    setCreatingInvoice(shipmentId);
    try {
      const res = await b2bInvoiceService.createB2bInvoiceFromShipment(shipmentId);
      const inv = res?.result ?? res;
      toast.success("Invoice ready");
      setConfirmGenerateInvoiceShipmentId(null);
      setSidebarOpen(false);
      setSelectedRecord(null);
      setReloadTrigger((p) => p + 1);
      if (inv?.id) goToInvoice(inv);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create invoice");
    } finally {
      setCreatingInvoice(null);
    }
  }, [goToInvoice]);

  const handleGenerateInvoiceConfirm = useCallback(async () => {
    if (confirmGenerateInvoiceShipmentId) {
      await handleGenerateInvoice(confirmGenerateInvoiceShipmentId);
    }
  }, [confirmGenerateInvoiceShipmentId, handleGenerateInvoice]);

  const handlePdfDownload = useCallback(async (id) => {
    try {
      const { blob, filename } = await b2bShipmentService.downloadB2bShipmentPDF(id);
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

  const handleDetailExport = useCallback(async () => {
    const id = selectedRecord?.id;
    if (!id) return;
    setDetailExporting(true);
    try {
      const { blob, filename } = await b2bShipmentService.exportB2bShipmentById(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (err) {
      console.error("Shipment export error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to export shipment");
    } finally {
      setDetailExporting(false);
    }
  }, [selectedRecord?.id]);

  const columns = useMemo(
    () => [
      {
        field: "shipment_no",
        label: "Shipment #",
        sortable: true,
        filterType: "text",
        filterKey: "shipment_no",
        defaultFilterOperator: "contains",
        render: (row) => (
          <Button
            type="button"
            variant="link"
            className="text-sm p-0 h-auto text-left font-normal"
            onClick={() => handleOpenSidebar(row)}
          >
            {row.shipment_no || row.id}
          </Button>
        ),
      },
      {
        field: "shipment_date",
        label: "Date",
        sortable: true,
        filterType: "date",
        filterKey: "shipment_date",
        filterKeyTo: "shipment_date_to",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.shipment_date) || "-",
      },
      {
        field: "salesOrder",
        label: "Order",
        filterType: "text",
        filterKey: "order_no",
        defaultFilterOperator: "contains",
        render: (row) => row.salesOrder?.order_no || "-",
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
        field: "warehouse",
        label: "Warehouse",
        filterType: "text",
        filterKey: "warehouse_name",
        defaultFilterOperator: "contains",
        render: (row) => row.warehouse?.name || "-",
      },
      {
        field: "invoice",
        label: "Invoice",
        filterType: "text",
        filterKey: "invoice_no",
        defaultFilterOperator: "contains",
        render: (row) => row.invoice?.invoice_no || "-",
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
                {!row.invoice?.id && currentPerm.can_create && (
                  <DropdownMenuItem onClick={() => setConfirmGenerateInvoiceShipmentId(row.id)}>
                    <IconReceipt className="size-4 mr-2" />
                    Generate Invoice
                  </DropdownMenuItem>
                )}
                {row.invoice?.id && currentPerm.can_read && (
                  <DropdownMenuItem onClick={() => goToInvoice(row.invoice)}>
                    <IconReceipt className="size-4 mr-2" />
                    View Invoice
                  </DropdownMenuItem>
                )}
                {!row.is_reversed && currentPerm.can_create && (
                  <DropdownMenuItem onClick={() => router.push(`/b2b-shipment-returns/add?shipment_id=${row.id}`)}>
                    <IconArrowBackUp className="size-4 mr-2" />
                    Create Return
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [handleOpenSidebar, handlePdfDownload, currentPerm, goToInvoice, router]
  );

  const detailHeaderActions = useMemo(() => {
    if (!selectedRecord?.id || loadingRecord) return null;
    const r = selectedRecord;
    const invLoading = creatingInvoice === r.id;
    const existingInv = r.invoice || null;
    return (
      <div className="flex items-center gap-1 flex-wrap justify-end max-w-[min(100%,28rem)]">
        <Button size="sm" variant="outline" disabled={detailExporting} onClick={handleDetailExport}>
          <IconFileSpreadsheet className="size-4 mr-1" />
          {detailExporting ? "Exporting…" : "Export Excel"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => handlePdfDownload(r.id)}>
          <IconFileTypePdf className="size-4 mr-1" />
          PDF
        </Button>
        {existingInv?.id ? (
          currentPerm.can_read && (
            <Button size="sm" variant="outline" onClick={() => goToInvoice(existingInv)}>
              <IconReceipt className="size-4 mr-1" />
              Invoice
            </Button>
          )
        ) : (
          currentPerm.can_create && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmGenerateInvoiceShipmentId(r.id)}
              disabled={invLoading}
            >
              <IconReceipt className="size-4 mr-1" />
              {invLoading ? "…" : "Invoice"}
            </Button>
          )
        )}
        {!r.is_reversed && currentPerm.can_create && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/b2b-shipment-returns/add?shipment_id=${r.id}`)}
          >
            <IconArrowBackUp className="size-4 mr-1" />
            Return
          </Button>
        )}
      </div>
    );
  }, [
    selectedRecord,
    loadingRecord,
    creatingInvoice,
    currentPerm,
    detailExporting,
    handleDetailExport,
    handlePdfDownload,
    goToInvoice,
    router,
  ]);

  const sidebarContent = useMemo(() => {
    if (loadingRecord) {
      return (
        <div className="flex min-h-50 items-center justify-center">
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      );
    }
    if (!selectedRecord) return null;
    const r = selectedRecord;
    const txt = (v) => (v === null || v === undefined || v === "" ? "-" : String(v));
    const qty = (v) => (v === null || v === undefined ? "-" : v);
    const items = Array.isArray(r.items) ? r.items : [];
    const totalQty = items.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 0), 0);
    const totalReturned = items.reduce((sum, it) => sum + (parseInt(it.returned_qty, 10) || 0), 0);
    const shipToName =
      r.shipTo?.ship_to_name || r.ship_to_name || r.client?.client_name || "-";
    const shipToAddr = [
      r.shipTo?.address,
      r.shipTo?.city,
      r.shipTo?.state,
      r.shipTo?.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <div className="pr-1 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-base">{txt(r.shipment_no || r.id)}</p>
            {r.is_reversed ? (
              <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs">
                Reversed
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Date: {formatDate(r.shipment_date) ?? "-"} · Order: {txt(r.salesOrder?.order_no)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border p-2 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Client</p>
            <p className="text-sm font-medium">{txt(r.client?.client_name)}</p>
            <p className="text-xs text-muted-foreground">Code: {txt(r.client?.client_code)}</p>
          </div>
          <div className="rounded-md border border-border p-2 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Warehouse</p>
            <p className="text-sm font-medium">{txt(r.warehouse?.name)}</p>
            <p className="text-xs text-muted-foreground">{txt(r.warehouse?.address)}</p>
          </div>
        </div>

        <div className="rounded-md border border-border p-2 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Ship To / Logistics</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Ship To</span>
            <span>{txt(shipToName)}</span>
            <span className="text-muted-foreground">Address</span>
            <span>{txt(shipToAddr)}</span>
            <span className="text-muted-foreground">Transporter</span>
            <span>{txt(r.transporter)}</span>
            <span className="text-muted-foreground">Invoice</span>
            <span>{txt(r.invoice?.invoice_no)}</span>
            <span className="text-muted-foreground">Created By</span>
            <span>{txt(r.createdBy?.name)}</span>
          </div>
          <div className="text-xs pt-1">
            <p className="text-muted-foreground">Remarks</p>
            <p className="text-sm">{txt(r.remarks)}</p>
          </div>
        </div>

        {items.length > 0 && (
          <div className="rounded-md border border-border overflow-hidden">
            <div className="px-2 py-1.5 bg-muted/40 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Items ({items.length})</p>
              <p className="text-xs text-muted-foreground">
                Qty {totalQty}
                {totalReturned > 0 ? ` · Returned ${totalReturned}` : ""}
              </p>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold">Product</th>
                    <th className="px-2 py-1 text-left font-semibold">UOM</th>
                    <th className="px-2 py-1 text-right font-semibold">Qty</th>
                    <th className="px-2 py-1 text-right font-semibold">Returned</th>
                    <th className="px-2 py-1 text-right font-semibold">Returnable</th>
                    <th className="px-2 py-1 text-left font-semibold">Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id || index} className="border-t border-border">
                      <td className="px-2 py-1.5">{txt(item.product?.product_name)}</td>
                      <td className="px-2 py-1.5">{txt(item.product?.measurementUnit?.unit || "—")}</td>
                      <td className="px-2 py-1.5 text-right">{qty(item.quantity)}</td>
                      <td className="px-2 py-1.5 text-right">{qty(item.returned_qty ?? 0)}</td>
                      <td className="px-2 py-1.5 text-right">{qty(item.returnable_qty)}</td>
                      <td className="px-2 py-1.5">{trackingLabel(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {Array.isArray(r.partial_returns) && r.partial_returns.length > 0 && (
          <div className="rounded-md border border-border p-2 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">
              Returns ({r.partial_returns.length})
            </p>
            <div className="space-y-1">
              {r.partial_returns.map((ret) => (
                <p key={ret.id} className="text-xs">
                  {txt(ret.return_no)} · {formatDate(ret.return_date) ?? "-"} · {txt(ret.status)} · qty{" "}
                  {qty(ret.total_return_quantity)}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }, [selectedRecord, loadingRecord]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="B2B Shipments"
        addButtonLabel={currentPerm.can_create ? "New Shipment" : undefined}
        onAddClick={currentPerm.can_create ? handleAdd : undefined}
      >
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
          title="Shipment Details"
          headerActions={detailHeaderActions}
        >
          {sidebarContent}
        </DetailsSidebar>

        <AlertDialog
          open={!!confirmGenerateInvoiceShipmentId}
          onOpenChange={(open) => !open && setConfirmGenerateInvoiceShipmentId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Generate Invoice</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to generate an invoice from this shipment? An invoice will be created and you will be redirected to view it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={!!creatingInvoice}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleGenerateInvoiceConfirm} disabled={!!creatingInvoice}>
                {creatingInvoice ? "Generating…" : "Generate Invoice"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
