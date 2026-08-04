export const DEFAULT_CURRENCY = "INR";

/** Common ISO currency codes for supplier base currency. INR first (default). */
export const CURRENCY_OPTIONS = [
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "CNY", label: "CNY — Chinese Yuan" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
];

const ALLOWED = new Set(CURRENCY_OPTIONS.map((c) => c.code));

/** Normalize to allowlisted ISO code; invalid/empty → INR. */
export function normalizeCurrencyCode(value) {
  if (value == null) return DEFAULT_CURRENCY;
  const code = String(value).trim().toUpperCase();
  if (!code || !ALLOWED.has(code)) return DEFAULT_CURRENCY;
  return code;
}
