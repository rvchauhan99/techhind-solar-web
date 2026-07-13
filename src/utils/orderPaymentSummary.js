"use client";

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const getOrderProjectCostAmount = (order) => toNumber(order?.project_cost);

export const getOrderReceivedAmount = (order) => toNumber(order?.total_paid);

export const getOrderOutstandingAmount = (order) =>
    getOrderProjectCostAmount(order) - getOrderReceivedAmount(order);

/** Approved + pending receipts (falls back to total_paid for older API responses). */
export const getOrderCommittedAmount = (order) => {
    if (order?.total_committed != null && order.total_committed !== "") {
        return toNumber(order.total_committed);
    }
    return getOrderReceivedAmount(order);
};

export const getOrderCommittedOutstandingAmount = (order) => {
    if (order?.committed_outstanding != null && order.committed_outstanding !== "") {
        return toNumber(order.committed_outstanding);
    }
    return getOrderProjectCostAmount(order) - getOrderCommittedAmount(order);
};

export const getOrderAllowOverpayment = (order) => {
    if (typeof order?.allow_overpayment === "boolean") return order.allow_overpayment;
    if (order?.allow_overpayment == null) return false;
    const s = String(order.allow_overpayment).trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "on";
};
