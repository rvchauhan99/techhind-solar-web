/**
 * Helpers for BOM substitute display on quotation form / details.
 */

export function normalizeSubstituteList(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((p) => {
            if (!p) return null;
            const id = Number(p.id ?? p.product_id);
            const product_name = p.product_name || p.name || null;
            if (!product_name && !(Number.isInteger(id) && id > 0)) return null;
            return {
                id: Number.isInteger(id) && id > 0 ? id : null,
                product_name,
                product_type_name: p.product_type_name || p.productType?.name || null,
                product_make_name: p.product_make_name || p.productMake?.name || null,
                capacity: p.capacity ?? null,
            };
        })
        .filter(Boolean);
}

/**
 * Build map keyed by primary product id string from BOM detail or bom_snapshot lines.
 */
export function buildBomSubstitutesByProductId(lines) {
    const map = {};
    if (!Array.isArray(lines)) return map;
    for (const line of lines) {
        if (!line || line.entry_type === "meta") continue;
        if (line.entry_type === "extra_material" || line.is_extra_material === true) continue;
        const primaryId = Number(line.product_id ?? line.product?.id);
        if (!Number.isInteger(primaryId) || primaryId <= 0) continue;
        const fromProducts = normalizeSubstituteList(line.substitute_products);
        const ids = Array.isArray(line.substitute_product_ids)
            ? line.substitute_product_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0 && n !== primaryId)
            : [];
        let list = fromProducts;
        if (!list.length && ids.length) {
            list = ids.map((id) => ({ id, product_name: `Product #${id}` }));
        }
        if (list.length) map[String(primaryId)] = list;
    }
    return map;
}

export function getSubstitutesForProductId(map, productId) {
    if (!map || productId == null || productId === "") return [];
    return map[String(productId)] || [];
}
