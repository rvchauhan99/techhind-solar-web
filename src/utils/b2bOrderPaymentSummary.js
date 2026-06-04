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

export const B2B_PAYMENT_ELIGIBLE_STATUSES = ["CONFIRMED", "PARTIAL_SHIPPED", "COMPLETED"];

export function canCollectB2bPayment(order) {
  return order && B2B_PAYMENT_ELIGIBLE_STATUSES.includes(order.status);
}
