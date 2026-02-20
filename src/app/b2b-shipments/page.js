"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconFileDescription, IconFileTypePdf, IconDotsVertical, IconReceipt } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
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
  const [totalCount, setTotalCount] = useState(0);
  const [creatingInvoice, setCreatingInvoice] = useState(null);
  const [confirmGenerateInvoiceShipmentId, setConfirmGenerateInvoiceShipmentId] = useState(null);

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

  const handleOpenSidebar = useCallback((row) => {
    setSelectedRecord(row);
    setSidebarOpen(true);
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [handleOpenSidebar, handlePdfDownload, currentPerm, goToInvoice]
  );

  const sidebarContent = useMemo(() => {
    if (!selectedRecord) return null;
    const r = selectedRecord;
    const invLoading = creatingInvoice === r.id;
    const existingInv = r.invoice || null;
    return (
      <div className="pr-1 space-y-3">
        <p className="font-semibold">{r.shipment_no || r.id}</p>
        <p className="text-xs font-semibold text-muted-foreground">Date</p>
        <p className="text-sm">{formatDate(r.shipment_date) ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Order</p>
        <p className="text-sm">{r.salesOrder?.order_no ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Client</p>
        <p className="text-sm">{r.client?.client_name ?? "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground">Warehouse</p>
        <p className="text-sm">{r.warehouse?.name ?? "-"}</p>
        <div className="pt-2 flex flex-col gap-2">
          {existingInv?.id ? (
            currentPerm.can_read && (
              <Button size="sm" variant="outline" onClick={() => goToInvoice(existingInv)}>
                View Invoice
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
                {invLoading ? "Generating..." : "Generate Invoice"}
              </Button>
            )
          )}
          <Button size="sm" onClick={() => handlePdfDownload(r.id)}>
            <IconFileTypePdf className="size-4 mr-1" />
            Download PDF
          </Button>
        </div>
      </div>
    );
  }, [selectedRecord, handlePdfDownload, handleGenerateInvoice, creatingInvoice, currentPerm, goToInvoice]);

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

        <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Shipment Details">
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
