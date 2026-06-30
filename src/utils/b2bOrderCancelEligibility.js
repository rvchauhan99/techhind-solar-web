export const getB2bOrderCancelEligibility = (order, { canUpdate = false, canCancelConfirmed = false } = {}) => {
  if (!order) {
    return { canCancel: false, mode: null, requiresReason: false, buttonLabel: "Cancel Order" };
  }

  const status = String(order.status || "").trim();
  if (status === "CANCELLED" || status === "COMPLETED") {
    return { canCancel: false, mode: null, requiresReason: false, buttonLabel: "Cancel Order" };
  }

  if (status === "DRAFT") {
    return {
      canCancel: Boolean(canUpdate),
      mode: "draft",
      requiresReason: false,
      buttonLabel: "Cancel Order",
    };
  }

  const canCancelFromApi = order.can_cancel_order === true;
  const totalPending =
    order.total_pending_qty !== undefined && order.total_pending_qty !== null
      ? Number(order.total_pending_qty)
      : null;
  const allowed =
    canCancelFromApi ||
    (["CONFIRMED", "PARTIAL_SHIPPED"].includes(status) &&
      canCancelConfirmed &&
      (totalPending === null || totalPending > 0));

  if (!allowed) {
    return { canCancel: false, mode: null, requiresReason: false, buttonLabel: "Cancel Order" };
  }

  const mode = order.cancel_mode || (status === "PARTIAL_SHIPPED" ? "remaining" : "full");
  return {
    canCancel: true,
    mode,
    requiresReason: true,
    buttonLabel: mode === "remaining" ? "Cancel Remaining Qty" : "Cancel Order",
    totalPendingQty: totalPending,
    totalShippedQty: (order.items || []).reduce(
      (sum, it) => sum + Number(it.shipped_qty ?? it.shipped_quantity ?? 0),
      0
    ),
  };
};
