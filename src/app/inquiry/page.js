"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import KanbanBoard from "./KanbanBoard";
import ListView from "./ListView";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import CsvImportDialog from "@/components/common/CsvImportDialog";
import { useRouter, useSearchParams } from "next/navigation";
import inquiryService from "@/services/inquiryService";
import { useAuth } from "@/hooks/useAuth";
import {
  IconPlus,
  IconFileDescription,
  IconList,
  IconChecklist,
  IconLayoutKanban,
  IconBan,
  IconDownload,
  IconChartPie,
} from "@tabler/icons-react";
import Container from "@/components/container";
import InquiryFilterPanel from "@/components/common/InquiryFilterPanel";

const INQUIRY_IMPORT_GUIDELINES = [
  "Download the sample CSV and fill required columns (Customer Name, Mobile Number, Date of Inquiry). Dates accept DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD.",
  "Upload the full file — valid rows are saved immediately; failed rows appear in the table below.",
  "If any rows fail: download Error CSV, fix only those rows, then upload that file again (do not re-upload already created rows).",
];

const ANALYSIS_FILTER_KEYS = [
  "status",
  "handled_by",
  "inquiry_source",
  "branch_name",
  "project_scheme",
  "date_of_inquiry_from",
  "date_of_inquiry_to",
  "next_reminder_date_from",
  "next_reminder_date_to",
  "created_at_from",
  "created_at_to",
  "is_dead",
];

function filtersFromSearchParams(searchParams) {
  const values = {};
  ANALYSIS_FILTER_KEYS.forEach((key) => {
    const v = searchParams.get(key);
    if (v != null && String(v).trim() !== "") values[key] = v;
  });
  return values;
}

export default function InquiryPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  const [view, setView] = useState("kanban");
  const [inquiries, setInquiries] = useState([]);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [showAssignment, setShowAssignment] = useState(false);
  const [showDeadOnly, setShowDeadOnly] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydratedFromUrlRef = useRef(false);

  // --- Advanced Filter Panel state ---
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterValues, setFilterValues] = useState({});

  // Hydrate filters from analysis drill-down query params (once)
  useEffect(() => {
    if (hydratedFromUrlRef.current) return;
    const fromUrl = filtersFromSearchParams(searchParams);
    if (Object.keys(fromUrl).length === 0) {
      hydratedFromUrlRef.current = true;
      return;
    }
    hydratedFromUrlRef.current = true;
    const next = { ...fromUrl };
    if (next.is_dead === "true") {
      setShowDeadOnly(true);
      setView("list");
      delete next.is_dead;
    }
    if (next.status === "Converted" || next.status === "all") {
      setView("list");
    }
    setFilterValues(next);
    setReloadTrigger((prev) => prev + 1);
  }, [searchParams]);

  // Build active filter params (strip empty values)
  const activeFilters = useCallback(() => {
    const result = {};
    Object.entries(filterValues).forEach(([k, v]) => {
      if (v != null && String(v).trim() !== "") result[k] = v;
    });
    return result;
  }, [filterValues]);

  // Allow add/import for anyone who has access to the Inquiry module.
  const canAccessInquiryModule = currentPerm.can_create || currentPerm.can_read;

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await inquiryService.exportInquiries({ is_dead: showDeadOnly, ...activeFilters() });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inquiries-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to export inquiries");
    } finally {
      setExporting(false);
    }
  }, [showDeadOnly, activeFilters]);
  const fetchingRef = useRef(null);

  const loadInquiries = useCallback(async () => {
    const requestId = Symbol();
    if (fetchingRef.current !== null) return;
    fetchingRef.current = requestId;
    try {
      const res = await inquiryService.getInquiries({
        is_dead: showDeadOnly,
        page: 1,
        limit: 10000,
        ...activeFilters(),
      });
      if (fetchingRef.current === requestId) {
        const result = res?.result ?? res?.data ?? res;
        const payload = Array.isArray(result) ? result : (result?.data ?? []);
        setInquiries(Array.isArray(payload) ? payload : []);
      }
    } catch (e) {
      if (fetchingRef.current === requestId) {
        console.error("Failed to load inquiries", e);
        setInquiries([]);
      }
    } finally {
      if (fetchingRef.current === requestId) fetchingRef.current = null;
    }
  }, [showDeadOnly, activeFilters]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries, reloadTrigger]);

  const handleRefreshInquiries = useCallback(async () => {
    try {
      const res = await inquiryService.getInquiries({
        is_dead: showDeadOnly,
        page: 1,
        limit: 10000,
        ...activeFilters(),
      });
      const result = res?.result ?? res?.data ?? res;
      const payload = Array.isArray(result) ? result : (result?.data ?? []);
      setInquiries(Array.isArray(payload) ? payload : []);
    } catch (e) {
      console.error("Failed to refresh inquiries", e);
    }
  }, [showDeadOnly, activeFilters]);

  const handleFilterApply = useCallback((values) => {
    setFilterValues(values);
    setFilterPanelOpen(false);
    setReloadTrigger((prev) => prev + 1);
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
    setReloadTrigger((prev) => prev + 1);
  }, []);

  return (
    <ProtectedRoute>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold flex-1">Inquiry</h1>
          <div className="flex flex-wrap items-center gap-2">
            {canAccessInquiryModule && (
              <Button onClick={() => router.push("/inquiry/add")}>
                <IconPlus className="mr-2 size-4" />
                New Inquiry
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push("/inquiry/analysis")}
            >
              <IconChartPie className="mr-2 size-4" />
              Analysis
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
            >
              <IconDownload className="mr-2 size-4" />
              {exporting ? "Exporting..." : "Export"}
            </Button>
            {canAccessInquiryModule && (
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(true)}
              >
                <IconFileDescription className="mr-2 size-4" />
                Import Inquiry
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setView("list");
                setShowAssignment(true);
                setShowDeadOnly(false);
              }}
            >
              <IconChecklist className="mr-2 size-4" />
              Assign Inquiry
            </Button>
            <Button
              variant={showDeadOnly ? "destructive" : "outline"}
              onClick={() => {
                if (showDeadOnly) {
                  setShowDeadOnly(false);
                } else {
                  setView("list");
                  setShowDeadOnly(true);
                  setShowAssignment(false);
                }
              }}
            >
              <IconBan className="mr-2 size-4" />
              Dead Inquiry
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const newView = view === "kanban" ? "list" : "kanban";
                setView(newView);
                setShowAssignment(false);
                setShowDeadOnly(false);
              }}
            >
              {view === "kanban" ? (
                <>
                  <IconList className="mr-2 size-4" />
                  List
                </>
              ) : (
                <>
                  <IconLayoutKanban className="mr-2 size-4" />
                  Kanban
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Advanced Filter Panel */}
        <div className="shrink-0">
          <InquiryFilterPanel
            open={filterPanelOpen}
            onToggle={setFilterPanelOpen}
            values={filterValues}
            onApply={handleFilterApply}
            onClear={handleFilterClear}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden pb-10">
          {view === "kanban" ? (
            <KanbanBoard
              inquiries={inquiries}
              onRefresh={handleRefreshInquiries}
            />
          ) : (
            <ListView
              onRefresh={handleRefreshInquiries}
              showAssignment={showAssignment}
              filterParams={{ is_dead: showDeadOnly, ...activeFilters() }}
            />
          )}
        </div>

        <CsvImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          title="Import Inquiries"
          guidelines={INQUIRY_IMPORT_GUIDELINES}
          sampleFileName="inquiry-import-sample.csv"
          errorCsvFileName="inquiry-import-errors.csv"
          resultCsvFileName="inquiry-import-result.csv"
          onDownloadSample={() => inquiryService.downloadInquiryImportSample()}
          onUpload={async (file) => {
            const data = await inquiryService.uploadInquiryCsv(file);
            const payload = data?.result ?? data;
            return payload?.inserted != null || payload?.errors
              ? payload
              : (payload?.result ?? payload);
          }}
          onImportSuccess={() => {
            handleRefreshInquiries();
            setReloadTrigger((prev) => prev + 1);
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
