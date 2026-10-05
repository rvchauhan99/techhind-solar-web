const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const lineValueOf = (quantity, rate) => (Number(quantity) || 0) * (Number(rate) || 0);

/**
 * Preview line discount. Disc Amt is rupees per qty; Disc % is of the unit rate.
 * Returns discount_amount as the per-unit integer and line_discount as perUnit × qty.
 */
const previewLineDiscount = ({
  quantity,
  rate,
  discount_percent,
  discount_amount,
  discount_basis,
} = {}) => {
  const qty = Number(quantity) || 0;
  const unitRate = Number(rate) || 0;
  const lineValue = lineValueOf(qty, unitRate);
  const basis = String(discount_basis || "percent").toLowerCase() === "amount" ? "amount" : "percent";

  if (basis === "amount") {
    const raw = discount_amount === "" || discount_amount == null ? 0 : Number(discount_amount);
    const perUnit = Number.isFinite(raw) ? Math.round(raw) : 0;
    const percent = unitRate > 0 && perUnit > 0 ? round2((perUnit / unitRate) * 100) : 0;
    const lineDiscount = Math.max(0, perUnit * qty);
    return {
      discount_basis: "amount",
      discount_amount: perUnit,
      discount_percent: percent,
      lineValue,
      line_discount: lineDiscount,
      taxable: Math.max(0, round2(lineValue - lineDiscount)),
      invalid: perUnit < 0 || (unitRate > 0 && perUnit > unitRate + 1e-9) || (unitRate <= 0 && perUnit > 0),
    };
  }

  const rawPct = discount_percent === "" || discount_percent == null ? 0 : Number(discount_percent);
  const percent = Number.isFinite(rawPct) ? rawPct : 0;
  let perUnit = unitRate > 0 && percent > 0 ? Math.round((unitRate * percent) / 100) : 0;
  if (perUnit > unitRate) perUnit = Math.floor(unitRate);
  if (perUnit < 0) perUnit = 0;
  const lineDiscount = Math.max(0, perUnit * qty);
  return {
    discount_basis: "percent",
    discount_percent: round2(percent),
    discount_amount: perUnit,
    lineValue,
    line_discount: lineDiscount,
    taxable: Math.max(0, round2(lineValue - lineDiscount)),
    invalid: percent < 0 || percent > 100,
  };
};

const integerAmountInput = (value) => String(value ?? "").split(".")[0].replace(/[^\d]/g, "");

/**
 * Keep Disc % and Disc Amt / Qty in sync. The field the user is typing is left as entered.
 * Rate (or per-watt) changes recalculate the field that was not last edited.
 * Quantity changes do not rewrite either discount input.
 */
const applyDiscountFieldChange = (item, changedName, rateKey = "unit_rate") => {
  const next = { ...item };
  const editsPercent = changedName === "discount_percent";
  const editsAmount = changedName === "discount_amount";
  const editsRate = changedName === rateKey || changedName === "per_watt_rate";

  if (editsAmount) {
    next.discount_amount = integerAmountInput(item.discount_amount);
    next.discount_basis = "amount";
  } else if (editsPercent) {
    next.discount_basis = "percent";
  } else if (editsRate) {
    next.discount_basis = item.discount_basis === "amount" ? "amount" : item.discount_basis || "percent";
  } else {
    return next;
  }

  const preview = previewLineDiscount({
    quantity: next.quantity,
    rate: next[rateKey],
    discount_percent: next.discount_percent,
    discount_amount: next.discount_amount,
    discount_basis: next.discount_basis,
  });

  if (next.discount_basis === "amount" && !editsPercent) {
    next.discount_percent = preview.discount_percent.toFixed(2);
  } else if (next.discount_basis !== "amount" && !editsAmount) {
    next.discount_amount = String(preview.discount_amount);
  }
  return next;
};

export { previewLineDiscount, integerAmountInput, lineValueOf, round2, applyDiscountFieldChange };
