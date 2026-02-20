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
