import inquiryService from "@/services/inquiryService"

/**
 * Rich label for inquiry pickers: number · customer · mobile
 * @param {Record<string, unknown> | null | undefined} inquiry
 * @returns {string}
 */
export function formatInquiryOptionLabel(inquiry) {
  if (!inquiry || typeof inquiry !== "object") return ""
  const number =
    inquiry.inquiry_number != null && String(inquiry.inquiry_number).trim() !== ""
      ? String(inquiry.inquiry_number).trim()
      : inquiry.id != null
        ? `Inquiry #${inquiry.id}`
        : ""
  const name =
    inquiry.customer_name != null && String(inquiry.customer_name).trim() !== ""
      ? String(inquiry.customer_name).trim()
      : ""
  const mobile =
    (inquiry.mobile_number != null && String(inquiry.mobile_number).trim() !== ""
      ? String(inquiry.mobile_number).trim()
      : null) ||
    (inquiry.phone_no != null && String(inquiry.phone_no).trim() !== ""
      ? String(inquiry.phone_no).trim()
      : "")
  return [number, name, mobile].filter(Boolean).join(" · ")
}

/**
 * Normalize inquiry list API payload to an array of rows.
 * @param {unknown} response
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeInquiryListResponse(response) {
  const root = response?.result ?? response?.data ?? response
  if (Array.isArray(root)) return root
  if (Array.isArray(root?.data)) return root.data
  if (Array.isArray(root?.rows)) return root.rows
  return []
}

/**
 * Async loader for AutocompleteField — searches inquiry #, customer name, mobile.
 * @param {string} q
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function loadInquiryOptions(q) {
  const query = String(q || "").trim()
  const response = await inquiryService.getInquiries({
    q: query,
    page: 1,
    limit: 20,
  })
  return normalizeInquiryListResponse(response)
}

/**
 * Load a single inquiry for edit / from-inquiry preload.
 * @param {number|string} id
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function loadInquiryById(id) {
  if (id == null || id === "") return null
  try {
    const response = await inquiryService.getInquiryById(id)
    const row = response?.result ?? response?.data ?? response
    if (!row || typeof row !== "object") return null
    // Flatten customer fields if nested (getById shape)
    if (row.customer && typeof row.customer === "object") {
      return {
        ...row,
        customer_name: row.customer_name ?? row.customer.customer_name ?? null,
        mobile_number: row.mobile_number ?? row.customer.mobile_number ?? null,
        phone_no: row.phone_no ?? row.customer.phone_no ?? null,
      }
    }
    return row
  } catch {
    return null
  }
}
