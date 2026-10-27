"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
  IconExternalLink,
  IconPhoto,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BucketImage from "@/components/common/BucketImage";
import b2bShipmentService from "@/services/b2bShipmentService";

const PHOTO_CAP = 20;
const PER_DROP = 10;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function photoList(raw) {
  return Array.isArray(raw) ? raw.filter((p) => p && p.id) : [];
}

function isImageFile(file) {
  const type = String(file?.type || "").toLowerCase();
  if (IMAGE_TYPES.has(type) || type.startsWith("image/")) return true;
  const name = String(file?.name || "").toLowerCase();
  return /\.(jpe?g|png|webp|heic|heif)$/.test(name);
}

function formatBytes(n) {
  const size = Number(n) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function ImageDropzone({ disabled, remaining, uploading, onFiles }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const blocked = disabled || remaining <= 0 || uploading;
  const take = Math.min(PER_DROP, remaining);

  const boxClass = over
    ? "border-[#00823b] bg-emerald-50 text-[#00823b]"
    : blocked
      ? "border-slate-200 bg-slate-50 text-slate-400"
      : "border-slate-300 bg-slate-50/60 text-slate-500 hover:border-slate-400";

  return (
    <div
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (blocked) return;
        onFiles(e.dataTransfer?.files);
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
        className={`w-full rounded-md border border-dashed px-2 py-3 text-xs ${boxClass} ${
          blocked ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <span className="flex items-center justify-center gap-1.5">
          <IconUpload className="size-4 shrink-0" />
          <span>
            {uploading
              ? "Uploading…"
              : remaining <= 0
                ? "Photo limit reached (20)"
                : `Drop or click to upload images · JPEG, PNG, WebP, HEIC · up to ${take} at a time`}
          </span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={IMAGE_ACCEPT}
        className="hidden"
        disabled={blocked}
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function B2bShipmentPhotosDialog({
  open,
  onOpenChange,
  shipmentId,
  shipmentNo,
  isReversed = false,
  canCreate = false,
  canDelete = false,
  onPhotosChange,
}) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(null);
  const onPhotosChangeRef = useRef(onPhotosChange);
  onPhotosChangeRef.current = onPhotosChange;

  const notifyPhotos = (next) => {
    onPhotosChangeRef.current?.(next);
  };

  const getUrl = useCallback(
    (photoId) => {
      if (!shipmentId || !photoId) return Promise.resolve(null);
      return b2bShipmentService.getB2bShipmentPhotoUrl(shipmentId, photoId);
    },
    [shipmentId]
  );

  const load = useCallback(async () => {
    if (!shipmentId) return;
    setLoading(true);
    try {
      const response = await b2bShipmentService.getB2bShipmentById(shipmentId);
      const result = response?.result || response;
      const next = photoList(result?.photos);
      setPhotos(next);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    if (open && shipmentId) {
      setConfirmId(null);
      setGalleryIndex(null);
      load();
    }
  }, [open, shipmentId, load]);

  const remaining = Math.max(0, PHOTO_CAP - photos.length);
  const canUpload = canCreate && !isReversed && remaining > 0;

  const uploadFiles = useCallback(
    async (list) => {
      if (!shipmentId || !canUpload || uploading) return;
      const incoming = Array.from(list || []);
      if (incoming.length === 0) return;
      const images = incoming.filter(isImageFile);
      if (incoming.length && images.length === 0) {
        toast.error("Only image files can be uploaded (JPEG, PNG, WebP, HEIC)");
        return;
      }
      const skipped = incoming.length - images.length;
      if (skipped > 0) {
        toast.error(`${skipped} file${skipped === 1 ? "" : "s"} skipped — images only`);
      }
      const batch = images.slice(0, Math.min(PER_DROP, remaining));
      if (batch.length === 0) return;
      setUploading(true);
      setUploadCount(batch.length);
      try {
        const res = await b2bShipmentService.uploadB2bShipmentPhotos(shipmentId, batch);
        const next = photoList(res?.result?.photos ?? res?.photos);
        setPhotos(next);
        notifyPhotos(next);
        toast.success(batch.length === 1 ? "Photo uploaded" : `${batch.length} photos uploaded`);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to upload photos");
      } finally {
        setUploading(false);
        setUploadCount(0);
      }
    },
    [shipmentId, canUpload, uploading, remaining]
  );

  const handleDelete = async (photoId) => {
    if (!shipmentId || !photoId || !canDelete || isReversed) return;
    setDeletingId(photoId);
    try {
      const res = await b2bShipmentService.deleteB2bShipmentPhoto(shipmentId, photoId);
      const next = photoList(res?.result?.photos ?? res?.photos);
      setPhotos(next);
      notifyPhotos(next);
      setConfirmId(null);
      if (galleryIndex != null) {
        if (next.length === 0) setGalleryIndex(null);
        else setGalleryIndex(Math.min(galleryIndex, next.length - 1));
      }
      toast.success("Photo deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete photo");
    } finally {
      setDeletingId(null);
    }
  };

  const slides = useMemo(
    () =>
      photos.map((p, i) => ({
        id: p.id,
        src: p.id,
        label: p.filename || `Photo ${i + 1}`,
      })),
    [photos]
  );

  const galleryOpen = galleryIndex != null && slides[galleryIndex];
  const slide = galleryOpen ? slides[galleryIndex] : null;

  useEffect(() => {
    if (galleryIndex == null) return undefined;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setGalleryIndex((i) => (i > 0 ? i - 1 : i));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setGalleryIndex((i) => (i != null && i < slides.length - 1 ? i + 1 : i));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [galleryIndex, slides.length]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl sm:max-w-5xl w-[min(96vw,72rem)] h-[min(85vh,760px)] p-3 gap-2 flex flex-col overflow-hidden">
          <DialogHeader className="space-y-0 pr-8 shrink-0">
            <DialogTitle className="text-sm flex items-center gap-1.5 min-w-0">
              <IconPhoto className="size-4 shrink-0" />
              <span className="truncate">
                Photos
                {shipmentNo ? (
                  <span className="text-muted-foreground font-normal"> · {shipmentNo}</span>
                ) : null}
              </span>
              <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px] ml-auto shrink-0">
                {photos.length}/{PHOTO_CAP}
              </Badge>
              {isReversed ? (
                <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px] shrink-0">
                  View only
                </Badge>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          {isReversed ? (
            <p className="text-[11px] text-muted-foreground shrink-0">Reversed shipments are view-only.</p>
          ) : canCreate ? (
            <div className="shrink-0 space-y-1">
              <ImageDropzone
                disabled={!canUpload}
                remaining={remaining}
                uploading={uploading}
                onFiles={uploadFiles}
              />
              {uploading ? (
                <p className="text-[11px] text-muted-foreground">
                  Uploading {uploadCount} photo{uploadCount === 1 ? "" : "s"}…
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex-1 min-h-0 overflow-auto">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-[4/3] rounded border border-border bg-muted animate-pulse" />
                ))}
              </div>
            ) : photos.length === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed border-border rounded-md bg-muted/20">
                <IconPhoto className="size-8 mb-1 opacity-40" />
                <p className="text-xs font-medium">No photos uploaded</p>
                {canUpload ? (
                  <p className="text-[11px]">Drop images above to attach them to this shipment.</p>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="rounded border border-border overflow-hidden bg-muted/20 group hover:border-[#00823b]/60"
                  >
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => setGalleryIndex(idx)}
                      aria-label={`View ${photo.filename || `photo ${idx + 1}`}`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <BucketImage
                          fill
                          path={photo.id}
                          getUrl={getUrl}
                          alt={photo.filename || "Photo"}
                          sx={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 0, display: "block" }}
                        />
                      </div>
                    </button>
                    <div className="px-1.5 py-1 flex items-center gap-1 border-t border-border">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium truncate leading-tight">
                          {photo.filename || `Photo ${idx + 1}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {photo.size ? formatBytes(photo.size) : "Image"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[11px] text-[#00823b] font-semibold shrink-0"
                        onClick={() => setGalleryIndex(idx)}
                      >
                        View
                      </Button>
                      {canDelete && !isReversed ? (
                        confirmId === photo.id ? (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[11px]"
                              onClick={() => setConfirmId(null)}
                              disabled={deletingId === photo.id}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[11px] text-destructive"
                              disabled={deletingId === photo.id}
                              onClick={() => handleDelete(photo.id)}
                            >
                              {deletingId === photo.id ? "…" : "Confirm"}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                            title="Delete photo"
                            onClick={() => setConfirmId(photo.id)}
                          >
                            <IconTrash className="size-3.5" />
                          </Button>
                        )
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!galleryOpen} onOpenChange={(isOpen) => !isOpen && setGalleryIndex(null)}>
        <DialogContent className="!fixed !inset-0 !left-0 !top-0 !flex !h-[100dvh] !max-h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 !rounded-none border-none bg-black/95 p-0 gap-0 flex-col overflow-hidden text-white ring-0">
          <DialogHeader className="p-2 sm:p-3 shrink-0 flex-row items-center justify-between gap-2 border-b border-white/10 bg-black/60 space-y-0">
            <DialogTitle className="text-white text-xs sm:text-sm font-medium pr-2 line-clamp-2">
              {slide?.label}
              {slides.length > 0 ? (
                <span className="text-white/60 font-normal ml-2 whitespace-nowrap">
                  {(galleryIndex ?? 0) + 1} / {slides.length}
                </span>
              ) : null}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 h-7 px-2"
              onClick={async () => {
                if (!slide?.id) return;
                const url = await getUrl(slide.id);
                if (url) window.open(url, "_blank");
              }}
              aria-label="Open full image"
            >
              <IconExternalLink className="size-3.5 mr-1" />
              Open full
            </Button>
          </DialogHeader>
          <div className="relative flex-1 min-h-0 w-full flex items-center justify-center px-10 sm:px-14 py-2">
            {galleryIndex > 0 && (
              <IconButton
                type="button"
                aria-label="Previous photo"
                onClick={() => setGalleryIndex((i) => (i > 0 ? i - 1 : i))}
                sx={{
                  position: "absolute",
                  left: 4,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  color: "#fff",
                  bgcolor: "rgba(255,255,255,0.12)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                }}
                size="large"
              >
                <ChevronLeftIcon sx={{ fontSize: 32 }} />
              </IconButton>
            )}
            {galleryIndex != null && galleryIndex < slides.length - 1 && (
              <IconButton
                type="button"
                aria-label="Next photo"
                onClick={() => setGalleryIndex((i) => (i < slides.length - 1 ? i + 1 : i))}
                sx={{
                  position: "absolute",
                  right: 4,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  color: "#fff",
                  bgcolor: "rgba(255,255,255,0.12)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
                }}
                size="large"
              >
                <ChevronRightIcon sx={{ fontSize: 32 }} />
              </IconButton>
            )}
            <div className="relative w-full h-full max-h-full flex items-center justify-center">
              {slide?.src ? (
                <BucketImage
                  fill
                  path={slide.src}
                  getUrl={getUrl}
                  alt={slide.label}
                  sx={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    borderRadius: 0,
                  }}
                />
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
