"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconPlus,
  IconUpload,
  IconPhoneCall,
  IconUserPlus,
  IconReport,
  IconChartPie,
  IconLayoutKanban,
  IconList,
  IconHome,
  IconDownload,
} from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import LeadListFilterPanel from "@/components/common/LeadListFilterPanel";
import { EMPTY_VALUES, DEFAULT_FILTER_LAST_30_DAYS } from "@/components/common/LeadListFilterPanel";
import ListView from "./ListView";
import KanbanBoard from "./KanbanBoard";
import marketingLeadsService from "@/services/marketingLeadsService";
import { toast } from "sonner";

/** Filter keys persisted in the URL by ListView (useListingQueryState). */
const LIST_EXPORT_FILTER_KEYS = [
  "customer_name",
  "mobile_number",
  "branch_id",
  "inquiry_source_id",
  "status",
  "priority",
  "campaign_name",
  "campaign_id",
  "created_from",
  "created_to",
  "next_follow_up_from",
  "next_follow_up_to",
  "not_status",
  "assigned_to",
  "product_interest",
  "lead_segment",
];

export default function MarketingLeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState(() => (searchParams.get("view") === "list" ? "list" : "kanban"));
  const [kanbanLeads, setKanbanLeads] = useState([]);
  const [kanbanFilters, setKanbanFilters] = useState(DEFAULT_FILTER_LAST_30_DAYS);
  const [exporting, setExporting] = useState(false);
  const loadingRef = useRef(false);

  const buildApiFilters = useCallback((filters = {}) => {
    const result = {};
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const cleaned = value
          .map((v) => String(v).trim())
          .filter((v) => v !== "");
        if (cleaned.length) {
          result[key] = cleaned.join(",");
        }
      } else if (value != null && String(value).trim() !== "") {
        result[key] = value;
      }
    });
    return result;
  }, []);

  const loadKanbanLeads = useCallback(async (filters = {}) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const apiFilters = buildApiFilters(filters);
      const hasStatusFilter = Array.isArray(filters?.status)
        ? filters.status.length > 0
        : filters?.status != null && String(filters.status).trim() !== "";
      if (!hasStatusFilter && !apiFilters.not_status) {
        apiFilters.not_status = "junk";
      }
      const res = await marketingLeadsService.getMarketingLeads({
        page: 1,
        limit: 10000,
        ...apiFilters,
      });
      const payload = res?.result ?? res?.data ?? res;
      const data = Array.isArray(payload) ? payload : payload?.data ?? [];
      const list = Array.isArray(data) ? data : [];
      setKanbanLeads(list);
    } catch (e) {
      setKanbanLeads([]);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("view") === "list") {
      setView("list");
    }
  }, [searchParams]);

  useEffect(() => {
    if (view === "kanban") {
      loadKanbanLeads(kanbanFilters);
    }
  }, [view]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Kanban filters live in state; list filters are URL params (useListingQueryState).
      const sourceFilters =
        view === "list"
          ? Object.fromEntries(
              LIST_EXPORT_FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""])
            )
          : kanbanFilters;
      const filters = buildApiFilters(sourceFilters);
      if (view === "list") {
        const quickSearch = searchParams.get("q");
        if (quickSearch) filters.q = quickSearch;
      }
      const hasStatusFilter = Array.isArray(sourceFilters?.status)
        ? sourceFilters.status.length > 0
        : sourceFilters?.status != null && String(sourceFilters.status).trim() !== "";
      if (!hasStatusFilter && !filters.not_status) {
        filters.not_status = "junk";
      }
      const blob = await marketingLeadsService.exportMarketingLeads(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marketing-leads-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }, [view, searchParams, kanbanFilters, buildApiFilters]);

  return (
    <ProtectedRoute>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold flex-1">Marketing Leads</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              onClick={() => router.push("/marketing-leads/add")}
            >
              <IconPlus className="mr-2 size-4" />
              Add Lead
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/marketing-leads/upload")}
            >
              <IconUpload className="mr-2 size-4" />
              Import Leads
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/marketing-leads/call-report")}
            >
              <IconPhoneCall className="mr-2 size-4" />
              Call Report
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/marketing-leads/assign")}
            >
              <IconUserPlus className="mr-2 size-4" />
              Assign Leads
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
            >
              <IconDownload className="mr-2 size-4" />
              {exporting ? "Exporting…" : "Export"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/marketing-leads/analysis")}
            >
              <IconChartPie className="mr-2 size-4" />
              Analysis
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                setView((prev) => (prev === "kanban" ? "list" : "kanban"))
              }
            >
              {view === "kanban" ? (
                <>
                  <IconList className="mr-2 size-4" />
                  List View
                </>
              ) : (
                <>
                  <IconLayoutKanban className="mr-2 size-4" />
                  Kanban View
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/home")}
            >
              <IconHome className="mr-2 size-4" />
              Home
            </Button>
          </div>
        </div>
        {view === "kanban" && (
          <div className="shrink-0">
            <LeadListFilterPanel
              values={kanbanFilters}
              onApply={(v) => {
                setKanbanFilters(v);
                loadKanbanLeads(v);
              }}
              onClear={() => {
                setKanbanFilters(EMPTY_VALUES);
                loadKanbanLeads(EMPTY_VALUES);
              }}
              defaultOpen={false}
            />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-hidden pb-10">
          {view === "kanban" ? (
            <KanbanBoard
              leads={kanbanLeads}
              onRefresh={() => loadKanbanLeads(kanbanFilters)}
            />
          ) : (
            <ListView />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

