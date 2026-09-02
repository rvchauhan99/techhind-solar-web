import { AP } from "@/utils/assemblyProductionLabels";

export const PRODUCTION_DASHBOARD_FILTER_KEYS = [
  "q",
  "warehouse_id",
  "fg_product_id",
  "status",
  "priority",
  "start_date",
  "end_date",
  "open_only",
  "kpi_scope",
];

export const EMPTY_DASHBOARD_FILTERS = Object.fromEntries(
  PRODUCTION_DASHBOARD_FILTER_KEYS.map((k) => [k, ""])
);

export const STATUS_QUICK_TABS = [
  { key: "open", label: "Open", filter: { status: "", open_only: "true", kpi_scope: "open" } },
  { key: "draft", label: "Draft", filter: { status: "DRAFT", open_only: "", kpi_scope: "draft" } },
  { key: "completed", label: "Completed", filter: { status: "COMPLETED", open_only: "", kpi_scope: "completed" } },
  { key: "short_closed", label: "Short Closed", filter: { status: "SHORT_CLOSED", open_only: "", kpi_scope: "short_closed" } },
  { key: "cancelled", label: "Cancelled", filter: { status: "CANCELLED", open_only: "", kpi_scope: "cancelled" } },
  { key: "all", label: "All", filter: { status: "", open_only: "", kpi_scope: "all" } },
];

const today = () => new Date().toISOString().split("T")[0];

export const DATE_PRESETS = [
  {
    label: "Today",
    fn: () => {
      const d = today();
      return { start_date: d, end_date: d };
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
        start_date: m.toISOString().split("T")[0],
        end_date: e.toISOString().split("T")[0],
      };
    },
  },
  {
    label: "This Month",
    fn: () => {
      const n = new Date();
      return {
        start_date: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0],
        end_date: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0],
      };
    },
  },
  {
    label: "Last 30 Days",
    fn: () => {
      const d = new Date();
      const p = new Date();
      p.setDate(p.getDate() - 30);
      return { start_date: p.toISOString().split("T")[0], end_date: d.toISOString().split("T")[0] };
    },
  },
  {
    label: "Last 6M",
    fn: () => {
      const n = new Date();
      const p = new Date(n);
      p.setMonth(n.getMonth() - 6);
      p.setDate(1);
      return { start_date: p.toISOString().split("T")[0], end_date: n.toISOString().split("T")[0] };
    },
  },
  {
    label: "This Year",
    fn: () => {
      const n = new Date();
      return {
        start_date: new Date(n.getFullYear(), 0, 1).toISOString().split("T")[0],
        end_date: new Date(n.getFullYear(), 11, 31).toISOString().split("T")[0],
      };
    },
  },
];

export const DEFAULT_DATE_PRESET = "Last 6M";

export const getInitialDashboardFilters = () => {
  const preset = DATE_PRESETS.find((p) => p.label === DEFAULT_DATE_PRESET);
  const dates = preset ? preset.fn() : { start_date: "", end_date: "" };
  return {
    ...EMPTY_DASHBOARD_FILTERS,
    ...dates,
    kpi_scope: "all",
  };
};

export const deriveProductionKpiScope = (filters) => {
  const scope = String(filters?.kpi_scope || "").trim();
  if (scope) return scope;
  if (filters?.open_only === "true" || filters?.open_only === true) return "open";
  const st = String(filters?.status || "").trim();
  if (st === "DRAFT") return "draft";
  if (st === "COMPLETED") return "completed";
  if (st === "SHORT_CLOSED") return "short_closed";
  if (st === "CANCELLED") return "cancelled";
  if (st === "APPROVED" || st === "IN_PROGRESS") return "open";
  return "all";
};

export const pickDashboardParams = (filters = {}) => {
  const out = {};
  for (const key of PRODUCTION_DASHBOARD_FILTER_KEYS) {
    const v = filters[key];
    if (v != null && String(v).trim() !== "") out[key] = v;
  }
  return out;
};

export const mapDashboardFiltersToOrderListQuery = (filters = {}) => ({
  warehouse_id: filters.warehouse_id || undefined,
  fg_product_id: filters.fg_product_id || undefined,
  status: filters.status || undefined,
  priority: filters.priority || undefined,
  q: filters.q || undefined,
  open_only: filters.open_only === "true" || filters.open_only === true ? "true" : undefined,
  sortBy: "id",
  sortOrder: "DESC",
});

export const mapDashboardFiltersToBookingListQuery = (filters = {}) => ({
  warehouse_id: filters.warehouse_id || undefined,
  fg_product_id: filters.fg_product_id || undefined,
  booking_date_from: filters.start_date || undefined,
  booking_date_to: filters.end_date || undefined,
  status: "POSTED",
  sortBy: "id",
  sortOrder: "DESC",
});

export const PIPELINE_STAGES = [
  { id: "DRAFT", label: "Draft", color: "bg-slate-500" },
  { id: "APPROVED", label: "Approved", color: "bg-blue-500" },
  { id: "IN_PROGRESS", label: "In Progress", color: "bg-amber-500" },
  { id: "COMPLETED", label: "Completed", color: "bg-emerald-500" },
  { id: "SHORT_CLOSED", label: "Short Closed", color: "bg-violet-500" },
  { id: "CANCELLED", label: "Cancelled", color: "bg-red-500" },
];

export const money = (value) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export const formatQty = (value, digits = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits });
};

export { AP };
