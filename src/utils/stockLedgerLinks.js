"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getAllowedRoutes, isPathAllowedByRoutes } from "@/lib/permissionUtils";

export const STOCK_LEDGER_ROUTE = "/reports/stock-ledger";

export const FLOW_BUCKET_OPTIONS = [
  { value: "procurement_in", label: "Procurement IN" },
  { value: "procurement_out", label: "Procurement OUT" },
  { value: "sales_out", label: "Sales OUT" },
  { value: "sales_in", label: "Sales IN" },
  { value: "transfer", label: "Transfer" },
  { value: "production", label: "Production" },
  { value: "adjustment", label: "Adjustment" },
];

export const FLOW_BUCKET_LABELS = Object.fromEntries(
  FLOW_BUCKET_OPTIONS.map((o) => [o.value, o.label])
);

/** Buckets behind the dashboard "Commercial Net" figure. */
export const COMMERCIAL_BUCKETS = ["procurement_in", "procurement_out", "sales_out", "sales_in"];

/** Ready-made drill scopes for dashboard figures. */
export const LEDGER_DRILL = {
  procurementIn: { flow_bucket: ["procurement_in"] },
  salesOut: { flow_bucket: ["sales_out"] },
  commercialNet: { flow_bucket: COMMERCIAL_BUCKETS },
  transferOut: { transaction_type: "TRANSFER_OUT" },
  shrinkage: { shrinkage_only: 1 },
  all: {},
};

const BASE_KEYS = [
  "start_date",
  "end_date",
  "warehouse_id",
  "product_id",
  "product_type_id",
  "product_make_id",
  "flow_bucket",
  "sales_channel",
];

function toList(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Stock Ledger URL for a dashboard drill. `drill` overrides base filters, except flow_bucket
 * which intersects with the dashboard bucket filter so the ledger stays inside the same scope.
 * @param {object} baseFilters - applied Inward/Outward filters
 * @param {object} drill - e.g. { warehouse_id, flow_bucket: ["sales_out"], start_date, end_date }
 * @param {{ pathname?: string, searchParams?: URLSearchParams|string }} returnContext
 */
export function buildStockLedgerHref(baseFilters = {}, drill = {}, returnContext = {}) {
  const merged = {};
  for (const key of BASE_KEYS) {
    if (baseFilters?.[key] != null && baseFilters[key] !== "") merged[key] = baseFilters[key];
  }

  const baseBuckets = toList(baseFilters?.flow_bucket);
  for (const [key, value] of Object.entries(drill || {})) {
    if (value == null || value === "") continue;
    if (key === "flow_bucket") {
      const drillBuckets = toList(value);
      const scoped = baseBuckets.length
        ? drillBuckets.filter((b) => baseBuckets.includes(b))
        : drillBuckets;
      merged.flow_bucket = scoped.length ? scoped : baseBuckets;
      continue;
    }
    merged[key] = value;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    const v = Array.isArray(value) ? value.join(",") : String(value);
    if (v) params.set(key, v);
  }

  const { pathname, searchParams } = returnContext || {};
  if (pathname) {
    const qs =
      typeof searchParams === "string"
        ? searchParams.replace(/^\?/, "")
        : searchParams?.toString?.() || "";
    params.set("returnTo", qs ? `${pathname}?${qs}` : pathname);
  }

  const qs = params.toString();
  return qs ? `${STOCK_LEDGER_ROUTE}?${qs}` : STOCK_LEDGER_ROUTE;
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Date range covered by one trend bucket (day / week / month), clamped to the dashboard range.
 */
export function trendPeriodRange(period, grain = "day", bounds = {}) {
  const startStr = String(period || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startStr)) return null;
  const start = new Date(`${startStr}T00:00:00Z`);
  const end = new Date(start);
  if (grain === "week") end.setUTCDate(end.getUTCDate() + 6);
  else if (grain === "month") end.setUTCMonth(end.getUTCMonth() + 1, 0);

  let s = ymd(start);
  let e = ymd(end);
  if (bounds.start_date && s < bounds.start_date) s = bounds.start_date;
  if (bounds.end_date && e > bounds.end_date) e = bounds.end_date;
  return { start_date: s, end_date: e };
}

/** Whether the signed-in user can open the Stock Ledger report. */
export function useStockLedgerAccess() {
  const { user } = useAuth() || {};
  return useMemo(
    () => isPathAllowedByRoutes(STOCK_LEDGER_ROUTE, getAllowedRoutes(user?.modules || [])),
    [user]
  );
}
