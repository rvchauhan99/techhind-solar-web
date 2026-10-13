"use client";

import { Fragment, useEffect, useState } from "react";
import { Drawer, IconButton } from "@mui/material";
import { IconX, IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import Loader from "@/components/common/Loader";
import b2bSalesOrderService from "@/services/b2bSalesOrderService";
import { formatCurrency } from "@/utils/dataTableUtils";

function pnlTone(n) {
  if (n == null || Number.isNaN(Number(n))) return "text-slate-800";
  if (Number(n) < 0) return "text-destructive";
  return "text-emerald-700";
}

function formatMargin(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return "N/A";
  return `${Number(pct).toFixed(2)}%`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch (_) {
    return String(value);
  }
}

function StatementRow({ label, value, strong = false, toneClass = "text-slate-800", muted = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-2.5 py-1.5 ${
        strong ? "bg-slate-50 border-t border-slate-200" : ""
      }`}
    >
      <span
        className={`text-[11px] ${strong ? "font-semibold text-slate-900" : muted ? "text-slate-500" : "text-slate-700"}`}
      >
        {label}
      </span>
      <span className={`text-xs tabular-nums ${strong ? "font-bold" : "font-semibold"} ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}

export default function B2bSalesOrderPnlDrawer({
  open,
  onClose,
  orderId,
  orderNo,
  initialView = "actual",
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pnl, setPnl] = useState(null);
  const [expandedLine, setExpandedLine] = useState(null);
  const [view, setView] = useState(initialView === "average" ? "average" : "actual");

  useEffect(() => {
    if (open) {
      setView(initialView === "average" ? "average" : "actual");
    }
  }, [open, initialView, orderId]);

  useEffect(() => {
    if (!open || !orderId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    setPnl(null);
    setExpandedLine(null);
    b2bSalesOrderService
      .getB2bSalesOrderPnl(orderId)
      .then((res) => {
        if (cancelled) return;
        setPnl(res?.result ?? res?.data ?? res ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status;
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          (status === 403
            ? "You are not allowed to view B2B Sales Order P&L."
            : "Failed to load PNL");
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, orderId]);

  const money = (v) => (v == null || Number.isNaN(Number(v)) ? "—" : formatCurrency(v));
  const serialsForProduct = (productId) =>
    (pnl?.serials || []).filter((s) => Number(s.product_id) === Number(productId));

  const isActual = view === "actual";
  const incomplete =
    pnl?.cost_completeness === "incomplete_actual_cost_missing" ||
    pnl?.cost_completeness === "incomplete_average_cost_missing" ||
    Boolean(pnl?.actual_incomplete);

  const cogs = isActual ? pnl?.actual_cogs : pnl?.avg_cogs;
  const gross = isActual ? pnl?.actual_pnl : pnl?.avg_pnl;
  const margin = isActual ? pnl?.actual_margin_pct : pnl?.avg_margin_pct;
  const grossLabel =
    Number(gross) < 0 ? "Gross (loss)" : Number(gross) > 0 ? "Gross profit" : "Gross profit / (loss)";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 620 } } }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-3 py-2.5 bg-slate-50/80">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-900 leading-tight">
                Order P&L Report
              </p>
              {pnl?.pnl_available ? (
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                    incomplete
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-emerald-300 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {incomplete ? "Provisional" : "Complete"}
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-600 truncate mt-0.5">
              {pnl?.order_no || orderNo || `#${orderId}`}
              {pnl?.customer_name ? ` · ${pnl.customer_name}` : ""}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {isActual ? "Actual cost basis" : "Average price cost basis"}
              {pnl?.order_date ? ` · ${formatDate(pnl.order_date)}` : ""}
              {pnl?.status ? ` · ${pnl.status}` : ""}
              {pnl?.completed_at ? ` · Completed ${formatDate(pnl.completed_at)}` : ""}
            </p>
          </div>
          <IconButton size="small" aria-label="Close" onClick={onClose}>
            <IconX size={18} />
          </IconButton>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-3 py-1.5">
          <Button
            type="button"
            size="sm"
            variant={isActual ? "default" : "outline"}
            className="h-7 text-[11px] px-2"
            onClick={() => setView("actual")}
          >
            Actual P&L
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!isActual ? "default" : "outline"}
            className="h-7 text-[11px] px-2"
            onClick={() => setView("average")}
          >
            Avg Price P&L
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader />
            </div>
          ) : error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : !pnl ? (
            <p className="text-xs text-slate-500">No PNL data.</p>
          ) : !pnl.pnl_available ? (
            <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
              PNL available for shipments after cost snapshot go-live. This order has no snapshotted
              deliveries yet.
            </div>
          ) : (
            <>
              {pnl.mixed_inventory ? (
                <div className="rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] text-sky-950">
                  <span className="font-semibold">Mixed Inventory Costing:</span> Serialized lines use
                  actual serial cost; non-serialized lines use average inventory cost.
                </div>
              ) : null}

              {incomplete ? (
                <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
                  {pnl.cost_completeness === "incomplete_average_cost_missing"
                    ? "Incomplete – Average Cost Missing. Totals below are provisional."
                    : "Incomplete – Actual Cost Missing. Totals below are provisional."}
                </div>
              ) : null}

              <div className="rounded border border-slate-200 overflow-hidden">
                <div className="px-2.5 py-1 bg-slate-100 border-b border-slate-200">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    {isActual ? "Actual P&L statement" : "Average-price P&L statement"}
                  </p>
                </div>
                <StatementRow label="Net sales (pre-GST)" value={money(pnl.shipped_revenue)} />
                <StatementRow
                  label={isActual ? "(−) Actual COGS" : "(−) Avg COGS"}
                  value={money(cogs)}
                  muted
                />
                <StatementRow
                  label={grossLabel}
                  value={money(gross)}
                  strong
                  toneClass={pnlTone(gross)}
                />
                <StatementRow
                  label="Gross margin %"
                  value={formatMargin(margin)}
                  toneClass={pnlTone(margin)}
                />
                <StatementRow
                  label="Qty shipped (net returns)"
                  value={String(pnl.total_qty ?? "—")}
                  muted
                />
              </div>

              {isActual && (pnl.has_serialized || pnl.has_non_serialized) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {pnl.has_serialized ? (
                    <div className="rounded border border-slate-200 px-2 py-1.5 text-[11px]">
                      <p className="text-[10px] uppercase font-semibold text-slate-500 mb-0.5">
                        Serialized
                      </p>
                      <p className="tabular-nums text-slate-800 leading-snug">
                        Sales {money(pnl.serialized_shipped_revenue)}
                      </p>
                      <p className="tabular-nums text-slate-600 leading-snug">
                        Actual COGS {money(pnl.serialized_actual_cogs)}
                      </p>
                    </div>
                  ) : null}
                  {pnl.has_non_serialized ? (
                    <div className="rounded border border-slate-200 px-2 py-1.5 text-[11px]">
                      <p className="text-[10px] uppercase font-semibold text-slate-500 mb-0.5">
                        Non-serialized
                      </p>
                      <p className="tabular-nums text-slate-800 leading-snug">
                        Sales {money(pnl.non_serialized_shipped_revenue)}
                      </p>
                      <p className="tabular-nums text-slate-600 leading-snug">
                        Avg COGS {money(pnl.non_serialized_actual_cogs)}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded border border-slate-200 overflow-hidden">
                <div className="px-2.5 py-1 bg-slate-100 border-b border-slate-200">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    Line details
                  </p>
                </div>
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-1.5 py-1 text-left font-semibold">Product</th>
                      <th className="px-1.5 py-1 text-right font-semibold">Qty</th>
                      <th className="px-1.5 py-1 text-right font-semibold">Sell</th>
                      <th className="px-1.5 py-1 text-right font-semibold">
                        {isActual ? "Act COGS" : "Avg COGS"}
                      </th>
                      <th className="px-1.5 py-1 text-right font-semibold">
                        {isActual ? "Act P&L" : "Avg P&L"}
                      </th>
                      <th className="px-1.5 py-1 text-right font-semibold">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pnl.lines || []).map((line) => {
                      const openRow = expandedLine === line.order_item_id;
                      const serials = serialsForProduct(line.product_id);
                      const hasSerials = isActual && serials.length > 0;
                      const lineCogs = isActual ? line.actual_cogs : line.avg_cogs;
                      const linePnl = isActual ? line.actual_pnl : line.avg_pnl;
                      const lineMargin = isActual ? line.actual_margin_pct : line.avg_margin_pct;
                      return (
                        <Fragment key={line.order_item_id}>
                          <tr className="border-t border-slate-100 align-top">
                            <td className="px-1.5 py-1">
                              <div className="flex items-start gap-0.5">
                                {hasSerials ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="size-5 shrink-0"
                                    onClick={() =>
                                      setExpandedLine(openRow ? null : line.order_item_id)
                                    }
                                  >
                                    {openRow ? (
                                      <IconChevronDown className="size-3.5" />
                                    ) : (
                                      <IconChevronRight className="size-3.5" />
                                    )}
                                  </Button>
                                ) : (
                                  <span className="inline-block size-5" />
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-800 leading-tight">
                                    {line.product_name || line.product_id}
                                  </p>
                                  {line.inventory_type ? (
                                    <p className="text-[10px] text-slate-400 capitalize">
                                      {String(line.inventory_type).replace("_", " ")}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-1.5 py-1 text-right tabular-nums">
                              {line.net_delivered_qty}
                            </td>
                            <td className="px-1.5 py-1 text-right tabular-nums">
                              {money(line.shipped_revenue)}
                            </td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{money(lineCogs)}</td>
                            <td
                              className={`px-1.5 py-1 text-right tabular-nums font-semibold ${pnlTone(linePnl)}`}
                            >
                              {money(linePnl)}
                            </td>
                            <td
                              className={`px-1.5 py-1 text-right tabular-nums ${pnlTone(lineMargin)}`}
                            >
                              {formatMargin(lineMargin)}
                            </td>
                          </tr>
                          {hasSerials && openRow ? (
                            <tr className="bg-slate-50/60">
                              <td colSpan={6} className="px-2 py-1">
                                <table className="w-full text-[10px] border border-slate-100 bg-white">
                                  <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                      <th className="px-1 py-0.5 text-left">Serial</th>
                                      <th className="px-1 py-0.5 text-right">Actual</th>
                                      <th className="px-1 py-0.5 text-right">Avg@ship</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {serials.map((s) => (
                                      <tr
                                        key={`${s.serial_id}-${s.serial_number}`}
                                        className="border-t border-slate-50"
                                      >
                                        <td className="px-1 py-0.5 font-mono">
                                          {s.serial_number || "—"}
                                        </td>
                                        <td className="px-1 py-0.5 text-right tabular-nums">
                                          {money(s.actual_unit_cost)}
                                        </td>
                                        <td className="px-1 py-0.5 text-right tabular-nums">
                                          {money(s.avg_unit_cost_at_ship)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 pb-1">
                Realized P&L on snapshotted shipped qty (net returns). Pre-GST sell rate. Same sales
                value for Actual and Avg views; only COGS method differs.
              </p>
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}
