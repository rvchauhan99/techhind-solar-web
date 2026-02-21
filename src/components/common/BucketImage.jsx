"use client";

import { useState, useEffect } from "react";
import { Box } from "@mui/material";

/**
 * Fetches signed URL via getUrl(path) and renders an image. Use for bucket-stored images.
 * @param {string} path - Bucket key (path)
 * @param {function(string): Promise<string|null>} getUrl - e.g. siteVisitService.getDocumentUrl
 * @param {string} alt - Alt text
 * @param {object} sx - MUI sx props
 * @param {function} onClick - Optional click handler (e.g. open in new tab)
 */
export default function BucketImage({ path, getUrl, alt = "Image", sx = {}, onClick }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!path || typeof getUrl !== "function") {
      setUrl(null);
      setLoadError(false);
      return;
    }
    let cancelled = false;
    setError(false);
    setLoadError(false);
    getUrl(path)
      .then((u) => {
        if (!cancelled && u) setUrl(u);
        else if (!cancelled) setError(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [path, getUrl]);

  const handleImgError = () => setLoadError(true);

  if (error || !path) return <Box component="span" sx={{ fontSize: "0.85rem", color: "text.secondary" }}>—</Box>;
  if (!url) return <Box component="span" sx={{ fontSize: "0.85rem", color: "text.secondary" }}>Loading…</Box>;
  if (loadError) return <Box component="span" sx={{ fontSize: "0.85rem", color: "text.secondary" }}>Image unavailable</Box>;

  return (
    <Box
      component="img"
      src={url}
      alt={alt}
      onError={handleImgError}
      sx={{
        width: 50,
        height: 50,
        objectFit: "cover",
        borderRadius: 1,
        cursor: onClick ? "pointer" : "default",
        ...sx,
      }}
      onClick={onClick ? () => window.open(url, "_blank") : undefined}
    />
  );
}
