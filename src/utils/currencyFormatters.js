const parseInrAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Full INR for tables, charts, and KPI tooltips. */
export const formatInrFull = (value) =>
  parseInrAmount(value).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

/** Compact INR for dense KPI cards (Cr / L). */
export const formatInrCompact = (value) => {
  const n = parseInrAmount(value);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  if (abs >= 1e7) {
    return `${sign}₹${(abs / 1e7).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
  }
  if (abs >= 1e5) {
    return `${sign}₹${(abs / 1e5).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
  }
  return formatInrFull(n);
};
