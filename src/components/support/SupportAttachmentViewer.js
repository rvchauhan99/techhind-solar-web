"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconFile,
  IconFileSpreadsheet,
  IconFileText,
  IconLoader2,
  IconX,
} from "@tabler/icons-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toastError } from "@/utils/toast";
import apiClient from "@/lib/api/axios";

export const isImageAttachment = (att) => {
  const mime = String(att?.mime || "");
  if (mime.startsWith("image/")) return true;
  const name = String(att?.name || "").toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp)$/.test(name);
};

export const isPdfAttachment = (att) => {
  const mime = String(att?.mime || "");
  if (mime === "application/pdf") return true;
  return String(att?.name || "").toLowerCase().endsWith(".pdf");
};

const fileIcon = (att) => {
  const name = String(att?.name || "").toLowerCase();
  const mime = String(att?.mime || "");
  if (mime.includes("sheet") || /\.(xlsx?|csv)$/.test(name)) return IconFileSpreadsheet;
  if (isPdfAttachment(att) || mime.includes("pdf") || mime.includes("text")) return IconFileText;
  return IconFile;
};

export const fetchSupportFileBlob = async (att) => {
  const fileId = att?.file_id;
  if (!fileId) throw new Error("Missing file id");
  const res = await apiClient.get(`/support-tickets/files/${encodeURIComponent(fileId)}`, {
    responseType: "blob",
  });
  const mime = att.mime || res.data?.type || "application/octet-stream";
  return new Blob([res.data], { type: mime });
};

const downloadBlob = (blob, name) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name || "attachment";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const openBlobInTab = (blob) => {
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => window.URL.revokeObjectURL(url), 120_000);
};

function ImageThumb({ att, onOpen, onDownload, loadingId }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const urlRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setSrc(null);
    fetchSupportFileBlob(att)
      .then((blob) => {
        if (cancelled) return;
        const url = window.URL.createObjectURL(blob);
        urlRef.current = url;
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (urlRef.current) {
        window.URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [att?.file_id]);

  const busy = loadingId === att.file_id;

  return (
    <div
      className="relative h-14 w-14 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50"
      data-testid={`support-file-${att.file_id}`}
    >
      <button
        type="button"
        onClick={() => onOpen(att)}
        className="absolute inset-0 hover:ring-1 hover:ring-[#00823b] focus:outline-none focus:ring-1 focus:ring-[#00823b]"
        aria-label={`View ${att.name || "image"}`}
        data-testid={`support-file-view-${att.file_id}`}
        title={att.name}
      >
        {src && !failed ? (
          <img src={src} alt={att.name || "attachment"} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
            {failed ? "!" : <IconLoader2 className="size-3.5 animate-spin" />}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDownload(att);
        }}
        disabled={busy}
        className="absolute bottom-0.5 right-0.5 z-[1] rounded bg-black/55 p-0.5 text-white opacity-90 hover:opacity-100 disabled:opacity-50"
        aria-label={`Download ${att.name || "attachment"}`}
        title="Download"
        data-testid={`support-file-download-${att.file_id}`}
      >
        {busy ? <IconLoader2 className="size-2.5 animate-spin" /> : <IconDownload className="size-2.5" />}
      </button>
    </div>
  );
}

function FileChip({ att, onView, onDownload, loadingId }) {
  const Icon = fileIcon(att);
  const busy = loadingId === att.file_id;
  return (
    <div
      className="inline-flex max-w-full items-center gap-0.5 rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px]"
      data-testid={`support-file-${att.file_id}`}
    >
      <Icon className="size-3 shrink-0 text-slate-400" />
      <button
        type="button"
        onClick={() => onView(att)}
        disabled={busy}
        className="max-w-[9rem] truncate px-0.5 text-[#1b365d] hover:underline disabled:opacity-50"
        title={`View ${att.name}`}
        data-testid={`support-file-view-${att.file_id}`}
      >
        {att.name || "file"}
      </button>
      <button
        type="button"
        onClick={() => onDownload(att)}
        disabled={busy}
        className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-[#00823b] disabled:opacity-50"
        aria-label={`Download ${att.name || "attachment"}`}
        title="Download"
        data-testid={`support-file-download-${att.file_id}`}
      >
        {busy ? <IconLoader2 className="size-3 animate-spin" /> : <IconDownload className="size-3" />}
      </button>
    </div>
  );
}

function AttachmentLightbox({ open, attachments, index, onClose, onIndex, onDownload, previewUrl, loading }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
      if (e.key === "ArrowRight") onIndex(Math.min(attachments.length - 1, index + 1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, index, attachments.length, onIndex]);

  const att = attachments[index];
  const canPrev = index > 0;
  const canNext = index < attachments.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="!fixed !inset-0 !left-0 !top-0 !flex !h-[100dvh] !max-h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none border-none bg-black/95 p-0 gap-0 flex-col overflow-hidden text-white ring-0"
        data-testid="support-attachment-lightbox"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-black/60 p-2 sm:p-3">
          <DialogTitle className="m-0 line-clamp-2 pr-2 text-xs font-medium text-white sm:text-sm">
            {att?.name || "Attachment"}
            {attachments.length > 1 && (
              <span className="ml-2 whitespace-nowrap font-normal text-white/60">
                {index + 1} / {attachments.length}
              </span>
            )}
          </DialogTitle>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => att && onDownload(att)}
              className="inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] font-semibold text-white hover:bg-white/10"
              data-testid="support-lightbox-download"
            >
              <IconDownload className="size-3.5" />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-white hover:bg-white/10"
              aria-label="Close"
              data-testid="support-lightbox-close"
            >
              <IconX className="size-4" />
            </button>
          </div>
        </div>
        <div className="relative flex min-h-0 w-full flex-1 items-center justify-center px-10 py-2 sm:px-14">
          {canPrev && (
            <button
              type="button"
              aria-label="Previous"
              onClick={() => onIndex(index - 1)}
              className="absolute left-2 top-1/2 z-[2] inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              data-testid="support-lightbox-prev"
            >
              <IconChevronLeft className="size-6" />
            </button>
          )}
          {canNext && (
            <button
              type="button"
              aria-label="Next"
              onClick={() => onIndex(index + 1)}
              className="absolute right-2 top-1/2 z-[2] inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              data-testid="support-lightbox-next"
            >
              <IconChevronRight className="size-6" />
            </button>
          )}
          {loading || !previewUrl ? (
            <IconLoader2 className="size-8 animate-spin text-white/70" />
          ) : (
            <img
              src={previewUrl}
              alt={att?.name || "attachment"}
              className="max-h-full max-w-full object-contain"
              data-testid="support-lightbox-image"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SupportAttachmentList({ attachments }) {
  const list = Array.isArray(attachments) ? attachments : [];
  const images = list.filter(isImageAttachment);
  const others = list.filter((a) => !isImageAttachment(a));
  const [loadingId, setLoadingId] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [lightboxLoading, setLightboxLoading] = useState(false);
  const previewRef = useRef(null);

  const revokePreview = useCallback(() => {
    if (previewRef.current) {
      window.URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  useEffect(() => () => revokePreview(), [revokePreview]);

  const loadLightboxPreview = useCallback(
    async (att) => {
      setLightboxLoading(true);
      revokePreview();
      try {
        const blob = await fetchSupportFileBlob(att);
        const url = window.URL.createObjectURL(blob);
        previewRef.current = url;
        setPreviewUrl(url);
      } catch (err) {
        toastError(err?.response?.data?.message || err?.message || "Unable to open image");
        setLightbox(null);
      } finally {
        setLightboxLoading(false);
      }
    },
    [revokePreview]
  );

  useEffect(() => {
    if (!lightbox) return;
    const att = lightbox.attachments[lightbox.index];
    if (att) loadLightboxPreview(att);
  }, [lightbox, loadLightboxPreview]);

  const handleOpenImage = (att) => {
    const idx = images.findIndex((a) => a.file_id === att.file_id);
    setLightbox({ attachments: images, index: Math.max(0, idx) });
  };

  const handleView = async (att) => {
    if (isImageAttachment(att)) {
      handleOpenImage(att);
      return;
    }
    setLoadingId(att.file_id);
    try {
      const blob = await fetchSupportFileBlob(att);
      openBlobInTab(blob);
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "Unable to open file");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDownload = async (att) => {
    setLoadingId(att.file_id);
    try {
      const blob = await fetchSupportFileBlob(att);
      downloadBlob(blob, att.name);
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "Download failed");
    } finally {
      setLoadingId(null);
    }
  };

  const handleCloseLightbox = () => {
    setLightbox(null);
    revokePreview();
  };

  if (!list.length) return null;

  return (
    <>
      <div className="mt-1.5 flex flex-wrap items-start gap-1.5">
        {images.map((a) => (
          <ImageThumb
            key={a.file_id}
            att={a}
            onOpen={handleOpenImage}
            onDownload={handleDownload}
            loadingId={loadingId}
          />
        ))}
        {others.map((a) => (
          <FileChip
            key={a.file_id}
            att={a}
            onView={handleView}
            onDownload={handleDownload}
            loadingId={loadingId}
          />
        ))}
      </div>
      <AttachmentLightbox
        open={Boolean(lightbox)}
        attachments={lightbox?.attachments || []}
        index={lightbox?.index || 0}
        onClose={handleCloseLightbox}
        onIndex={(i) => setLightbox((g) => (g ? { ...g, index: i } : g))}
        onDownload={handleDownload}
        previewUrl={previewUrl}
        loading={lightboxLoading}
      />
    </>
  );
}

export const SUPPORT_STATUS_STYLES = {
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  resolved: "bg-blue-50 text-blue-700 border-blue-200",
  closed: "bg-slate-50 text-slate-600 border-slate-200",
};

export const SUPPORT_PRIORITY_STYLES = {
  low: "bg-slate-50 text-slate-600 border-slate-200",
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

export function SupportStatusBadge({ value }) {
  const v = value || "open";
  return (
    <span
      data-testid={`support-status-${v}`}
      className={`inline-flex h-6 items-center rounded border px-2 text-[11px] font-semibold capitalize ${
        SUPPORT_STATUS_STYLES[v] || SUPPORT_STATUS_STYLES.open
      }`}
    >
      {v}
    </span>
  );
}

export function SupportPriorityBadge({ value }) {
  const v = value || "normal";
  return (
    <span
      data-testid={`support-priority-${v}`}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        SUPPORT_PRIORITY_STYLES[v] || SUPPORT_PRIORITY_STYLES.normal
      }`}
    >
      {v}
    </span>
  );
}

/** Queued file chips for create/reply composers */
export function SupportFileChipList({ files, onRemove, disabled }) {
  if (!files?.length) return null;
  return (
    <ul className="flex flex-wrap gap-1" data-testid="support-file-chip-list">
      {files.map((file, index) => (
        <li
          key={`${file.name}-${file.size}-${index}`}
          className="inline-flex max-w-full items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px]"
        >
          <IconFile className="size-3 shrink-0 text-slate-400" />
          <span className="max-w-[140px] truncate">{file.name}</span>
          <span className="shrink-0 text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
          {onRemove && !disabled && (
            <button
              type="button"
              aria-label={`Remove ${file.name}`}
              data-testid={`support-file-chip-remove-${index}`}
              className="text-slate-400 hover:text-red-600"
              onClick={() => onRemove(index)}
            >
              <IconX className="size-3" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Dense dashed dropzone for support reply/create */
export function SupportFileDropzone({
  onFiles,
  disabled = false,
  multiple = true,
  maxFiles,
  already = 0,
  maxBytes,
  inputTestId = "support-reply-files",
  dropzoneTestId = "support-reply-dropzone",
  hint,
}) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const remaining = maxFiles == null ? Infinity : Math.max(0, maxFiles - already);
  const blocked = disabled || remaining <= 0;

  const handleIncoming = (list) => {
    if (blocked) return;
    const arr = Array.from(list || []);
    const accepted = [];
    for (const f of arr) {
      if (accepted.length >= remaining) break;
      if (maxBytes && f.size > maxBytes) {
        toastError(`${f.name} exceeds ${(maxBytes / (1024 * 1024)).toFixed(0)} MB`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length) onFiles(accepted);
  };

  const boxClass = over
    ? "border-[#00823b] bg-emerald-50 text-[#00823b]"
    : blocked
      ? "border-slate-200 bg-slate-50 text-slate-400"
      : "border-slate-300 bg-slate-50/60 text-slate-500 hover:border-slate-400";

  return (
    <div
      data-testid={dropzoneTestId}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (blocked) return;
        handleIncoming(e.dataTransfer?.files);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (blocked) return;
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setOver(false);
      }}
    >
      <button
        type="button"
        disabled={blocked}
        onClick={() => !blocked && inputRef.current?.click()}
        className={`w-full rounded-md border border-dashed px-2 py-1.5 text-[11px] ${boxClass} ${
          blocked ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <span className="flex items-center justify-center gap-1">
          <IconDownload className="size-3.5 shrink-0 rotate-180" />
          <span>{hint || (remaining <= 0 ? "Attachment limit reached" : "Drop, paste, or click to attach")}</span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept="image/*,.pdf,.csv,.xls,.xlsx"
        className="hidden"
        disabled={blocked}
        data-testid={inputTestId}
        onChange={(e) => {
          handleIncoming(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
