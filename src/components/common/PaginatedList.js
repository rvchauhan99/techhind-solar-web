"use client";

import * as React from "react";
import SearchInput from "@/components/common/SearchInput";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  IconChevronsLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsRight,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// In-flight fetch cache: reuse same request when effect runs twice (e.g. React Strict Mode)
const inFlightByKey = new Map();

/**
 * PaginatedList - list-based paginated data with search and pagination.
 * Supports optional controlled mode: pass q, onQChange, filters, page, setPage, limit, setLimit for URL-driven state.
 * Optional searchPlaceholder and filterSlot (e.g. Filter button) for order list pages.
 */
export default function PaginatedList({
  renderItem,
  fetcher,
  initialPage = 1,
  initialLimit = 10,
  showSearch = true,
  moduleKey = null,
  height = "75vh",
  initialSortBy = null,
  initialSortOrder = null,
  getRowKey = (row) => row.id || Math.random(),
  onRowsChange = null,
  searchPlaceholder = "Search...",
  q: controlledQ,
  onQChange,
  filters: controlledFilters = {},
  page: controlledPage,
  setPage: controlledSetPage,
  limit: controlledLimit,
  setLimit: controlledSetLimit,
  filterSlot = null,
}) {
  const [rows, setRows] = React.useState([]);
  const [page, setPage] = React.useState(initialPage - 1);
  const [rowsPerPage, setRowsPerPage] = React.useState(controlledLimit ?? initialLimit);
  const [totalCount, setTotalCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState(initialSortBy);
  const [sortOrder, setSortOrder] = React.useState(initialSortOrder || "asc");
  const isControlled = controlledQ !== undefined && onQChange != null;
  const isPaginationControlled = controlledPage != null && controlledSetPage != null;
  const isLimitControlled = controlledLimit != null && controlledSetLimit != null;
  const effectiveQ = isControlled ? (controlledQ ?? "") : query;
  const effectiveDebouncedQ = isControlled ? effectiveQ : debouncedQuery;
  const effectivePage = isPaginationControlled ? Math.max(0, Number(controlledPage) - 1) : page;
  const effectiveRowsPerPage = isLimitControlled ? Number(controlledLimit) : rowsPerPage;
  const { modulePermissions, currentModuleId, fetchPermissionForModule, user } =
    useAuth();
  const [resolvedPerms, setResolvedPerms] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    const loadPerm = async () => {
      if (!moduleKey) {
        setResolvedPerms(null);
        return;
      }
      const modules = user?.modules || [];
      const findModuleRecursive = (list) => {
        for (const mod of list || []) {
          if (mod.key === moduleKey || mod.route === moduleKey) return mod;
          if (mod.submodules?.length) {
            const found = findModuleRecursive(mod.submodules);
            if (found) return found;
          }
        }
        return null;
      };
      const mod = findModuleRecursive(modules);
      if (!mod?.id) {
        setResolvedPerms(null);
        return;
      }
      const cached = modulePermissions?.[mod.id];
      if (cached) {
        setResolvedPerms(cached);
        return;
      }
      try {
        const perms = await fetchPermissionForModule(mod.id);
        if (mounted) setResolvedPerms(perms);
      } catch (err) {
        if (mounted) setResolvedPerms(null);
      }
    };
    loadPerm();
    return () => {
      mounted = false;
    };
  }, [moduleKey, user, fetchPermissionForModule, modulePermissions]);

  const normalize = (res) => {
    if (!res) return { data: [], total: 0 };
    if (Array.isArray(res)) return { data: res, total: res.length };
    if (res.data && res.meta) return { data: res.data, total: res.meta.total || 0 };
    if (res.result && Array.isArray(res.result))
      return { data: res.result, total: res.result.length };
    if (res.result?.data)
      return {
        data: res.result.data,
        total: res.result.meta?.total || 0,
      };
    return { data: [], total: 0 };
  };

  React.useEffect(() => {
    if (!isControlled) {
      const timer = setTimeout(() => setDebouncedQuery(query), 500);
      return () => clearTimeout(timer);
    }
  }, [query, isControlled]);

  const fetcherRef = React.useRef(fetcher);
  React.useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const buildFetcherParams = React.useCallback(
    (p, l, qVal, sBy, sOrder, filtersToMerge) => {
      const apiPage = p + 1;
      const fetcherParams = { page: apiPage, limit: l, q: qVal ?? "" };
      if (sBy) {
        fetcherParams.sortBy = sBy;
        fetcherParams.sortOrder = sOrder;
      }
      if (filtersToMerge && typeof filtersToMerge === "object") {
        Object.entries(filtersToMerge).forEach(([k, v]) => {
          if (v != null && String(v).trim() !== "") fetcherParams[k] = v;
        });
      }
      return fetcherParams;
    },
    []
  );

  const getOrCreatePromise = React.useCallback((params, skipCache) => {
    const key = JSON.stringify(params);
    if (skipCache) inFlightByKey.delete(key);
    if (inFlightByKey.has(key)) return inFlightByKey.get(key);
    const promise = fetcherRef.current(params).then(normalize);
    inFlightByKey.set(key, promise);
    promise.finally(() => inFlightByKey.delete(key));
    return promise;
  }, []);

  const load = React.useCallback(
    async (skipCache = false, p = effectivePage, l = effectiveRowsPerPage, qVal = effectiveDebouncedQ, sBy = sortBy, sOrder = sortOrder, filtersToMerge = controlledFilters) => {
      const params = buildFetcherParams(p, l, qVal, sBy, sOrder, filtersToMerge);
      setLoading(true);
      try {
        const result = await getOrCreatePromise(params, skipCache);
        setRows(result.data);
        setTotalCount(result.total);
        if (onRowsChange) onRowsChange(result.data);
      } catch (err) {
        console.error("PaginatedList load error:", err);
        setRows([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    [effectivePage, effectiveRowsPerPage, effectiveDebouncedQ, sortBy, sortOrder, onRowsChange, controlledFilters, buildFetcherParams, getOrCreatePromise]
  );

  React.useEffect(() => {
    if (!isControlled && page !== 0) setPage(0);
  }, [effectiveDebouncedQ, isControlled]);

  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    const params = buildFetcherParams(
      effectivePage,
      effectiveRowsPerPage,
      effectiveDebouncedQ,
      sortBy,
      sortOrder,
      controlledFilters
    );
    setLoading(true);
    getOrCreatePromise(params, false)
      .then((result) => {
        if (mountedRef.current) {
          setRows(result.data);
          setTotalCount(result.total);
          if (onRowsChange) onRowsChange(result.data);
        }
      })
      .catch((err) => {
        console.error("PaginatedList load error:", err);
        if (mountedRef.current) {
          setRows([]);
          setTotalCount(0);
        }
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    return () => {
      mountedRef.current = false;
    };
  }, [effectivePage, effectiveRowsPerPage, effectiveDebouncedQ, sortBy, sortOrder, buildFetcherParams, getOrCreatePromise, onRowsChange, controlledFilters]);

  const handleChangePage = (event, newPage) => {
    if (isPaginationControlled) controlledSetPage(newPage + 1);
    else setPage(newPage);
  };
  const handleChangeRowsPerPage = (v) => {
    const num = parseInt(v, 10);
    if (isLimitControlled) {
      controlledSetLimit(num);
      if (isPaginationControlled) controlledSetPage(1);
    } else {
      setRowsPerPage(num);
      setPage(0);
    }
  };

  const reload = () => load(true);
  const totalPages = Math.ceil(totalCount / effectiveRowsPerPage) || 1;
  const from = totalCount === 0 ? 0 : effectivePage * effectiveRowsPerPage + 1;
  const to = Math.min((effectivePage + 1) * effectiveRowsPerPage, totalCount);
  const perms = resolvedPerms ?? modulePermissions?.[currentModuleId];

  const handleSearchChange = (e) => {
    const v = e.target.value;
    if (isControlled) onQChange(v);
    else setQuery(v);
  };

  return (
    <div
      className="flex flex-col w-full overflow-hidden rounded-lg border border-border bg-card"
      style={{ height }}
    >
      {(showSearch || filterSlot) && (
        <div className={cn("shrink-0 flex items-center gap-2 bg-background border-b border-border", showSearch ? "p-2" : "py-1 px-2 justify-end")}>
          {showSearch && (
            <div className="flex-1 min-w-0">
              <SearchInput
                placeholder={searchPlaceholder}
                value={effectiveQ}
                onChange={handleSearchChange}
                fullWidth
              />
            </div>
          )}
          {filterSlot}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 bg-muted/30 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : rows.length > 0 ? (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={getRowKey(row)}>
                {renderItem(row, reload, perms)}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground">
            No records found
          </p>
        )}
      </div>

      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-t border-border p-2 bg-background">
        <p className="text-sm text-muted-foreground">
          Showing {from} to {to} of {totalCount}
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={String(effectiveRowsPerPage)}
            onValueChange={handleChangeRowsPerPage}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 25].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-0.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleChangePage(null, 0)}
              disabled={effectivePage === 0}
              aria-label="first page"
            >
              <IconChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleChangePage(null, effectivePage - 1)}
              disabled={effectivePage === 0}
              aria-label="previous page"
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleChangePage(null, effectivePage + 1)}
              disabled={effectivePage >= totalPages - 1}
              aria-label="next page"
            >
              <IconChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleChangePage(null, totalPages - 1)}
              disabled={effectivePage >= totalPages - 1}
              aria-label="last page"
            >
              <IconChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
