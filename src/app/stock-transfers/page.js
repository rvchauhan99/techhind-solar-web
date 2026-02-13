"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import stockTransferService from "@/services/stockTransferService";
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
import { formatDate } from "@/utils/dataTableUtils";

const COLUMN_FILTER_KEYS = [
  "transfer_number",
  "transfer_date_from",
  "transfer_date_to",
  "transfer_date_op",
  "status",
  "from_warehouse_name",
  "from_warehouse_name_op",
  "to_warehouse_name",
  "to_warehouse_name_op",
  "total_quantity",
  "total_quantity_op",
  "total_quantity_to",
];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "RECEIVED", label: "Received" },
];

export default function StockTransferPage() {
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
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [transferToApprove, setTransferToApprove] = useState(null);
  const [transferToReceive, setTransferToReceive] = useState(null);
  const [approving, setApproving] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
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
      const response = await stockTransferService.getStockTransferById(id);
      const result = response?.result || response;
      setSelectedTransfer(result);
      setSidebarOpen(true);
    } catch (error) {
      console.error("Error fetching stock transfer:", error);
      toast.error("Failed to load stock transfer");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedTransfer(null);
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      const blob = await stockTransferService.exportStockTransfers(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stock-transfers-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export stock transfers");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const getStatusVariant = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "received") return "default";
    if (s === "approved") return "secondary";
    if (s === "in_transit") return "outline";
    return "secondary";
  };

  const filterParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      ),
    [filters]
  );

  const columns = useMemo(
    () => [
      {
        field: "transfer_number",
        label: "Transfer Number",
        sortable: true,
        filterType: "text",
        filterKey: "transfer_number",
        defaultFilterOperator: "contains",
      },
      {
        field: "transfer_date",
        label: "Transfer Date",
        sortable: true,
        filterType: "date",
        filterKey: "transfer_date_from",
        filterKeyTo: "transfer_date_to",
        operatorKey: "transfer_date_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.transfer_date),
      },
      {
        field: "fromWarehouse",
        label: "From Warehouse",
        sortable: false,
        filterType: "text",
        filterKey: "from_warehouse_name",
        defaultFilterOperator: "contains",
        render: (row) => row.fromWarehouse?.name || "-",
      },
      {
        field: "toWarehouse",
        label: "To Warehouse",
        sortable: false,
        filterType: "text",
        filterKey: "to_warehouse_name",
        defaultFilterOperator: "contains",
        render: (row) => row.toWarehouse?.name || "-",
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
        field: "total_quantity",
        label: "Total Qty",
        sortable: true,
        filterType: "number",
        filterKey: "total_quantity",
        filterKeyTo: "total_quantity_to",
        operatorKey: "total_quantity_op",
        defaultFilterOperator: "equals",
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
                onClick={() => router.push(`/stock-transfers/edit?id=${row.id}`)}
                title="Edit"
                aria-label="Edit"
              >
                <IconPencil className="size-4" />
              </Button>
            )}
            {row.status === "DRAFT" && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => {
                  setTransferToApprove(row);
                  setShowApproveDialog(true);
                }}
                title="Approve"
                aria-label="Approve"
              >
                <IconCircleCheck className="size-4" />
              </Button>
            )}
            {row.status === "APPROVED" && (
              <Button
                size="icon"
                variant="success"
                size="icon"
                onClick={() => {
                  setTransferToReceive(row);
                  setShowReceiveDialog(true);
                }}
                title="Receive"
                aria-label="Receive"
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
      const {
        page: p,
        limit: l,
        q: searchQ,
        sortBy: sBy,
        sortOrder: sOrder,
        status: statusFilter,
        transfer_number: transferNumber,
        transfer_date_from: transferDateFrom,
        transfer_date_to: transferDateTo,
        from_warehouse_name: fromWarehouseName,
        to_warehouse_name: toWarehouseName,
      } = params || {};
      const response = await stockTransferService.getStockTransfers({
        page: p,
        limit: l,
        q: searchQ || undefined,
        status: statusFilter || undefined,
        sortBy: sBy || "id",
        sortOrder: sOrder || "DESC",
        transfer_number: transferNumber || undefined,
        transfer_date_from: transferDateFrom || undefined,
        transfer_date_to: transferDateTo || undefined,
        from_warehouse_name: fromWarehouseName || undefined,
        to_warehouse_name: toWarehouseName || undefined,
      });
      const result = response?.result || response;
      return {
        data: result?.data || [],
        meta: result?.meta || { total: 0, page: p, pages: 0, limit: l },
      };
    },
    [tableKey]
  );

  const handleApproveConfirm = async () => {
    if (!transferToApprove) return;
    setApproving(true);
    try {
      await stockTransferService.approveStockTransfer(transferToApprove.id);
      setTableKey((prev) => prev + 1);
      setShowApproveDialog(false);
      setTransferToApprove(null);
      toast.success("Stock transfer approved successfully. Stock quantities and inventory ledger have been updated.");
    } catch (error) {
      console.error("Approve error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to approve stock transfer");
    } finally {
      setApproving(false);
    }
  };

  const handleReceiveConfirm = async () => {
    if (!transferToReceive) return;
    setReceiving(true);
    try {
      await stockTransferService.receiveStockTransfer(transferToReceive.id);
      setTableKey((prev) => prev + 1);
      setShowReceiveDialog(false);
      setTransferToReceive(null);
      toast.success("Stock transfer marked as received successfully");
    } catch (error) {
      console.error("Receive error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to receive stock transfer");
    } finally {
      setReceiving(false);
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
    if (!selectedTransfer) return null;
    const t = selectedTransfer;
    const statusVariant = getStatusVariant(t.status);
    return (
      <div className="pr-1 space-y-3">
        <p className="font-semibold">{t.transfer_number}</p>
        <Badge variant={statusVariant} className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
          {t.status}
        </Badge>
        <p className="text-xs text-muted-foreground">Transfer Date: {formatDate(t.transfer_date)}</p>
        <hr className="border-border" />
        <p className="text-xs font-semibold text-muted-foreground">From</p>
        <p className="text-sm">{t.fromWarehouse?.name || "-"}</p>
        {t.fromWarehouse?.address && <p className="text-xs text-muted-foreground">{t.fromWarehouse.address}</p>}
        <p className="text-xs font-semibold text-muted-foreground mt-2 block">To</p>
        <p className="text-sm">{t.toWarehouse?.name || "-"}</p>
        {t.toWarehouse?.address && <p className="text-xs text-muted-foreground">{t.toWarehouse.address}</p>}
        {t.requestedBy && (
          <p className="text-xs text-muted-foreground">Requested by: {t.requestedBy?.name}</p>
        )}
        {t.approvedBy && (
          <p className="text-xs text-muted-foreground">Approved by: {t.approvedBy?.name}</p>
        )}
        {t.items && t.items.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-muted-foreground">Items ({t.items.length})</p>
            <div className="mt-1 overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">Product</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {t.items.map((item, index) => (
                    <tr key={item.id || index} className="border-t border-border">
                      <td className="px-2 py-1.5">{item.product?.product_name || "-"}</td>
                      <td className="px-2 py-1.5 text-right">{item.transfer_quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex justify-between rounded-md border border-border bg-muted/50 p-2 text-sm">
              <span>Total Quantity</span>
              <span className="font-semibold">{t.total_quantity ?? t.items.reduce((s, i) => s + (i.transfer_quantity || 0), 0)}</span>
            </div>
          </div>
        )}
        {t.remarks && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-muted-foreground">Remarks</p>
            <p className="text-sm">{t.remarks}</p>
          </div>
        )}
      </div>
    );
  }, [loadingRecord, selectedTransfer]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Stock Transfers"
        addButtonLabel={currentPerm.can_create ? "Create Transfer" : undefined}
        onAddClick={currentPerm.can_create ? () => router.push("/stock-transfers/add") : undefined}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          moduleKey="stock-transfers"
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
          sortBy={sortBy || "id"}
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
      </ListingPageContainer>

      <DetailsSidebar
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        title="Stock Transfer Details"
      >
        {sidebarContent}
      </DetailsSidebar>

      <AlertDialog open={showApproveDialog} onOpenChange={(open) => { if (!open) { setShowApproveDialog(false); setTransferToApprove(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Stock Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this stock transfer? Stock quantities in both warehouses and inventory ledger will be updated. This action cannot be undone.
              {transferToApprove && (
                <span className="mt-2 block text-muted-foreground">
                  Transfer: {transferToApprove.transfer_number}. From: {transferToApprove.fromWarehouse?.name} → To: {transferToApprove.toWarehouse?.name}.
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

      <AlertDialog open={showReceiveDialog} onOpenChange={(open) => { if (!open) { setShowReceiveDialog(false); setTransferToReceive(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Received</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this stock transfer as received? The stock has already been moved during approval.
              {transferToReceive && (
                <span className="mt-2 block text-muted-foreground">
                  Transfer: {transferToReceive.transfer_number}. From: {transferToReceive.fromWarehouse?.name} → To: {transferToReceive.toWarehouse?.name}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={receiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReceiveConfirm} disabled={receiving} loading={receiving}>
              Receive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}
