"use client";

import { useCallback, useRef, useState } from "react";
import {
  IconTruck,
  IconPackage,
  IconCurrencyRupee,
  IconChartBar,
  IconCircleCheck,
  IconClock,
  IconDownload,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PaginatedTable from "@/components/common/PaginatedTable";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import deliveryReportService from "@/services/deliveryReportService";
import orderService from "@/services/orderService";
import { toastError } from "@/utils/toast";
import { formatRupeesInteger } from "@/utils/orderFormatters";

const INR = (v) => formatRupeesInteger(v);

const INR2 = (v) =>
  Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const STATUS_BADGE = {
  complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-slate-50 text-slate-600 border-slate-200",
};

function buildParams(filters, page, limit, sortBy, sortOrder) {
  return {
    page,
    limit,
    start_date: filters?.start_date || undefined,
    end_date: filters?.end_date || undefined,
    warehouse_id: filters?.warehouse_id || undefined,
    order_number: filters?.order_number || undefined,
    customer_name: filters?.customer_name || undefined,
    delivery_status: filters?.delivery_status || undefined,
    order_status: filters?.order_status || undefined,
    challan_no: filters?.challan_no || undefined,
    handled_by: filters?.handled_by || undefined,
    sortBy: sortBy || "last_delivery_at",
    sortOrder: sortOrder === "asc" ? "ASC" : "DESC",
  };
}

function KpiCard({ icon: Icon, iconColor, label, value, sub, loading, valueClass }) {
  return (
    <Card
      className={`rounded-xl shadow-sm border-slate-200 bg-white transition-all hover:shadow-md ${
        loading ? "animate-pulse" : ""
      }`}
    >
      <CardContent className="p-2 flex flex-col justify-center h-full gap-0.5">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight leading-none">
            {label}
          </span>
          {Icon && (
            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${iconColor}`}>
              <Icon size={11} />
            </div>
          )}
        </div>
        <div className={`text-lg font-bold leading-none ${valueClass || "text-slate-900"}`}>
          {loading ? "…" : value}
        </div>
        {sub && <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function formatMoneyOrDash(v, available) {
  if (!available || v == null) return "—";
  return `₹${INR2(v)}`;
}

export default function DeliveryReportView({ filters, refreshKey }) {
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const setErrorRef = useRef(() => {});
  setErrorRef.current = setError;

  const fetcher = useCallback(
    async (params) => {
      setError(null);
      setSummaryLoading(true);
      const page = params.page ?? 1;
      const limit = params.limit ?? 25;
      const sortBy = params.sortBy || "last_delivery_at";
      const sortOrder = params.sortOrder || "desc";
      const apiParams = buildParams(filters, page, limit, sortBy, sortOrder);
      try {
        const response = await deliveryReportService.getDeliveryReport(apiParams);
        const result = response.result || response;
        setSummary(result.meta?.summary || null);
        return {
          data: result.data || [],
          meta: { total: result.meta?.total ?? 0 },
        };
      } catch (err) {
        setSummary(null);
        setErrorRef.current(
          err?.response?.data?.message || "Failed to load delivery report"
        );
        return { data: [], meta: { total: 0 } };
      } finally {
        setSummaryLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, refreshKey]
  );

  const handleExport = async (format = "csv") => {
    try {
      const params = buildParams(filters, 1, 25, "last_delivery_at", "desc");
      delete params.page;
      delete params.limit;
      delete params.sortBy;
      delete params.sortOrder;
      await deliveryReportService.exportReport(params, format);
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to export report.");
    }
  };

  const handleOpenDetails = (row) => {
    setSelectedOrder({
      id: row.order_id,
      order_number: row.order_number,
      customer_name: row.customer_name,
      planned_warehouse_name: row.warehouse_name,
      delivery_status: row.delivery_status,
      total_delivered_qty: row.total_delivered_qty,
      order_status: row.order_status,
      last_delivery_at: row.last_delivery_at,
    });
    setDetailsOpen(true);
  };

  const handlePrintOrder = async (resolvedOrder) => {
    try {
      const file = await orderService.downloadOrderPDF(resolvedOrder?.id);
      const blob = file?.blob || file;
      const filename =
        file?.filename || `order-${resolvedOrder?.order_number || resolvedOrder?.id}.pdf`;
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
      toastError(err?.response?.data?.message || "Failed to download order PDF");
    }
  };

  const formatDateTime = (val) => {
    if (!val) return "—";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleString();
  };

  const columns = [
    {
      field: "order_number",
      label: "Order #",
      sortable: true,
      render: (row) => (
        <button
          type="button"
          className="text-[10px] font-medium text-primary hover:underline text-left"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDetails(row);
          }}
        >
          {row.order_number || "—"}
        </button>
      ),
    },
    {
      field: "customer_name",
      label: "Customer",
      sortable: true,
      render: (row) => (
        <span className="text-[10px] text-slate-700 truncate max-w-[120px] block">
          {row.customer_name || "—"}
        </span>
      ),
    },
    {
      field: "warehouse_name",
      label: "Warehouse",
      render: (row) => (
        <span className="text-[10px] text-slate-500">{row.warehouse_name || "—"}</span>
      ),
    },
    {
      field: "challan_count",
      label: "Challans",
      render: (row) => (
        <span className="text-[10px] text-slate-600">{row.challan_count ?? 0}</span>
      ),
    },
    {
      field: "total_delivered_qty",
      label: "Qty",
      sortable: true,
      render: (row) => (
        <span className="text-[10px] font-medium text-slate-800">
          {row.total_delivered_qty ?? 0}
        </span>
      ),
    },
    {
      field: "actual_cogs",
      label: "Actual COGS",
      render: (row) => (
        <span
          className={`text-[10px] font-medium ${
            row.actual_incomplete ? "text-amber-700" : "text-slate-800"
          }`}
          title={row.actual_incomplete ? "Some lines missing cost snapshot" : undefined}
        >
          {formatMoneyOrDash(row.actual_cogs, row.pnl_available)}
        </span>
      ),
    },
    {
      field: "avg_cogs",
      label: "Avg COGS",
      render: (row) => (
        <span className="text-[10px] text-slate-600">
          {row.avg_cogs != null ? `₹${INR2(row.avg_cogs)}` : "—"}
        </span>
      ),
    },
    {
      field: "allocated_revenue",
      label: "Revenue",
      render: (row) => (
        <span className="text-[10px] font-medium text-slate-800">
          ₹{INR2(row.allocated_revenue)}
        </span>
      ),
    },
    {
      field: "actual_pnl",
      label: "Actual PNL",
      render: (row) => {
        if (!row.pnl_available || row.actual_pnl == null) {
          return <span className="text-[10px] text-slate-400">—</span>;
        }
        const positive = Number(row.actual_pnl) >= 0;
        return (
          <span
            className={`text-[10px] font-semibold ${
              positive ? "text-emerald-700" : "text-red-600"
            }`}
          >
            ₹{INR2(row.actual_pnl)}
          </span>
        );
      },
    },
    {
      field: "margin_pct",
      label: "Margin %",
      render: (row) => (
        <span className="text-[10px] text-slate-600">
          {row.margin_pct != null ? `${INR2(row.margin_pct)}%` : "—"}
        </span>
      ),
    },
    {
      field: "last_delivery_at",
      label: "Last Delivery",
      sortable: true,
      render: (row) => (
        <span className="text-[10px] text-slate-500">{formatDateTime(row.last_delivery_at)}</span>
      ),
    },
    {
      field: "delivery_status",
      label: "Delivery",
      sortable: true,
      render: (row) => {
        const s = String(row.delivery_status || "pending").toLowerCase();
        return (
          <span
            className={`text-[9px] font-semibold px-1 py-0 rounded-full border ${
              STATUS_BADGE[s] || STATUS_BADGE.pending
            }`}
          >
            {s}
          </span>
        );
      },
    },
    {
      field: "order_status",
      label: "Order",
      render: (row) => (
        <span className="text-[10px] text-slate-500">{row.order_status || "—"}</span>
      ),
    },
  ];

  const pnlSub =
    summary?.margin_pct != null ? `Margin ${INR2(summary.margin_pct)}%` : undefined;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
        <KpiCard
          icon={IconTruck}
          iconColor="bg-blue-50 text-blue-600"
          label="Orders"
          value={summary?.order_count ?? 0}
          sub={`${summary?.complete_count ?? 0} complete · ${summary?.partial_count ?? 0} partial`}
          loading={summaryLoading}
        />
        <KpiCard
          icon={IconPackage}
          iconColor="bg-slate-100 text-slate-600"
          label="Delivered Qty"
          value={summary?.total_delivered_qty ?? 0}
          loading={summaryLoading}
        />
        <KpiCard
          icon={IconCurrencyRupee}
          iconColor="bg-amber-50 text-amber-700"
          label="Actual COGS"
          value={`₹${INR(summary?.net_actual_cogs)}`}
          sub={`${summary?.pnl_order_count ?? 0} with snap`}
          loading={summaryLoading}
        />
        <KpiCard
          icon={IconCurrencyRupee}
          iconColor="bg-sky-50 text-sky-700"
          label="Revenue"
          value={`₹${INR(summary?.allocated_revenue)}`}
          loading={summaryLoading}
        />
        <KpiCard
          icon={IconChartBar}
          iconColor={
            summary?.actual_pnl != null && Number(summary.actual_pnl) < 0
              ? "bg-red-50 text-red-600"
              : "bg-emerald-50 text-emerald-600"
          }
          label="Actual PNL"
          value={
            summary?.actual_pnl != null ? `₹${INR(summary.actual_pnl)}` : "—"
          }
          sub={pnlSub}
          loading={summaryLoading}
          valueClass={
            summary?.actual_pnl == null
              ? "text-slate-400"
              : Number(summary.actual_pnl) >= 0
                ? "text-emerald-700"
                : "text-red-600"
          }
        />
        <KpiCard
          icon={IconCircleCheck}
          iconColor="bg-emerald-50 text-emerald-600"
          label="Complete"
          value={summary?.complete_count ?? 0}
          sub={
            <span className="inline-flex items-center gap-0.5">
              <IconClock size={9} /> {summary?.pending_count ?? 0} pending
            </span>
          }
          loading={summaryLoading}
        />
      </div>

      {error && (
        <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 text-[10px] gap-1 px-1.5"
          onClick={() => handleExport("csv")}
        >
          <IconDownload size={12} /> CSV
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 text-[10px] gap-1 px-1.5"
          onClick={() => handleExport("excel")}
        >
          <IconDownload size={12} /> Excel
        </Button>
      </div>

      <PaginatedTable
        key={refreshKey}
        columns={columns}
        fetcher={fetcher}
        initialLimit={25}
        initialSortBy="last_delivery_at"
        initialSortOrder="desc"
        persistScrollbars
      />

      <OrderDetailsDrawer
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onPrint={handlePrintOrder}
        showPrint
        showDeliverySnapshot
      />
    </div>
  );
}
