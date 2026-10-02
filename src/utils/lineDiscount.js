const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const lineValueOf = (quantity, rate) => (Number(quantity) || 0) * (Number(rate) || 0);

/** Preview the other discount field while the user is typing. Does not throw. */
const previewLineDiscount = ({
  quantity,
  rate,
  discount_percent,
  discount_amount,
  discount_basis,
} = {}) => {
  const lineValue = lineValueOf(quantity, rate);
  const basis = String(discount_basis || "percent").toLowerCase() === "amount" ? "amount" : "percent";

  if (basis === "amount") {
    const raw = discount_amount === "" || discount_amount == null ? 0 : Number(discount_amount);
    const amount = Number.isFinite(raw) ? Math.round(raw) : 0;
    const percent = lineValue > 0 && amount > 0 ? round2((amount / lineValue) * 100) : 0;
    return {
      discount_basis: "amount",
      discount_amount: amount,
      discount_percent: percent,
      lineValue,
      invalid: amount < 0 || (lineValue > 0 && amount > lineValue + 1e-9) || (lineValue <= 0 && amount > 0),
    };
  }

  const rawPct = discount_percent === "" || discount_percent == null ? 0 : Number(discount_percent);
  const percent = Number.isFinite(rawPct) ? rawPct : 0;
  let amount = lineValue > 0 && percent > 0 ? Math.round((lineValue * percent) / 100) : 0;
  if (amount > lineValue) amount = Math.floor(lineValue);
  if (amount < 0) amount = 0;
  return {
    discount_basis: "percent",
    discount_percent: round2(percent),
    discount_amount: amount,
    lineValue,
    invalid: percent < 0 || percent > 100,
  };
};

const integerAmountInput = (value) => String(value ?? "").split(".")[0].replace(/[^\d]/g, "");

/**
 * Keep Disc % and Disc Amt in sync. The field the user is typing is left as entered.
 * Quantity or rate changes recalculate the field that was not last edited.
 */
const applyDiscountFieldChange = (item, changedName, rateKey = "unit_rate") => {
  const next = { ...item };
  const editsPercent = changedName === "discount_percent";
  const editsAmount = changedName === "discount_amount";
  const editsLine = changedName === "quantity" || changedName === rateKey || changedName === "per_watt_rate";

  if (editsAmount) {
    next.discount_amount = integerAmountInput(item.discount_amount);
    next.discount_basis = "amount";
  } else if (editsPercent) {
    next.discount_basis = "percent";
  } else if (editsLine) {
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
