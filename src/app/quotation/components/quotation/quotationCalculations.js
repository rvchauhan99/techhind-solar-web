/**
 * Financial calculations for quotation. UI only renders computed results.
 */

const toNum = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v));

/**
 * @param {Record<string, unknown>} formData
 * @returns {{ subtotal: number; gstAmount: number; totalPayable: number; effectiveCost: number }}
 */
export function calculateTotals(formData) {
    // Subtotal used for payable calculation (keeps all add-ons and discount)
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
