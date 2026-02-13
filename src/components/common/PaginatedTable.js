"use client";

import * as React from "react";
import SearchInput from "@/components/common/SearchInput";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DateField from "@/components/common/DateField";
import { TABLE_REFERENCE_STYLES } from "@/utils/dataTableUtils";
import { FIELD_HEIGHT_CLASS_SMALL } from "@/utils/formConstants";
import { useAuth } from "@/hooks/useAuth";
import {
  IconChevronsLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsRight,
  IconArrowUp,
  IconArrowDown,
  IconFilter,
  IconMenu2,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getOperatorsForFilterType,
  getDefaultOperator,
} from "@/utils/filterOperators";
import { cn } from "@/lib/utils";

const COLUMN_FILTER_DEBOUNCE_MS = 500;
const SEARCH_DEBOUNCE_MS = 500;
/** Stable empty object to avoid "Maximum update depth" when columnFilterValues defaults to {} */
const EMPTY_FILTERS = Object.freeze ? Object.freeze({}) : {};
const TABLE_SEARCH_PADDING = "0.5rem";
const TABLE_PAGINATION_PADDING = "0.5rem";

/** Shared background and height for all table column filter inputs (text, date, select) */
const TABLE_FILTER_INPUT_CLASS = "bg-white text-sm min-w-0";

/**
 * PaginatedTable (MUI TablePagination) - reusable
 * props:
 * - columns: [{ field, label, render?(row, reload), sortable?: boolean }]
 * - fetcher: async ({ page, limit, q, sortBy?, sortOrder?, ...filterParams }) => { data, meta }
 * - initialPage (1-based), initialLimit
 * - initialSortBy, initialSortOrder (optional default sorting)
 * - filterParams: object merged into fetcher params (when parent uses URL state)
 * - onRowClick(row): when provided, rows are clickable; skip when target is button/link
 * - Controlled mode: pass page (1-based), limit, q, sortBy, sortOrder + onPageChange(0-based), onRowsPerPageChange, onQChange, onSortChange
 */
export default function PaginatedTable({
  columns = [],
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
  onTotalChange = null,
  filterParams = {},
  onRowClick = null,
  // Controlled mode (from useListingQueryState)
  page: controlledPage,
  limit: controlledLimit,
  q: controlledQ,
  sortBy: controlledSortBy,
  sortOrder: controlledSortOrder,
  onPageChange: onControlledPageChange,
  onRowsPerPageChange: onControlledRowsPerPageChange,
  onQChange: onControlledQChange,
  onSortChange: onControlledSortChange,
  // Per-column filter row (floating filters under headers)
  columnFilterValues = EMPTY_FILTERS,
  onColumnFilterChange = null,
  // When false, parent renders PaginationControls below; table still uses page/limit/onPageChange/onRowsPerPageChange
  showPagination = true,
}) {
  const hasColumnFilters = Boolean(onColumnFilterChange);
  const filterDebounceRef = React.useRef({});
  const pendingFilterRef = React.useRef({});
  const debouncedColumnFilterChange = React.useCallback(
    (key, value) => {
      pendingFilterRef.current[key] = value;
      if (filterDebounceRef.current[key]) {
        clearTimeout(filterDebounceRef.current[key]);
      }
      filterDebounceRef.current[key] = setTimeout(() => {
        onColumnFilterChange?.(key, value);
        delete filterDebounceRef.current[key];
        delete pendingFilterRef.current[key];
      }, COLUMN_FILTER_DEBOUNCE_MS);
    },
    [onColumnFilterChange]
  );

  const handleOperatorChange = React.useCallback(
    (operatorKeyOrFilterKey, operator) => {
      const key = operatorKeyOrFilterKey.endsWith("_op")
        ? operatorKeyOrFilterKey
        : operatorKeyOrFilterKey + "_op";
      onColumnFilterChange?.(key, operator);
    },
    [onColumnFilterChange]
  );
  React.useEffect(() => () => {
    Object.values(filterDebounceRef.current || {}).forEach((t) => clearTimeout(t));
  }, []);

  const isControlled =
    controlledPage !== undefined &&
    controlledLimit !== undefined &&
    onControlledPageChange &&
    onControlledRowsPerPageChange;

  const [rows, setRows] = React.useState([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const [internalPage, setInternalPage] = React.useState(initialPage - 1);
  const [internalRowsPerPage, setInternalRowsPerPage] = React.useState(initialLimit);
  const [query, setQuery] = React.useState(isControlled ? controlledQ ?? "" : "");
  const [debouncedQuery, setDebouncedQuery] = React.useState(isControlled ? controlledQ ?? "" : "");
  const [searchDisplayValue, setSearchDisplayValue] = React.useState(controlledQ ?? "");
  const searchDebounceRef = React.useRef(null);
  const [internalSortBy, setInternalSortBy] = React.useState(initialSortBy);
  const [internalSortOrder, setInternalSortOrder] = React.useState(initialSortOrder || "desc");

  const [localFilterValues, setLocalFilterValues] = React.useState(columnFilterValues);

  const page = isControlled ? Math.max(0, (controlledPage ?? 1) - 1) : internalPage;
  const rowsPerPage = isControlled ? (controlledLimit ?? initialLimit) : internalRowsPerPage;
  const sortBy = isControlled ? (controlledSortBy ?? null) : internalSortBy;
  const sortOrder = isControlled ? (controlledSortOrder ?? "desc") : internalSortOrder;
  const qDisplay = isControlled ? searchDisplayValue : query;
  const setQDisplay = isControlled && onControlledQChange
    ? (e) => {
        const v = typeof e === "object" && e?.target ? e.target.value : e;
        setSearchDisplayValue(v ?? "");
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
          onControlledQChange?.(v ?? "");
          searchDebounceRef.current = null;
        }, SEARCH_DEBOUNCE_MS);
      }
    : setQuery;
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

      const matchPredicate = (m) => {
        if (!m) return false;
        const key = m.key || "";
        return (
          key === moduleKey ||
          m.route === moduleKey ||
          key === moduleKey.replace(/[-\s]/g, "_") ||
          key === moduleKey.replace(/\//g, "_")
        );
      };

      const findModuleRecursive = (list) => {
        for (const mod of list || []) {
          if (matchPredicate(mod)) return mod;
          if (mod.submodules && mod.submodules.length) {
            const found = findModuleRecursive(mod.submodules);
            if (found) return found;
          }
        }
        return null;
      };

      const mod = findModuleRecursive(modules);
      if (!mod || !mod.id) {
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
    if (!res) return { data: [], total: 0, page: 1 };
    if (Array.isArray(res)) return { data: res, total: res.length, page: 1 };
    // common shape: { data: [...], meta: { total, page, pages, limit } }
    if (res.data && res.meta)
      return {
        data: res.data,
        total: res.meta.total || 0,
        page: res.meta.page || 1,
      };
    // sendSuccess uses { status, message, result }
    if (res.result && Array.isArray(res.result))
      return { data: res.result, total: res.result.length, page: 1 };
    if (res.result && res.result.data)
      return {
        data: res.result.data,
        total: res.result.meta?.total || 0,
        page: res.result.meta?.page || 1,
      };
    if (res.rows && Array.isArray(res.rows))
      return {
        data: res.rows,
        total: res.count || res.rows.length,
        page: res.page || 1,
      };
    return { data: [], total: 0, page: 1 };
  };

  // Debounce the query (uncontrolled only) - update debouncedQuery after user stops typing for 500ms
  React.useEffect(() => {
    if (isControlled) return;
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, isControlled]);

  // When controlled, sync search display from prop (e.g. URL load, back button)
  React.useEffect(() => {
    if (isControlled && controlledQ !== undefined) {
      setSearchDisplayValue(controlledQ ?? "");
      setQuery(controlledQ ?? "");
      setDebouncedQuery(controlledQ ?? "");
    }
  }, [isControlled, controlledQ]);

  // Sync local filter values from parent (e.g. URL load, back button)
  // Merge pending (in-progress typing) over columnFilterValues to avoid overwriting
  // Use stringified key to avoid infinite loop when parent passes inline {} or new object each render
  const columnFilterValuesKey = React.useMemo(
    () => JSON.stringify(columnFilterValues ?? EMPTY_FILTERS),
    [columnFilterValues]
  );
  React.useEffect(() => {
    setLocalFilterValues((prev) => ({
      ...(columnFilterValues ?? EMPTY_FILTERS),
      ...pendingFilterRef.current,
    }));
  }, [columnFilterValuesKey]);

  React.useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

  // Use ref to store latest fetcher to avoid recreating load function
  const fetcherRef = React.useRef(fetcher);
  React.useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Use ref to track loading state to prevent concurrent loads
  const loadingRef = React.useRef(false);

  const effectiveQ = isControlled ? (controlledQ ?? "") : debouncedQuery;
  const filterParamsRef = React.useRef(filterParams);
  React.useEffect(() => {
    filterParamsRef.current = filterParams;
  }, [filterParams]);

  const filterParamsKey = React.useMemo(
    () => JSON.stringify(filterParams ?? {}),
    [filterParams]
  );

  const load = React.useCallback(
    async (p = page, l = rowsPerPage, q = effectiveQ, sBy = sortBy, sOrder = sortOrder) => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      setLoading(true);
      try {
        const apiPage = p + 1;
        const fetcherParams = {
          page: apiPage,
          limit: l,
          q: q || undefined,
          ...filterParamsRef.current,
        };
        if (sBy) {
          fetcherParams.sortBy = sBy;
          fetcherParams.sortOrder = sOrder;
        }
        const res = await fetcherRef.current(fetcherParams);
        const { data, total } = normalize(res);
        const rowsData = data || [];
        setRows(rowsData);
        const resolvedTotal = total || (rowsData ? rowsData.length : 0);
        setTotalCount(resolvedTotal);
        if (onTotalChange) onTotalChange(resolvedTotal);
        // Notify parent component about rows change
        if (onRowsChange && typeof onRowsChange === 'function') {
          onRowsChange(rowsData);
        }
      } catch (err) {
        console.error("PaginatedTable load error:", err);
        setRows([]);
        setTotalCount(0);
        if (onTotalChange) onTotalChange(0);
        // Notify parent component about rows change (empty array)
        if (onRowsChange && typeof onRowsChange === 'function') {
          onRowsChange([]);
        }
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [page, rowsPerPage, effectiveQ, sortBy, sortOrder, onRowsChange, onTotalChange]
  );

  // Reset to first page when debounced query changes (uncontrolled only)
  React.useEffect(() => {
    if (isControlled) return;
    if (page !== 0) setInternalPage(0);
  }, [debouncedQuery, isControlled]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    load(page, rowsPerPage, debouncedQuery, sortBy, sortOrder);
  }, [page, rowsPerPage, debouncedQuery, sortBy, sortOrder, load, filterParamsKey]);

  const handleChangePage = (event, newPage) => {
    if (isControlled && onControlledPageChange) {
      onControlledPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handleChangeRowsPerPage = (event) => {
    const v = parseInt(event.target.value, 10);
    if (isControlled && onControlledRowsPerPageChange) {
      onControlledRowsPerPageChange(v);
      if (onControlledPageChange) onControlledPageChange(0);
    } else {
      setInternalRowsPerPage(v);
      setInternalPage(0);
    }
  };

  const reload = () => load(page, rowsPerPage, debouncedQuery, sortBy, sortOrder);

  const handleSortClick = (field) => {
    if (sortBy === field) {
      if (sortOrder === "asc") {
        const nextOrder = "desc";
        if (isControlled && onControlledSortChange) onControlledSortChange(field, nextOrder);
        else setInternalSortOrder(nextOrder);
      } else {
        if (isControlled && onControlledSortChange) onControlledSortChange(null, "asc");
        else {
          setInternalSortBy(null);
          setInternalSortOrder("asc");
        }
      }
    } else {
      if (isControlled && onControlledSortChange) onControlledSortChange(field, "desc");
      else {
        setInternalSortBy(field);
        setInternalSortOrder("desc");
      }
    }
  };

  const emptyRows = Math.max(
    0,
    (1 + page) * rowsPerPage - (rows ? rows.length : 0)
  );

  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;
  const from = totalCount === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min((page + 1) * rowsPerPage, totalCount);

  return (
    <div
      className="flex flex-col w-full max-w-full overflow-hidden rounded-lg border border-border bg-card"
      style={{ height }}
    >
      {showSearch && (
        <div className="shrink-0 p-2">
          <SearchInput
            placeholder="Search"
            value={qDisplay}
            onChange={(e) => setQDisplay(e.target.value)}
            fullWidth
          />
        </div>
      )}

      <div className="flex-1 min-w-0 overflow-auto border-y border-border w-full max-w-full [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
        <table className="w-full min-w-max table-auto" aria-label="paginated table">
          <thead className="sticky top-0 z-10 bg-[#F1F1F1] dark:bg-muted">
            <tr>
              {columns.map((c, colIndex) => {
                const isSortable = c.sortable === true;
                const isActiveSort = sortBy === c.field;
                const isActionColumn = c.isActionColumn || c.field === "actions" || c.field === "action";
                const isFirstColumn = colIndex === 0;
                const isLastColumn = colIndex === columns.length - 1;
                return (
                  <th
                    key={c.field || c.label}
                    onClick={isSortable ? () => handleSortClick(c.field) : undefined}
                    className={cn(
                      "text-left text-sm font-bold px-2.5 py-1.5 border-b border-border whitespace-nowrap",
                      isLastColumn ? "" : "border-r border-border",
                      isSortable && "cursor-pointer hover:bg-muted/80",
                      isActionColumn && "min-w-[150px] whitespace-normal",
                      !isActionColumn && "min-w-[80px] overflow-hidden text-ellipsis",
                      isFirstColumn && isActionColumn && "sticky left-0 z-20 bg-[#F1F1F1] dark:bg-muted shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
                      isLastColumn && isActionColumn && "sticky right-0 z-20 bg-[#F1F1F1] dark:bg-muted shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]"
                    )}
                    style={{
                      maxWidth: !isActionColumn && c.maxWidth ? c.maxWidth : undefined,
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {c.headerRender ? c.headerRender() : <span>{c.label}</span>}
                      {isSortable && (
                        <span className="inline-flex flex-col -my-0.5">
                          <IconArrowUp
                            className={cn(
                              "size-3.5",
                              isActiveSort && sortOrder === "asc" ? "opacity-100 text-primary" : "opacity-30 text-muted-foreground"
                            )}
                          />
                          <IconArrowDown
                            className={cn(
                              "size-3.5 -mt-0.5",
                              isActiveSort && sortOrder === "desc" ? "opacity-100 text-primary" : "opacity-30 text-muted-foreground"
                            )}
                          />
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
            {hasColumnFilters && (
              <tr className="[&_td]:py-0.5 [&_td]:px-1 [&_td]:align-middle [&_td]:border-b [&_td]:border-border">
                {columns.map((c, colIndex) => {
                  const filterKey = c.filterKey ?? c.field;
                  const operatorKey = c.operatorKey ?? filterKey + "_op";
                  const value = localFilterValues[filterKey] ?? "";
                  const filterType = c.filterType;
                  const isActionColumn = c.isActionColumn || c.field === "actions" || c.field === "action";
                  if (isActionColumn || !filterType) {
                    const isFirstColumn = colIndex === 0;
                    const isLastColumn = colIndex === columns.length - 1;
                    const stickyClass =
                      isFirstColumn && isActionColumn
                        ? "sticky left-0 z-20 bg-[#F1F1F1] dark:bg-muted shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] "
                        : isLastColumn && isActionColumn
                          ? "sticky right-0 z-20 bg-[#F1F1F1] dark:bg-muted shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)] "
                          : "";
                    return <td key={(c.field || c.label) + "-filter"} className={cn(stickyClass, c.field === "actions" ? "min-w-[150px]" : "")} />;
                  }
                  const opKey = operatorKey;
                  const operatorValue =
                    columnFilterValues[opKey] ??
                    c.defaultFilterOperator ??
                    getDefaultOperator(filterType);
                  const operators =
                    filterType === "text" || filterType === "date" || filterType === "number"
                      ? getOperatorsForFilterType(filterType)
                      : [];
                  const showOperatorDropdown =
                    (filterType === "text" || filterType === "date" || filterType === "number") && operators.length > 0;
                  const filterKeyTo = c.filterKeyTo;
                  const valueTo = filterKeyTo ? (localFilterValues[filterKeyTo] ?? "") : "";

                  const OperatorDropdown = showOperatorDropdown ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                          "h-8 w-8 shrink-0"
                        )}
                        aria-label="Filter operator"
                      >
                        <IconMenu2 className="size-4 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {operators.map((op) => (
                          <DropdownMenuItem
                            key={op.value}
                            onClick={() => handleOperatorChange(operatorKey, op.value)}
                            className={cn(
                              operatorValue === op.value && "bg-accent"
                            )}
                          >
                            {op.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null;

                  return (
                    <td key={(c.field || c.label) + "-filter"} style={{ minWidth: c.maxWidth, maxWidth: c.maxWidth }}>
                      <div className="flex items-center gap-1">
                        {filterType === "text" && (
                          <>
                            <Input
                              name={`filter-${filterKey}`}
                              value={value}
                              onChange={(e) => {
                                const v = e.target.value;
                                setLocalFilterValues((prev) => ({ ...prev, [filterKey]: v }));
                                debouncedColumnFilterChange(filterKey, v);
                              }}
                              className={cn(FIELD_HEIGHT_CLASS_SMALL, "flex-1 py-1", TABLE_FILTER_INPUT_CLASS)}
                              placeholder=""
                            />
                            {OperatorDropdown}
                          </>
                        )}
                        {filterType === "date" && (
                          <>
                            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                              <DateField
                                name={`filter-${filterKey}`}
                                label=""
                                value={value}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLocalFilterValues((prev) => ({ ...prev, [filterKey]: v }));
                                  debouncedColumnFilterChange(filterKey, v);
                                }}
                                size="small"
                                fullWidth
                                className={TABLE_FILTER_INPUT_CLASS}
                              />
                              {operatorValue === "inRange" && filterKeyTo && (
                                <DateField
                                  name={`filter-${filterKeyTo}`}
                                  label=""
                                  value={valueTo}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setLocalFilterValues((prev) => ({ ...prev, [filterKeyTo]: v }));
                                    debouncedColumnFilterChange(filterKeyTo, v);
                                  }}
                                  size="small"
                                  fullWidth
                                  className={TABLE_FILTER_INPUT_CLASS}
                                />
                              )}
                            </div>
                            {OperatorDropdown}
                          </>
                        )}
                        {filterType === "number" && (
                          <>
                            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                              <Input
                                type="number"
                                name={`filter-${filterKey}`}
                                value={value}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLocalFilterValues((prev) => ({ ...prev, [filterKey]: v }));
                                  debouncedColumnFilterChange(filterKey, v);
                                }}
                                placeholder=""
                                className={cn(FIELD_HEIGHT_CLASS_SMALL, "flex-1 py-1", TABLE_FILTER_INPUT_CLASS)}
                              />
                              {operatorValue === "between" && filterKeyTo && (
                                <Input
                                  type="number"
                                  name={`filter-${filterKeyTo}`}
                                  value={valueTo}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setLocalFilterValues((prev) => ({ ...prev, [filterKeyTo]: v }));
                                    debouncedColumnFilterChange(filterKeyTo, v);
                                  }}
                                  placeholder="To"
                                  className={cn(FIELD_HEIGHT_CLASS_SMALL, "flex-1 py-1", TABLE_FILTER_INPUT_CLASS)}
                                />
                              )}
                            </div>
                            {OperatorDropdown}
                          </>
                        )}
                        {filterType === "select" && (
                          <Select
                            value={value || "__all__"}
                            onValueChange={(v) => {
                              const nextVal = v === "__all__" ? "" : v;
                              setLocalFilterValues((prev) => ({ ...prev, [filterKey]: nextVal }));
                              onColumnFilterChange(filterKey, nextVal);
                            }}
                          >
                            <SelectTrigger className={cn(FIELD_HEIGHT_CLASS_SMALL, "w-full min-w-0", TABLE_FILTER_INPUT_CLASS)}>
                              <SelectValue placeholder="All">
                                {value ? (c.filterOptions?.find((o) => o.value === value)?.label ?? value) : "All"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">All</SelectItem>
                              {(c.filterOptions || []).map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {!showOperatorDropdown && (
                          <IconFilter className="size-4 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            )}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                </td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  onClick={
                    onRowClick
                      ? (e) => {
                          if (e.target.closest?.("button, [role='button'], a")) return;
                          onRowClick(row);
                        }
                      : undefined
                  }
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined}
                >
                  {columns.map((c, colIndex) => {
                    const isActionColumn = c.isActionColumn || c.field === "actions" || c.field === "action";
                    const isFirstColumn = colIndex === 0;
                    const isLastColumn = colIndex === columns.length - 1;
                    return (
                      <td
                        key={(c.field || c.label) + getRowKey(row)}
                        className={cn(
                          "px-2.5 py-1.5 border-b border-border text-sm",
                          isActionColumn && "min-w-[150px] overflow-visible whitespace-normal",
                          !isActionColumn && "min-w-[80px] overflow-hidden text-ellipsis",
                          !isActionColumn && !c.wrap && "whitespace-nowrap",
                          !isActionColumn && c.wrap && "break-words",
                          isFirstColumn && isActionColumn && "sticky left-0 z-10 bg-background shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]",
                          isLastColumn && isActionColumn && "sticky right-0 z-10 bg-background shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                        )}
                        style={{ maxWidth: !isActionColumn && c.maxWidth ? c.maxWidth : undefined }}
                      >
                        {c.render
                          ? c.render(
                              row,
                              reload,
                              resolvedPerms ?? modulePermissions?.[currentModuleId]
                            )
                          : row[c.field]}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-t border-border p-2 bg-background">
          <p className="text-sm text-muted-foreground">
            Showing {from} to {to} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Select
              value={String(rowsPerPage)}
              onValueChange={(v) => handleChangeRowsPerPage({ target: { value: v } })}
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
      )}
    </div>
  );
}
