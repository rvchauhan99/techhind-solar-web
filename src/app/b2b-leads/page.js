"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  IconPlus,
  IconChartPie,
  IconLayoutKanban,
  IconList,
  IconHome,
  IconUserPlus,
  IconDownload,
} from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import LeadListFilterPanel from "@/components/common/LeadListFilterPanel";
import { EMPTY_VALUES } from "@/components/common/LeadListFilterPanel";
import ListView from "./ListView";
import KanbanBoard from "./KanbanBoard";
import b2bLeadService from "@/services/b2bLeadService";
import Input from "@/components/common/Input";
import {
  B2B_STATUS_OPTIONS,
  B2B_PRIORITY_OPTIONS,
} from "./b2bLeadFilterOptions";
import { toast } from "sonner";

export default function B2bLeadsPage() {
  const router = useRouter();
  const [view, setView] = useState("kanban");
  const [kanbanLeads, setKanbanLeads] = useState([]);
  const [kanbanFilters, setKanbanFilters] = useState(EMPTY_VALUES);
  const [extraDraft, setExtraDraft] = useState({ company_name: "", city: "" });
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
      const res = await b2bLeadService.getB2bLeads({
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
  }, [buildApiFilters]);

  useEffect(() => {
    if (view === "kanban") {
      loadKanbanLeads(kanbanFilters);
    }
  }, [view, loadKanbanLeads, kanbanFilters]);

  useEffect(() => {
    setExtraDraft({
      company_name: kanbanFilters.company_name || "",
      city: kanbanFilters.city || "",
    });
  }, [kanbanFilters.company_name, kanbanFilters.city]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const filters =
        view === "kanban" ? buildApiFilters(kanbanFilters) : buildApiFilters(kanbanFilters);
      const blob = await b2bLeadService.exportB2bLeads(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `b2b-leads-${new Date().toISOString().split("T")[0]}.xlsx`;
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
  }, [view, kanbanFilters, buildApiFilters]);

  const extraFields = (
    <>
      <Input
        name="company_name"
        label="Company Name"
        placeholder="Company name"
        value={extraDraft.company_name}
        onChange={(e) =>
          setExtraDraft((prev) => ({ ...prev, company_name: e.target.value }))
        }
      />
      <Input
        name="city"
        label="City"
        placeholder="City"
        value={extraDraft.city}
        onChange={(e) => setExtraDraft((prev) => ({ ...prev, city: e.target.value }))}
      />
    </>
  );

  return (
    <ProtectedRoute>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold flex-1">B2B Leads</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              onClick={() => router.push("/b2b-leads/add")}
            >
              <IconPlus className="mr-2 size-4" />
              Add Lead
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/b2b-leads/assign")}
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
              onClick={() => router.push("/b2b-leads/analysis")}
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
                setKanbanFilters({
                  ...v,
                  company_name: extraDraft.company_name || "",
                  city: extraDraft.city || "",
                });
              }}
              onClear={() => {
                setExtraDraft({ company_name: "", city: "" });
                setKanbanFilters(EMPTY_VALUES);
              }}
              defaultOpen={false}
              hideFields={["customer_name", "campaign_id", "inquiry_source_id", "branch_id"]}
              statusOptions={B2B_STATUS_OPTIONS}
              priorityOptions={B2B_PRIORITY_OPTIONS}
              extraFields={extraFields}
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
            <ListView sharedFilters={kanbanFilters} />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
