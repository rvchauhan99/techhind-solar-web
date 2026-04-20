"use client";

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const getOrderProjectCostAmount = (order) => toNumber(order?.project_cost);

export const getOrderReceivedAmount = (order) => toNumber(order?.total_paid);

export const getOrderOutstandingAmount = (order) =>
    getOrderProjectCostAmount(order) - getOrderReceivedAmount(order);

