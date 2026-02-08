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

/**
 * PaginatedList - list-based paginated data with search and pagination.
 * Same API: renderItem(row, reload, permissions), fetcher, initialPage, initialLimit, showSearch, moduleKey, height, getRowKey, onRowsChange.
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
}) {
  const [rows, setRows] = React.useState([]);
  const [page, setPage] = React.useState(initialPage - 1);
  const [rowsPerPage, setRowsPerPage] = React.useState(initialLimit);
  const [totalCount, setTotalCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState(initialSortBy);
  const [sortOrder, setSortOrder] = React.useState(initialSortOrder || "asc");
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
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const fetcherRef = React.useRef(fetcher);
  React.useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const load = React.useCallback(
    async (p = page, l = rowsPerPage, q = debouncedQuery, sBy = sortBy, sOrder = sortOrder) => {
      setLoading(true);
      try {
        const apiPage = p + 1;
        const fetcherParams = { page: apiPage, limit: l, q };
        if (sBy) {
          fetcherParams.sortBy = sBy;
          fetcherParams.sortOrder = sOrder;
        }
        const res = await fetcherRef.current(fetcherParams);
        const { data, total } = normalize(res);
        setRows(data);
        setTotalCount(total);
        if (onRowsChange) onRowsChange(data);
      } catch (err) {
        console.error("PaginatedList load error:", err);
        setRows([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage, debouncedQuery, sortBy, sortOrder, onRowsChange]
  );

  React.useEffect(() => {
    if (page !== 0) setPage(0);
  }, [debouncedQuery]);

  React.useEffect(() => {
    load();
  }, [page, rowsPerPage, debouncedQuery, sortBy, sortOrder, load]);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (v) => {
    setRowsPerPage(parseInt(v, 10));
    setPage(0);
  };

  const reload = () => load();
  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;
  const from = totalCount === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min((page + 1) * rowsPerPage, totalCount);
  const perms = resolvedPerms ?? modulePermissions?.[currentModuleId];

  return (
    <div
      className="flex flex-col w-full overflow-hidden rounded-lg border border-border bg-card"
      style={{ height }}
    >
      {showSearch && (
        <div className="shrink-0 p-2">
          <SearchInput
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            fullWidth
          />
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
            value={String(rowsPerPage)}
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
              disabled={page === 0}
              aria-label="first page"
            >
              <IconChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleChangePage(null, page - 1)}
              disabled={page === 0}
              aria-label="previous page"
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleChangePage(null, page + 1)}
              disabled={page >= totalPages - 1}
              aria-label="next page"
            >
              <IconChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleChangePage(null, totalPages - 1)}
              disabled={page >= totalPages - 1}
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
