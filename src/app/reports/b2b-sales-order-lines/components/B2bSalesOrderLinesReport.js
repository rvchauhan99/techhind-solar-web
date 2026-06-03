"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconAlertTriangle,
  IconChartBar,
  IconCircleCheck,
  IconClock,
  IconCurrencyRupee,
  IconDownload,
  IconFileTypePdf,
  IconPackage,
  IconPencil,
  IconTruck,
  IconX,
} from "@tabler/icons-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import DetailsSidebar from "@/components/common/DetailsSidebar";
import PaginatedTable from "@/components/common/PaginatedTable";
import b2bSalesOrderLinesReportService from "@/services/b2bSalesOrderLinesReportService";
import b2bSalesOrderService from "@/services/b2bSalesOrderService";
import B2bSalesOrderDetailsContent from "@/app/b2b-sales-orders/components/B2bSalesOrderDetailsContent";
import { useAuth } from "@/hooks/useAuth";
import { toastError } from "@/utils/toast";
import { formatInrCompact, formatInrFull } from "@/utils/currencyFormatters";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];
const TOOLTIP_STYLE = { borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgb(0 0 0 / 0.12)", fontSize: 11 };

const STATUS_BADGE = {
  DRAFT: "bg-slate-50 text-slate-600 border-slate-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL_SHIPPED: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
  PENDING: "bg-slate-50 text-slate-600 border-slate-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_LABEL = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  PARTIAL_SHIPPED: "Partial Shipped",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
  PARTIAL: "Partial",
};

const number = (value, digits = 0) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const isEmptyFilterValue = (value) =>
  value == null || value === "" || (Array.isArray(value) && value.length === 0);

const cleanFilters = (filters = {}) => {
  const out = {};
  for (const [key, value] of Object.entries(filters || {})) {
    if (!isEmptyFilterValue(value)) out[key] = value;
  }
  return out;
};

const toApiFilterParams = (filters = {}) => {
  const cleaned = cleanFilters(filters);
  const status = Array.isArray(cleaned.status) ? cleaned.status.join(",") : cleaned.status;
  const lineStatus = Array.isArray(cleaned.line_fulfillment_status)
    ? cleaned.line_fulfillment_status.join(",")
    : cleaned.line_fulfillment_status;
  return {
    ...cleaned,
    status: status || undefined,
    line_fulfillment_status: lineStatus || undefined,
    q: cleaned.q ? String(cleaned.q).trim() : undefined,
  };
};

const buildParams = (filters, params = {}) => ({
  ...toApiFilterParams(filters),
  page: params.page ?? 1,
  limit: params.limit ?? 25,
  sortBy: params.sortBy || "order_date",
  sortOrder: params.sortOrder === "asc" ? "ASC" : "DESC",
});

function KpiCard({ icon: Icon, iconColor, label, value, title, sub, loading }) {
  return (
    <Card className={`rounded-xl shadow-sm border-slate-200 bg-white transition-all hover:shadow-md min-w-0 ${loading ? "animate-pulse" : ""}`}>
      <CardContent className="p-2 flex flex-col justify-center h-full gap-0.5 min-w-0">
        <div className="flex justify-between items-center mb-0.5 gap-1 min-w-0">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight leading-none truncate">{label}</span>
          {Icon && (
            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${iconColor}`}>
              <Icon size={11} />
            </div>
          )}
        </div>
        <div
          className="min-w-0 w-full truncate tabular-nums text-sm font-bold text-slate-900 leading-tight"
          title={!loading && title ? title : undefined}
        >
          {loading ? "…" : value}
        </div>
        {sub && <div className="text-[10px] text-slate-400 leading-none truncate">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Panel({ title, children, className = "" }) {
  return (
    <Card className={`rounded-xl border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
        <IconChartBar size={13} className="text-slate-400" />
        <h3 className="text-xs font-semibold text-slate-700 leading-tight">{title}</h3>
      </div>
      <div className="h-[190px] p-2">{children}</div>
    </Card>
  );
}

function EmptyState({ text = "No data available" }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-[11px] text-slate-400">
      <IconChartBar size={22} className="text-slate-200 mb-1" />
      {text}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[status] || STATUS_BADGE.PENDING}`}>
      {STATUS_LABEL[status] || status || "—"}
    </span>
  );
}

function FulfillmentBar({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value || 0)));
  const color = pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-500" : "bg-slate-300";
  return (
    <div className="min-w-[78px]">
      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
        <span>{number(pct, 1)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function B2bSalesOrderLinesReport({ filters, refreshKey }) {
  const router = useRouter();
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [selectedOrderSummary, setSelectedOrderSummary] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [confirmOrderDialogOpen, setConfirmOrderDialogOpen] = useState(false);
  const [orderToConfirm, setOrderToConfirm] = useState(null);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [cancelOrderDialogOpen, setCancelOrderDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const setErrorRef = useRef(() => {});
  setErrorRef.current = setError;

  const filterParams = useCallback(() => toApiFilterParams(filters), [filters]);

  const fetcher = useCallback(
    async (params) => {
      setError(null);
      setLoading(true);
      try {
        const response = await b2bSalesOrderLinesReportService.getReport(buildParams(filters, params));
        const result = response?.result || response;
        setSummary(result?.summary || null);
        return {
          data: result?.data || [],
          meta: { total: result?.meta?.total || 0 },
        };
      } catch (err) {
        setSummary(null);
        setErrorRef.current(err?.response?.data?.message || "Failed to load B2B sales order lines report");
        return { data: [], meta: { total: 0 } };
      } finally {
        setLoading(false);
      }
    },
    [filters, refreshKey, localRefreshKey]
  );

  const handleExport = async (format) => {
    try {
      await b2bSalesOrderLinesReportService.exportReport(buildParams(filters, { page: 1, limit: 500 }), format);
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to export report");
    }
  };

  const handleOpenOrder = useCallback((row) => {
    if (!row?.order_id) return;
    setSelectedOrderId(row.order_id);
    setSelectedLineId(row.id ?? null);
    setSelectedOrderSummary({
      id: row.order_id,
      status: row.order_status,
      order_no: row.order_no,
    });
    setOrderDetails(null);
    setSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedOrderId(null);
    setSelectedLineId(null);
    setSelectedOrderSummary(null);
    setOrderDetails(null);
  }, []);

  const loadOrderDetails = useCallback(async (orderId) => {
    if (!orderId) return;
    setLoadingOrderDetails(true);
    setOrderDetails(null);
    try {
      const res = await b2bSalesOrderService.getB2bSalesOrderById(orderId);
      const order = res?.result ?? res;
      setOrderDetails(order ?? null);
      if (order) {
        setSelectedOrderSummary((prev) => ({
          id: order.id ?? prev?.id ?? orderId,
          status: order.status ?? prev?.status,
          order_no: order.order_no ?? prev?.order_no,
        }));
      }
    } catch (err) {
      setOrderDetails(null);
      toastError(err?.response?.data?.message || "Failed to load order details");
    } finally {
      setLoadingOrderDetails(false);
    }
  }, []);

  useEffect(() => {
    if (!sidebarOpen || !selectedOrderId) return;
    loadOrderDetails(selectedOrderId);
  }, [sidebarOpen, selectedOrderId, loadOrderDetails]);

  const handleEdit = useCallback(
    (id) => {
      if (!id) return;
      router.push(`/b2b-sales-orders/edit?id=${id}`);
    },
    [router]
  );

  const handleConfirmOrderClick = useCallback((order) => {
    if (!order?.id) return;
    setOrderToConfirm(order);
    setConfirmOrderDialogOpen(true);
  }, []);

  const handleConfirmOrderConfirm = useCallback(async () => {
    if (!orderToConfirm?.id) return;
    setConfirmingOrder(true);
    try {
      await b2bSalesOrderService.confirmB2bSalesOrder(orderToConfirm.id);
      toast.success("Order confirmed");
      setConfirmOrderDialogOpen(false);
      setOrderToConfirm(null);
      setLocalRefreshKey((prev) => prev + 1);
      await loadOrderDetails(orderToConfirm.id);
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to confirm order");
    } finally {
      setConfirmingOrder(false);
    }
  }, [orderToConfirm, loadOrderDetails]);

  const handleCancelOrderClick = useCallback((order) => {
    if (!order?.id) return;
    setOrderToCancel(order);
    setCancelOrderDialogOpen(true);
  }, []);

  const handleCancelOrderConfirm = useCallback(async () => {
    if (!orderToCancel?.id) return;
    setCancellingOrder(true);
    try {
      await b2bSalesOrderService.cancelB2bSalesOrder(orderToCancel.id);
      toast.success("Order cancelled");
      setCancelOrderDialogOpen(false);
      setOrderToCancel(null);
      setLocalRefreshKey((prev) => prev + 1);
      if (selectedOrderId === orderToCancel.id) {
        handleCloseSidebar();
      }
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancellingOrder(false);
    }
  }, [orderToCancel, selectedOrderId, handleCloseSidebar]);

  const handlePdfDownload = useCallback(async (orderId) => {
    if (!orderId) return;
    try {
      const { blob, filename } = await b2bSalesOrderService.downloadB2bSalesOrderPDF(orderId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to download PDF");
    }
  }, []);

  const fulfillmentData = summary?.by_fulfillment_status || [];
  const statusData = summary?.by_status || [];
  const topPendingProducts = summary?.top_products_by_pending_qty || [];
  const trendData = summary?.monthly_trend || [];

  const columns = [
    {
      field: "order_no",
      label: "Order",
      sortable: true,
      stickyLeft: true,
      stickyWidth: 120,
      render: (row) => (
        <div className="leading-tight">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-[10px] font-semibold text-blue-700 hover:underline"
            disabled={!row.order_id}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenOrder(row);
            }}
          >
            {row.order_no || "—"}
          </Button>
          <div className="text-[9px] text-slate-400">{row.order_date || "—"}</div>
        </div>
      ),
    },
    {
      field: "client_name",
      label: "Client",
      sortable: true,
      render: (row) => (
        <div className="leading-tight min-w-[130px]">
          <div className="text-[10px] font-medium text-slate-700 truncate">{row.client_name || "—"}</div>
          <div className="text-[9px] text-slate-400 truncate">{row.ship_to_name || "—"}</div>
        </div>
      ),
    },
    {
      field: "product_name",
      label: "Product",
      sortable: true,
      render: (row) => (
        <div className="leading-tight min-w-[180px]">
          <div className="text-[10px] font-medium text-slate-800 truncate">{row.product_name || "—"}</div>
          <div className="text-[9px] text-slate-400 truncate">
            {[row.product_type, row.product_make, row.model_number || row.hsn_code].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
      ),
    },
    {
      field: "warehouse_name",
      label: "Warehouse",
      render: (row) => <span className="text-[10px] text-slate-600">{row.warehouse_name || "—"}</span>,
    },
    {
      field: "order_status",
      label: "Order Status",
      render: (row) => <StatusBadge status={row.order_status} />,
    },
    {
      field: "line_fulfillment_status",
      label: "Line",
      render: (row) => <StatusBadge status={row.line_fulfillment_status} />,
    },
    {
      field: "ordered_quantity",
      label: "Ordered",
      sortable: true,
      render: (row) => <span className="text-[10px] font-semibold text-slate-700">{number(row.ordered_quantity)}</span>,
    },
    {
      field: "shipped_quantity",
      label: "Shipped",
      sortable: true,
      render: (row) => <span className="text-[10px] font-semibold text-emerald-700">{number(row.shipped_quantity)}</span>,
    },
    {
      field: "pending_quantity",
      label: "Pending",
      sortable: true,
      render: (row) => (
        <span className={`text-[10px] font-semibold ${Number(row.pending_quantity) > 0 ? "text-amber-700" : "text-slate-500"}`}>
          {number(row.pending_quantity)}
        </span>
      ),
    },
    {
      field: "fulfillment_percent",
      label: "Fulfill",
      sortable: true,
      render: (row) => <FulfillmentBar value={row.fulfillment_percent} />,
    },
    {
      field: "unit_rate",
      label: "Rate",
      render: (row) => <span className="text-[10px] text-slate-600">{formatInrFull(row.unit_rate)}</span>,
    },
    {
      field: "total_amount",
      label: "Value",
      sortable: true,
      render: (row) => <span className="text-[10px] font-semibold text-slate-800">{formatInrFull(row.total_amount)}</span>,
    },
    {
      field: "pending_value",
      label: "Pending Value",
      render: (row) => <span className="text-[10px] font-semibold text-amber-700">{formatInrFull(row.pending_value)}</span>,
    },
  ];

  const selectedOrder = orderDetails || selectedOrderSummary;

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-600 flex items-center gap-1">
          <IconAlertTriangle size={13} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-1.5">
        <KpiCard icon={IconPackage} iconColor="bg-blue-50 text-blue-600" label="Lines" value={number(summary?.total_lines)} loading={loading} />
        <KpiCard
          icon={IconCurrencyRupee}
          iconColor="bg-emerald-50 text-emerald-600"
          label="Order Value"
          value={formatInrCompact(summary?.total_value)}
          title={formatInrFull(summary?.total_value)}
          loading={loading}
        />
        <KpiCard icon={IconPackage} iconColor="bg-slate-50 text-slate-600" label="Ordered Qty" value={number(summary?.ordered_qty)} loading={loading} />
        <KpiCard icon={IconTruck} iconColor="bg-blue-50 text-blue-600" label="Shipped Qty" value={number(summary?.shipped_qty)} loading={loading} />
        <KpiCard icon={IconClock} iconColor="bg-amber-50 text-amber-600" label="Pending Qty" value={number(summary?.pending_qty)} loading={loading} />
        <KpiCard
          icon={IconCurrencyRupee}
          iconColor="bg-amber-50 text-amber-600"
          label="Pending Value"
          value={formatInrCompact(summary?.pending_value)}
          title={formatInrFull(summary?.pending_value)}
          loading={loading}
        />
        <KpiCard icon={IconCircleCheck} iconColor="bg-emerald-50 text-emerald-600" label="Completed" value={number(summary?.completed_lines)} loading={loading} />
        <KpiCard icon={IconTruck} iconColor="bg-amber-50 text-amber-600" label="Partial" value={number(summary?.partial_lines)} loading={loading} />
        <KpiCard icon={IconClock} iconColor="bg-slate-50 text-slate-600" label="Pending" value={number(summary?.pending_lines)} loading={loading} />
        <KpiCard icon={IconChartBar} iconColor="bg-violet-50 text-violet-600" label="Avg Fulfill" value={`${number(summary?.avg_fulfillment_percent, 1)}%`} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
        <Panel title="Value By Order Status">
          {statusData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <RTooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatInrFull(v)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </Panel>

        <Panel title="Line Fulfillment Mix">
          {fulfillmentData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={fulfillmentData} dataKey="line_count" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2}>
                  {fulfillmentData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RTooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </Panel>

        <Panel title="Top Pending Products">
          {topPendingProducts.length ? (
            <div className="space-y-1 overflow-hidden">
              {topPendingProducts.slice(0, 6).map((item, idx) => {
                const max = Number(topPendingProducts[0]?.pending_qty || 1);
                const pct = Math.min(100, (Number(item.pending_qty || 0) / max) * 100);
                return (
                  <div key={item.product_id || item.name} className="flex items-center gap-1.5 px-1 py-0.5 hover:bg-slate-50 rounded">
                    <span className="text-[10px] text-slate-400 w-4">{idx + 1}</span>
                    <span className="text-[10px] text-slate-600 flex-1 truncate">{item.name || "Unknown"}</span>
                    <span className="text-[10px] font-semibold text-amber-700">{number(item.pending_qty)}</span>
                    <div className="w-14 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <EmptyState />}
        </Panel>

        <Panel title="Monthly Trend">
          {trendData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <RTooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="shipped_qty" stackId="qty" fill="#2563eb" radius={[3, 3, 0, 0]} />
                <Bar dataKey="pending_qty" stackId="qty" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState />}
        </Panel>
      </div>

      <Card className="rounded-xl border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-2 py-1.5 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-xs font-semibold text-slate-700 leading-tight">Sales Order Lines</h2>
            <p className="text-[10px] text-slate-400">Detailed line-level order, shipment, and pending value view</p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => handleExport("csv")}>
              <IconDownload size={12} className="mr-1" /> CSV
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => handleExport("excel")}>
              <IconDownload size={12} className="mr-1" /> Excel
            </Button>
          </div>
        </div>
        <PaginatedTable
          key={`${refreshKey}-${localRefreshKey}`}
          columns={columns}
          fetcher={fetcher}
          filterParams={filterParams()}
          initialPage={1}
          initialLimit={25}
          initialSortBy="order_date"
          initialSortOrder="desc"
          showSearch={false}
          compactDensity
          persistScrollbars
          height="64vh"
          getRowKey={(row) => row.id}
          moduleKey="/reports/b2b-sales-order-lines"
        />
      </Card>

      <DetailsSidebar
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        title="Order Details"
        headerActions={
            selectedOrderId ? (
              <div className="flex items-center gap-1">
                {selectedOrder?.status === "DRAFT" && currentPerm.can_update && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(selectedOrderId)}>
                      <IconPencil className="size-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="default" onClick={() => handleConfirmOrderClick(selectedOrder)}>
                      <IconCircleCheck className="size-4 mr-1" />
                      Confirm
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleCancelOrderClick(selectedOrder)}>
                      Cancel Order
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => handlePdfDownload(selectedOrderId)}>
                  <IconFileTypePdf className="size-4 mr-1" />
                  Download PDF
                </Button>
              </div>
            ) : null
        }
      >
        <B2bSalesOrderDetailsContent
          order={orderDetails}
          loading={loadingOrderDetails}
            canUpdate={currentPerm.can_update}
            onConfirm={handleConfirmOrderClick}
            onCancel={handleCancelOrderClick}
          highlightLineId={selectedLineId}
        />
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
              {confirmingOrder ? "Confirming..." : "Confirm Order"}
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
              {cancellingOrder ? "Cancelling..." : "Yes, cancel order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
