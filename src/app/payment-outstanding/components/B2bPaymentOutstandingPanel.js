"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconDownload,
  IconCurrencyRupee,
  IconCalendar,
  IconRefresh,
  IconFilter,
  IconChartBar,
  IconChartPie,
  IconAlertTriangle,
  IconCoins,
  IconCreditCard,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconFileText,
  IconUsers,
} from "@tabler/icons-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import PaginatedTable from "@/components/common/PaginatedTable";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import Input from "@/components/common/Input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import b2bPaymentOutstandingService from "@/services/b2bPaymentOutstandingService";
import b2bClientService from "@/services/b2bClientService";
import companyService from "@/services/companyService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { formatCurrency, formatDate } from "@/utils/dataTableUtils";
import { getB2bOrderOutstandingDisplay } from "@/utils/b2bOrderPaymentSummary";
import { toast } from "sonner";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PARTIAL_SHIPPED", label: "Partial Shipped" },
  { value: "COMPLETED", label: "Completed" },
];

const STATUS_LABELS = {
  "": "All",
  CONFIRMED: "Confirmed",
  PARTIAL_SHIPPED: "Partial Shipped",
  COMPLETED: "Completed",
};

const INITIAL_FILTERS = {
  status: "",
  order_no: "",
  client_id: "",
  client_name: "",
  warehouse_id: "",
  warehouse_name: "",
  payment_terms: "",
  order_date_from: "",
  order_date_to: "",
};

const FILTER_LABELS = {
  status: "Status",
  order_no: "Order #",
  client_name: "Client",
  warehouse_name: "Warehouse",
  payment_terms: "Payment Terms",
  order_date_from: "Date From",
  order_date_to: "Date To",
};

const mapList = (res) => {
  const data = res?.result?.data ?? res?.result ?? res?.data ?? res ?? [];
  return Array.isArray(data) ? data : [];
};

const loadWarehouseOptions = async (q) => {
  const res = await companyService.listWarehouses();
  const list = mapList(res);
  const term = String(q || "").toLowerCase();
  return list
    .filter((w) => !term || String(w.name || w.label || "").toLowerCase().includes(term))
    .slice(0, 50)
    .map((w) => ({ ...w, id: w.id, name: w.name ?? w.label }));
};

const loadClientOptions = async (q) => {
  const res = await b2bClientService.getB2bClients({ q: q || undefined, limit: 50 });
  return mapList(res).map((c) => ({ ...c, id: c.id, name: c.client_name ?? c.name }));
};

const loadPaymentTermsOptions = async (q) =>
  getReferenceOptionsSearch("termsAndConditions.model", {
    q,
    limit: 20,
    type: "payment_terms",
    is_active: "true",
  }).then((res) => {
    const list = mapList(res);
    return list.map((t) => ({ ...t, id: t.id, name: t.title ?? t.label ?? t.name ?? "" }));
  });

const DEFAULT_DATE_PRESET_LABEL = "All";

const DATE_PRESETS = [
  { label: "All", fn: () => ({ order_date_from: "", order_date_to: "" }) },
  {
    label: "Today",
    fn: () => {
      const d = new Date().toISOString().split("T")[0];
      return { order_date_from: d, order_date_to: d };
    },
  },
  {
    label: "This Week",
    fn: () => {
      const n = new Date();
      const dy = n.getDay();
      const m = new Date(n);
      m.setDate(n.getDate() - (dy === 0 ? 6 : dy - 1));
      const e = new Date(m);
      e.setDate(m.getDate() + 6);
      return {
        order_date_from: m.toISOString().split("T")[0],
        order_date_to: e.toISOString().split("T")[0],
      };
    },
  },
  {
    label: "This Month",
    fn: () => {
      const n = new Date();
      return {
        order_date_from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0],
        order_date_to: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0],
      };
    },
  },
  {
    label: "Last 3M",
    fn: () => {
      const n = new Date();
      const p = new Date(n);
      p.setMonth(n.getMonth() - 3);
      return { order_date_from: p.toISOString().split("T")[0], order_date_to: n.toISOString().split("T")[0] };
    },
  },
  {
    label: "This Year",
    fn: () => {
      const n = new Date();
      return {
        order_date_from: new Date(n.getFullYear(), 0, 1).toISOString().split("T")[0],
        order_date_to: new Date(n.getFullYear(), 11, 31).toISOString().split("T")[0],
      };
    },
  },
];

const PIE_COLORS = ["#1b365d", "#0ea5e9", "#f59e0b", "#ec4899", "#8b5cf6"];
const TT_STYLE = {
  borderRadius: "8px",
  border: "none",
  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
  fontSize: "11px",
  backgroundColor: "#0f172a",
  color: "#f8fafc",
};

function getChips(filters) {
  return Object.entries(filters || {})
    .filter(([k, v]) => {
      if (k === "client_id" || k === "warehouse_id") return false;
      return v != null && v !== "";
    })
    .map(([key, value]) => ({
      key,
      label: FILTER_LABELS[key] || key,
      value: key === "status" ? (STATUS_LABELS[value] || value) : String(value),
    }));
}

function countActive(f) {
  if (!f) return 0;
  return Object.entries(f).filter(([k, v]) => {
    if (k === "client_id" || k === "warehouse_id") return false;
    return v != null && v !== "";
  }).length;
}

function KpiCard({ icon: Icon, iconColor, label, value, sub, progress, loading }) {
  return (
    <Card className="rounded-lg shadow-sm border-slate-200 bg-white transition-all hover:shadow-md">
      <CardContent className="p-2.5 flex flex-col justify-between h-full gap-0.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
          {Icon && (
            <div className={`w-5.5 h-5.5 rounded flex items-center justify-center shrink-0 ${iconColor}`}>
              <Icon size={12} />
            </div>
          )}
        </div>
        <div className="text-base font-bold text-slate-900 leading-tight">
          {loading ? "…" : value}
        </div>
        {progress !== undefined && (
          <div className="space-y-1 w-full mt-0.5">
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden border border-slate-200/50">
              <div className="bg-emerald-600 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        {sub && <p className="text-[9px] text-slate-400 leading-none">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function PanelHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start justify-between gap-2 px-2.5 py-1.5 border-b border-slate-100 shrink-0">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-slate-500 shrink-0" />}
        <div>
          <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
          {subtitle && <p className="text-[9px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export default function B2bPaymentOutstandingPanel() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [applied, setApplied] = useState(INITIAL_FILTERS);
  const [kpis, setKpis] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(DEFAULT_DATE_PRESET_LABEL);
  const [rows, setRows] = useState([]);
  const [kpisLoading, setKpisLoading] = useState(true);

  const chips = useMemo(() => getChips(applied), [applied]);
  const activeCount = countActive(applied);

  useEffect(() => {
    setKpisLoading(true);
    b2bPaymentOutstandingService.kpis(applied).then((r) => {
      const data = r?.result ?? r?.data ?? r;
      setKpis(data);
    }).catch(() => setKpis(null))
      .finally(() => setKpisLoading(false));
  }, [applied, refreshKey]);

  const fetcher = useCallback(
    async ({ page, limit, q }) => {
      const res = await b2bPaymentOutstandingService.list({
        ...applied,
        q: q || undefined,
        page,
        limit,
      });
      const payload = res?.result ?? res?.data ?? res;
      return {
        data: payload?.data || [],
        meta: { total: payload?.total ?? 0 },
      };
    },
    [applied, refreshKey]
  );

  const totalPayable = kpis?.total_payable || 0;
  const totalOutstanding = kpis?.total_outstanding || 0;
  const totalCollected = kpis?.total_collected ?? Math.max(0, totalPayable - totalOutstanding);
  const collectionRate = totalPayable > 0 ? (totalCollected / totalPayable) * 100 : 0;
  const avgOutstanding = kpis?.avg_outstanding || 0;

  const clientChartData = useMemo(() => {
    const grouped = rows.reduce((acc, row) => {
      const clientName = row.client?.client_name || row.client_name || "Unknown";
      const amt = Number(row.outstanding_balance || 0);
      if (amt <= 0) return acc;
      const existing = acc.find((item) => item.name === clientName);
      if (existing) {
        existing.amount += amt;
      } else {
        acc.push({ name: clientName, amount: amt });
      }
      return acc;
    }, []);
    return grouped.sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [rows]);

  const statusChartData = useMemo(() => {
    const grouped = rows.reduce((acc, row) => {
      const statusLabel = row.status || "Other";
      const amt = Number(row.outstanding_balance || 0);
      if (amt <= 0) return acc;
      const existing = acc.find((item) => item.name === statusLabel);
      if (existing) {
        existing.value += amt;
      } else {
        acc.push({ name: statusLabel, value: amt });
      }
      return acc;
    }, []);
    return grouped.map((s, idx) => ({ ...s, color: PIE_COLORS[idx % PIE_COLORS.length] }));
  }, [rows]);

  const applyFilters = (next) => {
    setApplied(next);
    setRefreshKey((k) => k + 1);
  };

  const handlePreset = (preset) => {
    const dates = preset.fn();
    const next = { ...filters, ...dates };
    setFilters(next);
    applyFilters(next);
    setActivePreset(preset.label);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setApplied(INITIAL_FILTERS);
    setActivePreset(DEFAULT_DATE_PRESET_LABEL);
    setRefreshKey((k) => k + 1);
  };

  const handleApply = () => {
    const from = filters.order_date_from || "";
    const to = filters.order_date_to || "";
    setActivePreset(!from && !to ? DEFAULT_DATE_PRESET_LABEL : null);
    applyFilters(filters);
  };

  const handleStatusTab = (value) => {
    const next = { ...filters, status: value };
    setFilters(next);
    applyFilters(next);
  };

  const removeChip = (key) => {
    const empty = INITIAL_FILTERS[key] ?? "";
    const next = { ...applied, [key]: empty };
    if (key === "client_name") {
      next.client_id = "";
    }
    if (key === "warehouse_name") {
      next.warehouse_id = "";
    }
    if (key === "order_date_from" || key === "order_date_to") {
      const from = key === "order_date_from" ? "" : next.order_date_from;
      const to = key === "order_date_to" ? "" : next.order_date_to;
      next.order_date_from = from;
      next.order_date_to = to;
      setActivePreset(!from && !to ? DEFAULT_DATE_PRESET_LABEL : null);
    }
    setFilters(next);
    applyFilters(next);
  };

  const columns = [
    {
      field: "order_no",
      label: "Order #",
      render: (row) => (
        <Link
          href={`/b2b-sales-orders/view?id=${row.id}&tab=2`}
          className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1.5"
        >
          <IconFileText className="size-3.5 text-slate-400 shrink-0" />
          {row.order_no}
        </Link>
      ),
    },
    {
      field: "order_date",
      label: "Date",
      render: (row) => (row.order_date ? formatDate(row.order_date) : "-"),
    },
    {
      field: "client",
      label: "Client",
      render: (row) => row.client?.client_name || row.client_name || "-",
    },
    {
      field: "client_contact",
      label: "Contact",
      render: (row) => (
        <span className="text-[11px] text-slate-500">
          {row.client?.phone || row.client?.contact_person || "-"}
        </span>
      ),
    },
    {
      field: "plannedWarehouse",
      label: "Warehouse",
      render: (row) => (
        <span className="text-[11px] text-slate-500">{row.plannedWarehouse?.name || "-"}</span>
      ),
    },
    {
      field: "payment_terms",
      label: "Pay Terms",
      render: (row) => (
        <span className="text-[11px] text-slate-500 truncate max-w-[100px] inline-block" title={row.payment_terms || ""}>
          {row.payment_terms || "-"}
        </span>
      ),
    },
    {
      field: "status",
      label: "Status",
      render: (row) => {
        const variantMap = {
          CONFIRMED: "navy",
          PARTIAL_SHIPPED: "accent",
          COMPLETED: "default",
          CANCELLED: "destructive",
        };
        return (
          <Badge variant={variantMap[row.status] || "secondary"} className="text-[10px]">
            {row.status}
          </Badge>
        );
      },
    },
    {
      field: "payable_amount",
      label: "Payable",
      headerRender: () => <span className="ml-auto">Payable</span>,
      render: (row) => (
        <div className="text-right text-[11px] font-medium text-slate-700 w-full select-none">
          {formatCurrency(row.payable_amount)}
        </div>
      ),
    },
    {
      field: "total_paid",
      label: "Paid",
      headerRender: () => <span className="ml-auto">Paid</span>,
      render: (row) => (
        <div className="text-right text-[11px] font-medium text-emerald-600 w-full select-none">
          {formatCurrency(row.total_paid)}
        </div>
      ),
    },
    {
      field: "outstanding_balance",
      label: "Outstanding",
      headerRender: () => <span className="ml-auto">Outstanding</span>,
      render: (row) => {
        const display = getB2bOrderOutstandingDisplay(row);
        if (display.type === "outstanding") {
          return (
            <div className="flex justify-end select-none">
              <Badge variant="destructive" className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
                {formatCurrency(display.amount)}
              </Badge>
            </div>
          );
        }
        if (display.type === "fully_paid") {
          return (
            <div className="flex justify-end select-none">
              <span className="text-xs text-emerald-600 font-semibold">
                {display.label}
              </span>
            </div>
          );
        }
        return (
          <div className="flex justify-end select-none">
            <span className="text-xs text-slate-400 font-medium">
              {display.label}
            </span>
          </div>
        );
      },
    },
    {
      field: "actions",
      label: "Actions",
      isActionColumn: true,
      render: (row) => (
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-primary hover:text-primary hover:bg-slate-100 gap-1 px-2"
            asChild
          >
            <Link href={`/b2b-sales-orders/view?id=${row.id}&tab=2`}>
              <IconCurrencyRupee className="size-3.5" />
              Add Payment
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <KpiCard
          icon={IconFileText}
          iconColor="bg-slate-100 text-slate-600"
          label="Outstanding Orders"
          value={kpis?.order_count ?? "—"}
          loading={kpisLoading}
        />
        <KpiCard
          icon={IconAlertTriangle}
          iconColor="bg-red-100 text-red-500"
          label="Total Outstanding"
          value={`₹${Number(totalOutstanding).toLocaleString("en-IN")}`}
          loading={kpisLoading}
          sub="Requires follow-up"
        />
        <KpiCard
          icon={IconCreditCard}
          iconColor="bg-blue-100 text-blue-600"
          label="Total Collected"
          value={`₹${Number(totalCollected).toLocaleString("en-IN")}`}
          loading={kpisLoading}
        />
        <KpiCard
          icon={IconCoins}
          iconColor="bg-emerald-100 text-emerald-600"
          label="Collection Efficiency"
          value={`${collectionRate.toFixed(1)}%`}
          progress={kpisLoading ? 0 : collectionRate}
          sub="Payment collection efficiency"
          loading={kpisLoading}
        />
        <KpiCard
          icon={IconCurrencyRupee}
          iconColor="bg-amber-100 text-amber-600"
          label="Avg Outstanding"
          value={`₹${Number(avgOutstanding).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
          loading={kpisLoading}
          sub="Per order average"
        />
        <KpiCard
          icon={IconUsers}
          iconColor="bg-indigo-100 text-indigo-600"
          label="Status Split"
          value={kpisLoading ? "…" : `${kpis?.confirmed_count ?? 0} / ${kpis?.partial_shipped_count ?? 0} / ${kpis?.completed_count ?? 0}`}
          loading={kpisLoading}
          sub="Confirmed / Partial / Completed"
        />
      </div>

      {/* Date Presets and Filters Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            <IconCalendar size={11} /> Date presets:
          </span>
          {DATE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => handlePreset(p)}
              className={[
                "text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-all",
                activePreset === p.label
                  ? "bg-[#1b365d] text-white border-[#1b365d]"
                  : "bg-white border-slate-200 text-slate-500 hover:border-[#1b365d] hover:text-[#1b365d]",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value || "all"}
              type="button"
              onClick={() => handleStatusTab(t.value)}
              className={[
                "text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-all",
                applied.status === t.value
                  ? "bg-[#1b365d] text-white border-[#1b365d]"
                  : "bg-white border-slate-200 text-slate-500 hover:border-[#1b365d] hover:text-[#1b365d]",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
          <div className="h-4 w-px bg-slate-200 mx-1" />
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{activeCount} active</Badge>
          )}
          <Button size="sm" variant="outline" onClick={handleReset} className="h-7 text-xs gap-1 px-2">
            <IconRefresh size={12} /> Reset
          </Button>
          <Button size="sm" onClick={handleApply} className="h-7 text-xs gap-1 px-2 bg-[#00823b] hover:bg-[#00823b]/90 text-white">
            <IconFilter size={12} /> Apply
          </Button>
        </div>
      </div>

      {/* Active Filter Chips */}
      {chips.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap px-0.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Filters:</span>
          {chips.map(({ key, label, value }) => (
            <button
              key={key}
              type="button"
              onClick={() => removeChip(key)}
              className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:text-red-600 transition-colors"
            >
              <span className="text-slate-400">{label}:</span>
              <span className="max-w-[120px] truncate">{value}</span>
              <IconX size={10} />
            </button>
          ))}
        </div>
      )}

      {/* Advanced Filters Collapsible Card */}
      <Card className="rounded-lg shadow-sm border-slate-200 bg-white overflow-visible">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-50 transition-colors rounded-lg"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <IconFilter size={12} /> Advanced Filters
          </span>
          {filtersOpen ? (
            <IconChevronUp size={13} className="text-slate-400" />
          ) : (
            <IconChevronDown size={13} className="text-slate-400" />
          )}
        </button>
        {filtersOpen && (
          <div className="border-t border-slate-100 px-2.5 py-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <Input
              name="order_no"
              label="Order #"
              value={filters.order_no}
              onChange={(e) => setFilters((p) => ({ ...p, order_no: e.target.value }))}
            />
            <AutocompleteField
              usePortal
              name="client_id"
              label="Client"
              asyncLoadOptions={loadClientOptions}
              getOptionLabel={(o) => o?.client_name ?? o?.name ?? ""}
              value={
                filters.client_id
                  ? { id: filters.client_id, client_name: filters.client_name }
                  : null
              }
              onChange={(e, v) => {
                setFilters((p) => ({
                  ...p,
                  client_id: v?.id ?? "",
                  client_name: v?.client_name ?? v?.name ?? "",
                }));
              }}
              placeholder="Select Client..."
            />
            <AutocompleteField
              usePortal
              name="warehouse_id"
              label="Warehouse"
              asyncLoadOptions={loadWarehouseOptions}
              getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
              value={
                filters.warehouse_id
                  ? { id: filters.warehouse_id, name: filters.warehouse_name }
                  : null
              }
              onChange={(e, v) =>
                setFilters((p) => ({
                  ...p,
                  warehouse_id: v?.id ?? "",
                  warehouse_name: v?.name ?? v?.label ?? "",
                }))
              }
              placeholder="Select Warehouse..."
            />
            <AutocompleteField
              usePortal
              name="payment_terms"
              label="Payment Terms"
              asyncLoadOptions={loadPaymentTermsOptions}
              getOptionLabel={(o) => o?.name ?? o?.title ?? ""}
              value={filters.payment_terms ? { id: filters.payment_terms, name: filters.payment_terms } : null}
              onChange={(e, v) =>
                setFilters((p) => ({
                  ...p,
                  payment_terms: v?.name ?? v?.title ?? "",
                }))
              }
              placeholder="Select Payment Terms..."
            />
            <DateField
              label="Order Date From"
              value={filters.order_date_from}
              onChange={(e) => setFilters((p) => ({ ...p, order_date_from: e.target.value }))}
            />
            <DateField
              label="Order Date To"
              value={filters.order_date_to}
              onChange={(e) => setFilters((p) => ({ ...p, order_date_to: e.target.value }))}
            />
          </div>
        )}
      </Card>

      {/* Analytics Charts Grid */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="col-span-12 md:col-span-8">
            <Card className="rounded-lg shadow-sm border-slate-200 bg-white h-full overflow-hidden">
              <PanelHeader
                icon={IconChartBar}
                title="Top Outstanding Clients"
                subtitle="Clients with highest total balance due in current view"
              />
              <div className="p-2" style={{ height: 160 }}>
                {clientChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={clientChartData}
                      layout="vertical"
                      margin={{ top: 2, right: 20, left: 10, bottom: 2 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) =>
                          v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v
                        }
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={90}
                        tick={{ fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RTooltip
                        contentStyle={TT_STYLE}
                        itemStyle={{ color: "#f8fafc" }}
                        labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
                        formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Outstanding"]}
                        cursor={{ fill: "#f8fafc" }}
                      />
                      <Bar dataKey="amount" fill="#1b365d" radius={[0, 4, 4, 0]} maxBarSize={16}>
                        {clientChartData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">No data to display</div>
                )}
              </div>
            </Card>
          </div>

          <div className="col-span-12 md:col-span-4">
            <Card className="rounded-lg shadow-sm border-slate-200 bg-white h-full overflow-hidden">
              <PanelHeader
                icon={IconChartPie}
                title="Status Distribution"
                subtitle="Outstanding balance split by order status"
              />
              <div className="p-2">
                {statusChartData.length > 0 ? (
                  <div className="flex items-center gap-2 justify-center min-h-[130px]">
                    <div style={{ width: 90, height: 120 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={45}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {statusChartData.map((e, i) => (
                              <Cell key={i} fill={e.color} />
                            ))}
                          </Pie>
                          <RTooltip
                            contentStyle={TT_STYLE}
                            itemStyle={{ color: "#f8fafc" }}
                            labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
                            formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      {statusChartData.map((s) => (
                        <div key={s.name} className="flex items-center justify-between gap-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-[10px] text-slate-600 truncate">{s.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[10px] font-bold text-slate-800">₹{Number(s.value).toLocaleString("en-IN")}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 min-h-[130px]">No data to display</div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="rounded-lg shadow-sm border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Outstanding Invoices</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">List of orders with positive outstanding balances</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 px-2.5 border-slate-200 text-slate-600"
            onClick={async () => {
              try {
                const blob = await b2bPaymentOutstandingService.export(applied);
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `b2b-payment-outstanding-${new Date().toISOString().split("T")[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("CSV exported successfully");
              } catch (err) {
                toast.error(err?.response?.data?.message || "Export failed");
              }
            }}
          >
            <IconDownload className="size-3.5" /> Export CSV
          </Button>
        </div>

        <PaginatedTable
          key={refreshKey}
          columns={columns}
          fetcher={fetcher}
          onRowsChange={setRows}
          filterParams={applied}
          initialPage={1}
          initialLimit={25}
          showSearch
          searchPlaceholder="Search order # or client..."
          height="calc(100vh - 350px)"
          getRowKey={(r) => r.id}
        />
      </Card>
    </div>
  );
}
