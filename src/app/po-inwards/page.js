"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import poInwardService from "@/services/poInwardService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { IconCircleCheck, IconEye, IconPencil } from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate, formatCurrency } from "@/utils/dataTableUtils";

const COLUMN_FILTER_KEYS = [
  "po_number",
  "po_number_op",
  "supplier_name",
  "supplier_name_op",
  "warehouse_name",
  "warehouse_name_op",
  "supplier_invoice_number",
  "supplier_invoice_number_op",
  "status",
  "received_at_from",
  "received_at_to",
  "received_at_op",
  "total_received_quantity",
  "total_received_quantity_op",
  "total_received_quantity_to",
  "total_accepted_quantity",
  "total_accepted_quantity_op",
  "total_accepted_quantity_to",
];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "RECEIVED", label: "Received" },
];

export default function POInwardPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const router = useRouter();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } =
    listingState;

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [poInwardToApprove, setPoInwardToApprove] = useState(null);
  const [approving, setApproving] = useState(false);
  const [selectedPOInward, setSelectedPOInward] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [tableKey, setTableKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback(
    (key, value) => setFilter(key, value),
    [setFilter]
  );

  const handleOpenSidebar = useCallback(async (id) => {
    setLoadingRecord(true);
    try {
      const response = await poInwardService.getPOInwardById(id);
      const result = response?.result || response;
      setSelectedPOInward(result);
      setSidebarOpen(true);
    } catch (error) {
      console.error("Error fetching PO Inward:", error);
      toast.error("Failed to load PO Inward");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedPOInward(null);
  }, []);

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
      const blob = await poInwardService.exportPOInwards(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `po-inwards-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export PO Inwards");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const getStatusVariant = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "received") return "default";
    if (s === "draft") return "secondary";
    return "outline";
  };

  const columns = useMemo(
    () => [
      {
        field: "purchaseOrder",
        label: "PO Number",
        sortable: false,
        filterType: "text",
        filterKey: "po_number",
        defaultFilterOperator: "contains",
        render: (row) => row.purchaseOrder?.po_number || "-",
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
        field: "warehouse",
        label: "Warehouse",
        sortable: false,
        filterType: "text",
        filterKey: "warehouse_name",
        defaultFilterOperator: "contains",
        render: (row) => row.warehouse?.name || "-",
      },
      {
        field: "supplier_invoice_number",
        label: "Supplier Invoice",
        sortable: false,
        filterType: "text",
        filterKey: "supplier_invoice_number",
        defaultFilterOperator: "contains",
      },
      {
        field: "status",
        label: "Status",
        sortable: true,
        filterType: "select",
        filterKey: "status",
        filterOptions: STATUS_OPTIONS,
        render: (row) => (
          <Badge variant={getStatusVariant(row.status)} className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
            {row.status || "-"}
          </Badge>
        ),
      },
      {
        field: "total_received_quantity",
        label: "Received Qty",
        sortable: true,
        filterType: "number",
        filterKey: "total_received_quantity",
        filterKeyTo: "total_received_quantity_to",
        operatorKey: "total_received_quantity_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "total_accepted_quantity",
        label: "Accepted Qty",
        sortable: true,
        filterType: "number",
        filterKey: "total_accepted_quantity",
        filterKeyTo: "total_accepted_quantity_to",
        operatorKey: "total_accepted_quantity_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "received_at",
        label: "Received At",
        sortable: true,
        filterType: "date",
        filterKey: "received_at_from",
        filterKeyTo: "received_at_to",
        operatorKey: "received_at_op",
        defaultFilterOperator: "inRange",
        render: (row) => (row.received_at ? new Date(row.received_at).toLocaleString() : "-"),
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
            {row.status === "DRAFT" && perms?.can_update && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => router.push(`/po-inwards/edit?id=${row.id}`)}
                title="Edit"
                aria-label="Edit"
              >
                <IconPencil className="size-4" />
              </Button>
            )}
            {row.status === "DRAFT" && (
              <Button
                size="icon"
                variant="success"
                size="icon"
                onClick={() => {
                  setPoInwardToApprove(row);
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
    [handleOpenSidebar, router]
  );

  const fetcher = useMemo(
    () => async (params) => {
      const p = params || {};
      const response = await poInwardService.getPOInwards({
        page: p.page,
        limit: p.limit,
        q: p.q || undefined,
        status: p.status || undefined,
        sortBy: p.sortBy || "created_at",
        sortOrder: p.sortOrder || "DESC",
        supplier_invoice_number: p.supplier_invoice_number || undefined,
        received_at_from: p.received_at_from || undefined,
        received_at_to: p.received_at_to || undefined,
        po_number: p.po_number || undefined,
        supplier_name: p.supplier_name || undefined,
        warehouse_name: p.warehouse_name || undefined,
        total_received_quantity: p.total_received_quantity || undefined,
        total_received_quantity_op: p.total_received_quantity_op || undefined,
        total_received_quantity_to: p.total_received_quantity_to || undefined,
        total_accepted_quantity: p.total_accepted_quantity || undefined,
        total_accepted_quantity_op: p.total_accepted_quantity_op || undefined,
        total_accepted_quantity_to: p.total_accepted_quantity_to || undefined,
      });
      const result = response?.result || response;
      return {
        data: result?.data || [],
        meta: result?.meta || { total: 0, page: p.page, pages: 0, limit: p.limit },
      };
    },
    [tableKey]
  );

  const handleApproveConfirm = async () => {
    if (!poInwardToApprove) return;
    setApproving(true);
    try {
      await poInwardService.approvePOInward(poInwardToApprove.id);
      setTableKey((prev) => prev + 1);
      setShowApproveDialog(false);
      setPoInwardToApprove(null);
      toast.success("PO Inward approved successfully. Stock and inventory ledger have been updated.");
    } catch (error) {
      console.error("Approve error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to approve PO Inward");
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
    if (!selectedPOInward) return null;
    const p = selectedPOInward;
    const statusVariant = getStatusVariant(p.status);
    const txt = (v) => (v === null || v === undefined || v === "" ? "-" : String(v));
    const dt = (v) => (v ? new Date(v).toLocaleString() : "-");
    const qty = (v) => (v === null || v === undefined ? "-" : v);

    return (
      <div className="pr-1 space-y-4">
        <div className="space-y-1">
          <p className="font-semibold text-base">{txt(p.purchaseOrder?.po_number)}</p>
          <Badge variant={statusVariant} className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
            {txt(p.status)}
          </Badge>
          <p className="text-xs text-muted-foreground">
            PO Date: {formatDate(p.purchaseOrder?.po_date)} · Due: {formatDate(p.purchaseOrder?.due_date)}
          </p>
          <p className="text-xs text-muted-foreground">Received At: {dt(p.received_at)}</p>
        </div>

        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Supplier</p>
          <p className="text-sm">{txt(p.supplier?.supplier_name)}</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Code</span><span>{txt(p.supplier?.supplier_code)}</span>
            <span className="text-muted-foreground">GSTIN</span><span>{txt(p.supplier?.gstin)}</span>
          </div>
        </div>

        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Warehouse</p>
          <p className="text-sm">{txt(p.warehouse?.name)}</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Address</span><span>{txt(p.warehouse?.address)}</span>
          </div>
        </div>

        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Invoice & Receipt</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Invoice No</span><span>{txt(p.supplier_invoice_number)}</span>
            <span className="text-muted-foreground">Invoice Date</span><span>{formatDate(p.supplier_invoice_date)}</span>
            <span className="text-muted-foreground">Receipt Type</span><span>{txt(p.receipt_type)}</span>
            <span className="text-muted-foreground">Inspection</span><span>{p.inspection_required ? "Required" : "Not Required"}</span>
            <span className="text-muted-foreground">Received By</span><span>{txt(p.receivedBy?.name || p.received_by)}</span>
            <span className="text-muted-foreground">Receiver Email</span><span className="break-all">{txt(p.receivedBy?.email)}</span>
          </div>
          <div className="text-xs">
            <p className="text-muted-foreground">Remarks</p>
            <p className="text-sm">{txt(p.remarks)}</p>
          </div>
        </div>

        {Array.isArray(p.items) && p.items.length > 0 && (
          <div className="rounded-md border border-border overflow-hidden">
            <div className="px-3 py-2 bg-muted/40">
              <p className="text-xs font-semibold text-muted-foreground">Items ({p.items.length})</p>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold">Product</th>
                    <th className="px-2 py-1 text-right font-semibold">Ordered</th>
                    <th className="px-2 py-1 text-right font-semibold">Received</th>
                    <th className="px-2 py-1 text-right font-semibold">Accepted</th>
                    <th className="px-2 py-1 text-right font-semibold">Rejected</th>
                    <th className="px-2 py-1 text-right font-semibold">Rate</th>
                    <th className="px-2 py-1 text-right font-semibold">GST%</th>
                    <th className="px-2 py-1 text-right font-semibold">Taxable</th>
                    <th className="px-2 py-1 text-right font-semibold">Total</th>
                    <th className="px-2 py-1 text-left font-semibold">Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {p.items.map((item, index) => (
                    <tr key={item.id || index} className="border-t border-border">
                      <td className="px-2 py-1.5">{txt(item.product?.product_name)}</td>
                      <td className="px-2 py-1.5 text-right">{qty(item.ordered_quantity)}</td>
                      <td className="px-2 py-1.5 text-right">{qty(item.received_quantity)}</td>
                      <td className="px-2 py-1.5 text-right">{qty(item.accepted_quantity)}</td>
                      <td className="px-2 py-1.5 text-right">{qty(item.rejected_quantity)}</td>
                      <td className="px-2 py-1.5 text-right">{formatCurrency(item.rate || 0)}</td>
                      <td className="px-2 py-1.5 text-right">{txt(item.gst_percent)}</td>
                      <td className="px-2 py-1.5 text-right">{formatCurrency(item.taxable_amount || 0)}</td>
                      <td className="px-2 py-1.5 text-right">{formatCurrency(item.total_amount || 0)}</td>
                      <td className="px-2 py-1.5">
                        {txt(item.tracking_type)}
                        {Array.isArray(item.serials) && item.serials.length > 0 ? ` (${item.serials.length} serials)` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Receipt Totals</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Total Received</span><span className="font-semibold">{qty(p.total_received_quantity)}</span>
            <span className="text-muted-foreground">Total Accepted</span><span className="font-semibold">{qty(p.total_accepted_quantity)}</span>
            <span className="text-muted-foreground">Total Rejected</span><span className="font-semibold">{qty(p.total_rejected_quantity)}</span>
          </div>
        </div>

        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Audit</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">Inward ID</span><span>{txt(p.id)}</span>
            <span className="text-muted-foreground">Created At</span><span>{dt(p.created_at)}</span>
          </div>
        </div>
      </div>
    );
  }, [loadingRecord, selectedPOInward]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="PO Inwards (Goods Receipt)"
        addButtonLabel={currentPerm.can_create ? "Create Receipt" : undefined}
        onAddClick={currentPerm.can_create ? () => router.push("/po-inwards/add") : undefined}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          moduleKey="po-inwards"
          height="calc(100vh - 200px)"
          showSearch={false}
          showPagination={false}
          onTotalChange={setTotalCount}
          columnFilterValues={columnFilterValues}
          onColumnFilterChange={handleColumnFilterChange}
          filterParams={{ q: undefined, ...filterParams }}
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
        title="PO Inward Details"
      >
        {sidebarContent}
      </DetailsSidebar>

      <AlertDialog open={showApproveDialog} onOpenChange={(open) => { if (!open) { setShowApproveDialog(false); setPoInwardToApprove(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve PO Inward</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this PO Inward (Goods Receipt)? Stock and inventory ledger will be updated. This action cannot be undone.
              {poInwardToApprove && (
                <span className="mt-2 block text-muted-foreground">
                  PO: {poInwardToApprove.purchaseOrder?.po_number}. Warehouse: {poInwardToApprove.warehouse?.name}.
                </span>
              )}
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
