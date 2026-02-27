"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
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
} from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import LeadListFilterPanel from "@/components/common/LeadListFilterPanel";
import { EMPTY_VALUES, DEFAULT_FILTER_LAST_30_DAYS } from "@/components/common/LeadListFilterPanel";
import ListView from "./ListView";
import KanbanBoard from "./KanbanBoard";
import marketingLeadsService from "@/services/marketingLeadsService";

export default function MarketingLeadsPage() {
  const router = useRouter();
  const [view, setView] = useState("list");
  const [kanbanLeads, setKanbanLeads] = useState([]);
  const [kanbanFilters, setKanbanFilters] = useState(DEFAULT_FILTER_LAST_30_DAYS);
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
      const res = await marketingLeadsService.getMarketingLeads({
        page: 1,
        limit: 10000,
        ...apiFilters,
      });
      const payload = res?.result ?? res?.data ?? res;
      const data = Array.isArray(payload) ? payload : payload?.data ?? [];
      const list = Array.isArray(data) ? data : [];
      const statusFilter = apiFilters?.status;
      const filtered =
        !statusFilter || statusFilter === ""
          ? list.filter((lead) => lead.status !== "converted")
          : list;
      setKanbanLeads(filtered);
    } catch (e) {
      setKanbanLeads([]);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (view === "kanban") {
      loadKanbanLeads(kanbanFilters);
    }
  }, [view]);

  return (
    <ProtectedRoute>
      <div className="w-full pt-2 flex flex-col h-full overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 shrink-0">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-800">
              Marketing Leads
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push("/marketing-leads/add")}
            >
              <IconPlus className="size-4 mr-1.5" />
              Add Lead
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/marketing-leads/upload")}
            >
              <IconUpload className="size-4 mr-1.5" />
              Import Leads
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/marketing-leads/call-report")}
            >
              <IconPhoneCall className="size-4 mr-1.5" />
              Call Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/marketing-leads/assign")}
            >
              <IconUserPlus className="size-4 mr-1.5" />
              Assign Leads
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/marketing-leads/analysis")}
            >
              <IconReport className="size-4 mr-1.5" />
              Summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/marketing-leads/analysis")}
            >
              <IconChartPie className="size-4 mr-1.5" />
              Analysis
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setView((prev) => (prev === "kanban" ? "list" : "kanban"))
              }
            >
              {view === "kanban" ? (
                <>
                  <IconList className="size-4 mr-1.5" />
                  List View
                </>
              ) : (
                <>
                  <IconLayoutKanban className="size-4 mr-1.5" />
                  Kanban View
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/home")}
            >
              <IconHome className="size-4 mr-1.5" />
              Home
            </Button>
          </div>
        </div>
        {view === "kanban" ? (
          <div className="w-full flex-1 flex flex-col min-h-0">
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
            <KanbanBoard leads={kanbanLeads} />
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col min-h-0">
            <ListView />
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

