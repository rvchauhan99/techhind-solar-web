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
import { IconCircleCheck, IconEye, IconPencil, IconFileSpreadsheet, IconDownload } from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate, formatCurrency } from "@/utils/dataTableUtils";

const COLUMN_FILTER_KEYS = [
  "receipt_number",
  "receipt_number_op",
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

  const [selectedPOInward, setSelectedPOInward] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [tableKey, setTableKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [detailExporting, setDetailExporting] = useState(false);
  const [attachmentLoadingKey, setAttachmentLoadingKey] = useState(null);

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
    setAttachmentLoadingKey(null);
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

  const handleDetailExport = useCallback(async () => {
    const id = selectedPOInward?.id;
    if (!id) return;
    setDetailExporting(true);
    try {
      const { blob, filename } = await poInwardService.exportPOInwardById(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Detail export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export PO Inward");
    } finally {
      setDetailExporting(false);
    }
  }, [selectedPOInward?.id]);

  const detailHeaderActions = useMemo(() => {
    if (!selectedPOInward?.id) return null;
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={detailExporting}
        onClick={handleDetailExport}
      >
        <IconFileSpreadsheet className="size-4 mr-1" />
        {detailExporting ? "Exporting…" : "Export Excel"}
      </Button>
    );
  }, [selectedPOInward?.id, detailExporting, handleDetailExport]);

  // Default listing: newest first (id DESC) — same as other listing pages.
  const effectiveSortBy = sortBy || "id";
  const effectiveSortOrder = sortOrder || "DESC";

  const getStatusVariant = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "received") return "default";
    if (s === "draft") return "secondary";
    return "outline";
  };

  const handleOpenAttachment = useCallback(async (inwardId, attachmentIndex) => {
    const key = `${inwardId}:${attachmentIndex}`;
    setAttachmentLoadingKey(key);
    try {
      const response = await poInwardService.getAttachmentUrl(inwardId, attachmentIndex);
      const url = response?.result?.url || response?.url;
      if (url) window.open(url, "_blank");
      else toast.error("Failed to get attachment URL");
    } catch (error) {
      console.error("Attachment open error:", error);
      toast.error(error?.response?.data?.message || "Failed to open attachment");
    } finally {
      setAttachmentLoadingKey(null);
    }
  }, []);

  const columns = useMemo(
    () => [
      {
        field: "receipt_number",
        label: "Receipt #",
        sortable: false,
        filterType: "text",
        filterKey: "receipt_number",
        defaultFilterOperator: "contains",
        render: (row) => row.receipt_number || "-",
      },
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
        render: (row) => (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate">{row.supplier?.supplier_name || "-"}</span>
            {row.is_import ? <Badge variant="accent" className="shrink-0">Import</Badge> : null}
          </div>
        ),
      },
      {
        field: "currency_code",
        label: "Currency",
        sortable: false,
        render: (row) => row.currency_code || "INR",
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
        render: (row) => formatDate(row.received_at),
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
            {row.status === "DRAFT" &&
              (!row.is_import || row.can_approve_import) && (
              <Button
                size="icon"
                variant="success"
                onClick={() => router.push(`/po-inwards/approve?id=${row.id}`)}
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
        sortBy: p.sortBy || "id",
        sortOrder: p.sortOrder || "DESC",
        supplier_invoice_number: p.supplier_invoice_number || undefined,
        received_at_from: p.received_at_from || undefined,
        received_at_to: p.received_at_to || undefined,
        po_number: p.po_number || undefined,
        supplier_name: p.supplier_name || undefined,
        warehouse_name: p.warehouse_name || undefined,
        receipt_number: p.receipt_number || undefined,
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
    const isImport = !!p.is_import;
    const txt = (v) => (v == null || v === "" ? "-" : String(v));
    const qty = (v) => (v == null || v === "" ? "-" : String(v));
    const dt = (v) => (v ? formatDate(v) : "-");

    return (
      <div className="space-y-3 p-1">
        <div className="rounded-md border border-border p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">{txt(p.receipt_number)}</p>
            <Badge variant={statusVariant}>{txt(p.status)}</Badge>
            {isImport ? <Badge variant="accent">Import</Badge> : null}
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground">PO Number</span><span>{txt(p.purchaseOrder?.po_number)}</span>
            <span className="text-muted-foreground">Supplier</span><span>{txt(p.supplier?.supplier_name)}</span>
            <span className="text-muted-foreground">Warehouse</span><span>{txt(p.warehouse?.name)}</span>
            <span className="text-muted-foreground">Received At</span><span>{dt(p.received_at)}</span>
            <span className="text-muted-foreground">Supplier Invoice</span><span>{txt(p.supplier_invoice_number)}</span>
            {isImport ? (
              <>
                <span className="text-muted-foreground">Currency</span><span>{txt(p.currency_code)}</span>
                <span className="text-muted-foreground">Exchange Rate</span><span>{txt(p.exchange_rate)}</span>
                <span className="text-muted-foreground">BOE No.</span><span>{txt(p.bill_of_entry_number)}</span>
                <span className="text-muted-foreground">BOE Date</span><span>{dt(p.bill_of_entry_date)}</span>
                <span className="text-muted-foreground">Container</span><span>{txt(p.container_number)}</span>
                <span className="text-muted-foreground">BL / AWB</span>
                <span>{[p.bill_of_lading, p.air_way_bill].filter(Boolean).join(" / ") || "-"}</span>
              </>
            ) : null}
          </div>
          <div className="text-xs">
            <p className="text-muted-foreground">Remarks</p>
            <p className="text-sm">{txt(p.remarks)}</p>
          </div>
        </div>

        {isImport && Array.isArray(p.charges) && p.charges.some((c) => Number(c.amount_inr) > 0) && (
          <div className="rounded-md border border-border p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Import Charges (INR)</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
              {p.charges.filter((c) => Number(c.amount_inr) > 0).map((c) => (
                <span key={`l-${c.charge_type || c.id}`} className="text-muted-foreground col-span-1 contents">
                  <span className="text-muted-foreground">
                    {c.charge_type}{c.inventoriable === false ? " (ITC)" : ""}
                  </span>
                  <span>{formatCurrency(c.amount_inr)}</span>
                </span>
              ))}
              <span className="text-muted-foreground">Inventoriable total</span>
              <span>{formatCurrency(p.inventoriable_charges_inr || 0)}</span>
              <span className="text-muted-foreground">ITC (non-inventoriable)</span>
              <span>{formatCurrency(p.non_inventoriable_charges_inr || 0)}</span>
              <span className="text-muted-foreground font-semibold">Landed total</span>
              <span className="font-semibold">{formatCurrency(p.landed_total_inr || 0)}</span>
            </div>
          </div>
        )}

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
                    <th className="px-2 py-1 text-left font-semibold">UOM</th>
                    <th className="px-2 py-1 text-right font-semibold">Accepted</th>
                    <th className="px-2 py-1 text-right font-semibold">{isImport ? "PO INR" : "Rate"}</th>
                    {isImport ? <th className="px-2 py-1 text-right font-semibold">Allocated</th> : null}
                    {isImport ? <th className="px-2 py-1 text-right font-semibold">Landed</th> : null}
                    {!isImport ? <th className="px-2 py-1 text-right font-semibold">GST%</th> : null}
                    <th className="px-2 py-1 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {p.items.map((item, index) => (
                    <tr key={item.id || index} className="border-t border-border">
                      <td className="px-2 py-1.5">{txt(item.product?.product_name)}</td>
                      <td className="px-2 py-1.5">{txt(item.product?.measurementUnit?.unit || "—")}</td>
                      <td className="px-2 py-1.5 text-right">{qty(item.accepted_quantity)}</td>
                      <td className="px-2 py-1.5 text-right">{formatCurrency((item.rate_inr_po ?? item.rate) || 0)}</td>
                      {isImport ? (
                        <td className="px-2 py-1.5 text-right">{formatCurrency(item.allocated_charges_inr || 0)}</td>
                      ) : null}
                      {isImport ? (
                        <td className="px-2 py-1.5 text-right">{formatCurrency((item.landed_unit_inr ?? item.rate) || 0)}</td>
                      ) : null}
                      {!isImport ? (
                        <td className="px-2 py-1.5 text-right">{txt(item.gst_percent)}</td>
                      ) : null}
                      <td className="px-2 py-1.5 text-right">{formatCurrency(item.total_amount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Attachments</p>
          {Array.isArray(p.attachments) && p.attachments.length > 0 ? (
            <div className="space-y-2">
              {p.attachments.map((attachment, index) => {
                const loadingKey = `${p.id}:${index}`;
                return (
                  <div
                    key={`${attachment.path || attachment.filename || "att"}-${index}`}
                    className="flex items-start justify-between gap-2 rounded border border-border p-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm truncate">{attachment.filename || attachment.path || `File ${index + 1}`}</p>
                      <p className="text-xs text-muted-foreground">
                        Size: {attachment?.size ? `${Math.round((attachment.size / 1024) * 100) / 100} KB` : "-"}
                        {attachment?.uploaded_at ? ` · ${dt(attachment.uploaded_at)}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={attachmentLoadingKey === loadingKey}
                      onClick={() => handleOpenAttachment(p.id, index)}
                    >
                      <IconDownload className="size-4" />
                      Open
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No attachments</p>
          )}
        </div>

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
            <span className="text-muted-foreground">Posted At</span><span>{dt(p.posted_at)}</span>
            <span className="text-muted-foreground">Created At</span><span>{dt(p.created_at)}</span>
          </div>
        </div>
      </div>
    );
  }, [loadingRecord, selectedPOInward, attachmentLoadingKey, handleOpenAttachment]);

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
          sortBy={effectiveSortBy}
          sortOrder={effectiveSortOrder}
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
        headerActions={detailHeaderActions}
      >
        {sidebarContent}
      </DetailsSidebar>
    </ProtectedRoute>
  );
}
