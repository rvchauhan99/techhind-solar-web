"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconSpeakerphone } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import EmptyState from "@/components/common/EmptyState";
import { unwrap } from "@/lib/apiUnwrap";
import { toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatRange(row) {
  const start = row.start_date || "—";
  const end = row.end_date || "Open";
  return `${start} → ${end}`;
}

export default function HrmsAnnouncementsFeedPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await hrmsService.getMyAnnouncements();
        if (cancelled) return;
        const payload = unwrap(res) || {};
        setItems(payload.data || []);
        setMeta(payload.meta || null);
      } catch (err) {
        toastErrorFromApi(err, "Could not load announcements");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ProtectedRoute>
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">My Announcements</h1>
            <p className="text-sm text-muted-foreground">
              Active announcements for your department
              {meta?.department_id ? ` (#${meta.department_id})` : ""}.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => router.push("/hrms")}>
            Back to HRMS
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={IconSpeakerphone}
            title="No announcements"
            description={
              meta?.department_id
                ? "Nothing active for your department right now."
                : "Link an active employee profile with a department to see announcements."
            }
          />
        ) : (
          <ul className="divide-y rounded-md border border-border">
            {items.map((row) => (
              <li key={row.id} className="px-3 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm font-semibold text-foreground">{row.title}</div>
                  <div className="text-xs text-muted-foreground">{formatRange(row)}</div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                  {stripHtml(row.description)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProtectedRoute>
  );
}
