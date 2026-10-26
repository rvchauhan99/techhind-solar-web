/** Site Visit media contract — must match API siteVisitMedia.js */

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024
export const OTHER_MAX_COUNT = 20

export const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
])

export const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
])

export const IMAGE_ONLY_FIELDS = new Set([
  "visit_photo",
  "left_corner_site_image",
  "right_corner_site_image",
  "left_top_corner_site_image",
  "right_top_corner_site_image",
  "drawing_image",
  "house_building_outside_photo",
])

export const OTHER_FIELD = "other_images_videos"

export const IMAGE_ALLOWED_LABEL = "JPG, PNG, WEBP"
export const OTHER_ALLOWED_LABEL = "JPG, PNG, WEBP, MP4, MOV, WEBM"

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
export const OTHER_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
export const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"

export const IMAGE_HINT = `Max 10 MB · ${IMAGE_ALLOWED_LABEL}`
export const OTHER_HINT = `Images 10 MB · Videos 50 MB · ${OTHER_ALLOWED_LABEL}`

export const SITE_VISIT_UPLOAD_TIMEOUT_MS = 120000

export const MESSAGES = {
  size: (name, maxMb) => `${name} exceeds the maximum size of ${maxMb} MB`,
  typeImage: (name) => `${name} is not supported. Allowed: ${IMAGE_ALLOWED_LABEL}`,
  typeOther: (name) => `${name} is not supported. Allowed: ${OTHER_ALLOWED_LABEL}`,
  videoWrongSlot: "Video is only allowed under Other Images/Videos",
  otherCount: `You can upload at most ${OTHER_MAX_COUNT} other images/videos`,
  visitPhotoRequired: "Visit photo is required",
  timeout: "Upload timed out. Try fewer or smaller files, then submit again",
}

export function isImageMime(mime) {
  return IMAGE_MIME_TYPES.has(String(mime || "").toLowerCase())
}

export function isVideoMime(mime) {
  return VIDEO_MIME_TYPES.has(String(mime || "").toLowerCase())
}

function extensionOf(name) {
  const parts = String(name || "").toLowerCase().split(".")
  return parts.length > 1 ? `.${parts.pop()}` : ""
}

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"])
const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm"])

/** Bucket key or filename — detect image by extension. */
export function isImagePath(path) {
  if (!path || typeof path !== "string") return false
  const base = path.split("?")[0]
  return IMAGE_EXTS.has(extensionOf(base))
}

/** Bucket key or filename — detect video by extension. */
export function isVideoPath(path) {
  if (!path || typeof path !== "string") return false
  const base = path.split("?")[0]
  return VIDEO_EXTS.has(extensionOf(base))
}

export function isImageFile(file) {
  if (!file) return false
  if (file.type && isImageMime(file.type)) return true
  return IMAGE_EXTS.has(extensionOf(file.name))
}

export function isVideoFile(file) {
  if (!file) return false
  if (file.type && isVideoMime(file.type)) return true
  return VIDEO_EXTS.has(extensionOf(file.name))
}

/**
 * @param {File} file
 * @param {string} fieldName
 * @returns {string|null} error message or null
 */
export function validateSiteVisitFile(file, fieldName) {
  if (!file) return null
  const name = file.name || "File"

  if (IMAGE_ONLY_FIELDS.has(fieldName)) {
    if (isVideoFile(file)) return MESSAGES.videoWrongSlot
    if (!isImageFile(file)) return MESSAGES.typeImage(name)
    if (file.size > IMAGE_MAX_BYTES) return MESSAGES.size(name, 10)
    return null
  }

  if (fieldName === OTHER_FIELD) {
    if (!isImageFile(file) && !isVideoFile(file)) return MESSAGES.typeOther(name)
    if (isVideoFile(file) && file.size > VIDEO_MAX_BYTES) return MESSAGES.size(name, 50)
    if (isImageFile(file) && file.size > IMAGE_MAX_BYTES) return MESSAGES.size(name, 10)
    return null
  }

  return MESSAGES.typeImage(name)
}

/**
 * Validate a list of other files including count against existing.
 * @returns {{ ok: File[], error: string|null }}
 */
export function validateOtherFiles(incoming, existing = []) {
  const next = [...existing]
  for (const file of incoming) {
    if (next.length >= OTHER_MAX_COUNT) {
      return { ok: next, error: MESSAGES.otherCount }
    }
    const err = validateSiteVisitFile(file, OTHER_FIELD)
    if (err) return { ok: next, error: err }
    next.push(file)
  }
  return { ok: next, error: null }
}

export function formatSiteVisitUploadError(error) {
  if (!error) return MESSAGES.timeout.replace("timed out", "failed")
  const code = error.code || error?.response?.status
  const msg = error.response?.data?.message || error.message || ""
  if (
    error.code === "ECONNABORTED" ||
    /timeout/i.test(String(msg)) ||
    code === "ECONNABORTED"
  ) {
    return MESSAGES.timeout
  }
  return msg || "An error occurred while saving the site visit"
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
