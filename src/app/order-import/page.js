"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Container from "@/components/container";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Checkbox from "@/components/common/Checkbox";
import { toast } from "sonner";
import { toastError, toastSuccess } from "@/utils/toast";
import { IconDownload, IconUpload, IconTable } from "@tabler/icons-react";
import orderImportService from "@/services/orderImportService";
import PaginatedTable from "@/components/common/PaginatedTable";

function DownloadButton({ disabled, onClick, label, loading }) {
  return (
    <Button onClick={onClick} disabled={disabled || loading} size="sm" className="gap-2">
      <IconDownload className="size-4" />
      {loading ? "Preparing..." : label}
    </Button>
  );
}

export default function OrderImportPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const importFileRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dryRun, setDryRun] = useState(true);
  const [skipExisting, setSkipExisting] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);

  const [running, setRunning] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [results, setResults] = useState([]);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingExcelForJobId, setDownloadingExcelForJobId] = useState(null);

  const [polling, setPolling] = useState(false);

  const resetStateForNewRun = useCallback(() => {
    setJobStatus(null);
    setJobId(null);
    setResults([]);
    setPolling(false);
  }, []);

  const handleOpenDialog = useCallback(() => {
    resetStateForNewRun();
    setUploadDialogOpen(true);
    setFile(null);
    setDryRun(true);
    setSkipExisting(true);
    setUpdateExisting(false);
    if (importFileRef.current) importFileRef.current.value = "";
  }, [resetStateForNewRun]);

  const handleCloseDialog = useCallback(() => {
    setUploadDialogOpen(false);
  }, []);

  const toggleUpdateExisting = useCallback((checked) => {
    setUpdateExisting(checked);
    if (checked) setSkipExisting(false);
  }, []);

  const toggleSkipExisting = useCallback((checked) => {
    setSkipExisting(checked);
    if (checked) setUpdateExisting(false);
  }, []);

  const onFileChange = useCallback((e) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  }, []);

  const downloadSample = useCallback(async () => {
    try {
      const blob = await orderImportService.downloadOrderImportSampleCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "order-import-sample.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Sample CSV downloaded");
    } catch (err) {
      toastError(err?.response?.data?.message || err.message || "Failed to download sample CSV");
    }
  }, []);

  const pollJobUntilDone = useCallback(
    async (id) => {
      setPolling(true);
      try {
        // Polling strategy: short interval; stop as soon as job completes.
        // Backend should return { status } with values like "completed"/"failed".
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const statusRes = await orderImportService.getOrderImportJobStatus(id);
          const status = statusRes?.status || statusRes?.result?.status || statusRes?.data?.status;
          setJobStatus(statusRes);

          if (status === "completed") {
            const resultsRes = await orderImportService.getOrderImportJobResults(id);
            setResults(resultsRes?.results || resultsRes?.result?.results || []);
            return;
          }
          if (status === "failed") {
            toastError(statusRes?.error || statusRes?.result?.error || "Import job failed");
            return;
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
      } finally {
        setPolling(false);
      }
    },
    []
  );

  const runImport = useCallback(async () => {
    if (!file) {
      toastError("Please select a CSV file");
      return;
    }
    if (!skipExisting && !updateExisting) {
      toastError("Select at least one: Skip existing or Update existing");
      return;
    }

    setRunning(true);
    setResults([]);
    setJobStatus(null);
    setJobId(null);

    try {
      const res = await orderImportService.uploadOrderImportCsv(file, {
        dryRun,
        skipExisting,
        updateExisting,
      });

      const resolved = res?.result || res || {};
      const id = resolved.jobId || resolved.job_id || resolved.id;
      if (!id) {
        // Fallback: if backend returns immediate results
        const immediate = resolved.results || resolved.result || resolved.data;
        if (Array.isArray(immediate)) {
          setResults(immediate);
          toastSuccess("Import completed");
        } else {
          toastSuccess("Import request submitted");
        }
        return;
      }

      setJobId(id);
      toastSuccess("Import job started");
      await pollJobUntilDone(id);
    } catch (err) {
      toastError(err?.response?.data?.message || err.message || "Import failed");
    } finally {
      setRunning(false);
    }
  }, [file, dryRun, skipExisting, updateExisting, pollJobUntilDone]);

  const handleDownloadExcel = useCallback(async () => {
    if (!jobId) return;
    setDownloadingExcel(true);
    try {
      const { blob, filename } = await orderImportService.downloadOrderImportJobExcel(jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "order-import-result.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Excel result downloaded");
    } catch (err) {
      toastError(err?.response?.data?.message || err.message || "Failed to download Excel result");
    } finally {
      setDownloadingExcel(false);
    }
  }, [jobId]);

  const handleDownloadExcelForJob = useCallback(async (downloadJobId) => {
    if (!downloadJobId) return;

    setDownloadingExcelForJobId(downloadJobId);
    try {
      const { blob, filename } = await orderImportService.downloadOrderImportJobExcel(downloadJobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `order-import-${downloadJobId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Excel result downloaded");
    } catch (err) {
      toastError(err?.response?.data?.message || err.message || "Failed to download Excel result");
    } finally {
      setDownloadingExcelForJobId(null);
    }
  }, []);

  const handleViewJobResult = useCallback(async (selectedJob) => {
    if (!selectedJob?.id) return;

    setPolling(false);
    setResults([]);
    setJobId(selectedJob.id);
    setJobStatus({ status: selectedJob.status });

    try {
      const res = await orderImportService.getOrderImportJobResults(selectedJob.id);
      const resolved = res?.results || res?.result?.results || [];
      setResults(resolved);
    } catch (err) {
      toastError(err?.response?.data?.message || err.message || "Failed to load job results");
    }
  }, []);

  const formatDateTime = useCallback((value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  }, []);

  const summary = useMemo(() => {
    const completed = jobStatus?.status === "completed";
    const failed = jobStatus?.status === "failed";
    return { completed, failed };
  }, [jobStatus]);

  const historyColumns = useMemo(
    () => [
      { field: "id", label: "Job", render: (row) => row?.id ?? "-" },
      {
        field: "created_at",
        label: "Date/Time",
        sortable: true,
        render: (row) => formatDateTime(row?.created_at),
      },
      { field: "created_by_name", label: "User", render: (row) => row?.created_by_name ?? "-" },
      { field: "dryRun", label: "Dry Run", render: (row) => (row?.dryRun ? "Yes" : "No") },
      {
        field: "skipExisting",
        label: "Skip Existing",
        render: (row) => (row?.skipExisting ? "Yes" : "No"),
      },
      {
        field: "updateExisting",
        label: "Update Existing",
        render: (row) => (row?.updateExisting ? "Yes" : "No"),
      },
      { field: "status", label: "Status", render: (row) => row?.status ?? "-" },
      {
        field: "actions",
        label: "Actions",
        isActionColumn: true,
        sortable: false,
        render: (row) => {
          const isCompleted = row?.status === "completed";
          const isDownloading = downloadingExcelForJobId === row?.id;
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e?.stopPropagation?.();
                  handleViewJobResult(row);
                }}
              >
                View Result
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!isCompleted || isDownloading}
                loading={isDownloading}
                onClick={(e) => {
                  e?.stopPropagation?.();
                  handleDownloadExcelForJob(row?.id);
                }}
              >
                Download Excel
              </Button>
            </div>
          );
        },
      },
    ],
    [formatDateTime, downloadingExcelForJobId, handleDownloadExcelForJob, handleViewJobResult]
  );

  return (
    <ProtectedRoute>
      <Container className="flex flex-col py-4 w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Order Import</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload CSV, run Dry Run (optional), review full row results, and download Excel output.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadSample} disabled={running}>
              <IconDownload className="size-4" />
              Download Sample
            </Button>
            <Button onClick={handleOpenDialog} size="sm" disabled={running} className="gap-2">
              <IconUpload className="size-4" />
              Upload & Import
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-lg px-4 py-3">
          <IconTable className="size-4" />
          <div className="text-sm">
            {jobId ? (
              <>
                Job: <span className="font-semibold">{jobId}</span>
                {jobStatus?.status ? <span className="ml-2 text-muted-foreground">({jobStatus.status})</span> : null}
              </>
            ) : (
              <>No import run yet.</>
            )}
          </div>
          {jobId && summary.completed && (
            <DownloadButton
              disabled={!summary.completed}
              loading={downloadingExcel}
              onClick={handleDownloadExcel}
              label="Download Excel"
            />
          )}
        </div>

        <Dialog open={uploadDialogOpen} onOpenChange={(open) => (!open ? handleCloseDialog() : null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Orders (CSV)</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">CSV File</label>
                <input ref={importFileRef} type="file" accept=".csv" onChange={onFileChange} />
                <p className="text-xs text-muted-foreground">Use the sample template to avoid mapping errors.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Checkbox
                    name="dry_run"
                    label="Dry Run (allowed)"
                    checked={dryRun}
                    onCheckedChange={(v) => setDryRun(v)}
                  />
                </div>
                <div className="grid gap-2">
                  <Checkbox
                    name="skip_existing"
                    label="Skip existing (no touch)"
                    checked={skipExisting}
                    onCheckedChange={(v) => toggleSkipExisting(v)}
                  />
                  <Checkbox
                    name="update_existing"
                    label="Update existing"
                    checked={updateExisting}
                    onCheckedChange={(v) => toggleUpdateExisting(v)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleCloseDialog} disabled={running}>
                  Cancel
                </Button>
                <Button size="sm" onClick={runImport} disabled={running || polling || !file} loading={running}>
                  Run Import
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {results && results.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Results (All Records)</h2>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full text-xs min-w-[980px] border-collapse">
                  <thead className="sticky top-0 bg-muted/50 z-10">
                    <tr className="text-left">
                      <th className="p-2 border-b font-medium">Row</th>
                      <th className="p-2 border-b font-medium">Order #</th>
                      <th className="p-2 border-b font-medium">Action</th>
                      <th className="p-2 border-b font-medium">Status</th>
                      <th className="p-2 border-b font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, idx) => (
                      <tr key={r?.row ?? idx} className="border-b last:border-b-0">
                        <td className="p-2 border-b">{r?.row ?? "-"}</td>
                        <td className="p-2 border-b">{r?.order_number ?? "-"}</td>
                        <td className="p-2 border-b">{r?.action ?? r?.status ?? "-"}</td>
                        <td className="p-2 border-b">{r?.status ?? "-"}</td>
                        <td className="p-2 border-b text-red-600">{r?.error ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">Previous Job History</h2>
          <PaginatedTable
            height="45vh"
            showSearch={false}
            initialPage={1}
            initialLimit={10}
            initialSortBy="created_at"
            initialSortOrder="desc"
            columns={historyColumns}
            fetcher={({ page, limit, sortBy, sortOrder }) =>
              orderImportService.getOrderImportJobsHistory({
                page,
                limit,
                sortBy,
                sortOrder,
              })
            }
          />
        </div>
      </Container>
    </ProtectedRoute>
  );
}

