"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Local (non-URL) listing state with the same shape as `useListingQueryState`.
 *
 * Why this exists: HRMS list pages render in a layout with no <Suspense> boundary,
 * so `useSearchParams()` is not safe there. This hook gives the exact same controlled
 * `PaginatedTable` contract (1-based `page`, `limit`, `q`, `sortBy`, `sortOrder`,
 * `filters`, `setPage`, `setLimit`, `setQ`, `setSort`, `setFilter`, `setFilters`,
 * `clearFilters`) while keeping state local. Filter changes reset to page 1 so a
 * narrowing filter never strands the user on an out-of-range page.
 *
 * @param {Object} [options]
 * @param {number} [options.defaultLimit=20]
 * @param {Object} [options.filters={}]   Initial column-filter values keyed by filter key
 * @param {string|null} [options.sortBy=null]
 * @param {string} [options.sortOrder="desc"]
 */
export function useListTableState({
  defaultLimit = 20,
  filters: initialFilters = {},
  sortBy: initialSortBy = null,
  sortOrder: initialSortOrder = "desc",
} = {}) {
  const [page, setPageState] = useState(1); // 1-based
  const [limit, setLimitState] = useState(defaultLimit);
  const [q, setQState] = useState("");
  const [sortBy, setSortByState] = useState(initialSortBy);
  const [sortOrder, setSortOrderState] = useState(initialSortOrder);
  const [filters, setFiltersState] = useState(initialFilters);

  const setPage = useCallback((p) => {
    const n = Number(p);
    setPageState(Number.isFinite(n) && n > 0 ? n : 1);
  }, []);

  const setLimit = useCallback(
    (l) => {
      const n = Number(l);
      setLimitState(Number.isFinite(n) && n > 0 ? n : defaultLimit);
      setPageState(1);
    },
    [defaultLimit]
  );

  const setQ = useCallback((value) => {
    setQState(value == null ? "" : String(value));
    setPageState(1);
  }, []);

  const setSort = useCallback((by, order) => {
    setSortByState(by || null);
    setSortOrderState(order || "desc");
    setPageState(1);
  }, []);

  const setFilter = useCallback((key, value) => {
    setFiltersState((prev) => ({ ...prev, [key]: value == null ? "" : value }));
    setPageState(1);
  }, []);

  const setFilters = useCallback((next) => {
    setFiltersState((prev) => ({ ...prev, ...(next || {}) }));
    setPageState(1);
  }, []);

  /** Clear all filters (or only the given keys) and return to page 1. */
  const clearFilters = useCallback((keys) => {
    setFiltersState((prev) => {
      const next = { ...prev };
      const list = Array.isArray(keys) ? keys : Object.keys(next);
      list.forEach((k) => {
        next[k] = "";
      });
      return next;
    });
    setPageState(1);
  }, []);

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(
        ([k, v]) => !k.endsWith("_op") && v != null && String(v).trim() !== ""
      ).length,
    [filters]
  );

  return {
    page,
    limit,
    q,
    sortBy,
    sortOrder,
    filters,
    activeFilterCount,
    setPage,
    setLimit,
    setQ,
    setSort,
    setFilter,
    setFilters,
    clearFilters,
  };
}

export default useListTableState;
