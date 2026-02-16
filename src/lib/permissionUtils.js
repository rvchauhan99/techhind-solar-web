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

/**
 * Check if a path is allowed given a list of allowed routes.
 * Path is allowed if it exactly matches a route or is a child (path starts with route + "/").
 * Path and routes are normalized (trim, no trailing slash) so /inquiry/ and /inquiry match.
 * @param {string} pathname - e.g. "/purchase-orders", "/inquiry/add", "/inquiry/123"
 * @param {string[]} allowedRoutes - from getAllowedRoutes(profile.modules)
 * @returns {boolean}
 */
export function isPathAllowedByRoutes(pathname, allowedRoutes) {
  if (!pathname || typeof pathname !== "string") return false;
  const path = normalizePath(pathname);
  if (!path) return false;
  return allowedRoutes.some(
    (route) => path === route || (route !== "/" && path.startsWith(route + "/"))
  );
}
