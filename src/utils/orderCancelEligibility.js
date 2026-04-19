export const getOrderCancelEligibility = (orderData) => {
    if (!orderData) return { canCancel: false };
    const deliveryStatusRaw = orderData.delivery_status ?? orderData.deliveryStatus ?? "";
    const deliveryStatus = String(deliveryStatusRaw).trim().toLowerCase();

    return { canCancel: deliveryStatus === "pending" };
};
