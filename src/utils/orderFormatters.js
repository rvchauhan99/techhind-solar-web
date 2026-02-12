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

export const formatCurrency = (value) => {
    const n = Number(value);
    if (Number.isNaN(n)) return "Rs. 0";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);
};

export const formatKw = (value) => {
    const n = Number(value);
    if (Number.isNaN(n)) return "0.00";
    return n.toFixed(2);
};

export const getPrimaryPhone = (order) => order?.mobile_number || order?.phone_no || "-";

export const compactAddress = (order) => {
    const parts = [
        order?.address,
        order?.landmark_area,
        order?.taluka,
        order?.district,
        order?.pin_code,
    ].filter((v) => v && String(v).trim() !== "");
    return parts.length ? parts.join(", ") : "-";
};

export const safeValue = (value) => {
    if (value == null) return "-";
    const v = String(value).trim();
    return v === "" ? "-" : v;
};

