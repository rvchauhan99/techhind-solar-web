"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconDotsVertical,
  IconEdit,
  IconCircleCheck,
  IconCurrencyRupee,
  IconMessageCircle,
  IconUpload,
  IconFileDescription,
  IconHome,
  IconDownload,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import PaginatedTable from "@/components/common/PaginatedTable";
import PaginationControls from "@/components/common/PaginationControls";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import QuotationDetailsDrawer from "@/components/common/QuotationDetailsDrawer";
import Container from "@/components/container";
import orderService from "@/services/orderService";
import productService from "@/services/productService";
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { useListingQueryState } from "@/hooks/useListingQueryState";
import { formatDate } from "@/utils/dataTableUtils";
import { ORDER_LINK_CLASS } from "@/utils/orderLinkStyles";
import { toastError } from "@/utils/toast";

const statusVariantMap = {
  pending: "secondary",
  approved: "default",
  in_progress: "default",
  completed: "default",
  cancelled: "destructive",
};

const COLUMN_FILTER_KEYS = [
  "order_number",
  "order_number_op",
  "status",
  "order_date_from",
  "order_date_to",
  "order_date_op",
  "customer_name",
  "customer_name_op",
  "project_scheme_id",
  "capacity",
  "capacity_op",
  "capacity_to",
  "project_cost",
  "project_cost_op",
  "project_cost_to",
  "solar_panel_id",
  "inverter_id",
];

async function searchProductsByTypeCi(q, productTypeCi) {
  const res = await productService.getProducts({
    q: q?.trim() ? q.trim() : undefined,
    limit: 30,
    product_type_ci: productTypeCi,
    visibility: "active",
  });
  const payload = res?.result ?? res?.data ?? res;
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.map((row) => ({
    id: row.id,
    name: row.product_name,
    label: row.product_name,
    product_name: row.product_name,
  }));
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function ListView({
  title = "Pending Orders",
  defaultStatus = "pending",
  exportButtonLabel,
  onExportClick,
  exportDisabled = false,
  showHomeButton = false,
  onHomeClick,
}) {
  const router = useRouter();
  const listingState = useListingQueryState({
    defaultLimit: 20,
    filterKeys: COLUMN_FILTER_KEYS,
  });
  const { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilter, setSort } = listingState;

  const [totalCount, setTotalCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [quotationDrawerOpen, setQuotationDrawerOpen] = useState(false);
  const [selectedQuotationOrder, setSelectedQuotationOrder] = useState(null);
  const [projectSchemeOptions, setProjectSchemeOptions] = useState([]);
  const [loadingProjectSchemes, setLoadingProjectSchemes] = useState(false);

  const columnFilterValues = useMemo(() => ({ ...filters, status: filters.status || defaultStatus }), [filters, defaultStatus]);
  const handleColumnFilterChange = useCallback((key, value) => setFilter(key, value), [setFilter]);

  const getStatusVariant = (status) => statusVariantMap[status] || "secondary";

  const filterParams = useMemo(() => {
    const entries = Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "");
    const obj = Object.fromEntries(entries);
    if (!obj.status) obj.status = defaultStatus;
    return { q: undefined, ...obj };
  }, [filters, defaultStatus]);

  useEffect(() => {
    let mounted = true;
    setLoadingProjectSchemes(true);
    getReferenceOptionsSearch("project_scheme.model", { q: "", limit: 1000 })
      .then((rows) => {
        if (!mounted) return;
        const list = Array.isArray(rows) ? rows : [];
        setProjectSchemeOptions(
          list
            .map((o) => ({
              value: o?.id != null ? String(o.id) : (o?.value != null ? String(o.value) : ""),
              label: o?.name ?? o?.label ?? o?.value ?? (o?.id != null ? String(o.id) : ""),
            }))
            .filter((o) => o.value !== "")
        );
      })
      .catch(() => {
        if (!mounted) return;
        setProjectSchemeOptions([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingProjectSchemes(false);
      });
    return () => { mounted = false; };
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null && String(v).trim() !== "")
      );
      if (!exportParams.status) exportParams.status = defaultStatus;
      const blob = await orderService.exportOrders(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export orders");
    } finally {
      setExporting(false);
    }
  }, [filters, defaultStatus]);

  const fetcher = useMemo(
    () => async (params) => {
      const response = await orderService.getOrders(params);
      const result = response?.result ?? response;
      return {
        data: result?.data ?? [],
        meta: result?.meta ?? { total: 0, page: params.page, pages: 0, limit: params.limit },
      };
    },
    []
  );

  const handleOpenSidebar = useCallback((row) => {
    setSelectedRecord(row);
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedRecord(null);
  }, []);

  const handlePrintOrder = useCallback(async (resolvedOrder) => {
    try {
      const file = await orderService.downloadOrderPDF(resolvedOrder?.id);
      const blob = file?.blob || file;
      const filename = file?.filename || `order-${resolvedOrder?.order_number || resolvedOrder?.id}.pdf`;
      if (!blob) throw new Error("PDF download failed");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to download order PDF";
      toastError(msg);
    }
  }, []);

  const handleOpenQuotationDrawer = useCallback((row) => {
    if (!row?.id) return;
    setSelectedQuotationOrder(row);
    setQuotationDrawerOpen(true);
  }, []);

  const columns = useMemo(
    () => [
      {
        field: "pui_number",
        label: "PUI",
        sortable: true,
        filterType: "text",
        filterKey: "order_number",
        defaultFilterOperator: "contains",
        render: (row) => (
          <Button
            type="button"
            variant="link"
            className={`${ORDER_LINK_CLASS} p-0 h-auto text-left font-semibold`}
            onClick={() => router.push(`/order/view?id=${row.id}`)}
          >
            {row.pui_number || "-"}
          </Button>
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
          <Badge variant={getStatusVariant(row.status)} className="text-xs">
            {row.status || "pending"}
          </Badge>
        ),
      },
      {
        field: "order_date",
        label: "Order Date",
        sortable: true,
        filterType: "date",
        filterKey: "order_date_from",
        filterKeyTo: "order_date_to",
        operatorKey: "order_date_op",
        defaultFilterOperator: "inRange",
        render: (row) => formatDate(row.order_date) || "-",
      },
      {
        field: "capacity",
        label: "Capacity",
        sortable: true,
        filterType: "number",
        filterKey: "capacity",
        filterKeyTo: "capacity_to",
        operatorKey: "capacity_op",
        defaultFilterOperator: "equals",
        render: (row) => (row.capacity != null ? `${row.capacity} kW` : "-"),
      },
      {
        field: "project_scheme_name",
        label: "Project Scheme",
        filterType: "select",
        filterKey: "project_scheme_id",
        filterOptions: projectSchemeOptions,
        render: (row) => row.project_scheme_name || "-",
      },
      {
        field: "customer_name",
        label: "Name",
        filterType: "text",
        filterKey: "customer_name",
        defaultFilterOperator: "contains",
        render: (row) => row.customer_name || "-",
      },
      { field: "mobile_number", label: "Mobile", render: (row) => row.mobile_number || "-" },
      { field: "loan_type_name", label: "Loan Type", render: (row) => row.loan_type_name || "-" },
      { field: "address", label: "Address", render: (row) => row.address || "-" },
      { field: "state_name", label: "State", render: (row) => row.state_name || "-" },
      { field: "solar_panel_name", label: "Solar Panel", render: (row) => row.solar_panel_name || "-" },
      { field: "inverter_name", label: "Inverter", render: (row) => row.inverter_name || "-" },
      { field: "consumer_no", label: "Consumer No", render: (row) => row.consumer_no || "-" },
      { field: "discom_name", label: "Discom", render: (row) => row.discom_name || "-" },
      { field: "company_name", label: "Company", render: (row) => row.company_name || "-" },
      { field: "phone_no", label: "Phone No", render: (row) => row.phone_no || "-" },
      { field: "reference_from", label: "Reference", render: (row) => row.reference_from || "-" },
      { field: "handled_by_name", label: "Handled By", render: (row) => row.handled_by_name || "-" },
      { field: "channel_partner_name", label: "Channel Partner", render: (row) => row.channel_partner_name || "-" },
      { field: "inquiry_by_name", label: "Inquiry By", render: (row) => row.inquiry_by_name || "-" },
      {
        field: "project_cost",
        label: "Total Payable",
        sortable: true,
        filterType: "number",
        filterKey: "project_cost",
        filterKeyTo: "project_cost_to",
        operatorKey: "project_cost_op",
        defaultFilterOperator: "equals",
        render: (row) =>
          row.project_cost != null ? `₹${Number(row.project_cost).toLocaleString()}` : "-",
      },
      { field: "branch_name", label: "Branch", render: (row) => row.branch_name || "-" },
      { field: "order_remarks", label: "Last Remarks", render: (row) => row.order_remarks || "-" },
      { field: "inquiry_source_name", label: "Source", render: (row) => row.inquiry_source_name || "-" },
      {
        field: "actions",
        label: "Actions",
        sortable: false,
        isActionColumn: true,
        render: (row) => (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => handleOpenSidebar(row)}
              title="View details"
              aria-label="View details"
            >
              <IconFileDescription className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-green-600"
              title="Registration"
              onClick={() => router.push(`/order/view?id=${row.id}&tab=0`)}
            >
              <IconCircleCheck className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              title="Payments"
              onClick={() => router.push(`/order/view?id=${row.id}&tab=2`)}
            >
              <IconCurrencyRupee className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              title="Quotation Details"
              onClick={() => handleOpenQuotationDrawer(row)}
            >
              <IconDownload className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground h-8 w-8 shrink-0">
                <IconDotsVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/order/view?id=${row.id}&tab=4`)}>
                  <IconMessageCircle className="size-4 mr-2" />
                  Remarks
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/order/view?id=${row.id}&tab=5`)}>
                  <IconUpload className="size-4 mr-2" />
                  Upload Documents
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/order/edit?id=${row.id}`)}>
                  <IconEdit className="size-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [handleOpenSidebar, handleOpenQuotationDrawer, router, getStatusVariant]
  );

  const tableHeight = "calc(100vh - 150px)";

  return (
    <Container className="flex flex-col gap-2 py-2 h-full min-h-0 max-w-[1536px] mx-auto">
      <div className="flex justify-between items-center flex-shrink-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex gap-2">
          {exportButtonLabel && (
            <Button
              onClick={handleExport}
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={exportDisabled || exporting}
              loading={exporting}
            >
              <IconDownload className="size-4" />
              {exportButtonLabel}
            </Button>
          )}
          {showHomeButton && onHomeClick && (
            <Button onClick={onHomeClick} size="sm" variant="outline" className="gap-1.5">
              <IconHome className="size-4" />
              Home
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 shrink-0">
        <div className="w-full sm:w-[min(100%,220px)]">
          <AutocompleteField
            usePortal
            name="solar_panel_id"
            label="Solar panel"
            variant="minimal"
            asyncLoadOptions={(q) => searchProductsByTypeCi(q, "panel")}
            getOptionLabel={(o) => o?.product_name ?? o?.label ?? o?.name ?? ""}
            resolveOptionById={async (id) => {
              try {
                const res = await productService.getProductById(id);
                const p = res?.result ?? res?.data ?? res;
                if (!p?.id) return null;
                return { id: p.id, product_name: p.product_name, label: p.product_name };
              } catch {
                return null;
              }
            }}
            value={filters.solar_panel_id ? { id: filters.solar_panel_id } : null}
            onChange={(e, newValue) =>
              handleColumnFilterChange(
                "solar_panel_id",
                newValue?.id != null ? String(newValue.id) : ""
              )
            }
            placeholder="Panel product…"
          />
        </div>
        <div className="w-full sm:w-[min(100%,220px)]">
          <AutocompleteField
            usePortal
            name="inverter_id"
            label="Inverter"
            variant="minimal"
            asyncLoadOptions={(q) => searchProductsByTypeCi(q, "inverter")}
            getOptionLabel={(o) => o?.product_name ?? o?.label ?? o?.name ?? ""}
            resolveOptionById={async (id) => {
              try {
                const res = await productService.getProductById(id);
                const p = res?.result ?? res?.data ?? res;
                if (!p?.id) return null;
                return { id: p.id, product_name: p.product_name, label: p.product_name };
              } catch {
                return null;
              }
            }}
            value={filters.inverter_id ? { id: filters.inverter_id } : null}
            onChange={(e, newValue) =>
              handleColumnFilterChange(
                "inverter_id",
                newValue?.id != null ? String(newValue.id) : ""
              )
            }
            placeholder="Inverter…"
          />
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 gap-2">
        <PaginatedTable
          columns={columns}
          fetcher={fetcher}
          showSearch={false}
          showPagination={false}
          height={tableHeight}
          onTotalChange={setTotalCount}
          columnFilterValues={columnFilterValues}
          onColumnFilterChange={handleColumnFilterChange}
          filterParams={filterParams}
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
      </div>

      <OrderDetailsDrawer
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        order={selectedRecord}
        onPrint={handlePrintOrder}
        showPrint
        showDeliverySnapshot
      />
      <QuotationDetailsDrawer
        open={quotationDrawerOpen}
        onClose={() => {
          setQuotationDrawerOpen(false);
          setSelectedQuotationOrder(null);
        }}
        orderId={selectedQuotationOrder?.id}
        quotationId={selectedQuotationOrder?.quotation_id}
      />
    </Container>
  );
}
