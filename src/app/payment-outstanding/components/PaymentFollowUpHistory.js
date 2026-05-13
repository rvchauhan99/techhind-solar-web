"use client";

import { useEffect, useState } from "react";
import paymentOutstandingService from "@/services/paymentOutstandingService";

export default function PaymentFollowUpHistory({ orderId, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await paymentOutstandingService.listFollowUps(orderId, { limit: 200 });
        if (mounted) setRows(Array.isArray(data) ? data : (data?.data || []));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [orderId, refreshKey]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="bg-muted px-2 py-1.5 text-[11px] font-semibold text-muted-foreground">Previous Follow-Ups</div>
      <div className="max-h-[320px] overflow-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr className="[&_th]:text-left [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-[10px] [&_th]:uppercase [&_th]:text-muted-foreground">
              <th>Contacted At</th>
              <th>Channel</th>
              <th>Outcome</th>
              <th>Promised Amt</th>
              <th>Next Follow-Up</th>
              <th>Remarks</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-3 text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-3 text-muted-foreground">No follow-ups recorded yet.</td></tr>
            ) : rows.map((fu) => (
              <tr key={fu.id} className="border-b border-border last:border-b-0">
                <td className="px-2 py-1">{fu.contacted_at ? new Date(fu.contacted_at).toLocaleString() : "-"}</td>
                <td className="px-2 py-1 capitalize">{fu.contact_channel || "-"}</td>
                <td className="px-2 py-1">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                    {(fu.outcome || "-").replaceAll("_", " ")}
                  </span>
                </td>
                <td className="px-2 py-1">₹{Number(fu.promised_amount || 0).toLocaleString("en-IN")}</td>
                <td className="px-2 py-1">{fu.next_follow_up_at ? new Date(fu.next_follow_up_at).toLocaleString() : "-"}</td>
                <td className="px-2 py-1 max-w-[240px] truncate" title={fu.notes || ""}>{fu.notes || "-"}</td>
                <td className="px-2 py-1">{fu.createdByUser?.name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

