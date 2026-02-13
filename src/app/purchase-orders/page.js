"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import purchaseOrderService from "@/services/purchaseOrderService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatCurrency } from "@/utils/dataTableUtils";
import { DIALOG_FORM_SMALL } from "@/utils/formConstants";
import PaginationControls from "@/components/common/PaginationControls";
import { IconTrash, IconCircleCheck, IconEye, IconPencil, IconDownload, IconPrinter } from "@tabler/icons-react";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
];

const COLUMN_FILTER_KEYS = [
  "po_number",
  "po_number_op",
  "status",
  "po_date_from",
  "po_date_to",
  "po_date_op",
  "due_date_from",
  "due_date_to",
  "due_date_op",
  "supplier_name",
  "supplier_name_op",
  "ship_to_name",
  "ship_to_name_op",
  "grand_total",
  "grand_total_op",
  "grand_total_to",
];

export default function PurchaseOrderPage() {
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
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } =
    listingState;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [poToDelete, setPoToDelete] = useState(null);
  const [poToApprove, setPoToApprove] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [attachmentLoadingIndex, setAttachmentLoadingIndex] = useState(null);
  const [printingId, setPrintingId] = useState(null);
  const [tableKey, setTableKey] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = {
        ...(filters.po_number && { po_number: filters.po_number, po_number_op: filters.po_number_op }),
        ...(filters.status && { status: filters.status }),
        ...(filters.po_date_from && {
          po_date_from: filters.po_date_from,
          po_date_to: filters.po_date_to,
          po_date_op: filters.po_date_op,
        }),
        ...(filters.due_date_from && {
          due_date_from: filters.due_date_from,
          due_date_to: filters.due_date_to,
          due_date_op: filters.due_date_op,
        }),
        ...(filters.supplier_name && {
          supplier_name: filters.supplier_name,
          supplier_name_op: filters.supplier_name_op,
        }),
        ...(filters.ship_to_name && {
          ship_to_name: filters.ship_to_name,
          ship_to_name_op: filters.ship_to_name_op,
        }),
        ...(filters.grand_total && {
          grand_total: filters.grand_total,
          grand_total_op: filters.grand_total_op,
          grand_total_to: filters.grand_total_to,
        }),
      };
      const blob = await purchaseOrderService.exportPurchaseOrders(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `purchase-orders-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export purchase orders");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const handleColumnFilterChange = useCallback(
    (key, value) => {
      setFilter(key, value);
    },
    [setFilter]
  );

  const handleOpenSidebar = useCallback(async (id) => {
    setLoadingRecord(true);
    try {
      const response = await purchaseOrderService.getPurchaseOrderById(id);
      const result = response.result || response;
      setSelectedPO(result);
      setSidebarOpen(true);
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      toast.error(error?.response?.data?.message || "Failed to load purchase order");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedPO(null);
    setAttachmentLoadingIndex(null);
  }, []);

  const handleOpenAttachment = useCallback(async (poId, attachmentIndex) => {
    setAttachmentLoadingIndex(attachmentIndex);
    try {
      const response = await purchaseOrderService.getAttachmentUrl(poId, attachmentIndex);
      const url = response?.result?.url || response?.url;
      if (url) {
        window.open(url, "_blank");
      } else {
        toast.error("Failed to get attachment URL");
      }
    } catch (error) {
      console.error("Attachment open error:", error);
      toast.error(error?.response?.data?.message || "Failed to open attachment");
    } finally {
      setAttachmentLoadingIndex(null);
    }
  }, []);

  const handlePrintPO = useCallback(async (poId, e) => {
    if (e) e.stopPropagation();
    setPrintingId(poId);
    try {
      const { blob, filename } = await purchaseOrderService.getPurchaseOrderPdf(poId);
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          try {
            printWindow.print();
          } catch (_) {
            // PDF viewer may not support print() immediately; user can print from browser
          }
        };
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }
      toast.success("Purchase order PDF opened");
    } catch (error) {
      console.error("Print/PDF error:", error);
      toast.error(error?.response?.data?.message || "Failed to generate PDF");
    } finally {
      setPrintingId(null);
    }
  }, []);

  const columns = useMemo(
    () => [
      {
        field: "po_number",
        label: "PO Number",
        sortable: true,
        filterType: "text",
        filterKey: "po_number",
        defaultFilterOperator: "contains",
      },
      {
        field: "po_date",
        label: "PO Date",
        sortable: true,
        filterType: "date",
        filterKey: "po_date_from",
        filterKeyTo: "po_date_to",
        operatorKey: "po_date_op",
        defaultFilterOperator: "inRange",
      },
      {
        field: "due_date",
        label: "Due Date",
        sortable: true,
        filterType: "date",
        filterKey: "due_date_from",
        filterKeyTo: "due_date_to",
        operatorKey: "due_date_op",
        defaultFilterOperator: "inRange",
      },
      {
        field: "supplier",
        label: "Supplier",
        sortable: false,
        filterType: "text",
        filterKey: "supplier_name",
        defaultFilterOperator: "contains",
        render: (row) => row.supplier?.supplier_name || "-",
      },
      {
        field: "shipTo",
        label: "Warehouse",
        sortable: false,
        filterType: "text",
        filterKey: "ship_to_name",
        defaultFilterOperator: "contains",
        render: (row) => row.shipTo?.name || "-",
      },
      {
        field: "status",
        label: "Status",
        sortable: true,
        filterType: "select",
        filterKey: "status",
        filterOptions: STATUS_OPTIONS,
        render: (row) => {
          const status = row.status || "";
          const statusLower = status.toLowerCase();
          const variant = statusLower === "approved" ? "default" : statusLower === "draft" ? "secondary" : "outline";
          return (
            <Badge variant={variant} className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
              {status}
            </Badge>
          );
        },
      },
      {
        field: "grand_total",
        label: "Total",
        sortable: true,
        filterType: "number",
        filterKey: "grand_total",
        filterKeyTo: "grand_total_to",
        operatorKey: "grand_total_op",
        defaultFilterOperator: "equals",
        render: (row) => formatCurrency(row.grand_total),
      },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        isActionColumn: true,
        render: (row, reload, perms) => (
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => handleOpenSidebar(row.id)}
              title="View"
              aria-label="View"
            >
              <IconEye className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={(e) => handlePrintPO(row.id, e)}
              title="Print"
              aria-label="Print"
              disabled={printingId === row.id}
            >
              <IconPrinter className="size-4" />
            </Button>
            {row.status === "DRAFT" && perms?.can_update && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => router.push(`/purchase-orders/edit?id=${row.id}`)}
                title="Edit"
                aria-label="Edit"
              >
                <IconPencil className="size-4" />
              </Button>
            )}
            {row.status === "DRAFT" && perms?.can_delete && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setPoToDelete(row);
                  setShowDeleteDialog(true);
                }}
                title="Delete"
                aria-label="Delete"
              >
                <IconTrash className="size-4" />
              </Button>
            )}
            {row.status === "DRAFT" && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setPoToApprove(row);
                  setShowApproveDialog(true);
                }}
                title="Approve"
                aria-label="Approve"
              >
                <IconCircleCheck className="size-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [router, handleOpenSidebar, handlePrintPO, printingId]
  );

  const fetcher = useMemo(
    () => async (params) => {
      const {
        page: p,
        limit: l,
        q: searchQ,
        sortBy: sBy,
        sortOrder: sOrder,
        status: statusFilter,
        po_number: poNumber,
        po_number_op: poNumberOp,
        po_date_from: poDateFrom,
        po_date_to: poDateTo,
        po_date_op: poDateOp,
        due_date_from: dueDateFrom,
        due_date_to: dueDateTo,
        due_date_op: dueDateOp,
        supplier_name: supplierName,
        supplier_name_op: supplierNameOp,
        ship_to_name: shipToName,
        ship_to_name_op: shipToNameOp,
        grand_total: grandTotal,
        grand_total_op: grandTotalOp,
        grand_total_to: grandTotalTo,
      } = params;
      const response = await purchaseOrderService.getPurchaseOrders({
        page: p,
        limit: l,
        q: searchQ || undefined,
        status: statusFilter || undefined,
        sortBy: sBy || "created_at",
        sortOrder: sOrder || "DESC",
        po_number: poNumber || undefined,
        po_number_op: poNumberOp || undefined,
        po_date_from: poDateFrom || undefined,
        po_date_to: poDateTo || undefined,
        po_date_op: poDateOp || undefined,
        due_date_from: dueDateFrom || undefined,
        due_date_to: dueDateTo || undefined,
        due_date_op: dueDateOp || undefined,
        supplier_name: supplierName || undefined,
        supplier_name_op: supplierNameOp || undefined,
        ship_to_name: shipToName || undefined,
        ship_to_name_op: shipToNameOp || undefined,
        grand_total: grandTotal || undefined,
        grand_total_op: grandTotalOp || undefined,
        grand_total_to: grandTotalTo || undefined,
      });
      const result = response.result || response;
      return {
        data: result.data || [],
        meta: result.meta || { total: 0, page: p, pages: 0, limit: l },
      };
    },
    [tableKey]
  );

  const handleDeleteConfirm = async () => {
    if (!poToDelete) return;
    setDeleting(true);
    try {
      await purchaseOrderService.deletePurchaseOrder(poToDelete.id);
      setTableKey((prev) => prev + 1);
      setShowDeleteDialog(false);
      setPoToDelete(null);
      toast.success(`Purchase Order "${poToDelete.po_number}" deleted successfully`);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to delete purchase order");
    } finally {
      setDeleting(false);
    }
  };

  const handleApproveConfirm = async () => {
    if (!poToApprove) return;
    setApproving(true);
    try {
      await purchaseOrderService.approvePurchaseOrder(poToApprove.id);
      setTableKey((prev) => prev + 1);
      setShowApproveDialog(false);
      setPoToApprove(null);
      toast.success(`Purchase Order "${poToApprove.po_number}" approved successfully`);
    } catch (error) {
      console.error("Approve error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to approve purchase order");
    } finally {
      setApproving(false);
    }
  };

  const sidebarContent = useMemo(() => {
    if (loadingRecord) {
      return (
        <div className="flex min-h-[200px] items-center justify-center">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      );
    }
    if (!selectedPO) return null;

    const po = selectedPO;
    const statusVariant = po.status === "APPROVED" ? "default" : po.status === "DRAFT" ? "secondary" : "outline";
    const text = (value) => {
      if (value === null || value === undefined || value === "") return "-";
      return String(value);
    };

    const dateTime = (value) => {
      if (!value) return "-";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "-";
      return d.toLocaleString();
    };

    const attachmentFileName = (attachment) => {
      if (attachment?.filename) return attachment.filename;
      if (attachment?.path) {
        const split = String(attachment.path).split("/");
        return split[split.length - 1] || "attachment";
      }
      return "attachment";
    };

    return (
      <div className="pr-1 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-base">{text(po.po_number)}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              disabled={printingId === po.id}
              onClick={() => handlePrintPO(po.id)}
            >
              <IconPrinter className="size-4 mr-1" />
              {printingId === po.id ? "Generating..." : "Print"}
            </Button>
          </div>
          <Badge variant={statusVariant} className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
            {text(po.status)}
          </Badge>
          <p className="text-xs text-muted-foreground">
            PO Date: {formatDate(po.po_date)} · Due: {formatDate(po.due_date)}
          </p>
        </div>

        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Supplier</p>
          <p className="text-sm">{text(po.supplier?.supplier_name)}</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Code</span><span>{text(po.supplier?.supplier_code)}</span>
            <span className="text-muted-foreground">Contact</span><span>{text(po.supplier?.contact_person)}</span>
            <span className="text-muted-foreground">Phone</span><span>{text(po.supplier?.phone)}</span>
            <span className="text-muted-foreground">Email</span><span className="break-all">{text(po.supplier?.email)}</span>
            <span className="text-muted-foreground">GSTIN</span><span>{text(po.supplier?.gstin)}</span>
          </div>
        </div>

        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Bill To</p>
          <p className="text-sm">
            {text(po.billTo?.company_name)} {po.billTo?.company_code ? `(${po.billTo.company_code})` : ""}
          </p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Address</span><span>{text(po.billTo?.address)}</span>
            <span className="text-muted-foreground">City/State</span><span>{text([po.billTo?.city, po.billTo?.state].filter(Boolean).join(", "))}</span>
            <span className="text-muted-foreground">Contact</span><span>{text(po.billTo?.contact_number)}</span>
            <span className="text-muted-foreground">Email</span><span className="break-all">{text(po.billTo?.company_email)}</span>
          </div>
        </div>

        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Ship To</p>
          <p className="text-sm">{text(po.shipTo?.name)}</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Address</span><span>{text(po.shipTo?.address)}</span>
            <span className="text-muted-foreground">Contact</span><span>{text(po.shipTo?.contact_person)}</span>
            <span className="text-muted-foreground">Mobile</span><span>{text(po.shipTo?.mobile)}</span>
          </div>
        </div>

        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Terms & Notes</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Payment</span><span>{text(po.payment_terms)}</span>
            <span className="text-muted-foreground">Delivery</span><span>{text(po.delivery_terms)}</span>
            <span className="text-muted-foreground">Dispatch</span><span>{text(po.dispatch_terms)}</span>
            <span className="text-muted-foreground">Jurisdiction</span><span>{text(po.jurisdiction)}</span>
          </div>
          <div className="text-xs">
            <p className="text-muted-foreground">Remarks</p>
            <p className="text-sm">{text(po.remarks)}</p>
          </div>
        </div>

        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Financials</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Total Quantity</span><span>{text(po.total_quantity)}</span>
            <span className="text-muted-foreground">Taxable Amount</span><span>{formatCurrency(po.taxable_amount || 0)}</span>
            <span className="text-muted-foreground">Total GST</span><span>{formatCurrency(po.total_gst_amount || 0)}</span>
            <span className="text-muted-foreground">Grand Total</span><span className="font-semibold">{formatCurrency(po.grand_total || 0)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Amount in words</p>
          <p className="text-sm">{text(po.amount_in_words)}</p>
        </div>

        {po.items && po.items.length > 0 && (
          <div className="rounded-md border border-border overflow-hidden">
            <div className="px-3 py-2 bg-muted/40">
              <p className="text-xs font-semibold text-muted-foreground">Items ({po.items.length})</p>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold">Product</th>
                    <th className="px-2 py-1 text-right font-semibold">HSN</th>
                    <th className="px-2 py-1 text-right font-semibold">Rate</th>
                    <th className="px-2 py-1 text-right font-semibold">Ord</th>
                    <th className="px-2 py-1 text-right font-semibold">Rec</th>
                    <th className="px-2 py-1 text-right font-semibold">Ret</th>
                    <th className="px-2 py-1 text-right font-semibold">Rem</th>
                    <th className="px-2 py-1 text-right font-semibold">GST%</th>
                    <th className="px-2 py-1 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((item, index) => (
                    <tr key={item.id || index} className="border-t border-border">
                      <td className="px-2 py-1.5">{text(item.product?.product_name)}</td>
                      <td className="px-2 py-1.5 text-right">{text(item.hsn_code || item.product?.hsn_ssn_code)}</td>
                      <td className="px-2 py-1.5 text-right">{formatCurrency(item.rate || 0)}</td>
                      <td className="px-2 py-1.5 text-right">{text(item.order_qty ?? item.quantity)}</td>
                      <td className="px-2 py-1.5 text-right">{text(item.received_qty ?? item.received_quantity ?? 0)}</td>
                      <td className="px-2 py-1.5 text-right">{text(item.returned_qty ?? item.returned_quantity ?? 0)}</td>
                      <td className="px-2 py-1.5 text-right">{text(item.remaining_qty ?? 0)}</td>
                      <td className="px-2 py-1.5 text-right">{text(item.gst_percent)}</td>
                      <td className="px-2 py-1.5 text-right">{formatCurrency(item.amount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Attachments</p>
          {Array.isArray(po.attachments) && po.attachments.length > 0 ? (
            <div className="space-y-2">
              {po.attachments.map((attachment, index) => (
                <div key={`${attachment.path || attachment.filename || "att"}-${index}`} className="flex items-start justify-between gap-2 rounded border border-border p-2">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{attachmentFileName(attachment)}</p>
                    <p className="text-xs text-muted-foreground">
                      Size: {attachment?.size ? `${Math.round((attachment.size / 1024) * 100) / 100} KB` : "-"} · Uploaded: {dateTime(attachment?.uploaded_at)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={attachmentLoadingIndex === index}
                    loading={attachmentLoadingIndex === index}
                    onClick={() => handleOpenAttachment(po.id, index)}
                  >
                    <IconDownload className="size-4" />
                    Open
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No attachments</p>
          )}
        </div>

        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Audit</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Created By</span><span>{text(po.createdBy?.name || po.created_by)}</span>
            <span className="text-muted-foreground">Created At</span><span>{dateTime(po.created_at)}</span>
            <span className="text-muted-foreground">Approved By</span><span>{text(po.approvedBy?.name || po.approved_by)}</span>
            <span className="text-muted-foreground">Approved At</span><span>{dateTime(po.approved_at)}</span>
            <span className="text-muted-foreground">Updated At</span><span>{dateTime(po.updated_at)}</span>
          </div>
        </div>
      </div>
    );
  }, [loadingRecord, selectedPO, attachmentLoadingIndex, handleOpenAttachment, handlePrintPO, printingId]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Purchase Orders"
        addButtonLabel={currentPerm.can_create ? "Create PO" : undefined}
        onAddClick={currentPerm.can_create ? () => router.push("/purchase-orders/add") : undefined}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          moduleKey="purchase-orders"
          height="calc(100vh - 200px)"
          showSearch={false}
          showPagination={false}
          onTotalChange={setTotalCount}
          columnFilterValues={columnFilterValues}
          onColumnFilterChange={handleColumnFilterChange}
          filterParams={{
            q: undefined,
            status: filters.status || undefined,
            po_number: filters.po_number || undefined,
            po_number_op: filters.po_number_op || undefined,
            po_date_from: filters.po_date_from || undefined,
            po_date_to: filters.po_date_to || undefined,
            po_date_op: filters.po_date_op || undefined,
            due_date_from: filters.due_date_from || undefined,
            due_date_to: filters.due_date_to || undefined,
            due_date_op: filters.due_date_op || undefined,
            supplier_name: filters.supplier_name || undefined,
            supplier_name_op: filters.supplier_name_op || undefined,
            ship_to_name: filters.ship_to_name || undefined,
            ship_to_name_op: filters.ship_to_name_op || undefined,
            grand_total: filters.grand_total || undefined,
            grand_total_op: filters.grand_total_op || undefined,
            grand_total_to: filters.grand_total_to || undefined,
          }}
          onRowClick={(row) => handleOpenSidebar(row.id)}
          page={page}
          limit={limit}
          q={q}
          sortBy={sortBy}
          sortOrder={sortOrder}
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

      <DetailsSidebar
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        title="Purchase Order Details"
      >
        {sidebarContent}
      </DetailsSidebar>

      <Dialog open={showDeleteDialog} onOpenChange={(open) => { if (!open) { setShowDeleteDialog(false); setPoToDelete(null); } }}>
        <DialogContent className={DIALOG_FORM_SMALL}>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete Purchase Order <strong>&quot;{poToDelete?.po_number}&quot;</strong>?
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            This action cannot be undone. Only DRAFT purchase orders can be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setPoToDelete(null); }} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} loading={deleting} onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showApproveDialog} onOpenChange={(open) => { if (!open) { setShowApproveDialog(false); setPoToApprove(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve Purchase Order &quot;{poToApprove?.po_number}&quot;? Once approved, this purchase order cannot be edited or deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApproveConfirm} disabled={approving} loading={approving}>
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}
