/**
 * Client-side preview of installation serial reconciliation.
 * Must stay aligned with techhind-solar-api/src/modules/installation/installation.service.js
 * (createOrUpdate → complete → reconciliation block).
 */

/**
 * @param {Record<string, unknown>} installationScans
 * @param {string|number} pid
 * @returns {string[]}
 */
export function getInstallationScansForProduct(installationScans, pid) {
    const k = String(pid);
    if (installationScans[k] != null) return installationScans[k];
    const n = Number(pid);
    if (!Number.isNaN(n) && installationScans[n] != null) return installationScans[n];
    return [];
}

/**
 * @typedef {Object} DeliveredSerialRow
 * @property {string|null} [serial_number]
 * @property {number|null} [stock_serial_id]
 * @property {boolean} [missing_at_delivery]
 */

/**
 * @typedef {Object} PerProductPreview
 * @property {string} productId
 * @property {DeliveredSerialRow[]} deliveredSerials
 * @property {string[]} scanned
 * @property {'count_mismatch'|'empty_slots'|'duplicate_in_product'|null} blockingReason
 * @property {boolean} hasPlaceholder
 */

/**
 * Preview reconciliation without throwing (for live UI).
 *
 * @param {Record<string, DeliveredSerialRow[]>} deliveredSerialsMap
 * @param {Record<string, string[]>} installationScans
 * @returns {{
 *   perProduct: PerProductPreview[],
 *   mismatches: Array<{ product_id: string, missing_serials: string[], expected_serials: string[] }>,
 *   placeholderMismatch: boolean,
 *   canForceAdjust: boolean,
 *   capturesByProduct: Record<string, string[]>,
 *   allFilledAndShaped: boolean,
 * }}
 */
export function previewInstallationReconciliation(deliveredSerialsMap, installationScans) {
    const requiredProducts = Object.keys(deliveredSerialsMap || {});
    /** @type {PerProductPreview[]} */
    const perProduct = [];
    const mismatches = [];
    const capturesByProduct = {};
    let placeholderMismatch = false;

    for (const pid of requiredProducts) {
        const deliveredSerials =
            deliveredSerialsMap[pid] || deliveredSerialsMap[Number(pid)] || [];
        const rawScanned = getInstallationScansForProduct(installationScans || {}, pid);
        const requiredCount = deliveredSerials.length;

        /** @type {'count_mismatch'|'empty_slots'|'duplicate_in_product'|null} */
        let blockingReason = null;

        if (rawScanned.length !== requiredCount) {
            blockingReason = "count_mismatch";
        } else {
            const scannedSerials = rawScanned.map((s) => String(s).trim());
            if (scannedSerials.some((s) => !s)) {
                blockingReason = "empty_slots";
            } else {
                const lowerScanned = scannedSerials.map((s) => s.toLowerCase());
                if (new Set(lowerScanned).size !== lowerScanned.length) {
                    blockingReason = "duplicate_in_product";
                }
            }
        }

        const hasPlaceholder = deliveredSerials.some((s) => !s || !s.serial_number);

        perProduct.push({
            productId: pid,
            deliveredSerials,
            scanned: rawScanned.map((s) => String(s)),
            blockingReason,
            hasPlaceholder,
        });

        if (blockingReason) {
            continue;
        }

        const scannedSerials = rawScanned.map((s) => String(s).trim());
        const lowerScanned = scannedSerials.map((s) => s.toLowerCase());

        if (!hasPlaceholder) {
            const deliveredSerialNumbers = deliveredSerials.map((s) => String(s.serial_number).toLowerCase());
            const missingFromDelivered = lowerScanned.filter((sn) => !deliveredSerialNumbers.includes(sn));
            const extraInDelivered = deliveredSerialNumbers.filter((sn) => !lowerScanned.includes(sn));

            if (missingFromDelivered.length > 0) {
                mismatches.push({
                    product_id: pid,
                    missing_serials: missingFromDelivered,
                    expected_serials: extraInDelivered,
                });
            }
        } else {
            const knownLower = deliveredSerials
                .filter((s) => s && s.serial_number)
                .map((s) => String(s.serial_number).toLowerCase());
            const nullCount = deliveredSerials.filter((s) => !s || !s.serial_number).length;

            const pool = [...knownLower];
            const captures = [];
            for (const sn of lowerScanned) {
                const ix = pool.indexOf(sn);
                if (ix >= 0) pool.splice(ix, 1);
                else captures.push(sn);
            }

            if (pool.length > 0 || captures.length !== nullCount) {
                placeholderMismatch = true;
                mismatches.push({
                    product_id: pid,
                    missing_serials: captures,
                    expected_serials: pool,
                });
            } else if (captures.length > 0) {
                capturesByProduct[pid] = captures;
            }
        }
    }

    const canForceAdjust = mismatches.length > 0 && !placeholderMismatch;

    const allFilledAndShaped =
        requiredProducts.length === 0 || perProduct.every((p) => !p.blockingReason);

    return {
        perProduct,
        mismatches,
        placeholderMismatch,
        canForceAdjust,
        capturesByProduct,
        allFilledAndShaped,
    };
}

/**
 * Whether a trimmed scanned value is not on the delivery list (non-placeholder products only).
 * Mirrors multiset membership check used for missingFromDelivered in the service.
 *
 * @param {string} trimmedValue
 * @param {DeliveredSerialRow[]} deliveredSerials
 * @param {boolean} hasPlaceholder
 * @returns {boolean}
 */
export function scannedValueNotInDeliveredMultiset(trimmedValue, deliveredSerials, hasPlaceholder) {
    if (!trimmedValue || hasPlaceholder) return false;
    const lower = trimmedValue.toLowerCase();
    const deliveredSerialNumbers = (deliveredSerials || []).map((s) =>
        String(s.serial_number || "").toLowerCase()
    );
    return !deliveredSerialNumbers.includes(lower);
}

/**
 * Slot had no serial at delivery — installer must capture at site (Scenario A).
 * @param {DeliveredSerialRow|null|undefined} slot
 * @returns {boolean}
 */
export function slotIsCaptureAtDelivery(slot) {
    if (!slot) return true;
    if (slot.missing_at_delivery) return true;
    return !String(slot.serial_number || "").trim();
}

/**
 * Known DC slot: value must appear among delivered serial_numbers for this line (multiset).
 * Capture slots are never flagged invalid here.
 *
 * @param {string} trimmedValue
 * @param {DeliveredSerialRow[]} deliveredRows
 * @param {number} slotIndex
 * @returns {boolean}
 */
export function scannedValueInvalidForInstallationSlot(trimmedValue, deliveredRows, slotIndex) {
    if (!trimmedValue) return false;
    const slot = deliveredRows?.[slotIndex];
    if (slotIsCaptureAtDelivery(slot)) return false;
    const lower = trimmedValue.toLowerCase();
    const known = (deliveredRows || [])
        .map((s) => String(s?.serial_number || "").trim())
        .filter(Boolean)
        .map((s) => s.toLowerCase());
    return !known.includes(lower);
}
