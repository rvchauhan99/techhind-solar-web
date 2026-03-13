"use client";

import { useCallback, useRef, useState } from "react";
import { IconPackage, IconCheck, IconClock, IconTruck, IconLock, IconDownload } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import PaginatedTable from "@/components/common/PaginatedTable";
import serializedInventoryService from "@/services/serializedInventoryService";
import { toastError } from "@/utils/toast";
import SerialLedgerDialog from "./SerialLedgerDialog";

const ISSUED_AGAINST_LABELS = {
  customer_order: "Customer Order",
  b2b_sales_order: "Sales Order",
};

const STATUS_BADGE = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RESERVED: "bg-amber-50 text-amber-700 border-amber-200",
  ISSUED: "bg-blue-50 text-blue-700 border-blue-200",
  BLOCKED: "bg-red-50 text-red-600 border-red-200",
};

function buildParams(filters, page, limit, sortBy, sortOrder) {
  const status =
    filters?.status && Array.isArray(filters.status)
      ? filters.status.join(",")
      : filters?.status;
  return {
    page,
    limit,
    product_id: filters?.product_id || undefined,
    warehouse_id: filters?.warehouse_id || undefined,
    product_type_id: filters?.product_type_id || undefined,
    status: status ?? undefined,
    serial_number: filters?.serial_number || undefined,
    issued_against: filters?.issued_against || undefined,
    reference_number: filters?.reference_number || undefined,
    start_date: filters?.start_date || undefined,
    end_date: filters?.end_date || undefined,
    sortBy: sortBy || "id",
    sortOrder: sortOrder === "asc" ? "ASC" : "DESC",
  };
}

function formatCurrency(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

function KpiCard({ icon: Icon, iconColor, label, value, loading }) {
  return (
    <Card className={`rounded-xl shadow-sm border-slate-200 bg-white transition-all hover:shadow-md ${loading ? "animate-pulse" : ""}`}>
      <CardContent className="p-2 flex flex-col justify-center h-full gap-0.5">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight leading-none">{label}</span>
          {Icon && (
            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${iconColor}`}>
              <Icon size={11} />
            </div>
          )}
        </div>
        <div className="text-lg font-bold text-slate-900 leading-none">
          {loading ? "…" : value}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SerializedInventoryReport({ filters, onRefresh }) {
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSerial, setSelectedSerial] = useState(null);
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const setErrorRef = useRef(() => {});
  setErrorRef.current = setError;

  const handleViewLedger = (row) => {
    setSelectedSerial(row);
    setLedgerDialogOpen(true);
  };

  const filterParams = useCallback(() => {
    const status =
      filters?.status && Array.isArray(filters.status)
        ? filters.status.join(",")
        : filters?.status;
    return {
      ...filters,
      status: status ?? undefined,
      product_id: filters?.product_id || undefined,
      warehouse_id: filters?.warehouse_id || undefined,
      product_type_id: filters?.product_type_id || undefined,
      serial_number: filters?.serial_number || undefined,
      issued_against: filters?.issued_against || undefined,
      reference_number: filters?.reference_number || undefined,
      start_date: filters?.start_date || undefined,
      end_date: filters?.end_date || undefined,
    };
  }, [filters]);

  const fetcher = useCallback(
    async (params) => {
      setError(null);
      setSummaryLoading(true);
      const page = params.page ?? 1;
      const limit = params.limit ?? 25;
      const sortBy = params.sortBy || "id";
      const sortOrder = params.sortOrder || "desc";
      const apiParams = buildParams(filters, page, limit, sortBy, sortOrder);
      try {
        const response = await serializedInventoryService.getSerializedInventoryReport(apiParams);
        const result = response.result || response;
        setSummary(result.summary || null);
        return {
          data: result.data || [],
          meta: { total: result.meta?.total ?? 0 },
        };
      } catch (err) {
        setSummary(null);
        setErrorRef.current(
          err?.response?.data?.message || "Failed to load serialized inventory report"
        );
        return { data: [], meta: { total: 0 } };
      } finally {
        setSummaryLoading(false);
      }
    },
    [filters]
  );

  const handleExport = async (format = "csv") => {
    try {
      const status =
        filters?.status && Array.isArray(filters.status)
          ? filters.status.join(",")
          : filters?.status;
      const params = {
        product_id: filters?.product_id || undefined,
        warehouse_id: filters?.warehouse_id || undefined,
        product_type_id: filters?.product_type_id || undefined,
        status: status ?? undefined,
        serial_number: filters?.serial_number || undefined,
        issued_against: filters?.issued_against || undefined,
        reference_number: filters?.reference_number || undefined,
        start_date: filters?.start_date || undefined,
        end_date: filters?.end_date || undefined,
      };
      await serializedInventoryService.exportReport(params, format);
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to export report.");
    }
  };

  const columns = [
    {
      field: "serial_number",
      label: "Serial #",
      sortable: true,
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleViewLedger(row);
          }}
          className="text-[10px] font-medium text-primary hover:underline text-left"
        >
          {row.serial_number || "—"}
        </button>
      ),
    },
    {
      field: "product_name",
      label: "Product",
      render: (row) => (
        <span className="text-[10px] text-slate-700">
          {row.product_name ?? row.product?.product_name ?? row.product?.name ?? "—"}
        </span>
      ),
    },
    {
      field: "product_type",
      label: "Product Type",
      render: (row) => (
        <span className="text-[10px] text-slate-500">
          {row.product_type ?? row.product_type_name ?? row.product?.productType?.name ?? "—"}
        </span>
      ),
    },
    {
      field: "hsn_code",
      label: "HSN",
      render: (row) => (
        <span className="text-[10px] text-slate-500">
          {row.hsn_code ?? row.product?.hsn_ssn_code ?? "—"}
        </span>
      ),
    },
    {
      field: "warehouse_name",
      label: "Warehouse",
      render: (row) => <span className="text-[10px] text-slate-500">{row.warehouse_name || "—"}</span>,
    },
    {
      field: "status",
      label: "Status",
      render: (row) => (
        <span
          className={`text-[9px] font-semibold px-1 py-0 rounded-full border ${STATUS_BADGE[row.status] || "bg-slate-50 text-slate-500 border-slate-200"}`}
        >
          {row.status || "—"}
        </span>
      ),
    },
    {
      field: "issued_against",
      label: "Issued Against",
      render: (row) => (
        <span className="text-[10px] text-slate-500">
          {row.issued_against ? ISSUED_AGAINST_LABELS[row.issued_against] ?? row.issued_against : "—"}
        </span>
      ),
    },
    {
      field: "reference_number",
      label: "Reference #",
      render: (row) => <span className="text-[10px] text-slate-500">{row.reference_number || "—"}</span>,
    },
    {
      field: "unit_price",
      label: "Unit Price",
      sortable: true,
      render: (row) => (
        <span className="text-[10px] font-medium text-slate-800">{formatCurrency(row.unit_price)}</span>
      ),
    },
    {
      field: "inward_date",
      label: "Inward Date",
      sortable: true,
      render: (row) => (
        <span className="text-[10px] text-slate-600">
          {row.inward_date ? new Date(row.inward_date).toLocaleDateString("en-IN") : "—"}
        </span>
      ),
    },
    {
      field: "outward_date",
      label: "Outward Date",
      sortable: true,
      render: (row) => (
        <span className="text-[10px] text-slate-600">
          {row.outward_date ? new Date(row.outward_date).toLocaleDateString("en-IN") : "—"}
        </span>
      ),
    },
    {
      field: "actions",
      label: "",
      isActionColumn: true,
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleViewLedger(row);
          }}
          className="text-[9px] flex items-center gap-1 px-1 py-0 rounded border border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-colors"
        >
          Ledger
        </button>
      ),
    },
  ];

  const totalSerials = summary?.total ?? 0;
  const available = summary?.by_status?.AVAILABLE ?? 0;
  const reserved = summary?.by_status?.RESERVED ?? 0;
  const issued = summary?.by_status?.ISSUED ?? 0;

  return (
    <div className="space-y-2">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 lg:h-[68px]">
        <KpiCard
          icon={IconPackage}
          iconColor="bg-slate-100 text-slate-600"
          label="Total Serials"
          value={totalSerials}
          loading={summaryLoading}
        />
        <KpiCard
          icon={IconCheck}
          iconColor="bg-emerald-100 text-emerald-600"
          label="Available"
          value={available}
          loading={summaryLoading}
        />
        <KpiCard
          icon={IconClock}
          iconColor="bg-amber-100 text-amber-600"
          label="Reserved"
          value={reserved}
          loading={summaryLoading}
        />
        <KpiCard
          icon={IconTruck}
          iconColor="bg-blue-100 text-blue-600"
          label="Issued"
          value={issued}
          loading={summaryLoading}
        />
      </div>

      {/* Table card */}
      <Card className="rounded-xl shadow-sm border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100">
          <div>
            <h3 className="text-[11px] font-semibold text-slate-700">Serialized Inventory</h3>
            <p className="text-[9px] text-slate-400 mt-0">Click a row or Ledger to view serial ledger</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-400">Export:</span>
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="flex items-center gap-0.5 text-[10px] px-1.5 py-0 rounded border border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-colors"
            >
              <IconDownload size={10} /> CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport("excel")}
              className="flex items-center gap-0.5 text-[10px] px-1.5 py-0 rounded border border-slate-200 text-slate-500 hover:border-primary hover:text-primary transition-colors"
            >
              <IconDownload size={10} /> Excel
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-3 my-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}

        <PaginatedTable
          columns={columns}
          fetcher={fetcher}
          filterParams={filterParams()}
          initialPage={1}
          initialLimit={25}
          showSearch={false}
          height="calc(100vh - 300px)"
          getRowKey={(row) => row.id ?? row.serial_number ?? Math.random()}
          onRowClick={(row) => handleViewLedger(row)}
        />
      </Card>

      <SerialLedgerDialog
        open={ledgerDialogOpen}
        onClose={() => {
          setLedgerDialogOpen(false);
          setSelectedSerial(null);
        }}
        serialId={selectedSerial?.id}
        serialNumber={selectedSerial?.serial_number}
      />
    </div>
  );
}
