export function getB2bOrderPayableAmount(order) {
  const finalAmt = Number(order?.final_amount);
  const grand = Number(order?.grand_total);
  if (Number.isFinite(finalAmt) && finalAmt > 0) return finalAmt;
  return Number.isFinite(grand) ? grand : 0;
}

export function getB2bOrderReceivedAmount(order) {
  return Number(order?.total_paid ?? 0);
}

export function getB2bOrderOutstandingAmount(order) {
  if (order?.outstanding_balance != null) return Number(order.outstanding_balance);
  const payable = getB2bOrderPayableAmount(order);
  const received = getB2bOrderReceivedAmount(order);
  return Math.max(0, payable - received);
}

export function resolveB2bOrderPayableAmount(order) {
  const fromApi = Number(order?.payable_amount);
  if (Number.isFinite(fromApi) && fromApi >= 0) return fromApi;
  return getB2bOrderPayableAmount(order);
}

export function getB2bOrderOutstandingDisplay(order) {
  const outstanding = getB2bOrderOutstandingAmount(order);
  const payable = resolveB2bOrderPayableAmount(order);

  if (outstanding > 0) {
    return { type: "outstanding", amount: outstanding };
  }
  if (payable > 0) {
    return { type: "fully_paid", label: "Fully Paid" };
  }
  return { type: "not_applicable", label: "—" };
}

export function getB2bOrderPaymentProgress(order) {
  const payable = resolveB2bOrderPayableAmount(order);
  const totalPaid = getB2bOrderReceivedAmount(order);
  const showProgress = payable > 0;
  const paidPercent = showProgress
    ? Math.min(100, Math.max(0, (totalPaid / payable) * 100))
    : 0;

  return { payable, totalPaid, showProgress, paidPercent };
}

export const B2B_PAYMENT_ELIGIBLE_STATUSES = ["CONFIRMED", "PARTIAL_SHIPPED", "COMPLETED"];

export function canCollectB2bPayment(order) {
  if (!order) return false;
  if (typeof order.can_collect_payment === "boolean") return order.can_collect_payment;
  return B2B_PAYMENT_ELIGIBLE_STATUSES.includes(order.status);
}
