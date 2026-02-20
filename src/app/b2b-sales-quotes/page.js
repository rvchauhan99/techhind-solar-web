"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconFileDescription, IconPencil, IconTrash, IconFileTypePdf, IconChevronDown, IconCircleCheck, IconFileExport, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import BillToShipToDisplay from "@/components/common/BillToShipToDisplay";
import Loader from "@/components/common/Loader";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import b2bSalesQuoteService from "@/services/b2bSalesQuoteService";
import b2bSalesOrderService from "@/services/b2bSalesOrderService";
import companyService from "@/services/companyService";
import Select, { MenuItem } from "@/components/common/Select";
import Input from "@/components/common/Input";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate, formatCurrency } from "@/utils/dataTableUtils";
import { Badge } from "@/components/ui/badge";

const COLUMN_FILTER_KEYS = [
  "quote_no",
  "quote_no_op",
  "quote_date",
  "quote_date_op",
  "quote_date_to",
  "valid_till",
  "valid_till_op",
  "valid_till_to",
  "client_name",
  "client_name_op",
  "ship_to_name",
  "ship_to_name_op",
  "status",
  "grand_total",
  "grand_total_op",
  "grand_total_to",
];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
  { value: "CONVERTED", label: "Converted" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function B2bSalesQuotesPage() {
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
  const [quoteDetails, setQuoteDetails] = useState(null);
  const [loadingQuoteDetails, setLoadingQuoteDetails] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertQuoteId, setConvertQuoteId] = useState(null);
  const [convertPlannedWarehouseId, setConvertPlannedWarehouseId] = useState("");
  const [convertRemarks, setConvertRemarks] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [convertError, setConvertError] = useState(null);
  const [convertConfirmOpen, setConvertConfirmOpen] = useState(false);
  const [cancelQuoteDialogOpen, setCancelQuoteDialogOpen] = useState(false);
  const [quoteToCancel, setQuoteToCancel] = useState(null);
  const [cancellingQuote, setCancellingQuote] = useState(false);

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
      const response = await b2bSalesQuoteService.getB2bSalesQuotes({
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
    setQuoteDetails(null);
  }, []);

  useEffect(() => {
    if (!sidebarOpen || !selectedRecord?.id) return;
    setLoadingQuoteDetails(true);
    setQuoteDetails(null);
    b2bSalesQuoteService
      .getB2bSalesQuoteById(selectedRecord.id)
      .then((res) => {
        const q = res?.result ?? res;
        setQuoteDetails(q ?? null);
      })
      .catch(() => setQuoteDetails(null))
      .finally(() => setLoadingQuoteDetails(false));
  }, [sidebarOpen, selectedRecord?.id]);

  const handleEdit = useCallback(
    (id) => router.push(`/b2b-sales-quotes/edit?id=${id}`),
    [router]
  );

  const handleAdd = useCallback(() => router.push("/b2b-sales-quotes/add"), [router]);

  const handleApprove = useCallback(
    async (id) => {
      try {
        await b2bSalesQuoteService.approveB2bSalesQuote(id);
        toast.success("Quote approved");
        setReloadTrigger((p) => p + 1);
        if (selectedRecord?.id === id) {
          b2bSalesQuoteService.getB2bSalesQuoteById(id).then((res) => {
            const q = res?.result ?? res;
            setQuoteDetails(q ?? null);
          });
          setSelectedRecord((r) => (r?.id === id ? { ...r, status: "APPROVED" } : r));
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to approve quote");
      }
    },
    [selectedRecord?.id]
  );

  const openConvertDialog = useCallback((id) => {
    setConvertQuoteId(id);
    setConvertPlannedWarehouseId("");
    setConvertRemarks("");
    setConvertError(null);
    setConvertDialogOpen(true);
  }, []);

  useEffect(() => {
    if (!convertDialogOpen) return;
    companyService
      .listWarehouses()
      .then((res) => {
        const r = res?.result ?? res;
        const data = r?.data ?? r ?? [];
        setWarehouses(Array.isArray(data) ? data : []);
      })
      .catch(() => setWarehouses([]));
  }, [convertDialogOpen]);

  const handleConvertSubmitClick = useCallback(() => {
    const warehouseId = Number(convertPlannedWarehouseId);
    if (!warehouseId) {
      setConvertError("Please select a planned warehouse");
      return;
    }
    setConvertError(null);
    setConvertDialogOpen(false);
    setConvertConfirmOpen(true);
  }, [convertPlannedWarehouseId]);

  const handleConvertSubmitConfirm = useCallback(async () => {
    setConvertConfirmOpen(false);
    if (!convertQuoteId) return;
    const warehouseId = Number(convertPlannedWarehouseId);
    if (!warehouseId) {
      toast.error("Please select a planned warehouse");
      setConvertDialogOpen(true);
      return;
    }
    setConvertSubmitting(true);
    setConvertError(null);
    try {
      const res = await b2bSalesOrderService.createB2bSalesOrderFromQuote(convertQuoteId, {
        planned_warehouse_id: warehouseId,
        remarks: convertRemarks.trim() || undefined,
      });
      const created = res?.result ?? res;
      const orderId = created?.id ?? created?.data?.id;
      setConvertDialogOpen(false);
      setConvertQuoteId(null);
      setReloadTrigger((p) => p + 1);
      handleCloseSidebar();
      if (selectedRecord?.id === convertQuoteId) {
        setQuoteDetails(null);
        setSelectedRecord((r) => (r?.id === convertQuoteId ? { ...r, status: "CONVERTED", converted_to_so: true } : r));
      }
      toast.success(orderId ? `Order created. Order #${created?.order_no ?? orderId}` : "Order created from quote");
      if (orderId) router.push(`/b2b-sales-orders/edit?id=${orderId}`);
    } catch (err) {
      setConvertError(err.response?.data?.message || "Failed to create order from quote");
      toast.error(err.response?.data?.message || "Failed to create order from quote");
    } finally {
      setConvertSubmitting(false);
    }
  }, [convertQuoteId, convertPlannedWarehouseId, convertRemarks, handleCloseSidebar, selectedRecord?.id, router]);

  const handleCancelQuoteClick = useCallback((row) => {
    setQuoteToCancel(row);
    setCancelQuoteDialogOpen(true);
  }, []);

  const handleCancelQuoteConfirm = useCallback(async () => {
    if (!quoteToCancel) return;
    setCancellingQuote(true);
    try {
      await b2bSalesQuoteService.cancelB2bSalesQuote(quoteToCancel.id);
      setCancelQuoteDialogOpen(false);
      setQuoteToCancel(null);
      setReloadTrigger((p) => p + 1);
      setSidebarOpen(false);
      setSelectedRecord(null);
      setQuoteDetails(null);
      toast.success("Quote cancelled");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel quote");
    } finally {
      setCancellingQuote(false);
    }
  }, [quoteToCancel]);

  const handlePdfDownload = useCallback(async (id) => {
    try {
      const { blob, filename } = await b2bSalesQuoteService.downloadB2bSalesQuotePDF(id);
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
      await b2bSalesQuoteService.deleteB2bSalesQuote(recordToDelete.id);
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      setReloadTrigger((p) => p + 1);
      setSidebarOpen(false);
      setSelectedRecord(null);
      toast.success("Quote deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete quote");
    } finally {
      setDeleting(false);
    }
  }, [recordToDelete]);

  const columns = useMemo(
    () => [
      {
        field: "quote_no",
        label: "Quote #",
        sortable: true,
        filterType: "text",
        filterKey: "quote_no",
        defaultFilterOperator: "contains",
        render: (row) => (
          <Button
            type="button"
            variant="link"
            className="text-sm p-0 h-auto text-left font-normal"
            onClick={() => handleOpenSidebar(row)}
          >
            {row.quote_no || row.id}
          </Button>
        ),
      },
      {
        field: "quote_date",
        label: "Date",
        sortable: true,
        filterType: "date",
        filterKey: "quote_date",
        filterKeyTo: "quote_date_to",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.quote_date) || "-",
      },
      {
        field: "valid_till",
        label: "Valid Till",
        sortable: true,
        filterType: "date",
        filterKey: "valid_till",
        filterKeyTo: "valid_till_to",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.valid_till) || "-",
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
        field: "status",
        label: "Status",
        filterType: "select",
        filterKey: "status",
        filterOptions: STATUS_OPTIONS,
        render: (row) => (
          <Badge
            variant={
              row.status === "CANCELLED"
                ? "outline"
                : row.converted_to_so
                  ? "outline"
                  : row.status === "APPROVED"
                    ? "default"
                    : "secondary"
            }
            className="text-xs"
          >
            {row.status === "CANCELLED" ? "Cancelled" : row.converted_to_so ? "Converted" : row.status || "DRAFT"}
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
                {currentPerm.can_update && (row.status === "DRAFT" || row.status === "SENT") && (
                  <DropdownMenuItem onClick={() => handleEdit(row.id)}>
                    <IconPencil className="size-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {currentPerm.can_delete && (row.status === "DRAFT" || row.status === "SENT") && (
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(row)}
                    className="text-destructive focus:text-destructive"
                  >
                    <IconTrash className="size-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
                {currentPerm.can_update && (row.status === "DRAFT" || row.status === "SENT") && (
                  <DropdownMenuItem onClick={() => handleApprove(row.id)}>
                    <IconCircleCheck className="size-4 mr-2" />
                    Approve
                  </DropdownMenuItem>
                )}
                {row.status === "APPROVED" && !row.converted_to_so && (
                  <DropdownMenuItem onClick={() => openConvertDialog(row.id)}>
                    <IconFileExport className="size-4 mr-2" />
                    Convert to Order
                  </DropdownMenuItem>
                )}
                {currentPerm.can_update && !row.converted_to_so && row.status !== "CANCELLED" && (
                  <DropdownMenuItem
                    onClick={() => handleCancelQuoteClick(row)}
                    className="text-destructive focus:text-destructive"
                  >
                    <IconX className="size-4 mr-2" />
                    Cancel Quote
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
    [handleOpenSidebar, handleEdit, handleDeleteClick, handleApprove, openConvertDialog, handleCancelQuoteClick, handlePdfDownload, currentPerm, router]
  );

  const sidebarContent = useMemo(() => {
    if (!selectedRecord) return null;
    if (loadingQuoteDetails) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      );
    }
    const q = quoteDetails || selectedRecord;
    const items = q?.items ?? [];
    const hasItems = Array.isArray(items) && items.length > 0;
    const attachments = q?.attachments ?? [];
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    return (
      <div className="pr-1 space-y-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Quote No</p>
            <p className="font-medium">{q.quote_no ?? q.id ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Date</p>
            <p>{formatDate(q.quote_date) ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Valid Till</p>
            <p>{formatDate(q.valid_till) ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Client</p>
            <p>{q.client?.client_name ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Ship To</p>
            <p>{q.shipTo?.ship_to_name ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Status</p>
            <Badge
              variant={q.converted_to_so ? "outline" : q.status === "APPROVED" ? "default" : "secondary"}
              className="text-xs"
            >
              {q.converted_to_so ? "Converted" : q.status ?? "DRAFT"}
            </Badge>
          </div>
          {(q.payment_terms || q.delivery_terms) && (
            <>
              {q.payment_terms && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground">Payment Terms</p>
                  <p>{q.payment_terms}</p>
                </div>
              )}
              {q.delivery_terms && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground">Delivery Terms</p>
                  <p>{q.delivery_terms}</p>
                </div>
              )}
            </>
          )}
        </div>

        <BillToShipToDisplay billTo={q.client} shipTo={q.shipTo} />

        {hasItems && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Line Items</p>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Product</th>
                    <th className="text-right p-2">Qty</th>
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
                      <td className="p-2 text-right">{it.quantity ?? "-"}</td>
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
            <p>{formatCurrency(q.subtotal_amount) ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Total GST</p>
            <p>{formatCurrency(q.total_gst_amount) ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Grand Total</p>
            <p className="font-semibold">{formatCurrency(q.grand_total) ?? "-"}</p>
          </div>
        </div>

        {q.remarks && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Remarks</p>
            <p className="text-sm">{q.remarks}</p>
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

        {/* Quote actions */}
        <div className="border-t pt-4 flex flex-wrap gap-2">
          {currentPerm.can_update && (q.status === "DRAFT" || q.status === "SENT") && (
            <Button size="sm" onClick={() => handleApprove(q.id)}>
              Approve Quote
            </Button>
          )}
          {q.status === "APPROVED" && !q.converted_to_so && (
            <Button size="sm" variant="default" onClick={() => openConvertDialog(q.id)}>
              Convert to Order
            </Button>
          )}
          {currentPerm.can_update && !q.converted_to_so && q.status !== "CANCELLED" && (
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleCancelQuoteClick(q)}>
              Cancel Quote
            </Button>
          )}
          {q.converted_to_so && (
            <p className="text-sm text-muted-foreground">This quote has been converted to an order.</p>
          )}
          {q.status === "CANCELLED" && (
            <p className="text-sm text-muted-foreground">This quote has been cancelled.</p>
          )}
        </div>
      </div>
    );
  }, [selectedRecord, quoteDetails, loadingQuoteDetails, currentPerm.can_update, handleApprove, openConvertDialog, handleCancelQuoteClick]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="B2B Sales Quotes"
        addButtonLabel={currentPerm.can_create ? "Create Quote" : undefined}
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
          title="Quote Details"
          headerActions={
            selectedRecord?.id ? (
              <Button size="sm" variant="outline" onClick={() => handlePdfDownload(selectedRecord.id)}>
                <IconFileTypePdf className="size-4 mr-1" />
                Download PDF
              </Button>
            ) : null
          }
        >
          {sidebarContent}
        </DetailsSidebar>

        <Dialog open={convertDialogOpen} onOpenChange={(open) => !open && setConvertDialogOpen(false)}>
          <DialogContent className="sm:max-w-md" showCloseButton={!convertSubmitting}>
            <DialogHeader>
              <DialogTitle>Convert Quote to Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Select the planned warehouse and optionally add remarks. The order will be created from this quote.
              </p>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Planned Warehouse *</label>
                <Select
                  value={convertPlannedWarehouseId}
                  onChange={(e) => {
                    setConvertPlannedWarehouseId(e.target.value);
                    if (convertError) setConvertError(null);
                  }}
                  error={!!convertError}
                  helperText={convertError}
                >
                  <MenuItem value="">-- Select Warehouse --</MenuItem>
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={String(w.id)}>
                      {w.name || w.warehouse_name || `Warehouse ${w.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Remarks (optional)</label>
                <Input
                  value={convertRemarks}
                  onChange={(e) => setConvertRemarks(e.target.value)}
                  placeholder="Remarks for the order"
                  multiline
                  rows={2}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                You can add attachments to the order after it is created by editing the order.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConvertDialogOpen(false)}
                disabled={convertSubmitting}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleConvertSubmitClick} disabled={convertSubmitting}>
                {convertSubmitting ? "Creating…" : "Create Order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={convertConfirmOpen} onOpenChange={setConvertConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create order from quote?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a new sales order from this quote with the selected warehouse and remarks. The quote will be marked as converted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={convertSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleConvertSubmitConfirm();
                }}
                disabled={convertSubmitting}
              >
                {convertSubmitting ? "Creating…" : "Create Order"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={cancelQuoteDialogOpen} onOpenChange={setCancelQuoteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel quote?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this quote? The quote will be marked as cancelled. This action can be done only for quotes that are not yet converted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancellingQuote}>No</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleCancelQuoteConfirm} disabled={cancellingQuote}>
                {cancellingQuote ? "Cancelling…" : "Yes, cancel quote"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Quote</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this quote? This action cannot be undone.
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
