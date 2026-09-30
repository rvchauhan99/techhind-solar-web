/**
 * Shared list ↔ form navigation helpers.
 * Preserve listing query (page, limit, filters) via returnTo so submit/back
 * does not reset the user to page 1.
 */

/**
 * Open-redirect guard. Allows path + query (e.g. /order?page=3&limit=20).
 * @param {string|null|undefined} value
 * @param {string} fallback
 * @returns {string}
 */
export function getSafeReturnPath(value, fallback = "/") {
  if (value == null || value === "") return fallback;
  let decoded = String(value);
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith("/")) return fallback;
  if (decoded.startsWith("//")) return fallback;
  if (decoded.includes("://")) return fallback;
  return decoded;
}

/**
 * Restrict returnTo to a single allowed pathname (query string allowed).
 * @param {string|null|undefined} raw
 * @param {string} allowedPathname - e.g. "/fabrication-installation"
 * @returns {string|null}
 */
export function getSafeReturnPathAllowlist(raw, allowedPathname) {
  if (!allowedPathname || !allowedPathname.startsWith("/")) return null;
  const safe = getSafeReturnPath(raw, "");
  if (!safe) return null;
  const pathOnly = safe.split("?")[0].split("#")[0];
  if (pathOnly !== allowedPathname) return null;
  return safe;
}

/**
 * Build encoded returnTo value from list pathname + current search.
 * @param {string} pathname
 * @param {URLSearchParams|string|null|undefined} searchParamsOrString
 * @returns {string} encodeURIComponent'd path(?query)
 */
export function buildListReturnTo(pathname, searchParamsOrString) {
  const path = pathname || "/";
  let query = "";
  if (searchParamsOrString != null) {
    if (typeof searchParamsOrString === "string") {
      query = searchParamsOrString.startsWith("?")
        ? searchParamsOrString.slice(1)
        : searchParamsOrString;
    } else if (typeof searchParamsOrString.toString === "function") {
      query = searchParamsOrString.toString();
    }
  }
  const full = query ? `${path}?${query}` : path;
  return encodeURIComponent(full);
}

/**
 * Navigate back to list, preferring validated returnTo (with query).
 * @param {{ push: (url: string) => void }} router
 * @param {{ fallbackPath: string, returnTo?: string|null }} options
 */
export function navigateToList(router, { fallbackPath, returnTo } = {}) {
  const path = getSafeReturnPath(returnTo, fallbackPath || "/");
  router.push(path);
}

/**
 * Read returnTo from search params and resolve to a safe path.
 * @param {URLSearchParams|{ get: (k: string) => string|null }} searchParams
 * @param {string} fallbackPath
 * @returns {string}
 */
export function resolveReturnTo(searchParams, fallbackPath) {
  const raw =
    searchParams && typeof searchParams.get === "function"
      ? searchParams.get("returnTo")
      : null;
  return getSafeReturnPath(raw, fallbackPath);
}
