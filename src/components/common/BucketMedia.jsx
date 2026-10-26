"use client"

import { useState, useEffect } from "react"
import { Box } from "@mui/material"
import { isVideoPath } from "@/lib/siteVisitMedia"

/**
 * Fetches signed URL via getUrl(path) and renders image or video by path extension.
 * @param {string} path - Bucket key (path)
 * @param {function(string): Promise<string|null>} getUrl - e.g. siteVisitService.getDocumentUrl
 * @param {string} alt - Alt / accessible label
 * @param {object} sx - MUI sx props
 * @param {"image"|"video"|null} kind - Optional override; inferred from path when omitted
 * @param {function} onClick - Optional click (opens signed URL in new tab by default when set)
 */
export default function BucketMedia({
  path,
  getUrl,
  alt = "Media",
  sx = {},
  kind = null,
  controls = true,
  onClick,
}) {
  const [url, setUrl] = useState(null)
  const [error, setError] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const isVideo = kind === "video" || (kind !== "image" && isVideoPath(path))

  useEffect(() => {
    if (!path || typeof getUrl !== "function") {
      setUrl(null)
      setLoadError(false)
      return undefined
    }
    let cancelled = false
    setError(false)
    setLoadError(false)
    getUrl(path)
      .then((u) => {
        if (!cancelled && u) setUrl(u)
        else if (!cancelled) setError(true)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [path, getUrl])

  const handleLoadError = () => setLoadError(true)

  if (error || !path) {
    return (
      <Box component="span" sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
        —
      </Box>
    )
  }
  if (!url) {
    return (
      <Box component="span" sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
        Loading…
      </Box>
    )
  }
  if (loadError) {
    return (
      <Box component="span" sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
        {isVideo ? "Video unavailable" : "Image unavailable"}
      </Box>
    )
  }

  const openFull = onClick
    ? () => {
        if (typeof onClick === "function") onClick(url)
        else window.open(url, "_blank")
      }
    : undefined

  if (isVideo) {
    return (
      <Box
        component="video"
        src={url}
        controls={controls}
        playsInline
        preload="metadata"
        muted={!controls}
        onError={handleLoadError}
        onClick={openFull}
        sx={{
          width: 50,
          height: 50,
          objectFit: "cover",
          borderRadius: 1,
          cursor: openFull ? "pointer" : "default",
          ...sx,
        }}
      />
    )
  }

  return (
    <Box
      component="img"
      src={url}
      alt={alt}
      onError={handleLoadError}
      onClick={openFull}
      sx={{
        width: 50,
        height: 50,
        objectFit: "cover",
        borderRadius: 1,
        cursor: openFull ? "pointer" : "default",
        ...sx,
      }}
    />
  )
}
