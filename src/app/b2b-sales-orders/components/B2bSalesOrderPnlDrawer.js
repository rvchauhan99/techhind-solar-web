"use client";

import { Fragment, useEffect, useState } from "react";
import { Drawer, IconButton } from "@mui/material";
import { IconX, IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import Loader from "@/components/common/Loader";
import b2bSalesOrderService from "@/services/b2bSalesOrderService";
import { formatCurrency } from "@/utils/dataTableUtils";

function SummaryCell({ label, value, emphasize = false }) {
  return (
    <div className="min-w-0 rounded border border-slate-200 bg-slate-50/80 px-2 py-1">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 leading-none mb-0.5">{label}</p>
      <p className={`text-xs font-semibold tabular-nums ${emphasize ? "text-emerald-700" : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}

export default function B2bSalesOrderPnlDrawer({ open, onClose, orderId, orderNo }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pnl, setPnl] = useState(null);
  const [expandedLine, setExpandedLine] = useState(null);

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
        setError(err?.response?.data?.message || err?.message || "Failed to load PNL");
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

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 520 } } }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">Order PNL</p>
            <p className="text-[11px] text-slate-500 truncate">{orderNo || `#${orderId}`}</p>
          </div>
          <IconButton size="small" aria-label="Close" onClick={onClose}>
            <IconX size={18} />
          </IconButton>
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
              PNL available for shipments after cost snapshot go-live. This order has no snapshotted deliveries yet.
            </div>
          ) : (
            <>
              {pnl.actual_incomplete ? (
                <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
                  Some serials had missing purchase unit price — Actual COGS may be incomplete.
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                <SummaryCell label="Shipped revenue" value={money(pnl.shipped_revenue)} />
                <SummaryCell label="Actual COGS" value={money(pnl.actual_cogs)} />
                <SummaryCell label="Avg COGS" value={money(pnl.avg_cogs)} />
                <SummaryCell label="Actual PNL" value={money(pnl.actual_pnl)} emphasize />
                <SummaryCell label="Avg PNL" value={money(pnl.avg_pnl)} />
              </div>

              <div className="rounded border border-slate-200 overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-1.5 py-1 text-left font-semibold">Product</th>
                      <th className="px-1.5 py-1 text-right font-semibold">Qty</th>
                      <th className="px-1.5 py-1 text-right font-semibold">Sell</th>
                      <th className="px-1.5 py-1 text-right font-semibold">Act COGS</th>
                      <th className="px-1.5 py-1 text-right font-semibold">Avg COGS</th>
                      <th className="px-1.5 py-1 text-right font-semibold">Act PNL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pnl.lines || []).map((line) => {
                      const open = expandedLine === line.order_item_id;
                      const serials = serialsForProduct(line.product_id);
                      const hasSerials = serials.length > 0;
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
                                      setExpandedLine(open ? null : line.order_item_id)
                                    }
                                  >
                                    {open ? (
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
                                  {line.product_code ? (
                                    <p className="text-[10px] text-slate-400">{line.product_code}</p>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{line.net_delivered_qty}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{money(line.shipped_revenue)}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{money(line.actual_cogs)}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums">{money(line.avg_cogs)}</td>
                            <td className="px-1.5 py-1 text-right tabular-nums font-semibold text-emerald-700">
                              {money(line.actual_pnl)}
                            </td>
                          </tr>
                          {hasSerials && open ? (
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
                                      <tr key={`${s.serial_id}-${s.serial_number}`} className="border-t border-slate-50">
                                        <td className="px-1 py-0.5 font-mono">{s.serial_number || "—"}</td>
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
              <p className="text-[10px] text-slate-400">
                Realized PNL on snapshotted shipped qty (net returns). Pre-GST sell rate. Cancelled/pending excluded.
              </p>
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}
