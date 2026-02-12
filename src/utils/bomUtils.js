/**
 * Get product fields from a BOM line (supports both nested and flat format).
 * - Nested: line.product_snapshot contains product fields
 * - Flat: product fields are directly on line
 * @param {object} line - BOM line item
 * @returns {object|null} Product fields or null
 */
export function getBomLineProduct(line) {
  if (!line) return null;
  return line.product_snapshot || line;
}
