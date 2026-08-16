"use client";

export const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(d);
};

/** Truncate paisa and format as whole-rupee en-IN digits (no currency prefix). */
export const formatRupeesInteger = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0";
    return Math.trunc(n).toLocaleString("en-IN");
};

/** Whole-rupee INR for B2C order value display (truncates paisa; does not round). */
export const formatCurrency = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "₹0";
    return `₹${formatRupeesInteger(n)}`;
};

export const formatKw = (value) => {
    const n = Number(value);
    if (Number.isNaN(n)) return "0.00";
    return n.toFixed(2);
};

export const getPrimaryPhone = (order) => order?.mobile_number || order?.phone_no || "-";

export const getFullOrderAddress = (order) => {
    const parts = [
        order?.address,
        order?.landmark_area,
        order?.taluka,
        order?.district,
        order?.city_name,
        order?.state_name,
        order?.pin_code,
        order?.country,
    ].filter((v) => v && String(v).trim() !== "");
    return parts.length ? parts.join(", ") : "-";
};

export const compactAddress = (order) => getFullOrderAddress(order);

export const safeValue = (value) => {
    if (value == null) return "-";
    const v = String(value).trim();
    return v === "" ? "-" : v;
};

