"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Box, Button, FormHelperText, Typography } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import {
  IMAGE_ACCEPT,
  IMAGE_HINT,
  OTHER_ACCEPT,
  OTHER_FIELD,
  OTHER_HINT,
  OTHER_MAX_COUNT,
  VIDEO_ACCEPT,
  formatFileSize,
  isVideoFile,
  validateOtherFiles,
  validateSiteVisitFile,
} from "@/lib/siteVisitMedia";

function PreviewThumb({ file, onClear, size = 56 }) {
  const [url, setUrl] = useState(null);
  const isVideo = isVideoFile(file);

  useEffect(() => {
    if (!file || isVideo) {
      setUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isVideo]);

  return (
    <Box
      sx={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 1,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "grey.50",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isVideo ? (
        <VideocamOutlinedIcon fontSize="small" color="action" />
      ) : url ? (
        <img
          src={url}
          alt={file?.name || "preview"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <ImageOutlinedIcon fontSize="small" color="action" />
      )}
      {onClear && (
        <Button
          type="button"
          size="small"
          onClick={onClear}
          aria-label={`Remove ${file?.name || "file"}`}
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            minWidth: 20,
            width: 20,
            height: 20,
            p: 0,
            bgcolor: "rgba(0,0,0,0.55)",
            color: "#fff",
            borderRadius: 0,
            "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
          }}
        >
          <ClearIcon sx={{ fontSize: 12 }} />
        </Button>
      )}
    </Box>
  );
}

/**
 * Single-file dense attachment field for Site Visit image slots.
 */
export function MediaAttachmentField({
  fieldName,
  label,
  required = false,
  value = null,
  onChange,
  error = null,
  disabled = false,
  hint = IMAGE_HINT,
  accept = IMAGE_ACCEPT,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState(null);
  const showError = error || localError;

  const handlePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const validationError = validateSiteVisitFile(file, fieldName);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError(null);
    onChange?.(file);
  };

  const handleClear = () => {
    setLocalError(null);
    onChange?.(null);
  };

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: showError ? "error.main" : "divider",
        borderRadius: 1,
        p: 1,
        height: "100%",
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 600, display: "block", lineHeight: 1.2 }}>
        {label}
        {required ? (
          <Box component="span" sx={{ color: "error.main" }}>
            {" "}
            *
          </Box>
        ) : null}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75, lineHeight: 1.2 }}>
        {hint}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {value ? <PreviewThumb file={value} onClear={disabled ? undefined : handleClear} /> : null}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {value ? (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
              title={value.name}
            >
              {value.name}
            </Typography>
          ) : null}
          {value ? (
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
              {formatFileSize(value.size)}
            </Typography>
          ) : null}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            disabled={disabled}
            onChange={handlePick}
            style={{ display: "none" }}
          />
          <Button
            type="button"
            size="small"
            variant="outlined"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            sx={{ mt: value ? 0.5 : 0, textTransform: "none", py: 0.25, px: 1, minHeight: 28 }}
          >
            {value ? "Replace" : "Choose file"}
          </Button>
        </Box>
      </Box>

      {showError ? (
        <FormHelperText error sx={{ mx: 0, mt: 0.5 }}>
          {showError}
        </FormHelperText>
      ) : null}
    </Box>
  );
}

/**
 * Multi-file Other Images/Videos field.
 */
export function MediaAttachmentMultiField({
  fieldName = OTHER_FIELD,
  label = "Other Images/Videos",
  value = [],
  onChange,
  error = null,
  disabled = false,
  maxCount = OTHER_MAX_COUNT,
  hint = OTHER_HINT,
}) {
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [localError, setLocalError] = useState(null);
  const files = Array.isArray(value) ? value : [];
  const showError = error || localError;
  const remaining = maxCount - files.length;

  const countLabel = useMemo(() => `${files.length}/${maxCount}`, [files.length, maxCount]);

  const appendFiles = (incoming) => {
    const { ok, error: validationError } = validateOtherFiles(incoming, files);
    if (validationError) {
      setLocalError(validationError);
      if (ok.length !== files.length) {
        onChange?.(ok);
      }
      return;
    }
    setLocalError(null);
    onChange?.(ok);
  };

  const handleImages = (e) => {
    const list = Array.from(e.target.files || []);
    e.target.value = "";
    if (!list.length) return;
    appendFiles(list);
  };

  const handleVideo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    appendFiles([file]);
  };

  const handleRemoveAt = (index) => {
    const next = files.filter((_, i) => i !== index);
    setLocalError(null);
    onChange?.(next);
  };

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: showError ? "error.main" : "divider",
        borderRadius: 1,
        p: 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
          {countLabel}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75, lineHeight: 1.2 }}>
        {hint}
      </Typography>

      {files.length > 0 ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 0.75 }}>
          {files.map((file, index) => (
            <Box
              key={`${file.name}-${file.size}-${index}`}
              sx={{ display: "flex", alignItems: "center", gap: 0.5, maxWidth: "100%" }}
            >
              <PreviewThumb
                file={file}
                size={48}
                onClear={disabled ? undefined : () => handleRemoveAt(index)}
              />
              <Box sx={{ minWidth: 0, maxWidth: 120 }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.2,
                  }}
                  title={file.name}
                >
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                  {formatFileSize(file.size)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      ) : null}

      <input
        ref={imageInputRef}
        type="file"
        accept={OTHER_ACCEPT}
        multiple
        disabled={disabled || remaining <= 0}
        onChange={handleImages}
        style={{ display: "none" }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        disabled={disabled || remaining <= 0}
        onChange={handleVideo}
        style={{ display: "none" }}
      />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        <Button
          type="button"
          size="small"
          variant="outlined"
          disabled={disabled || remaining <= 0}
          onClick={() => imageInputRef.current?.click()}
          sx={{ textTransform: "none", py: 0.25, px: 1, minHeight: 28 }}
        >
          Add images
        </Button>
        <Button
          type="button"
          size="small"
          variant="outlined"
          disabled={disabled || remaining <= 0}
          onClick={() => videoInputRef.current?.click()}
          sx={{ textTransform: "none", py: 0.25, px: 1, minHeight: 28 }}
        >
          Add video
        </Button>
      </Box>

      {showError ? (
        <FormHelperText error sx={{ mx: 0, mt: 0.5 }}>
          {showError}
        </FormHelperText>
      ) : null}
    </Box>
  );
}

export default MediaAttachmentField;
