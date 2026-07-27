"use client";

/**
 * Build query string for B2B lead / follow-up drill-downs from analysis KPIs.
 */
export function buildB2bDrilldownHref(basePath, drilldown = {}, period = {}) {
  const params = new URLSearchParams();
  const merged = { ...drilldown };

  // Map analysis risk shortcuts to list/follow-up query params
  if (merged.risk === "overdue" && basePath.includes("followup")) {
    merged.reminder_view = "overdue";
    delete merged.risk;
  }

  Object.entries(merged).forEach(([key, value]) => {
    if (
      value == null ||
      value === "" ||
      key === "from" ||
      key === "to" ||
      key === "prior_from" ||
      key === "prior_to"
    ) {
      return;
    }
    if (typeof value === "object") return;
    params.set(key, String(value));
  });

  // Optional created range for period-scoped list when provided
  if (period?.from && !params.has("created_from") && !params.has("risk") && !params.has("reminder_view")) {
    // don't auto-apply period to avoid confusing open-pipeline drills
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function formatInrCompact(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatDelta(delta) {
  if (delta == null || !Number.isFinite(Number(delta))) return null;
  const n = Number(delta);
  return {
    direction: n > 0 ? "up" : n < 0 ? "down" : "neutral",
    label: `${n > 0 ? "+" : ""}${n}%`,
  };
}
