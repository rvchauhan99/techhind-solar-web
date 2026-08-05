import { DEFAULT_COUNTRY } from "@/constants/countries";

export function isIndiaCountry(country) {
  if (country == null || String(country).trim() === "") return true;
  return String(country).trim().toLowerCase() === "india";
}

export function normalizeCountry(country) {
  const raw = country != null ? String(country).trim() : "";
  return raw || DEFAULT_COUNTRY;
}

/** Postal field label + max length hints by country name. */
export const POSTAL_RULES = {
  India: { label: "PIN Code", maxLength: 6, placeholder: "380001" },
  "United States": { label: "ZIP Code", maxLength: 10, placeholder: "10001 or 10001-1234" },
  "United Kingdom": { label: "Postcode", maxLength: 10, placeholder: "SW1A 1AA" },
  "United Arab Emirates": { label: "Postal Code", maxLength: 10, placeholder: "Optional" },
  Singapore: { label: "Postal Code", maxLength: 6, placeholder: "018956" },
  Canada: { label: "Postal Code", maxLength: 7, placeholder: "K1A 0B1" },
  Australia: { label: "Postcode", maxLength: 4, placeholder: "2000" },
};

export function getPostalRule(country) {
  const key = normalizeCountry(country);
  return (
    POSTAL_RULES[key] || {
      label: "Postal Code",
      maxLength: 20,
      placeholder: "",
    }
  );
}
