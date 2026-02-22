"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import stockAdjustmentService from "@/services/stockAdjustmentService";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  "adjustment_number",
  "adjustment_date_from",
  "adjustment_date_to",
  "adjustment_date_op",
  "warehouse_name",
  "warehouse_name_op",
  "adjustment_type",
  "status",
  "total_quantity",
  "total_quantity_op",
  "total_quantity_to",
  "reason",
  "reason_op",
];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
  { value: "POSTED", label: "Posted" },
];

const ADJUSTMENT_TYPE_OPTIONS = [
  { value: "FOUND", label: "Found" },
  { value: "DAMAGE", label: "Damage" },
  { value: "LOSS", label: "Loss" },
  { value: "AUDIT", label: "Audit" },
];

export default function StockAdjustmentPage() {
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
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [adjustmentToApprove, setAdjustmentToApprove] = useState(null);
  const [adjustmentToPost, setAdjustmentToPost] = useState(null);
  const [approving, setApproving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
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
      const response = await stockAdjustmentService.getStockAdjustmentById(id);
      const result = response?.result || response;
      setSelectedAdjustment(result);
      setSidebarOpen(true);
    } catch (error) {
      console.error("Error fetching stock adjustment:", error);
      toast.error("Failed to load stock adjustment");
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedAdjustment(null);
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
      const blob = await stockAdjustmentService.exportStockAdjustments(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stock-adjustments-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export stock adjustments");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const getStatusVariant = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "posted") return "default";
    if (s === "approved") return "secondary";
    return "outline";
  };

  const columns = useMemo(
    () => [
      {
        field: "adjustment_number",
        label: "Adjustment Number",
        sortable: true,
        filterType: "text",
        filterKey: "adjustment_number",
        defaultFilterOperator: "contains",
      },
      {
        field: "adjustment_date",
        label: "Adjustment Date",
        sortable: true,
        filterType: "date",
        filterKey: "adjustment_date_from",
        filterKeyTo: "adjustment_date_to",
        operatorKey: "adjustment_date_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.adjustment_date),
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
        field: "adjustment_type",
        label: "Type",
        sortable: true,
        filterType: "select",
        filterKey: "adjustment_type",
        filterOptions: ADJUSTMENT_TYPE_OPTIONS,
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
        field: "remarks",
        label: "Remarks",
        sortable: false,
        filterType: "text",
        filterKey: "reason",
        defaultFilterOperator: "contains",
        render: (row) => row.remarks || row.reason || "-",
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
                onClick={() => router.push(`/stock-adjustments/edit?id=${row.id}`)}
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
                  setAdjustmentToApprove(row);
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
                onClick={() => {
                  setAdjustmentToPost(row);
                  setShowPostDialog(true);
                }}
                title="Post"
                aria-label="Post"
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
      const response = await stockAdjustmentService.getStockAdjustments({
        page: p.page,
        limit: p.limit,
        q: p.q || undefined,
        status: p.status || undefined,
        adjustment_type: p.adjustment_type || undefined,
        sortBy: p.sortBy || "id",
        sortOrder: p.sortOrder || "DESC",
        adjustment_number: p.adjustment_number || undefined,
        adjustment_date_from: p.adjustment_date_from || undefined,
        adjustment_date_to: p.adjustment_date_to || undefined,
        warehouse_name: p.warehouse_name || undefined,
        total_quantity: p.total_quantity || undefined,
        total_quantity_op: p.total_quantity_op || undefined,
        total_quantity_to: p.total_quantity_to || undefined,
        reason: p.reason || undefined,
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
    if (!adjustmentToApprove) return;
    setApproving(true);
    try {
      await stockAdjustmentService.approveStockAdjustment(adjustmentToApprove.id);
      setTableKey((prev) => prev + 1);
      setShowApproveDialog(false);
      setAdjustmentToApprove(null);
      toast.success("Stock adjustment approved successfully");
    } catch (error) {
      console.error("Approve error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to approve stock adjustment");
    } finally {
      setApproving(false);
    }
  };

  const handlePostConfirm = async () => {
    if (!adjustmentToPost) return;
    setPosting(true);
    try {
      await stockAdjustmentService.postStockAdjustment(adjustmentToPost.id);
      setTableKey((prev) => prev + 1);
      setShowPostDialog(false);
      setAdjustmentToPost(null);
      toast.success("Stock adjustment posted successfully. Stock has been updated.");
    } catch (error) {
      console.error("Post error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to post stock adjustment");
    } finally {
      setPosting(false);
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
    if (!selectedAdjustment) return null;
    const a = selectedAdjustment;
    const statusVariant = getStatusVariant(a.status);
    return (
      <div className="pr-1 space-y-3">
        <p className="font-semibold">{a.adjustment_number}</p>
        <Badge variant={statusVariant} className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
          {a.status}
        </Badge>
        <p className="text-xs text-muted-foreground">Date: {formatDate(a.adjustment_date)}</p>
        <hr className="border-border" />
        <p className="text-xs font-semibold text-muted-foreground">Warehouse</p>
        <p className="text-sm">{a.warehouse?.name || "-"}</p>
        <p className="text-xs font-semibold text-muted-foreground mt-2 block">Type</p>
        <p className="text-sm">{a.adjustment_type || "-"}</p>
        {(a.remarks || a.reason) && (
          <p className="text-xs text-muted-foreground">Remarks: {a.remarks || a.reason}</p>
        )}
        {a.items && a.items.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-muted-foreground">Items ({a.items.length})</p>
            <div className="mt-1 overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">Product</th>
                    <th className="px-2 py-1.5 text-center font-semibold">Direction</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {a.items.map((item, index) => (
                    <tr key={item.id || index} className="border-t border-border">
                      <td className="px-2 py-1.5">{item.product?.product_name || "-"}</td>
                      <td className="px-2 py-1.5 text-center">
                        <Badge variant={item.adjustment_direction === "IN" ? "default" : "destructive"} className="text-xs">
                          {item.adjustment_direction}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5 text-right">{item.adjustment_quantity ?? item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex justify-between rounded-md border border-border bg-muted/50 p-2 text-sm">
              <span>Total Quantity</span>
              <span className="font-semibold">{a.total_quantity ?? a.items.reduce((s, i) => s + (i.adjustment_quantity ?? (i.quantity || 0)), 0)}</span>
            </div>
          </div>
        )}
      </div>
    );
  }, [loadingRecord, selectedAdjustment]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Stock Adjustments"
        addButtonLabel={currentPerm.can_create ? "Create Adjustment" : undefined}
        onAddClick={currentPerm.can_create ? () => router.push("/stock-adjustments/new") : undefined}
        exportButtonLabel="Export"
        onExportClick={handleExport}
        exportDisabled={exporting}
      >
        <PaginatedTable
          key={tableKey}
          columns={columns}
          fetcher={fetcher}
          moduleKey="stock-adjustments"
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
        title="Stock Adjustment Details"
      >
        {sidebarContent}
      </DetailsSidebar>

      <AlertDialog open={showApproveDialog} onOpenChange={(open) => { if (!open) { setShowApproveDialog(false); setAdjustmentToApprove(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Stock Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this stock adjustment?
              {adjustmentToApprove && (
                <span className="mt-2 block text-muted-foreground">
                  Adjustment: {adjustmentToApprove.adjustment_number}. Warehouse: {adjustmentToApprove.warehouse?.name}.
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

      <AlertDialog open={showPostDialog} onOpenChange={(open) => { if (!open) { setShowPostDialog(false); setAdjustmentToPost(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post Stock Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to post this stock adjustment? Stock and inventory ledger will be updated. This action cannot be undone.
              {adjustmentToPost && (
                <span className="mt-2 block text-muted-foreground">
                  Adjustment: {adjustmentToPost.adjustment_number}. Warehouse: {adjustmentToPost.warehouse?.name}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={posting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePostConfirm} disabled={posting} loading={posting}>
              Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}
