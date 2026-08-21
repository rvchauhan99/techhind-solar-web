"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { IconDownload, IconUpload } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DIALOG_FORM_LARGE } from "@/utils/formConstants"

const downloadCsvText = (csvText, filename) => {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const CsvImportDialog = ({
  open,
  onOpenChange,
  title = "Import CSV",
  guidelines = [],
  sampleFileName = "import-sample.csv",
  onDownloadSample,
  onUpload,
  errorCsvFileName = "import-errors.csv",
  resultCsvFileName = "import-result.csv",
  onImportSuccess,
  accept = ".csv,text/csv",
}) => {
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      setImportResult(null)
      setImporting(false)
    }
    onOpenChange?.(nextOpen)
  }

  const handleDownloadSample = async () => {
    if (!onDownloadSample) return
    try {
      const blob = await onDownloadSample()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = sampleFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Sample CSV downloaded")
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to download sample")
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !onUpload) return
    setImporting(true)
    setImportResult(null)
    try {
      const result = await onUpload(file)
      setImportResult(result)
      const inserted = result?.inserted ?? 0
      const failed = result?.failed ?? 0
      if (inserted > 0) {
        onImportSuccess?.({ inserted })
        if (failed === 0) {
          toast.success(`${inserted} row(s) imported successfully`)
        } else {
          toast.success(`${inserted} row(s) imported`)
        }
      }
      if (failed > 0) {
        toast.warning(`${failed} row(s) failed — download Error CSV and re-upload only those rows`)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Upload failed")
      setImportResult({
        inserted: 0,
        failed: 0,
        total: 0,
        errors: [
          {
            row: 0,
            message: err?.response?.data?.message || err?.message || "Upload failed",
          },
        ],
        resultCsv: "",
        errorCsv: "",
      })
    } finally {
      setImporting(false)
      e.target.value = ""
    }
  }

  const inserted = importResult?.inserted ?? 0
  const failed = importResult?.failed ?? 0
  const total = importResult?.total ?? 0
  const errors = Array.isArray(importResult?.errors) ? importResult.errors : []
  const hasFailures = failed > 0 || errors.length > 0
  const allSuccess = importResult != null && failed === 0 && inserted > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`${DIALOG_FORM_LARGE} gap-0 p-0`}>
        <DialogHeader className="shrink-0 border-b border-border px-4 py-2">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 py-2">
          {guidelines.length > 0 && (
            <div className="shrink-0 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">How to import</p>
              <ol className="list-decimal space-y-0.5 pl-4">
                {guidelines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {onDownloadSample && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadSample}
              >
                <IconDownload className="mr-1.5 size-4" />
                Download sample CSV
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              <IconUpload className="mr-1.5 size-4" />
              {importing ? "Uploading..." : importResult ? "Upload again" : "Upload CSV"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {importResult != null && (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              <div className="grid shrink-0 grid-cols-3 gap-2 text-sm">
                <div className="rounded-md border border-border px-2 py-1.5">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {inserted}
                  </p>
                </div>
                <div className="rounded-md border border-border px-2 py-1.5">
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="font-semibold tabular-nums text-destructive">{failed}</p>
                </div>
                <div className="rounded-md border border-border px-2 py-1.5">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold tabular-nums">{total}</p>
                </div>
              </div>

              {allSuccess && (
                <p className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                  All rows imported successfully. No further action needed.
                </p>
              )}

              {hasFailures && (
                <div className="shrink-0 space-y-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 dark:border-amber-900 dark:bg-amber-950/40">
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                    Next step
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Successful rows are already saved. Download the Error CSV, fix only those
                    rows, then upload that file again. Do not re-upload rows that were already
                    created.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {importResult.errorCsv && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          downloadCsvText(importResult.errorCsv, errorCsvFileName)
                          toast.success("Error CSV downloaded")
                        }}
                      >
                        <IconDownload className="mr-1.5 size-4" />
                        Download Error CSV
                      </Button>
                    )}
                    {importResult.resultCsv && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          downloadCsvText(importResult.resultCsv, resultCsvFileName)
                          toast.success("Result CSV downloaded")
                        }}
                      >
                        <IconDownload className="mr-1.5 size-4" />
                        Download Result CSV
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={importing}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <IconUpload className="mr-1.5 size-4" />
                      Upload error records
                    </Button>
                  </div>
                </div>
              )}

              {!hasFailures && importResult.resultCsv && (
                <div className="shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      downloadCsvText(importResult.resultCsv, resultCsvFileName)
                      toast.success("Result CSV downloaded")
                    }}
                  >
                    <IconDownload className="mr-1.5 size-4" />
                    Download Result CSV
                  </Button>
                </div>
              )}

              {errors.length > 0 && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
                  <p className="shrink-0 border-b border-border bg-muted/40 px-2 py-1 text-xs font-medium">
                    Errors ({errors.length})
                  </p>
                  <div className="min-h-0 flex-1 overflow-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead className="sticky top-0 z-10 bg-muted/80">
                        <tr className="text-left">
                          <th className="w-16 border-b border-border px-2 py-1 font-medium">
                            Row
                          </th>
                          <th className="border-b border-border px-2 py-1 font-medium">
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {errors.map((err, i) => (
                          <tr key={i} className="border-b border-border last:border-b-0">
                            <td className="px-2 py-1 align-top tabular-nums text-muted-foreground">
                              {err.row ?? "-"}
                            </td>
                            <td className="px-2 py-1 align-top text-destructive">
                              {err.message || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CsvImportDialog
