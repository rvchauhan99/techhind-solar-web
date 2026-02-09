/**
 * Country dial codes for mobile number input. India (+91) first as default.
 * Used by PhoneField for country code dropdown.
 */
export const COUNTRY_DIAL_CODES = [
  { code: "+91", label: "India (+91)", dial: "91" },
  { code: "+1", label: "US/Canada (+1)", dial: "1" },
  { code: "+44", label: "UK (+44)", dial: "44" },
  { code: "+971", label: "UAE (+971)", dial: "971" },
  { code: "+966", label: "Saudi Arabia (+966)", dial: "966" },
  { code: "+61", label: "Australia (+61)", dial: "61" },
  { code: "+81", label: "Japan (+81)", dial: "81" },
  { code: "+86", label: "China (+86)", dial: "86" },
  { code: "+49", label: "Germany (+49)", dial: "49" },
  { code: "+33", label: "France (+33)", dial: "33" },
  { code: "+39", label: "Italy (+39)", dial: "39" },
  { code: "+34", label: "Spain (+34)", dial: "34" },
  { code: "+31", label: "Netherlands (+31)", dial: "31" },
  { code: "+65", label: "Singapore (+65)", dial: "65" },
  { code: "+60", label: "Malaysia (+60)", dial: "60" },
  { code: "+92", label: "Pakistan (+92)", dial: "92" },
  { code: "+880", label: "Bangladesh (+880)", dial: "880" },
  { code: "+94", label: "Sri Lanka (+94)", dial: "94" },
  { code: "+977", label: "Nepal (+977)", dial: "977" },
];

const DEFAULT_CODE = "+91";
const DEFAULT_DIAL = "91";

/** Dial codes sorted by length descending so we match longest first (e.g. +971 before +97). */
const DIAL_SORTED = [...COUNTRY_DIAL_CODES].sort(
  (a, b) => (b.dial?.length ?? 0) - (a.dial?.length ?? 0)
);

/**
 * Parse a full E.164 string into country code and local number for the PhoneField.
 * @param {string} fullE164 - e.g. "+918123456789"
 * @returns {{ countryCode: string, localNumber: string }}
 */
export function parseE164ForInput(fullE164) {
  const raw = (fullE164 ?? "").trim();
  if (!raw) {
    return { countryCode: DEFAULT_CODE, localNumber: "" };
  }
  const digitsOnly = raw.replace(/\D/g, "");
  if (!digitsOnly) {
    return { countryCode: DEFAULT_CODE, localNumber: "" };
  }
  for (const { code, dial } of DIAL_SORTED) {
    if (!dial) continue;
    if (digitsOnly === dial || digitsOnly.startsWith(dial)) {
      const local = digitsOnly.slice(dial.length);
      return { countryCode: code, localNumber: local };
    }
  }
  // No match: assume India (+91) if digits look like Indian 10-digit, else show as local with +91
  if (digitsOnly.length >= 10 && (digitsOnly.startsWith("91") || digitsOnly.length === 10)) {
    const dial = digitsOnly.startsWith("91") ? "91" : "";
    const local = digitsOnly.startsWith("91") ? digitsOnly.slice(2) : digitsOnly;
    return { countryCode: "+91", localNumber: local };
  }
  return { countryCode: DEFAULT_CODE, localNumber: digitsOnly };
}

/**
 * Build E.164 string from country code and local number (digits only).
 * @param {string} countryCode - e.g. "+91"
 * @param {string} localNumber - e.g. "8123456789"
 * @returns {string} e.g. "+918123456789"
 */
export function formatE164(countryCode, localNumber) {
  const code = (countryCode ?? DEFAULT_CODE).trim();
  const digits = (localNumber ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const codeDigits = code.replace(/\D/g, "");
  return `+${codeDigits}${digits}`;
}
