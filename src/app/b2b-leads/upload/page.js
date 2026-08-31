"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconUpload,
  IconDownload,
  IconCheck,
  IconAlertTriangle,
  IconFileSpreadsheet,
  IconFileAnalytics,
} from "@tabler/icons-react";
import Container from "@/components/container";
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import b2bLeadService from "@/services/b2bLeadService";
import { toastError, toastSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

export default function B2bLeadsUploadPage() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [hasImported, setHasImported] = useState(false);
  const [step, setStep] = useState(0);

  const getOptionLabel = (opt) =>
    opt?.label ??
    opt?.name ??
    opt?.source_name ??
    (opt?.id != null ? String(opt.id) : "");

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setStep(1);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const f = event.dataTransfer?.files?.[0];
    if (f) {
      setFile(f);
      setStep(1);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isDragging) setIsDragging(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const blobData = await b2bLeadService.downloadB2bLeadsTemplate();
      const blob = new Blob([blobData], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "b2b-leads-template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to download template";
      toastError(msg);
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      toastError("Please select a file to upload");
      return;
    }
    try {
      setHasImported(false);
      setPreviewing(true);
      setStep(1);
      const res = await b2bLeadService.previewB2bLeadsUpload(file, {
        inquiry_source_id: sourceId,
      });
      const data = res?.result || res?.data || res;
      setPreviewData(data);
      setStep(2);
      toastSuccess("Preview generated. No records have been saved yet.");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to generate preview";
      toastError(msg);
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    if (!file) {
      toastError("File reference is missing. Please select the file again.");
      return;
    }
    try {
      setConfirming(true);
      const res = await b2bLeadService.uploadB2bLeads(file, {
        inquiry_source_id: sourceId,
      });
      const data = res?.result || res?.data || res;
      setResult(data);
      setHasImported(true);
      setPreviewData((prev) => {
        if (!prev || !Array.isArray(prev.rows)) return prev;
        return {
          ...prev,
          rows: prev.rows.map((row) =>
            row.status === "valid" ? { ...row, status: "imported" } : row
          ),
        };
      });
      toastSuccess("B2B leads imported successfully");
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to import leads";
      toastError(msg);
    } finally {
      setConfirming(false);
    }
  };

  const StatusCell = ({ status }) => {
    switch (status) {
      case "valid":
      case "imported":
        return (
          <Badge variant="outline" className="text-[10px] uppercase py-0.5 h-5 bg-green-50 text-green-700 border-green-200">
            {status}
          </Badge>
        );
      case "duplicate":
        return (
          <Badge variant="outline" className="text-[10px] uppercase py-0.5 h-5 bg-amber-50 text-amber-700 border-amber-200">
            {status}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] uppercase py-0.5 h-5 bg-red-50 text-red-700 border-red-200">
            {status}
          </Badge>
        );
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-full flex flex-col pt-2 bg-gradient-to-b from-muted/30 to-transparent">
        <Container className="flex-1 max-w-[1536px] mx-auto py-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 px-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">B2B Leads Bulk Upload</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Import dealer and business leads using the Excel template. Review validation results before saving.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start">
              {result && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs py-1 px-2.5">
                  Last import: {result.created ?? 0} created
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="gap-2 bg-background shadow-sm"
              >
                <IconDownload className="size-4" />
                {downloadingTemplate ? "Preparing..." : "Download Excel Template"}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-1 mb-8 max-w-5xl mx-auto w-full">
            <div className="mx-auto w-full max-w-3xl mb-2 px-4">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-muted z-0 rounded" />
                {[
                  { title: "Download & Setup", subtitle: "Get template" },
                  { title: "Upload & Settings", subtitle: "Defaults" },
                  { title: "Review & Confirm", subtitle: "Preview" },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="relative z-10 flex flex-col items-center gap-2 bg-gradient-to-b from-muted/30 to-transparent px-2 md:px-4"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-bold transition-colors bg-card",
                        step > i
                          ? "bg-primary border-primary text-primary-foreground"
                          : step === i
                            ? "border-primary text-primary"
                            : "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {step > i ? <IconCheck className="size-4" /> : i + 1}
                    </div>
                    <div className="text-center">
                      <div
                        className={cn(
                          "text-xs md:text-sm font-semibold",
                          step >= i ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {s.title}
                      </div>
                      <div className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                        {s.subtitle}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-border shadow-sm w-full mx-auto md:max-w-4xl lg:max-w-5xl">
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  <div className="md:col-span-7 flex flex-col gap-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                        <IconFileSpreadsheet className="size-4 text-primary" />
                        1. Upload Filled Template
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Minimum required: <b>Company Name</b>, <b>Contact Person</b>, and <b>Mobile</b>.
                        Leads without Assigned To are assigned to you.
                      </p>
                    </div>

                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer bg-muted/20 hover:bg-muted/40",
                        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20"
                      )}
                    >
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title=""
                      />
                      <div className="rounded-full bg-background p-3 mb-3 shadow-sm border border-border">
                        <IconUpload
                          className={cn("size-6", isDragging ? "text-primary" : "text-muted-foreground")}
                        />
                      </div>
                      <div className="text-sm font-medium mb-1 text-center">
                        <span className="text-primary">Click to upload</span> or drag and drop
                      </div>
                      <div className="text-xs text-muted-foreground text-center">
                        Excel or CSV formats supported (Max ~10MB)
                      </div>

                      {file && (
                        <div className="mt-4 inline-flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 shadow-sm">
                          <IconCheck className="size-4 text-green-500" />
                          <span className="text-xs font-medium truncate max-w-[200px]">{file.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({Math.round(file.size / 1024)} KB)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:hidden h-px bg-border w-full" />

                  <div className="md:col-span-5 flex flex-col gap-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                        <IconFileAnalytics className="size-4 text-primary" />
                        2. Default Settings
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Applied when the Source column is blank. Required unless every row has a source.
                      </p>
                    </div>

                    <AutocompleteField
                      name="inquiry_source_id"
                      label="Default Source (recommended)"
                      asyncLoadOptions={(q) =>
                        getReferenceOptionsSearch("inquiry_source.model", { q, limit: 20 })
                      }
                      referenceModel="inquiry_source.model"
                      getOptionLabel={getOptionLabel}
                      value={sourceId ? { id: sourceId } : null}
                      onChange={(e, v) => setSourceId(v?.id != null ? String(v.id) : "")}
                      placeholder="Type to search source..."
                      usePortal
                      fullWidth
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground w-24"
                    onClick={() => {
                      setFile(null);
                      setPreviewData(null);
                      setResult(null);
                      setHasImported(false);
                      setStep(0);
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePreview}
                    disabled={previewing || !file}
                    className="w-40"
                  >
                    {previewing ? "Validating..." : "Validate & Preview"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {previewData && !hasImported && (
              <Card className="border-t-4 border-t-primary/60 shadow-md w-full mx-auto md:max-w-4xl lg:max-w-5xl">
                <CardHeader className="pb-3 border-b border-border bg-muted/10">
                  <CardTitle className="text-lg">Data Preview</CardTitle>
                  <CardDescription>
                    Review parsed results before committing to the database. No records have been saved yet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex flex-col">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-border bg-background">
                    <div className="p-4 flex flex-col gap-1 border-r border-border border-b md:border-b-0">
                      <span className="text-[10px] md:text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Total Rows
                      </span>
                      <span className="text-2xl font-bold">{previewData.total_rows ?? 0}</span>
                    </div>
                    <div className="p-4 flex flex-col gap-1 border-r-0 md:border-r border-border border-b md:border-b-0">
                      <span className="text-[10px] md:text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Valid
                      </span>
                      <span className="text-2xl font-bold text-green-600">{previewData.valid_rows ?? 0}</span>
                    </div>
                    <div className="p-4 flex flex-col gap-1 border-r border-border">
                      <span className="text-[10px] md:text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Duplicates
                      </span>
                      <span className="text-2xl font-bold text-amber-600">{previewData.duplicate_rows ?? 0}</span>
                    </div>
                    <div className="p-4 flex flex-col gap-1">
                      <span className="text-[10px] md:text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Errors
                      </span>
                      <span className="text-2xl font-bold text-red-600">{previewData.error_rows ?? 0}</span>
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-auto">
                    <table className="w-full text-sm text-left relative">
                      <thead className="text-[11px] text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                          <th className="px-4 py-3 font-medium whitespace-nowrap border-b border-border">Row</th>
                          <th className="px-4 py-3 font-medium whitespace-nowrap border-b border-border">Company</th>
                          <th className="px-4 py-3 font-medium whitespace-nowrap border-b border-border">Contact</th>
                          <th className="px-4 py-3 font-medium whitespace-nowrap border-b border-border">Mobile</th>
                          <th className="px-4 py-3 font-medium whitespace-nowrap border-b border-border">Source</th>
                          <th className="px-4 py-3 font-medium whitespace-nowrap border-b border-border">Assigned To</th>
                          <th className="px-4 py-3 font-medium whitespace-nowrap border-b border-border">Status</th>
                          <th className="px-4 py-3 font-medium whitespace-nowrap border-b border-border">Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 bg-background text-[13px]">
                        {(previewData.rows || []).map((row) => (
                          <tr key={row.row} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground font-mono">{row.row}</td>
                            <td className="px-4 py-2.5 font-medium">{row.company_name}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">{row.contact_person}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">{row.mobile_number}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                              {row.inquiry_source_name || "—"}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                              {row.assigned_to_name || "You (uploader)"}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <StatusCell status={row.status} />
                            </td>
                            <td
                              className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate"
                              title={row.message}
                            >
                              {row.message || "—"}
                            </td>
                          </tr>
                        ))}
                        {(!previewData.rows || previewData.rows.length === 0) && (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-muted-foreground text-sm bg-background">
                              No rows found to preview
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 flex items-center justify-end gap-3 bg-muted/20 border-t border-border mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPreviewData(null);
                        setStep(file ? 1 : 0);
                      }}
                      className="w-24 bg-background shadow-sm"
                    >
                      Back
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleConfirm}
                      disabled={confirming || !previewData || (previewData.valid_rows ?? 0) === 0}
                      className={cn(
                        "shadow-sm",
                        (previewData.valid_rows ?? 0) > 0 ? "bg-green-600 hover:bg-green-700 text-white" : ""
                      )}
                    >
                      {confirming ? "Saving..." : `Confirm & Save ${previewData.valid_rows ?? 0} Leads`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {result && (
              <Card className="border-t-4 border-t-green-500 shadow-md w-full mx-auto md:max-w-4xl lg:max-w-5xl">
                <CardHeader className="pb-3 border-b border-border bg-green-50/30">
                  <CardTitle className="text-lg text-green-700 flex items-center gap-2">
                    <div className="rounded-full bg-green-100 p-1 border border-green-200">
                      <IconCheck className="size-4" />
                    </div>
                    Import Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-border bg-background">
                    <div className="p-4 flex flex-col gap-1 border-r border-border border-b md:border-b-0">
                      <span className="text-[10px] md:text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Total Rows
                      </span>
                      <span className="text-2xl font-bold">{result.total_rows ?? 0}</span>
                    </div>
                    <div className="p-4 flex flex-col gap-1 border-r-0 md:border-r border-border border-b md:border-b-0">
                      <span className="text-[10px] md:text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Created
                      </span>
                      <span className="text-2xl font-bold text-green-600">{result.created ?? 0}</span>
                    </div>
                    <div className="p-4 flex flex-col gap-1 border-r border-border">
                      <span className="text-[10px] md:text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Skipped
                      </span>
                      <span className="text-2xl font-bold text-amber-600">{result.skipped_duplicates ?? 0}</span>
                    </div>
                    <div className="p-4 flex flex-col gap-1">
                      <span className="text-[10px] md:text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Failed
                      </span>
                      <span className="text-2xl font-bold text-red-600">{result.failed ?? 0}</span>
                    </div>
                  </div>

                  {Array.isArray(result.errors) && result.errors.length > 0 && (
                    <div className="p-4 bg-red-50/50 border-b border-border">
                      <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1.5">
                        <IconAlertTriangle className="size-4" />
                        Import Errors Encountered
                      </h4>
                      <div className="rounded border border-red-100 bg-background overflow-hidden max-h-40 overflow-y-auto">
                        <ul className="divide-y divide-red-100/50 text-[13px]">
                          {result.errors.slice(0, 50).map((e, idx) => (
                            <li key={idx} className="px-3 py-2 flex gap-3 text-red-700/80">
                              <span className="font-mono text-[11px] opacity-60 w-12 shrink-0 pt-0.5">
                                Row {e.row}
                              </span>
                              <span>{e.message}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-muted/20 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        setPreviewData(null);
                        setResult(null);
                        setHasImported(false);
                        setStep(0);
                      }}
                      className="bg-background shadow-sm"
                    >
                      Upload Another File
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </Container>
      </div>
    </ProtectedRoute>
  );
}
