/**
 * Data table utilities – reference-style formatting and styles for listing tables.
 * Aligns with karebo reference: formatDate, formatCurrency (INR), TABLE_REFERENCE_STYLES.
 */

/**
 * Format date for display. Supports backend date strings (ISO, dd-mm-yyyy HH:mm, etc.).
 * @param {string} dateString
 * @returns {string} Locale date (en-IN: day short month year; optional time)
 */
export function formatDate(dateString) {
  if (!dateString) return "-";
  try {
    if (typeof dateString === "string" && dateString.match(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/)) {
      const [datePart, timePart] = dateString.split(" ");
      const [day, month, year] = datePart.split("-");
      const [hours, minutes] = timePart.split(":");
      const date = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        parseInt(hours, 10),
        parseInt(minutes, 10)
      );
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }
    const date = new Date(dateString);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return String(dateString);
  } catch {
    return String(dateString);
  }
}

/**
 * Format currency for display (INR).
 * @param {number} value
 * @returns {string} e.g. "₹1,234.56"
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Reference-style table styling (header #F1F1F1, compact rows, max rows per page).
 * Use in PaginatedTable sx or theme overrides.
 */
export const TABLE_REFERENCE_STYLES = {
  headerBackgroundColor: "#F1F1F1",
  headerFontSize: 14,
  headerFontWeight: 700,
  cellPaddingCompact: "6px 10px",
  borderRadius: 8,
  rowMinHeight: 36,
};
