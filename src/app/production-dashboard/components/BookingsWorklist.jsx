"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Loader from "@/components/common/Loader";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import productionBookingService from "@/services/productionBookingService";
import { formatDate } from "@/utils/dataTableUtils";
import { getApiErrorMessage } from "@/utils/toast";
import { toast } from "sonner";
import { AP, formatQty, mapDashboardFiltersToBookingListQuery, money } from "./productionDashboardUi";

const PAGE_SIZE = 10;

export default function BookingsWorklist({ filters }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);

  const load = (page = 1) => {
    setLoading(true);
    productionBookingService
      .getProductionBookings({
        ...mapDashboardFiltersToBookingListQuery(filters),
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

  const handleOpen = async (id) => {
    setLoadingRecord(true);
    setSidebarOpen(true);
    try {
      const res = await productionBookingService.getProductionBookingById(id);
      setSelectedBooking(res?.result || res);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load booking"));
      setSidebarOpen(false);
    } finally {
      setLoadingRecord(false);
    }
  };

  const sidebarContent = useMemo(() => {
    if (loadingRecord) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
    if (!selectedBooking) return null;
    const b = selectedBooking;
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{b.booking_no}</span>
          <Badge variant="secondary">{b.status}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div><span className="text-muted-foreground">{AP.orders.singular}</span><br />{b.productionOrder?.order_no || "-"}</div>
          <div><span className="text-muted-foreground">Date</span><br />{b.booking_date ? formatDate(b.booking_date) : "-"}</div>
          <div><span className="text-muted-foreground">Good</span><br />{b.good_quantity}</div>
          <div><span className="text-muted-foreground">Rejected</span><br />{b.rejected_quantity}</div>
          <div className="col-span-2"><span className="text-muted-foreground">Total Cost</span><br />{money(b.total_cost)}</div>
        </div>
      </div>
    );
  }, [loadingRecord, selectedBooking]);

  return (
    <>
      <div id="dashboard-bookings" className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-2.5 py-1.5">
          <h3 className="text-[11px] font-bold uppercase tracking-tight text-slate-700">Posted Bookings</h3>
        </div>
        <div className="relative min-h-[180px] overflow-x-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader />
            </div>
          ) : (
            <table className="min-w-[900px] w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold">Booking No</th>
                  <th className="px-2 py-1 text-left font-semibold">Date</th>
                  <th className="px-2 py-1 text-left font-semibold">{AP.orders.orderNo}</th>
                  <th className="px-2 py-1 text-left font-semibold">Warehouse</th>
                  <th className="px-2 py-1 text-right font-semibold">Good</th>
                  <th className="px-2 py-1 text-right font-semibold">Rejected</th>
                  <th className="px-2 py-1 text-right font-semibold">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-6 text-center text-muted-foreground">
                      No posted bookings in the selected period.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-t border-border hover:bg-green-50/40"
                      onClick={() => handleOpen(row.id)}
                    >
                      <td className="px-2 py-1 font-semibold">{row.booking_no}</td>
                      <td className="px-2 py-1">{row.booking_date ? formatDate(row.booking_date) : "-"}</td>
                      <td className="px-2 py-1">{row.productionOrder?.order_no || "-"}</td>
                      <td className="px-2 py-1">{row.warehouse?.name || "-"}</td>
                      <td className="px-2 py-1 text-right">{formatQty(row.good_quantity)}</td>
                      <td className="px-2 py-1 text-right">{formatQty(row.rejected_quantity)}</td>
                      <td className="px-2 py-1 text-right">{money(row.total_cost)}</td>
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

      <DetailsSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} title="Booking Details">
        {sidebarContent}
      </DetailsSidebar>
    </>
  );
}
