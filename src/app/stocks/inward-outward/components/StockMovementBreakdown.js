"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconDownload, IconExternalLink } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import stockMovementReportService from "@/services/stockMovementReportService";
import { toastError } from "@/utils/toast";
import { formatRupeesInteger } from "@/utils/orderFormatters";
import { LEDGER_DRILL } from "@/utils/stockLedgerLinks";

const TABS = [
  { id: "by_warehouse", label: "By warehouse" },
  { id: "by_product_type", label: "By product type" },
  { id: "by_flow_bucket", label: "By bucket" },
  { id: "top_products", label: "Top products" },
];

const BUCKET_LABELS = {
  procurement_in: "Procurement IN",
  procurement_out: "Procurement OUT",
  sales_out: "Sales OUT",
  sales_in: "Sales IN",
  transfer: "Transfer",
  production: "Production",
  adjustment: "Adjustment",
  other: "Other",
};

const INR = (v) => Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

/** Numeric cell that drills into Stock Ledger when it has a non-zero value. */
function DrillCell({ href, value, children, className = "" }) {
  const content = children ?? value;
  return (
    <td className={`px-2 py-1 text-right ${className}`}>
      {href && Number(value) ? (
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="text-primary hover:underline tabular-nums"
          title="Open in Stock Ledger"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </td>
  );
}

const ROW_DIMENSION = {
  by_warehouse: (r) => (r.warehouse_id ? { warehouse_id: r.warehouse_id } : null),
  by_product_type: (r) => (r.product_type_id ? { product_type_id: r.product_type_id } : null),
  by_flow_bucket: (r) =>
    r.flow_bucket && r.flow_bucket !== "other" ? { flow_bucket: [r.flow_bucket] } : null,
  top_products: (r) => (r.product_id ? { product_id: r.product_id } : null),
};

export default function StockMovementBreakdown({ breakdowns, filters, ledgerHref }) {
  const router = useRouter();
  const [tab, setTab] = useState("by_warehouse");
  const [exporting, setExporting] = useState(false);

  const rowScope = (r) => ROW_DIMENSION[tab]?.(r) || null;
  const cellHref = (r, drill) => {
    const dim = rowScope(r);
    return dim ? ledgerHref?.({ ...dim, ...drill }) || null : null;
  };
  const rowProps = (r) => {
    const dim = rowScope(r);
    const href = dim ? ledgerHref?.(dim) : null;
    if (!href) return { className: "border-t border-slate-50" };
    return {
      className: "border-t border-slate-50 cursor-pointer hover:bg-slate-50",
      title: "Open in Stock Ledger",
      onClick: (e) => {
        if (e.metaKey || e.ctrlKey) window.open(href, "_blank", "noopener");
        else router.push(href);
      },
    };
  };

  const rows = useMemo(() => breakdowns?.[tab] || [], [breakdowns, tab]);

  const handleExport = async (format) => {
    try {
      setExporting(true);
      const params = {
        start_date: filters?.start_date || undefined,
        end_date: filters?.end_date || undefined,
        warehouse_id: filters?.warehouse_id || undefined,
        product_id: filters?.product_id || undefined,
        product_type_id: filters?.product_type_id || undefined,
        product_make_id: filters?.product_make_id || undefined,
        flow_bucket: filters?.flow_bucket || undefined,
        sales_channel: filters?.sales_channel || undefined,
        breakdown: tab,
      };
      await stockMovementReportService.exportReport(params, format);
    } catch (err) {
      toastError(err?.response?.data?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="rounded-xl border-slate-200 shadow-sm">
      <CardContent className="p-2 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5 justify-between">
          <div className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                  tab === t.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {ledgerHref?.(LEDGER_DRILL.all) ? (
              <Link
                href={ledgerHref(LEDGER_DRILL.all)}
                className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline px-1.5"
              >
                <IconExternalLink size={12} /> Open Stock Ledger
              </Link>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px] px-2"
              disabled={exporting}
              onClick={() => handleExport("csv")}
            >
              <IconDownload size={12} className="mr-1" /> CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px] px-2"
              disabled={exporting}
              onClick={() => handleExport("excel")}
            >
              Excel
            </Button>
          </div>
        </div>

        <div className="overflow-auto max-h-[360px] border border-slate-100 rounded-lg">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50 sticky top-0">
              {tab === "by_warehouse" && (
                <tr className="text-left text-slate-500">
                  <th className="px-2 py-1.5 font-semibold">Warehouse</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Procure IN</th>
                  <th className="px-2 py-1.5 font-semibold text-right">₹ IN</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Sales OUT</th>
                  <th className="px-2 py-1.5 font-semibold text-right">₹ OUT</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Xfer OUT</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Shrink</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Comm. Net</th>
                </tr>
              )}
              {tab === "by_product_type" && (
                <tr className="text-left text-slate-500">
                  <th className="px-2 py-1.5 font-semibold">Product type</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Procure IN</th>
                  <th className="px-2 py-1.5 font-semibold text-right">₹ IN</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Sales OUT</th>
                  <th className="px-2 py-1.5 font-semibold text-right">₹ OUT</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Shrink</th>
                </tr>
              )}
              {tab === "by_flow_bucket" && (
                <tr className="text-left text-slate-500">
                  <th className="px-2 py-1.5 font-semibold">Bucket</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Qty</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Value</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Lines</th>
                  <th className="px-2 py-1.5 font-semibold text-right">% Abs</th>
                </tr>
              )}
              {tab === "top_products" && (
                <tr className="text-left text-slate-500">
                  <th className="px-2 py-1.5 font-semibold">Product</th>
                  <th className="px-2 py-1.5 font-semibold">Type</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Sales OUT</th>
                  <th className="px-2 py-1.5 font-semibold text-right">₹ OUT</th>
                  <th className="px-2 py-1.5 font-semibold text-right">Procure IN</th>
                  <th className="px-2 py-1.5 font-semibold text-right">₹ IN</th>
                </tr>
              )}
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-4 text-center text-slate-400">
                    No rows for current filters
                  </td>
                </tr>
              )}
              {tab === "by_warehouse" &&
                rows.map((r) => (
                  <tr key={r.warehouse_id || r.warehouse_name} {...rowProps(r)}>
                    <td className="px-2 py-1 font-medium text-slate-800">{r.warehouse_name}</td>
                    <DrillCell
                      href={cellHref(r, LEDGER_DRILL.procurementIn)}
                      value={r.procurement_in_qty}
                    >
                      {INR(r.procurement_in_qty)}
                    </DrillCell>
                    <DrillCell
                      href={cellHref(r, LEDGER_DRILL.procurementIn)}
                      value={r.procurement_in_value}
                    >
                      ₹{formatRupeesInteger(r.procurement_in_value)}
                    </DrillCell>
                    <DrillCell href={cellHref(r, LEDGER_DRILL.salesOut)} value={r.sales_out_qty}>
                      {INR(r.sales_out_qty)}
                    </DrillCell>
                    <DrillCell href={cellHref(r, LEDGER_DRILL.salesOut)} value={r.sales_out_value}>
                      ₹{formatRupeesInteger(r.sales_out_value)}
                    </DrillCell>
                    <DrillCell
                      href={cellHref(r, LEDGER_DRILL.transferOut)}
                      value={r.transfer_out_qty}
                    >
                      {INR(r.transfer_out_qty)}
                    </DrillCell>
                    <DrillCell href={cellHref(r, LEDGER_DRILL.shrinkage)} value={r.shrinkage_qty}>
                      {INR(r.shrinkage_qty)}
                    </DrillCell>
                    <DrillCell
                      href={cellHref(r, LEDGER_DRILL.commercialNet)}
                      value={r.commercial_net_qty}
                      className="font-semibold"
                    >
                      {INR(r.commercial_net_qty)}
                    </DrillCell>
                  </tr>
                ))}
              {tab === "by_product_type" &&
                rows.map((r) => (
                  <tr key={r.product_type_id || r.product_type_name} {...rowProps(r)}>
                    <td className="px-2 py-1 font-medium">{r.product_type_name}</td>
                    <DrillCell
                      href={cellHref(r, LEDGER_DRILL.procurementIn)}
                      value={r.procurement_in_qty}
                    >
                      {INR(r.procurement_in_qty)}
                    </DrillCell>
                    <DrillCell
                      href={cellHref(r, LEDGER_DRILL.procurementIn)}
                      value={r.procurement_in_value}
                    >
                      ₹{formatRupeesInteger(r.procurement_in_value)}
                    </DrillCell>
                    <DrillCell href={cellHref(r, LEDGER_DRILL.salesOut)} value={r.sales_out_qty}>
                      {INR(r.sales_out_qty)}
                    </DrillCell>
                    <DrillCell href={cellHref(r, LEDGER_DRILL.salesOut)} value={r.sales_out_value}>
                      ₹{formatRupeesInteger(r.sales_out_value)}
                    </DrillCell>
                    <DrillCell href={cellHref(r, LEDGER_DRILL.shrinkage)} value={r.shrinkage_qty}>
                      {INR(r.shrinkage_qty)}
                    </DrillCell>
                  </tr>
                ))}
              {tab === "by_flow_bucket" &&
                rows.map((r) => (
                  <tr key={r.flow_bucket} {...rowProps(r)}>
                    <td className="px-2 py-1 font-medium">
                      {BUCKET_LABELS[r.flow_bucket] || r.flow_bucket}
                    </td>
                    <DrillCell href={cellHref(r, {})} value={r.qty}>
                      {INR(r.qty)}
                    </DrillCell>
                    <DrillCell href={cellHref(r, {})} value={r.value}>
                      ₹{formatRupeesInteger(r.value)}
                    </DrillCell>
                    <DrillCell href={cellHref(r, {})} value={r.line_count}>
                      {INR(r.line_count)}
                    </DrillCell>
                    <td className="px-2 py-1 text-right">{r.pct_of_absolute}%</td>
                  </tr>
                ))}
              {tab === "top_products" &&
                rows.map((r) => (
                  <tr key={r.product_id} {...rowProps(r)}>
                    <td className="px-2 py-1 font-medium max-w-[180px] truncate">
                      {r.product_name}
                    </td>
                    <td className="px-2 py-1 text-slate-500">{r.product_type_name}</td>
                    <DrillCell href={cellHref(r, LEDGER_DRILL.salesOut)} value={r.sales_out_qty}>
                      {INR(r.sales_out_qty)}
                    </DrillCell>
                    <DrillCell href={cellHref(r, LEDGER_DRILL.salesOut)} value={r.sales_out_value}>
                      ₹{formatRupeesInteger(r.sales_out_value)}
                    </DrillCell>
                    <DrillCell
                      href={cellHref(r, LEDGER_DRILL.procurementIn)}
                      value={r.procurement_in_qty}
                    >
                      {INR(r.procurement_in_qty)}
                    </DrillCell>
                    <DrillCell
                      href={cellHref(r, LEDGER_DRILL.procurementIn)}
                      value={r.procurement_in_value}
                    >
                      ₹{formatRupeesInteger(r.procurement_in_value)}
                    </DrillCell>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
