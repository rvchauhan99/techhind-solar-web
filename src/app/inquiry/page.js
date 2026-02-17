"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import KanbanBoard from "./KanbanBoard";
import ListView from "./ListView";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { useRouter } from "next/navigation";
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
  IconUpload,
} from "@tabler/icons-react";
import Container from "@/components/container";

export default function InquiryPage() {
  const { modulePermissions, currentModuleId } = useAuth();
  const currentPerm = modulePermissions?.[currentModuleId] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  const [query, setQuery] = useState("");
  const [view, setView] = useState("kanban");
  const [inquiries, setInquiries] = useState([]);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [showAssignment, setShowAssignment] = useState(false);
  const [showDeadOnly, setShowDeadOnly] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const importFileInputRef = useRef(null);
  const router = useRouter();

  // Allow add/import for anyone who has access to the Inquiry module.
  const canAccessInquiryModule = currentPerm.can_create || currentPerm.can_read;

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await inquiryService.exportInquiries({ q: query || undefined, is_dead: showDeadOnly });
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
  }, [query, showDeadOnly]);
  const fetchingRef = useRef(null);

  const loadInquiries = useCallback(async () => {
    const requestId = Symbol();
    if (fetchingRef.current !== null) return;
    fetchingRef.current = requestId;
    try {
      const res = await inquiryService.getInquiries({
        q: query || undefined,
        is_dead: showDeadOnly,
        page: 1,
        limit: 10000,
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
  }, [query, showDeadOnly]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries, reloadTrigger]);

  const handleRefreshInquiries = useCallback(async () => {
    try {
      const res = await inquiryService.getInquiries({
        q: query || undefined,
        is_dead: showDeadOnly,
        page: 1,
        limit: 10000,
      });
      const result = res?.result ?? res?.data ?? res;
      const payload = Array.isArray(result) ? result : (result?.data ?? []);
      setInquiries(Array.isArray(payload) ? payload : []);
    } catch (e) {
      console.error("Failed to refresh inquiries", e);
    }
  }, [query, showDeadOnly]);

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
              onClick={handleExport}
              disabled={exporting}
            >
              <IconDownload className="mr-2 size-4" />
              {exporting ? "Exporting..." : "Export"}
            </Button>
            {canAccessInquiryModule && (
              <Button
                variant="outline"
                onClick={() => {
                  setImportDialogOpen(true);
                  setImportResult(null);
                }}
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

        <div className="min-h-0 flex-1 overflow-hidden">
          {view === "kanban" ? (
            <KanbanBoard
              search={query}
              inquiries={inquiries}
              onRefresh={handleRefreshInquiries}
            />
          ) : (
            <ListView
              onRefresh={handleRefreshInquiries}
              showAssignment={showAssignment}
              filterParams={{ is_dead: showDeadOnly }}
            />
          )}
        </div>

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Import Inquiries</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const blob = await inquiryService.downloadInquiryImportSample();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "inquiry-import-sample.csv";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast.success("Sample CSV downloaded");
                    } catch (e) {
                      toast.error(e?.response?.data?.message || e?.message || "Failed to download sample");
                    }
                  }}
                >
                  <IconDownload className="mr-2 size-4" />
                  Download sample CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={importing}
                  onClick={() => importFileInputRef.current?.click()}
                >
                  <IconUpload className="mr-2 size-4" />
                  {importing ? "Uploading..." : "Upload CSV"}
                </Button>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setImporting(true);
                    setImportResult(null);
                    try {
                      const data = await inquiryService.uploadInquiryCsv(file);
                      const result = data?.result ?? data;
                      setImportResult(result);
                      const inserted = result?.inserted ?? 0;
                      const failed = result?.failed ?? 0;
                      const total = result?.total ?? 0;
                      if (inserted > 0) {
                        toast.success(`${inserted} inquiry(s) imported`);
                        handleRefreshInquiries();
                        setReloadTrigger((prev) => prev + 1);
                      }
                      if (failed > 0) {
                        toast.warning(`${failed} row(s) failed`);
                      }
                    } catch (err) {
                      toast.error(err?.response?.data?.message || err?.message || "Upload failed");
                      setImportResult({ inserted: 0, failed: 0, total: 0, errors: [{ row: 0, message: err?.response?.data?.message || err?.message || "Upload failed" }] });
                    } finally {
                      setImporting(false);
                      e.target.value = "";
                    }
                  }}
                />
              </div>
              {importResult != null && (
                <div className="space-y-2 rounded-md border border-border p-3 text-sm">
                  <p className="font-medium">
                    {importResult.inserted} created, {importResult.failed} failed out of {importResult.total} row(s).
                  </p>
                  {importResult.errors?.length > 0 && (
                    <ul className="max-h-32 list-inside list-disc overflow-y-auto text-destructive">
                      {importResult.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>
                          Row {err.row}: {err.message}
                        </li>
                      ))}
                      {importResult.errors.length > 10 && (
                        <li className="text-muted-foreground">… and {importResult.errors.length - 10} more</li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
