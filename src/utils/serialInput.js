/**
 * Shared utilities for parsing and distributing serial numbers from barcode/QR scan
 * or pasted text (e.g. pallet barcodes with multiple serials).
 * Separators: space, comma, newline, carriage return, tab, multiple spaces.
 */

export const SEPARATORS = /[\s,\n\r\t]+/;

/**
 * Split raw input into ordered array of non-empty, trimmed serial strings.
 * Deduplicates within the input (first occurrence kept, case-sensitive for storage).
 *
 * @param {string} text - Raw scan or paste string
 * @returns {string[]} Ordered unique serials (trimmed, non-empty)
 */
export function splitSerialInput(text) {
    if (text == null || typeof text !== "string") return [];
    const tokens = text.split(SEPARATORS).map((s) => s.trim()).filter(Boolean);
    const seenLower = new Set();
    const result = [];
    for (const t of tokens) {
        const key = t.toLowerCase();
        if (!seenLower.has(key)) {
            seenLower.add(key);
            result.push(t);
        }
    }
    return result;
}

/**
 * Whether the input contains more than one serial (after splitting).
 *
 * @param {string} text
 * @returns {boolean}
 */
export function hasMultipleSerials(text) {
    const tokens = splitSerialInput(text);
    return tokens.length > 1;
}

/**
 * Compute how to fill existing slots with incoming serials, respecting
 * existing values and optional case-insensitive dedupe against current slots.
 * Does not mutate inputs.
 *
 * @param {Object} opts
 * @param {string[]} opts.slots - Current drawer/slot values (array of strings)
 * @param {number} opts.startIndex - First slot index to consider for filling
 * @param {string[]} opts.incoming - Ordered list of serial strings to place
 * @param {boolean} [opts.caseInsensitive=true] - Dedupe against existing slots case-insensitively
 * @returns {{ nextSlots: string[], lastFilledIndex: number, overflow: string[], duplicates: string[] }}
 */
export function fillSerialSlots({ slots, startIndex, incoming, caseInsensitive = true }) {
    const nextSlots = [...(slots || [])];
    const overflow = [];
    const duplicates = [];
    const existingLower = new Set(
        (slots || []).map((s) => String(s || "").trim()).filter(Boolean).map((s) => (caseInsensitive ? s.toLowerCase() : s))
    );
    let lastFilledIndex = startIndex - 1;
    let searchFrom = startIndex;

    for (const serial of incoming) {
        const trimmed = String(serial || "").trim();
        if (!trimmed) continue;

        const key = caseInsensitive ? trimmed.toLowerCase() : trimmed;
        if (existingLower.has(key)) {
            duplicates.push(trimmed);
            continue;
        }

        let placed = false;
        for (let i = searchFrom; i < nextSlots.length; i++) {
            const current = String(nextSlots[i] || "").trim();
            if (!current) {
                nextSlots[i] = trimmed;
                existingLower.add(key);
                lastFilledIndex = i;
                searchFrom = i + 1;
                placed = true;
                break;
            }
        }
        if (!placed) {
            overflow.push(trimmed);
        }
    }

    return { nextSlots, lastFilledIndex, overflow, duplicates };
}

/**
 * Find another slot with the same serial (trim + case-insensitive).
 * Used on Tab/Enter while filling serial fields.
 *
 * @param {string[]} serials
 * @param {number} index
 * @returns {number} Index of the first matching other slot, or -1
 */
export function findCaseInsensitiveDuplicateIndex(serials, index) {
    const key = String(serials?.[index] || "").trim().toLowerCase();
    if (!key) return -1;
    return (serials || []).findIndex(
        (s, i) => i !== index && String(s || "").trim().toLowerCase() === key
    );
}

/**
 * Trim and drop empty slots, preserving order of filled serials.
 *
 * @param {string[]} slots
 * @returns {string[]}
 */
export function compactSerials(slots) {
    return (slots || [])
        .map((s) => String(s || "").trim())
        .filter(Boolean);
}

/**
 * Line status for serial count vs target qty.
 * @param {number} count
 * @param {number} qty
 * @returns {"complete"|"pending"|"over"|"empty"}
 */
export function getSerialLineStatus(count, qty) {
    const n = Number(count) || 0;
    const q = Number(qty) || 0;
    if (q <= 0 && n <= 0) return "empty";
    if (n === q && q > 0) return "complete";
    if (n > q) return "over";
    return "pending";
}

/**
 * Cap for auto-growing qty when scanning beyond current qty.
 * @param {{ pending?: number|null, available?: number|null, skipCap?: boolean }} opts
 * @returns {number|null} null = uncapped (e.g. commercial skip)
 */
export function resolveSerialCap({ pending, available, skipCap = false } = {}) {
    if (skipCap) return null;
    const caps = [];
    if (pending != null && !Number.isNaN(Number(pending))) caps.push(Number(pending));
    if (available != null && !Number.isNaN(Number(available))) caps.push(Number(available));
    if (!caps.length) return null;
    return Math.max(0, Math.min(...caps));
}

/**
 * Grow slots to fit overflow serials up to optional cap.
 * Returns grown slots + how many overflow items still could not be placed.
 *
 * @param {Object} opts
 * @param {string[]} opts.slots
 * @param {string[]} opts.overflow
 * @param {number|null} [opts.cap]
 * @param {boolean} [opts.caseInsensitive=true]
 * @returns {{ nextSlots: string[], placed: string[], remaining: string[], grownBy: number }}
 */
export function growSlotsForOverflow({ slots, overflow, cap = null, caseInsensitive = true }) {
    const nextSlots = [...(slots || [])];
    const placed = [];
    const remaining = [];
    const existingLower = new Set(
        nextSlots.map((s) => String(s || "").trim()).filter(Boolean).map((s) => (caseInsensitive ? s.toLowerCase() : s))
    );
    let grownBy = 0;

    for (const serial of overflow || []) {
        const trimmed = String(serial || "").trim();
        if (!trimmed) continue;
        const key = caseInsensitive ? trimmed.toLowerCase() : trimmed;
        if (existingLower.has(key)) continue;

        const nextLen = nextSlots.length + 1;
        if (cap != null && nextLen > cap) {
            remaining.push(trimmed);
            continue;
        }
        nextSlots.push(trimmed);
        existingLower.add(key);
        placed.push(trimmed);
        grownBy += 1;
    }

    return { nextSlots, placed, remaining, grownBy };
}
