"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconFilter } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Loader from "@/components/common/Loader";
import productionOrderService from "@/services/productionOrderService";
import { AP, formatQty, mapDashboardFiltersToOrderListQuery } from "./productionDashboardUi";

const PAGE_SIZE = 10;

const getStatusVariant = (status) => {
  if (status === "COMPLETED" || status === "IN_PROGRESS") return "default";
  if (status === "CANCELLED") return "destructive";
  return "secondary";
};

export default function WorkOrdersWorklist({ filters, onOpenFilter }) {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);

  const load = (page = 1) => {
    setLoading(true);
    productionOrderService
      .getProductionOrders({
        ...mapDashboardFiltersToOrderListQuery(filters),
        page,
        limit: PAGE_SIZE,
      })
      .then((res) => {
        const payload = res?.result || res || {};
        setRows(payload.data || []);
        const m = payload.meta || {};
        setMeta({
          page: m.page || page,
          limit: m.limit || PAGE_SIZE,
          total: m.total || 0,
          pages: m.pages || 1,
        });
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  return (
    <div id="dashboard-work-orders" className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-2.5 py-1.5">
        <h3 className="text-[11px] font-bold uppercase tracking-tight text-slate-700">{AP.orders.title}</h3>
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={onOpenFilter}>
          <IconFilter className="size-3" /> Filter
        </Button>
      </div>
      <div className="relative min-h-[180px] overflow-x-auto">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader />
          </div>
        ) : (
          <table className="min-w-[960px] w-full text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="px-2 py-1 text-left font-semibold">{AP.orders.orderNo}</th>
                <th className="px-2 py-1 text-left font-semibold">Warehouse</th>
                <th className="px-2 py-1 text-left font-semibold">Finished Good</th>
                <th className="px-2 py-1 text-right font-semibold">Planned</th>
                <th className="px-2 py-1 text-right font-semibold">Produced</th>
                <th className="px-2 py-1 text-right font-semibold">Pending</th>
                <th className="px-2 py-1 text-right font-semibold">Done %</th>
                <th className="px-2 py-1 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">
                    No work orders match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-border hover:bg-green-50/40"
                    onClick={() => router.push(`/production-orders/${row.id}`)}
                  >
                    <td className="px-2 py-1 font-semibold text-green-700">{row.order_no}</td>
                    <td className="px-2 py-1">{row.warehouse?.name || "-"}</td>
                    <td className="px-2 py-1">{row.fgProduct?.product_name || "-"}</td>
                    <td className="px-2 py-1 text-right">{formatQty(row.planned_quantity)}</td>
                    <td className="px-2 py-1 text-right">{formatQty(row.produced_quantity)}</td>
                    <td className="px-2 py-1 text-right">{formatQty(row.pending_quantity)}</td>
                    <td className="px-2 py-1 text-right">{Number(row.completion_percent || 0).toFixed(0)}%</td>
                    <td className="px-2 py-1">
                      <Badge variant={getStatusVariant(row.status)} className="px-1.5 py-0 text-[10px]">
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-2.5 py-1.5 text-[10px] text-slate-600">
        <span>
          {meta.total} total · page {meta.page} / {Math.max(meta.pages, 1)}
        </span>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="outline" className="h-6 px-2" disabled={meta.page <= 1 || loading} onClick={() => load(meta.page - 1)}>
            Prev
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-6 px-2" disabled={meta.page >= meta.pages || loading} onClick={() => load(meta.page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
