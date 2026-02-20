"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconFileDescription, IconPencil, IconTrash, IconFileTypePdf, IconChevronDown, IconCircleCheck, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import BillToShipToDisplay from "@/components/common/BillToShipToDisplay";
import Loader from "@/components/common/Loader";
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
import b2bSalesOrderService from "@/services/b2bSalesOrderService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate, formatCurrency } from "@/utils/dataTableUtils";
import { Badge } from "@/components/ui/badge";

const COLUMN_FILTER_KEYS = [
  "order_no",
  "order_no_op",
  "order_date",
  "order_date_op",
  "order_date_to",
  "client_name",
  "client_name_op",
  "ship_to_name",
  "ship_to_name_op",
  "planned_warehouse_name",
  "planned_warehouse_name_op",
  "status",
  "grand_total",
  "grand_total_op",
  "grand_total_to",
];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function B2bSalesOrdersPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
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
  const [orderDetails, setOrderDetails] = useState(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmOrderDialogOpen, setConfirmOrderDialogOpen] = useState(false);
  const [orderToConfirm, setOrderToConfirm] = useState(null);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [cancelOrderDialogOpen, setCancelOrderDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);
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
      const response = await b2bSalesOrderService.getB2bSalesOrders({
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
    setOrderDetails(null);
  }, []);

  useEffect(() => {
    if (!sidebarOpen || !selectedRecord?.id) return;
    setLoadingOrderDetails(true);
    setOrderDetails(null);
    b2bSalesOrderService
      .getB2bSalesOrderById(selectedRecord.id)
      .then((res) => {
        const o = res?.result ?? res;
        setOrderDetails(o ?? null);
      })
      .catch(() => setOrderDetails(null))
      .finally(() => setLoadingOrderDetails(false));
  }, [sidebarOpen, selectedRecord?.id]);

  const handleEdit = useCallback(
    (id) => router.push(`/b2b-sales-orders/edit?id=${id}`),
    [router]
  );

  const handleAdd = useCallback(() => router.push("/b2b-sales-orders/add"), [router]);

  const handleConfirmOrderClick = useCallback((row) => {
    setOrderToConfirm(row);
    setConfirmOrderDialogOpen(true);
  }, []);

  const handleConfirmOrderConfirm = useCallback(
    async () => {
      if (!orderToConfirm?.id) return;
      setConfirmingOrder(true);
      try {
        await b2bSalesOrderService.confirmB2bSalesOrder(orderToConfirm.id);
        setConfirmOrderDialogOpen(false);
        setOrderToConfirm(null);
        toast.success("Order confirmed");
        setReloadTrigger((p) => p + 1);
        if (selectedRecord?.id === orderToConfirm.id) {
          b2bSalesOrderService.getB2bSalesOrderById(orderToConfirm.id).then((res) => {
            const o = res?.result ?? res;
            setOrderDetails(o ?? null);
          });
          setSelectedRecord((r) => (r?.id === orderToConfirm.id ? { ...r, status: "CONFIRMED" } : r));
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to confirm order");
      } finally {
        setConfirmingOrder(false);
      }
    },
    [orderToConfirm, selectedRecord?.id]
  );

  const handleCancelOrderClick = useCallback((row) => {
    setOrderToCancel(row);
    setCancelOrderDialogOpen(true);
  }, []);

  const handleCancelOrderConfirm = useCallback(async () => {
    if (!orderToCancel?.id) return;
    setCancellingOrder(true);
    try {
      await b2bSalesOrderService.cancelB2bSalesOrder(orderToCancel.id);
      setCancelOrderDialogOpen(false);
      setOrderToCancel(null);
      toast.success("Order cancelled");
      setReloadTrigger((p) => p + 1);
      if (selectedRecord?.id === orderToCancel.id) {
        setSidebarOpen(false);
        setSelectedRecord(null);
        setOrderDetails(null);
      } else {
        setSelectedRecord((r) => (r?.id === orderToCancel.id ? { ...r, status: "CANCELLED" } : r));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancellingOrder(false);
    }
  }, [orderToCancel, selectedRecord?.id]);

  const handlePdfDownload = useCallback(async (id) => {
    try {
      const { blob, filename } = await b2bSalesOrderService.downloadB2bSalesOrderPDF(id);
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

  const handleDeleteClick = useCallback((row) => {
    setRecordToDelete(row);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!recordToDelete) return;
    setDeleting(true);
    try {
      await b2bSalesOrderService.deleteB2bSalesOrder(recordToDelete.id);
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      setReloadTrigger((p) => p + 1);
      setSidebarOpen(false);
      setSelectedRecord(null);
      toast.success("Order deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete order");
    } finally {
      setDeleting(false);
    }
  }, [recordToDelete]);

  const columns = useMemo(
    () => [
      {
        field: "order_no",
        label: "Order #",
        sortable: true,
        filterType: "text",
        filterKey: "order_no",
        defaultFilterOperator: "contains",
        render: (row) => (
          <Button
            type="button"
            variant="link"
            className="text-sm p-0 h-auto text-left font-normal"
            onClick={() => handleOpenSidebar(row)}
          >
            {row.order_no || row.id}
          </Button>
        ),
      },
      {
        field: "order_date",
        label: "Date",
        sortable: true,
        filterType: "date",
        filterKey: "order_date",
        filterKeyTo: "order_date_to",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.order_date) || "-",
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
        field: "shipTo",
        label: "Ship To",
        filterType: "text",
        filterKey: "ship_to_name",
        defaultFilterOperator: "contains",
        render: (row) => row.shipTo?.ship_to_name || "-",
      },
      {
        field: "plannedWarehouse",
        label: "Warehouse",
        filterType: "text",
        filterKey: "planned_warehouse_name",
        defaultFilterOperator: "contains",
        render: (row) => row.plannedWarehouse?.name || "-",
      },
      {
        field: "status",
        label: "Status",
        filterType: "select",
        filterKey: "status",
        filterOptions: STATUS_OPTIONS,
        render: (row) => (
          <Badge variant={row.status === "CONFIRMED" ? "default" : "secondary"} className="text-xs">
            {row.status || "DRAFT"}
          </Badge>
        ),
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => handleOpenSidebar(row)}
              title="View details"
            >
              <IconFileDescription className="size-4" />
              <span className="hidden sm:inline">View</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background h-8 px-3 text-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                Actions
                <IconChevronDown className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {currentPerm.can_update && row.status === "DRAFT" && (
                  <DropdownMenuItem onClick={() => handleEdit(row.id)}>
                    <IconPencil className="size-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {currentPerm.can_update && row.status === "DRAFT" && (
                  <DropdownMenuItem onClick={() => handleConfirmOrderClick(row)}>
                    <IconCircleCheck className="size-4 mr-2" />
                    Confirm Order
                  </DropdownMenuItem>
                )}
                {currentPerm.can_update && row.status === "DRAFT" && (
                  <DropdownMenuItem
                    onClick={() => handleCancelOrderClick(row)}
                    className="text-destructive focus:text-destructive"
                  >
                    <IconX className="size-4 mr-2" />
                    Cancel Order
                  </DropdownMenuItem>
                )}
                {currentPerm.can_delete && row.status === "DRAFT" && (
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(row)}
                    className="text-destructive focus:text-destructive"
                  >
                    <IconTrash className="size-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
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
    [handleOpenSidebar, handleEdit, handleDeleteClick, handleConfirmOrderClick, handleCancelOrderClick, handlePdfDownload, currentPerm]
  );

  const sidebarContent = useMemo(() => {
    if (!selectedRecord) return null;
    if (loadingOrderDetails) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      );
    }
    const o = orderDetails || selectedRecord;
    const items = o?.items ?? [];
    const hasItems = Array.isArray(items) && items.length > 0;
    const attachments = o?.attachments ?? [];
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    return (
      <div className="pr-1 space-y-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Order No</p>
            <p className="font-medium">{o.order_no ?? o.id ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Date</p>
            <p>{formatDate(o.order_date) ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Client</p>
            <p>{o.client?.client_name ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Ship To</p>
            <p>{o.shipTo?.ship_to_name ?? "-"}</p>
          </div>
          {o.plannedWarehouse && (
            <div className="col-span-2">
              <p className="text-xs font-semibold text-muted-foreground">Planned Warehouse</p>
              <p>{o.plannedWarehouse?.name ?? "-"}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Status</p>
            <Badge variant={o.status === "CONFIRMED" ? "default" : "secondary"} className="text-xs">
              {o.status ?? "DRAFT"}
            </Badge>
          </div>
          {(o.payment_terms || o.delivery_terms) && (
            <>
              {o.payment_terms && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground">Payment Terms</p>
                  <p>{o.payment_terms}</p>
                </div>
              )}
              {o.delivery_terms && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground">Delivery Terms</p>
                  <p>{o.delivery_terms}</p>
                </div>
              )}
            </>
          )}
        </div>

        <BillToShipToDisplay billTo={o.client} shipTo={o.shipTo} />

        {hasItems && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Line Items</p>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Product</th>
                    <th className="text-right p-2">Ordered</th>
                    <th className="text-right p-2">Shipped</th>
                    <th className="text-right p-2">Returned</th>
                    <th className="text-right p-2">Pending</th>
                    <th className="text-right p-2">Rate</th>
                    <th className="text-right p-2">Disc %</th>
                    <th className="text-right p-2">GST %</th>
                    <th className="text-right p-2">Taxable</th>
                    <th className="text-right p-2">GST</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.id ?? idx} className="border-b last:border-0">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2">{it.product?.product_name ?? it.product_label ?? "-"}</td>
                      <td className="p-2 text-right">{it.ordered_qty ?? it.quantity ?? "-"}</td>
                      <td className="p-2 text-right">{it.shipped_qty ?? 0}</td>
                      <td className="p-2 text-right">{it.returned_qty ?? 0}</td>
                      <td className="p-2 text-right">{it.pending_qty ?? (it.quantity != null ? Number(it.quantity) : "-")}</td>
                      <td className="p-2 text-right">{formatCurrency(it.unit_rate) ?? "-"}</td>
                      <td className="p-2 text-right">{it.discount_percent ?? 0}</td>
                      <td className="p-2 text-right">{it.gst_percent ?? "-"}</td>
                      <td className="p-2 text-right">{formatCurrency(it.taxable_amount) ?? "-"}</td>
                      <td className="p-2 text-right">{formatCurrency(it.gst_amount) ?? "-"}</td>
                      <td className="p-2 text-right">{formatCurrency(it.total_amount) ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm border-t pt-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Subtotal</p>
            <p>{formatCurrency(o.subtotal_amount) ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Total GST</p>
            <p>{formatCurrency(o.total_gst_amount) ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Grand Total</p>
            <p className="font-semibold">{formatCurrency(o.grand_total) ?? "-"}</p>
          </div>
        </div>

        {o.remarks && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Remarks</p>
            <p className="text-sm">{o.remarks}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Attachments</p>
          {hasAttachments ? (
            <ul className="text-sm list-disc list-inside space-y-0.5">
              {attachments.map((att, i) => (
                <li key={i}>{att.filename ?? att.name ?? `File ${i + 1}`}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">No attachments</p>
          )}
        </div>

        {currentPerm.can_update && o.status === "DRAFT" && (
          <div className="border-t pt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => handleConfirmOrderClick(o)}>
              <IconCircleCheck className="size-4 mr-1" />
              Confirm Order
            </Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleCancelOrderClick(o)}>
              Cancel Order
            </Button>
          </div>
        )}
      </div>
    );
  }, [selectedRecord, orderDetails, loadingOrderDetails, currentPerm.can_update, handleConfirmOrderClick, handleCancelOrderClick]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="B2B Sales Orders"
        addButtonLabel={currentPerm.can_create ? "Create Order" : undefined}
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
          title="Order Details"
          headerActions={
            selectedRecord?.id ? (
              <div className="flex items-center gap-1">
                {selectedRecord?.status === "DRAFT" && currentPerm.can_update && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(selectedRecord.id)}>
                      <IconPencil className="size-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="default" onClick={() => handleConfirmOrderClick(selectedRecord)}>
                      <IconCircleCheck className="size-4 mr-1" />
                      Confirm
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleCancelOrderClick(selectedRecord)}>
                      Cancel Order
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => handlePdfDownload(selectedRecord.id)}>
                  <IconFileTypePdf className="size-4 mr-1" />
                  Download PDF
                </Button>
              </div>
            ) : null
          }
        >
          {sidebarContent}
        </DetailsSidebar>

        <AlertDialog open={confirmOrderDialogOpen} onOpenChange={setConfirmOrderDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm order?</AlertDialogTitle>
              <AlertDialogDescription>
                Confirm this order? Planned warehouse must be set. The order status will change to Confirmed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={confirmingOrder}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmOrderConfirm} disabled={confirmingOrder}>
                {confirmingOrder ? "Confirming…" : "Confirm Order"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={cancelOrderDialogOpen} onOpenChange={setCancelOrderDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel order?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this order? The order will be marked as cancelled. Only draft orders can be cancelled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancellingOrder}>No</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleCancelOrderConfirm} disabled={cancellingOrder}>
                {cancellingOrder ? "Cancelling…" : "Yes, cancel order"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this order? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="sm"
                loading={deleting}
                onClick={handleDeleteConfirm}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
