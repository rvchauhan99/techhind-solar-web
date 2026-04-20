/**
 * Compact label for product pickers: name plus optional model number.
 * @param {Record<string, unknown> | null | undefined} p
 * @returns {string}
 */
export function formatProductAutocompleteLabel(p) {
  if (p == null) return "";
  const name = String(p.product_name ?? p.name ?? "").trim();
  const mn = String(p.model_number ?? "").trim();
  if (!mn) return name || String(p.id ?? "");
  return name ? `${name} · ${mn}` : mn;
}

/**
 * Option shape for order-list product filters (panel / dialog / list view).
 * @param {Record<string, unknown>} row — API product row
 */
export function mapProductRowForOrderFilter(row) {
  const label = formatProductAutocompleteLabel(row);
  return {
    id: row.id,
    product_name: row.product_name,
    model_number: row.model_number ?? null,
    name: label,
    label,
  };
}
