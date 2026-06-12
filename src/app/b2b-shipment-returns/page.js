"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
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
import b2bShipmentReturnService from "@/services/b2bShipmentReturnService";

const COLUMN_FILTER_KEYS = [
  "return_no",
  "return_no_op",
  "shipment_no",
  "shipment_no_op",
  "order_no",
  "order_no_op",
  "client_name",
  "client_name_op",
  "warehouse_name",
  "warehouse_name_op",
  "return_type",
  "status",
  "total_return_quantity",
  "total_return_quantity_op",
  "total_return_quantity_to",
  "return_date",
  "return_date_op",
  "return_date_to",
];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
];

const RETURN_TYPE_OPTIONS = [
  { value: "FULL", label: "Full" },
  { value: "PARTIAL", label: "Partial" },
];

const getStatusVariant = (status) => {
  if (status === "APPROVED") return "default";
  if (status === "DRAFT") return "secondary";
  return "outline";
};

const getTypeVariant = (type) => {
  if (type === "FULL") return "default";
  if (type === "PARTIAL") return "outline";
  return "secondary";
};

export default function B2bShipmentReturnsPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const router = useRouter();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
  };

  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, sortBy, sortOrder, filters, setPage, setLimit, setFilter, setSort } = listingState;

  const [tableKey, setTableKey] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [returnToApprove, setReturnToApprove] = useState(null);
  const [approving, setApproving] = useState(false);

  const columnFilterValues = useMemo(() => ({ ...filters }), [filters]);
  const handleColumnFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);

  const filterParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      ),
    [filters]
  );

  const effectiveSortBy = sortBy || "id";
  const effectiveSortOrder = sortOrder || "DESC";

  const handleOpenSidebar = useCallback(async (id) => {
    setSidebarOpen(true);
    setLoadingRecord(true);
    try {
      const res = await b2bShipmentReturnService.getB2bShipmentReturnById(id);
      setSelectedReturn(res?.result ?? res);
    } catch {
      toast.error("Failed to load return details");
      setSelectedReturn(null);
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedReturn(null);
  }, []);

  const columns = useMemo(
    () => [
      {
        field: "return_no",
        label: "Return #",
        sortable: true,
        filterType: "text",
        filterKey: "return_no",
        defaultFilterOperator: "contains",
        render: (row) => (
          <Button
            type="button"
            variant="link"
            className="text-sm p-0 h-auto text-left font-normal"
            onClick={() => handleOpenSidebar(row.id)}
          >
            {row.return_no || row.id}
          </Button>
        ),
      },
      {
        field: "shipment",
        label: "Shipment #",
        filterType: "text",
        filterKey: "shipment_no",
        defaultFilterOperator: "contains",
        render: (row) => row.shipment?.shipment_no || "-",
      },
      {
        field: "salesOrder",
        label: "Order #",
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
        field: "return_type",
        label: "Type",
        filterType: "select",
        filterKey: "return_type",
        filterOptions: RETURN_TYPE_OPTIONS,
        render: (row) => (
          <Badge variant={getTypeVariant(row.return_type)} className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
            {row.return_type || "-"}
          </Badge>
        ),
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
        field: "total_return_quantity",
        label: "Return Qty",
        sortable: true,
        filterType: "number",
        filterKey: "total_return_quantity",
        filterKeyTo: "total_return_quantity_to",
        operatorKey: "total_return_quantity_op",
        defaultFilterOperator: "equals",
      },
      {
        field: "return_date",
        label: "Return Date",
        sortable: true,
        filterType: "date",
        filterKey: "return_date",
        filterKeyTo: "return_date_to",
        operatorKey: "return_date_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.return_date),
      },
      {
        field: "actions",
        label: "Actions",
        isActionColumn: true,
        render: (row) => (
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="size-8" onClick={() => handleOpenSidebar(row.id)} title="View">
              <IconEye className="size-4" />
            </Button>
            {row.status === "DRAFT" && currentPerm.can_update && (
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => router.push(`/b2b-shipment-returns/edit?id=${row.id}`)}
                title="Edit"
              >
                <IconPencil className="size-4" />
              </Button>
            )}
            {row.status === "DRAFT" && currentPerm.can_update && (
              <Button
                size="icon"
                variant="success"
                className="size-8"
                onClick={() => {
                  setReturnToApprove(row);
                  setShowApproveDialog(true);
                }}
                title="Approve"
              >
                <IconCircleCheck className="size-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [handleOpenSidebar, router, currentPerm]
  );

  const fetcher = useCallback(
    async (params) => {
      const response = await b2bShipmentReturnService.getB2bShipmentReturns({
        ...params,
        ...filterParams,
        sortBy: params.sortBy || "id",
        sortOrder: params.sortOrder || "DESC",
      });
      const result = response?.result ?? response;
      return {
        data: result?.data ?? [],
        meta: result?.meta ?? { total: 0, page: params.page, pages: 0, limit: params.limit },
      };
    },
    [filterParams, tableKey]
  );

  const handleApproveConfirm = async () => {
    if (!returnToApprove) return;
    setApproving(true);
    try {
      await b2bShipmentReturnService.approveB2bShipmentReturn(returnToApprove.id);
      setTableKey((p) => p + 1);
      setShowApproveDialog(false);
      setReturnToApprove(null);
      setSidebarOpen(false);
      setSelectedReturn(null);
      toast.success("Return approved. Stock and inventory ledger updated.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to approve return");
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
    if (!selectedReturn) return null;
    const r = selectedReturn;
    const txt = (v) => (v === null || v === undefined || v === "" ? "-" : String(v));

    return (
      <div className="pr-1 space-y-3">
        <div className="space-y-1">
          <p className="font-semibold text-base">{txt(r.return_no)}</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={getStatusVariant(r.status)} className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
              {txt(r.status)}
            </Badge>
            <Badge variant={getTypeVariant(r.return_type)} className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
              {txt(r.return_type)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Return Date: {formatDate(r.return_date)}</p>
          <p className="text-xs text-muted-foreground">Return Qty: {r.total_return_quantity ?? 0}</p>
        </div>

        <div className="rounded-md border border-border p-2 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Shipment</p>
          <p className="text-sm">{txt(r.shipment?.shipment_no)}</p>
        </div>

        <div className="rounded-md border border-border p-2 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Order</p>
          <p className="text-sm">{txt(r.salesOrder?.order_no)}</p>
        </div>

        <div className="rounded-md border border-border p-2 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Client</p>
          <p className="text-sm">{txt(r.client?.client_name)}</p>
          {r.client?.client_code && (
            <p className="text-xs text-muted-foreground">Code: {txt(r.client.client_code)}</p>
          )}
        </div>

        <div className="rounded-md border border-border p-2 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Warehouse</p>
          <p className="text-sm">{txt(r.warehouse?.name)}</p>
        </div>

        <div className="rounded-md border border-border p-2 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Reason & Remarks</p>
          <p className="text-sm">{txt(r.reason_text)}</p>
          {r.remarks && <p className="text-xs text-muted-foreground">{txt(r.remarks)}</p>}
        </div>

        {Array.isArray(r.items) && r.items.length > 0 && (
          <div className="rounded-md border border-border overflow-hidden">
            <div className="px-2 py-1 bg-muted/40">
              <p className="text-xs font-semibold text-muted-foreground">Items ({r.items.length})</p>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold">Product</th>
                  <th className="px-2 py-1 text-right font-semibold">Qty</th>
                </tr>
              </thead>
              <tbody>
                {r.items.map((it) => (
                  <tr key={it.id} className="border-t border-border">
                    <td className="px-2 py-1">{it.product?.product_name || it.product_id}</td>
                    <td className="px-2 py-1 text-right">{it.return_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {r.status === "DRAFT" && currentPerm.can_update && (
          <div className="flex flex-col gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => router.push(`/b2b-shipment-returns/edit?id=${r.id}`)}>
              Edit Draft
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setReturnToApprove(r);
                setShowApproveDialog(true);
              }}
            >
              Approve Return
            </Button>
          </div>
        )}
      </div>
    );
  }, [selectedReturn, loadingRecord, currentPerm, router]);

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="B2B Shipment Returns"
        addButtonLabel={currentPerm.can_create ? "New Return" : undefined}
        onAddClick={currentPerm.can_create ? () => router.push("/b2b-shipment-returns/add") : undefined}
      >
        <div className="flex flex-col flex-1 min-h-0 gap-2">
          <PaginatedTable
            key={tableKey}
            columns={columns}
            fetcher={fetcher}
            moduleKey="b2b-shipment-returns"
            showSearch={false}
            showPagination={false}
            height="calc(100vh - 200px)"
            onTotalChange={setTotalCount}
            columnFilterValues={columnFilterValues}
            onColumnFilterChange={handleColumnFilterChange}
            filterParams={filterParams}
            onRowClick={(row) => handleOpenSidebar(row.id)}
            page={page}
            limit={limit}
            sortBy={effectiveSortBy}
            sortOrder={effectiveSortOrder}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            onRowsPerPageChange={setLimit}
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
        </div>

        <DetailsSidebar open={sidebarOpen} onClose={handleCloseSidebar} title="Return Details">
          {sidebarContent}
        </DetailsSidebar>

        <AlertDialog open={showApproveDialog} onOpenChange={(open) => !open && setShowApproveDialog(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Shipment Return</AlertDialogTitle>
              <AlertDialogDescription>
                This will credit stock back to the warehouse and post inventory ledger IN entries. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={approving}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleApproveConfirm} disabled={approving}>
                {approving ? "Approving…" : "Approve"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
