"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import serviceTicketService from "@/services/serviceTicketService";
import { IconClipboardList, IconTool, IconClock, IconMapPin } from "@tabler/icons-react";

const COLUMNS = [
  { key: "assigned", title: "Assigned", statuses: ["assigned"], icon: IconClipboardList, colorClass: "text-blue-500", borderClass: "border-blue-500" },
  { key: "visited", title: "Site Visited", statuses: ["site_visited", "diagnosis_submitted"], icon: IconMapPin, colorClass: "text-amber-500", borderClass: "border-amber-500" },
  { key: "pending_close", title: "Pending Close", statuses: ["awaiting_payment", "awaiting_warranty", "awaiting_material", "service_completed"], icon: IconClock, colorClass: "text-purple-500", borderClass: "border-purple-500" },
  { key: "other", title: "Other", statuses: [], icon: IconTool, colorClass: "text-slate-500", borderClass: "border-slate-400" },
];

const STATUS_COLORS = {
  assigned: "bg-blue-50 text-blue-700",
  site_visited: "bg-amber-50 text-amber-700",
  diagnosis_submitted: "bg-orange-50 text-orange-700",
  awaiting_payment: "bg-emerald-50 text-emerald-700",
  awaiting_warranty: "bg-purple-50 text-purple-700",
  awaiting_material: "bg-indigo-50 text-indigo-700",
  service_completed: "bg-teal-50 text-teal-700",
};

export default function MyServiceTicketsPage() {
  const router = useRouter();
  const [columns, setColumns] = useState({ assigned: [], visited: [], pending_close: [], other: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState({ total: 0, limit: 100 });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await serviceTicketService.getServiceTickets({
        my_tickets_only: true,
        limit: 100,
        sortBy: "updated_at",
        sortOrder: "DESC",
      });
      const result = res?.result || res || {};
      const rows = result?.data || [];
      const pagination = result?.pagination || {};
      const grouped = { assigned: [], visited: [], pending_close: [], other: [] };
      rows.forEach((row) => {
        if (COLUMNS[0].statuses.includes(row.status)) grouped.assigned.push(row);
        else if (COLUMNS[1].statuses.includes(row.status)) grouped.visited.push(row);
        else if (COLUMNS[2].statuses.includes(row.status)) grouped.pending_close.push(row);
        else grouped.other.push(row);
      });
      setColumns(grouped);
      setMeta({
        total: Number(pagination?.total || rows.length || 0),
        limit: Number(pagination?.limit || 100),
      });
    } catch (err) {
      setColumns({ assigned: [], visited: [], pending_close: [], other: [] });
      setError(err?.response?.data?.message || "Failed to load my tickets");
      toast.error(err?.response?.data?.message || "Failed to load my tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ProtectedRoute>
      <ListingPageContainer title="My Service Board" subtitle="Engineer workload and task tracking">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00823b]"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 border border-red-200 bg-red-50 rounded-lg gap-2">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            {meta.total > meta.limit && (
              <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Showing first {meta.limit} of {meta.total} tickets. Refine statuses or search to narrow results.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {COLUMNS.map((col) => {
              const ColumnIcon = col.icon;
              return (
                <div key={col.key} className="flex flex-col h-[calc(100vh-180px)]">
                  <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${col.borderClass}`}>
                    <div className="flex items-center gap-2">
                      <ColumnIcon className={col.colorClass} size={20} />
                      <h3 className="font-semibold text-slate-800">{col.title}</h3>
                    </div>
                    <Badge variant="secondary" className="bg-slate-200 text-slate-700 text-[11px] px-2 rounded-full">
                      {columns[col.key]?.length || 0}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1 scrollbar-thin">
                    {(columns[col.key] || []).map((t) => (
                      <Card 
                        key={t.id}
                        className="cursor-pointer border-slate-200 hover:border-[#00823b]/50 hover:shadow-md transition-all duration-200"
                        onClick={() => router.push(`/service/tickets/${t.id}`)}
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-slate-900 text-sm">{t.ticket_no}</span>
                            <Badge className={`text-[9px] px-1.5 py-0 uppercase tracking-wider shadow-none ${STATUS_COLORS[t.status] || "bg-slate-100 text-slate-600"}`}>
                              {t.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-700 truncate" title={t.customer_name}>
                              {t.customer_name}
                            </p>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">PUI: {t.order_number}</span>
                              <span className="flex items-center gap-1">
                                <IconTool size={12} />
                                {t.call_type}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {(columns[col.key] || []).length === 0 && (
                      <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
                        <ColumnIcon size={32} className="opacity-20 mb-2" />
                        <p className="text-sm">No tickets</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </>
        )}
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
