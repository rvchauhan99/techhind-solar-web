/**
 * Shared permission helpers: derive allowed routes from user profile (role.modules)
 * and check if a path is allowed. Used by ProtectedRoute and axios request interceptor.
 *
 * Child-route contract: A path is allowed if it exactly equals an allowed route or is a
 * child path (path starts with route + "/"). So parent route /inquiry allows /inquiry,
 * /inquiry/add, /inquiry/edit, /inquiry/123; the same pattern applies to other modules
 * (e.g. /order, /quotation) and their child pages. No per-module config needed.
 */

/**
 * Normalize path: trim, single leading slash, no trailing slash (so /inquiry/ and /inquiry match).
 * Exported for use in ProtectedRoute when matching pathname to module route.
 */
export function normalizePath(value) {
  if (value == null || typeof value !== "string") return "";
  const s = value.trim().replace(/\/+/g, "/");
  const withLeading = s.startsWith("/") ? s : `/${s}`;
  return withLeading === "/" ? withLeading : withLeading.replace(/\/$/, "");
}

/**
 * Flatten user.modules (and submodules) to get all allowed route strings.
 * Only includes modules with a non-empty route; empty routes are skipped.
 * Parent route must be in this list for child paths (e.g. /inquiry/add, /purchase-orders/edit) to be allowed.
 * @param {Array} modules - user.modules from profile
 * @returns {string[]} routes (e.g. ["/home", "/purchase-orders", "/inquiry"])
 */
export function getAllowedRoutes(modules) {
  const routes = [];
  function collect(list) {
    if (!list?.length) return;
    for (const mod of list) {
      if (mod?.route) {
        const normalized = normalizePath(mod.route);
        if (normalized) routes.push(normalized);
      }
      if (mod?.submodules?.length) collect(mod.submodules);
    }
  }
  collect(modules || []);
  return routes;
}

function routeMatchesPath(route, path) {
  return path === route || (route !== "/" && path.startsWith(route + "/"));
}

/**
 * Pick the most specific allowed route that matches a path (longest route wins).
 * @param {string} pathname
 * @param {string[]} allowedRoutes
 * @returns {string|null}
 */
export function findBestMatchingRoute(pathname, allowedRoutes) {
  if (!pathname || typeof pathname !== "string") return null;
  const path = normalizePath(pathname);
  if (!path) return null;

  let bestRoute = null;
  for (const route of allowedRoutes || []) {
    const normalizedRoute = normalizePath(route);
    if (!normalizedRoute || !routeMatchesPath(normalizedRoute, path)) continue;
    if (!bestRoute || normalizedRoute.length > bestRoute.length) {
      bestRoute = normalizedRoute;
    }
  }
  return bestRoute;
}

/**
 * Check if a path is allowed given a list of allowed routes.
 * Uses longest-route matching so sibling modules like /production-bookings and
 * /production-bookings/new resolve independently.
 * @param {string} pathname - e.g. "/purchase-orders", "/inquiry/add", "/order/view"
 * @param {string[]} allowedRoutes - from getAllowedRoutes(profile.modules)
 * @returns {boolean}
 */
export function isPathAllowedByRoutes(pathname, allowedRoutes) {
  if (!pathname || typeof pathname !== "string") return false;
  const path = normalizePath(pathname);
  if (!path) return false;
  const hasOrderChildAccess = allowedRoutes.some(
    (r) => r === "/confirm-orders" || r === "/closed-orders"
  );
  if (
    hasOrderChildAccess &&
    (
      path === "/order/view" ||
      path.startsWith("/order/view/") ||
      path === "/order/edit" ||
      path.startsWith("/order/edit/") ||
      path === "/order/amend" ||
      path.startsWith("/order/amend/")
    )
  ) {
    return true;
  }
  return findBestMatchingRoute(pathname, allowedRoutes) != null;
}
