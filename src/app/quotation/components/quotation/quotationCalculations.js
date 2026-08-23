/**
 * Financial calculations for quotation. UI only renders computed results.
 */

const toNum = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v));

/**
 * Invariant: total_project_value = price_per_kw × project_capacity
 * @param {{ project_capacity?: unknown, price_per_kw?: unknown }} params
 * @returns {number|null} rounded total, or null if capacity/rate not usable
 */
export function syncTotalFromCapacityAndRate({ project_capacity, price_per_kw }) {
    const cap = Number(project_capacity);
    const rate = Number(price_per_kw);
    if (!(cap > 0) || !(rate > 0) || Number.isNaN(cap) || Number.isNaN(rate)) return null;
    return Number((rate * cap).toFixed(2));
}

/**
 * Project capacity in kW from panel product wattage × quantity.
 * @param {unknown} panelCapacityWatts
 * @param {unknown} quantity
 * @returns {string} capacity fixed to 2 decimals, or "" if invalid
 */
export function computeProjectCapacityFromPanel(panelCapacityWatts, quantity) {
    const watts = Number(panelCapacityWatts);
    const qty = Number(quantity);
    if (!(watts > 0) || !(qty > 0) || Number.isNaN(watts) || Number.isNaN(qty)) return "";
    return ((watts * qty) / 1000).toFixed(2);
}

/**
 * @param {Record<string, unknown>} formData
 * @returns {{ subtotal: number; gstAmount: number; totalPayable: number; effectiveCost: number }}
 */
export function calculateTotals(formData) {
    // Subtotal used for payable calculation (keeps all add-ons and discount)
    // When Extra Materials is enabled, its sum is written into additional_cost_amount_2
    const payableSubtotal =
        toNum(formData.total_project_value) +
        toNum(formData.netmeter_amount) +
        toNum(formData.stamp_charges) +
        toNum(formData.state_government_amount) +
        toNum(formData.structure_amount) +
        toNum(formData.additional_cost_amount_1) +
        toNum(formData.additional_cost_amount_2) -
        toNum(formData.discount);

    // GST taxable base excludes non-taxable components:
    // - netmeter_amount
    // - stamp_charges
    // - state_government_amount
    // Discount has already been applied in payableSubtotal above.
    const gstTaxableBase =
        payableSubtotal -
        toNum(formData.netmeter_amount) -
        toNum(formData.stamp_charges) -
        toNum(formData.state_government_amount);

    const gstRate = toNum(formData.gst_rate);
    const safeTaxableBase = Math.max(0, gstTaxableBase);
    const gstAmount = (safeTaxableBase * gstRate) / 100;
    const totalPayable = payableSubtotal + gstAmount;
    const effectiveCost =
        totalPayable - toNum(formData.subsidy_amount) - toNum(formData.state_subsidy_amount);

    // Preserve original return shape; `subtotal` reported is the payable subtotal
    return { subtotal: payableSubtotal, gstAmount, totalPayable, effectiveCost };
}
