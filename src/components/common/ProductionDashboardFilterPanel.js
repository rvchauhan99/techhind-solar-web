"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { IconFilter, IconChevronDown, IconChevronUp, IconSearch, IconX } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DateField from "@/components/common/DateField";
import Select, { MenuItem } from "@/components/common/Select";
import AutocompleteField from "@/components/common/AutocompleteField";
import companyService from "@/services/companyService";
import productService from "@/services/productService";
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";
import { AP } from "@/utils/assemblyProductionLabels";
import { PRODUCTION_ORDER_STATUS_OPTIONS, PRODUCTION_ORDER_PRIORITY_OPTIONS } from "@/app/production-orders/components/productionOrderUi";
import { PRODUCTION_DASHBOARD_FILTER_KEYS } from "@/app/production-dashboard/components/productionDashboardUi";

const EMPTY_VALUES = Object.fromEntries(PRODUCTION_DASHBOARD_FILTER_KEYS.map((k) => [k, ""]));

export { PRODUCTION_DASHBOARD_FILTER_KEYS };

export default function ProductionDashboardFilterPanel({
  open: controlledOpen,
  onToggle,
  values = {},
  onApply,
  onClear,
  defaultOpen = false,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (next) => {
      if (controlledOpen === undefined) setInternalOpen(next);
      else onToggle?.(next);
    },
    [controlledOpen, onToggle]
  );

  const [localValues, setLocalValues] = useState({ ...EMPTY_VALUES, ...values });
  const [quickSearch, setQuickSearch] = useState(values.q || "");
  const [isSearching, setIsSearching] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    setLocalValues({ ...EMPTY_VALUES, ...values });
    setQuickSearch(values.q || "");
  }, [values]);

  useEffect(() => {
    const load = async () => {
      try {
        const profileRes = await companyService.getCompanyProfile();
        const companyId = (profileRes?.result || profileRes?.data || profileRes)?.id;
        if (!companyId) return;
        const res = await companyService.listWarehouses(parseInt(companyId, 10));
        const list = res?.result || res?.data || res || [];
        setWarehouses(Array.isArray(list) ? list : []);
      } catch {
        setWarehouses([]);
      }
    };
    load();
  }, []);

  const handleQuickSearchChange = useCallback(
    (value) => {
      setQuickSearch(value);
      setIsSearching(true);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onApply?.({ ...values, q: value, booking_no: "" });
        setIsSearching(false);
      }, 500);
    },
    [onApply, values]
  );

  useEffect(
    () => () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    },
    []
  );

  const handleChange = useCallback((key, value) => {
    setLocalValues((prev) => ({ ...prev, [key]: value ?? "" }));
  }, []);

  const labels = useMemo(
    () => ({
      q: "Search",
      warehouse_id: "Warehouse",
      fg_product_id: "Finished Good",
      status: "Status",
      priority: "Priority",
      start_date: "From",
      end_date: "To",
      open_only: "Open Only",
      kpi_scope: "Scope",
    }),
    []
  );

  const appliedSummary = Object.entries(values || {})
    .filter(
      ([key, v]) =>
        PRODUCTION_DASHBOARD_FILTER_KEYS.includes(key) &&
        v != null &&
        String(v).trim() !== "" &&
        key !== "kpi_scope"
    )
    .map(([key]) => labels[key] || key);

  const handleApply = useCallback(() => {
    onApply?.({ ...localValues, q: quickSearch });
    setOpen(false);
  }, [localValues, quickSearch, onApply, setOpen]);

  const handleClear = useCallback(() => {
    setLocalValues({ ...EMPTY_VALUES });
    setQuickSearch("");
    onClear?.();
  }, [onClear]);

  return (
    <Card className="mb-2 overflow-visible rounded-xl border-slate-200 bg-white shadow-sm">
      <div className="flex h-auto flex-col items-center gap-2 px-2.5 py-1.5 sm:h-10 sm:flex-row">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1 transition-colors hover:bg-slate-50 focus:outline-none"
        >
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-tight text-slate-700">
            <IconFilter size={12} /> Advanced Filters
            {appliedSummary.length > 0 && (
              <Badge variant="secondary" className="h-3.5 bg-green-100 px-1 text-[9px] leading-none text-green-700 border-green-200">
                {appliedSummary.length}
              </Badge>
            )}
          </span>
          {open ? <IconChevronUp size={12} className="text-slate-400" /> : <IconChevronDown size={12} className="text-slate-400" />}
        </button>

        <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
          {appliedSummary.map((label) => (
            <span
              key={label}
              className="inline-flex items-center whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-green-700"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="relative w-full shrink-0 sm:w-80">
          <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isSearching ? "animate-pulse text-green-500" : "text-slate-400"}`}>
            {isSearching ? (
              <div className="size-3.5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            ) : (
              <IconSearch size={14} />
            )}
          </div>
          <input
            type="text"
            placeholder={`Quick Search (${AP.orders.orderNo} / Finished Good / Warehouse)`}
            className="h-8 w-full rounded-lg border-2 border-green-200/60 bg-white pl-8 pr-7 text-[11px] font-semibold placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            value={quickSearch}
            onChange={(e) => handleQuickSearchChange(e.target.value)}
          />
          {quickSearch ? (
            <button
              type="button"
              onClick={() => handleQuickSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500"
            >
              <IconX size={12} />
            </button>
          ) : null}
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-2 border-t border-slate-100 bg-slate-50/30 px-2.5 py-2 sm:grid-cols-2 lg:grid-cols-6">
          <Select
            name="warehouse_id"
            label="Warehouse"
            placeholder="All"
            value={localValues.warehouse_id || ""}
            onChange={(e) => handleChange("warehouse_id", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {warehouses.map((wh) => (
              <MenuItem key={wh.id} value={String(wh.id)}>
                {wh.name}
              </MenuItem>
            ))}
          </Select>

          <AutocompleteField
            usePortal
            name="fg_product_id"
            label="Finished Good"
            options={[]}
            asyncLoadOptions={async (q) => {
              const res = await productService.getProducts({
                q: q || undefined,
                limit: 20,
                visibility: "active",
              });
              const data = res?.result?.data ?? res?.data ?? [];
              return Array.isArray(data) ? data : [];
            }}
            resolveOptionById={async (id) => {
              if (id == null || id === "") return null;
              const p = await productService.getProductById(id);
              return p?.result ?? p ?? null;
            }}
            getOptionLabel={(p) => formatProductAutocompleteLabel(p) || String(p?.id ?? "")}
            value={localValues.fg_product_id ? { id: Number(localValues.fg_product_id) } : null}
            onChange={(e, newValue) => handleChange("fg_product_id", newValue?.id ?? "")}
          />

          <Select
            name="status"
            label="Status"
            placeholder="All"
            value={localValues.status || ""}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {PRODUCTION_ORDER_STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>

          <Select
            name="priority"
            label="Priority"
            placeholder="All"
            value={localValues.priority || ""}
            onChange={(e) => handleChange("priority", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {PRODUCTION_ORDER_PRIORITY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>

          <DateField
            label="From"
            value={localValues.start_date || ""}
            onChange={(v) => handleChange("start_date", v)}
          />
          <DateField
            label="To"
            value={localValues.end_date || ""}
            onChange={(v) => handleChange("end_date", v)}
          />

          <div className="flex items-end gap-1.5 sm:col-span-2 lg:col-span-6">
            <Button type="button" size="sm" className="h-8" onClick={handleApply}>
              Apply
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
