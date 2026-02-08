"use client";

import { useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

const DEBOUNCE_MS = 450;

/**
 * Parse a string as integer; return defaultVal if invalid or missing.
 */
function parseIntSafe(str, defaultVal) {
  if (str == null || str === "") return defaultVal;
  const n = parseInt(str, 10);
  return Number.isNaN(n) ? defaultVal : n;
}

/**
 * URL-driven listing state: page, limit, q, sortBy, sortOrder, and configurable filters.
 * Use with Next.js useSearchParams + useRouter.replace so filters are shareable and back/forward work.
 *
 * @param {Object} options
 * @param {number} [options.defaultLimit=10]
 * @param {string[]} [options.filterKeys=[]] - e.g. ['status', 'date_from', 'date_to', 'supplier_id']
 * @returns {Object} { page, limit, q, sortBy, sortOrder, filters, setPage, setLimit, setQ, setFilters, setSort }
 */
export function useListingQueryState({ defaultLimit = 10, filterKeys = [] } = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const debounceTimerRef = useRef(null);

  const page = parseIntSafe(searchParams.get("page"), 1);
  const limit = parseIntSafe(searchParams.get("limit"), defaultLimit);
  const q = searchParams.get("q") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "";
  const sortOrder = searchParams.get("sortOrder") ?? "asc";

  const filters = useMemo(() => {
    const f = {};
    filterKeys.forEach((key) => {
      f[key] = searchParams.get(key) ?? "";
    });
    return f;
  }, [filterKeys.join(","), searchParams]);

  const buildSearchParams = useCallback(
    (updates) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      Object.entries(updates).forEach(([key, value]) => {
        if (value === "" || value == null) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      return next;
    },
    [searchParams]
  );

  const setPage = useCallback(
    (p) => {
      const next = buildSearchParams({ page: p <= 1 ? undefined : String(p) });
      router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
    },
    [pathname, router, buildSearchParams]
  );

  const setLimit = useCallback(
    (l) => {
      const next = buildSearchParams({ limit: String(l), page: undefined });
      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, buildSearchParams]
  );

  const setQ = useCallback(
    (value) => {
      const next = buildSearchParams({ q: value || undefined, page: undefined });
      router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
    },
    [pathname, router, buildSearchParams]
  );

  const setSort = useCallback(
    (by, order) => {
      const next = buildSearchParams({
        sortBy: by || undefined,
        sortOrder: order || undefined,
      });
      router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
    },
    [pathname, router, buildSearchParams]
  );

  const setFilters = useCallback(
    (newFilters, resetPage = true) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      if (resetPage) next.delete("page");
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === "" || value == null) next.delete(key);
        else next.set(key, String(value));
      });
      router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ""}`);
    },
    [pathname, router, searchParams]
  );

  const setFilter = useCallback(
    (key, value) => {
      const nextFilters = { ...filters, [key]: value };
      setFilters(nextFilters);
    },
    [filters, setFilters]
  );

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams();
    next.set("limit", String(limit));
    if (q) next.set("q", q);
    if (sortBy) next.set("sortBy", sortBy);
    if (sortOrder) next.set("sortOrder", sortOrder);
    router.replace(`${pathname}?${next.toString()}`);
  }, [pathname, router, limit, q, sortBy, sortOrder]);

  return {
    page,
    limit,
    q,
    sortBy: sortBy || null,
    sortOrder: sortOrder || "asc",
    filters,
    setPage,
    setLimit,
    setQ,
    setFilters,
    setFilter,
    setSort,
    clearFilters,
  };
}

export default useListingQueryState;
