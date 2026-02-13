/**
 * Financial calculations for quotation. UI only renders computed results.
 */

const toNum = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v));

/**
 * @param {Record<string, unknown>} formData
 * @returns {{ subtotal: number; gstAmount: number; totalPayable: number; effectiveCost: number }}
 */
export function calculateTotals(formData) {
    const subtotal =
        toNum(formData.total_project_value) +
        toNum(formData.netmeter_amount) +
        toNum(formData.stamp_charges) +
        toNum(formData.state_government_amount) +
        toNum(formData.structure_amount) +
        toNum(formData.additional_cost_amount_1) +
        toNum(formData.additional_cost_amount_2) -
        toNum(formData.discount);

    const gstRate = toNum(formData.gst_rate);
    const gstAmount = (subtotal * gstRate) / 100;
    const totalPayable = subtotal + gstAmount;
    const effectiveCost =
        totalPayable - toNum(formData.subsidy_amount) - toNum(formData.state_subsidy_amount);

    return { subtotal, gstAmount, totalPayable, effectiveCost };
}
