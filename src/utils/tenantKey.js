/**
 * Resolve tenant key from subdomain (e.g. se.techhind.in -> "se").
 * Safe for SSR: returns "" when window is undefined
 * 
 */
export function getTenantKeyFromSubdomain() {
  if (typeof window === "undefined") return "";
  const hostname = (window.location?.hostname || "").toLowerCase();
  if (!hostname || hostname === "localhost" || /^127\./.test(hostname)) return "";
  const parts = hostname.split(".");
  if (parts.length >= 3 && parts[0] !== "www") return parts[0].trim();
  return "";
}

/**
 * Effective tenant key for API calls (login, forgot-password, etc.).
 * Order: subdomain (when in browser) -> NEXT_PUBLIC_TENANT_KEY (e.g. acme for local).
 */
export function getEffectiveTenantKey() {
  const fromSubdomain = getTenantKeyFromSubdomain();
  if (fromSubdomain) return fromSubdomain;
  const fromEnv = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_TENANT_KEY) || "";
  return (fromEnv && String(fromEnv).trim()) || "";
}
