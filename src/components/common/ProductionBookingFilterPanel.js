"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { IconFilter, IconChevronDown, IconChevronUp, IconSearch, IconX } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import Select, { MenuItem } from "@/components/common/Select";
import AutocompleteField from "@/components/common/AutocompleteField";
import companyService from "@/services/companyService";
import productService from "@/services/productService";
import { formatProductAutocompleteLabel } from "@/utils/productAutocompleteLabel";
import { AP } from "@/utils/assemblyProductionLabels";
import {
  PRODUCTION_BOOKING_FILTER_KEYS,
  PRODUCTION_BOOKING_STATUS_OPTIONS,
} from "@/app/production-bookings/components/productionBookingUi";

const EMPTY_VALUES = Object.fromEntries(PRODUCTION_BOOKING_FILTER_KEYS.map((k) => [k, ""]));

export { PRODUCTION_BOOKING_FILTER_KEYS };

export default function ProductionBookingFilterPanel({
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

  const [localValues, setLocalValues] = useState(() => ({ ...EMPTY_VALUES, ...values }));
  const [quickSearch, setQuickSearch] = useState(values?.q ?? "");
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef(null);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  const valuesKey = useMemo(() => JSON.stringify(values ?? {}), [values]);

  useEffect(() => {
    setLocalValues({ ...EMPTY_VALUES, ...values });
  }, [valuesKey]);

  useEffect(() => {
    setQuickSearch(values?.q ?? "");
  }, [values?.q]);

  useEffect(() => {
    setLoadingWarehouses(true);
    companyService
      .listWarehouses()
      .then((r) => {
        const list = Array.isArray(r?.result ?? r?.data ?? r) ? (r?.result ?? r?.data ?? r) : [];
        setWarehouseOptions(
          list
            .map((w) => ({ id: w?.id, name: w?.name ?? w?.label }))
            .filter((w) => w?.id != null)
        );
      })
      .catch(() => setWarehouseOptions([]))
      .finally(() => setLoadingWarehouses(false));
  }, []);

  const handleQuickSearchChange = useCallback(
    (val) => {
      setQuickSearch(val);
      setIsSearching(Boolean(val));
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      const nextValues = {
        ...localValues,
        booking_no: "",
        order_no: "",
        q: val ?? "",
      };
      setLocalValues(nextValues);

      debounceTimerRef.current = setTimeout(() => {
        setIsSearching(false);
        onApply?.(nextValues);
        debounceTimerRef.current = null;
      }, 500);
    },
    [localValues, onApply]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleChange = useCallback((key, value) => {
    setLocalValues((prev) => ({ ...prev, [key]: value ?? "" }));
  }, []);

  const getAppliedFiltersSummary = () => {
    const labels = {
      q: "Search",
      booking_no: "Booking No",
      order_no: AP.orders.orderNo,
      warehouse_id: "Warehouse",
      fg_product_id: "Finished Good",
      status: "Status",
      booking_date_from: "Date From",
      booking_date_to: "Date To",
      production_order_id: AP.orders.singular,
    };
    return Object.entries(values || {})
      .filter(
        ([key, v]) =>
          PRODUCTION_BOOKING_FILTER_KEYS.includes(key) &&
          v != null &&
          String(v).trim() !== ""
      )
      .map(([key]) => labels[key] || key);
  };

  const appliedSummary = getAppliedFiltersSummary();
  const activeCount = appliedSummary.length;

  const handleApply = useCallback(() => {
    onApply?.(localValues);
    setOpen(false);
  }, [localValues, onApply, setOpen]);

  const handleClear = useCallback(() => {
    setLocalValues({ ...EMPTY_VALUES });
    setQuickSearch("");
    onClear?.();
  }, [onClear]);

  return (
    <Card className="rounded-xl shadow-sm border-slate-200 bg-white mb-2 overflow-visible">
      <div className="flex flex-col sm:flex-row items-center gap-2 px-2.5 py-1.5 h-auto sm:h-10">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-2.5 py-1 hover:bg-slate-50 transition-colors rounded-lg border border-slate-200 focus:outline-none shrink-0"
        >
          <span className="flex items-center gap-2 text-[11px] font-bold text-slate-700 uppercase tracking-tight">
            <IconFilter size={12} /> Advanced Filters
            {activeCount > 0 && (
              <Badge
                variant="secondary"
                className="text-[9px] h-3.5 px-1 leading-none bg-green-100 text-green-700 border-green-200"
              >
                {activeCount}
              </Badge>
            )}
          </span>
          {open ? (
            <IconChevronUp size={12} className="text-slate-400" />
          ) : (
            <IconChevronDown size={12} className="text-slate-400" />
          )}
        </button>

        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {appliedSummary.map((label) => (
            <span
              key={label}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-200 whitespace-nowrap uppercase tracking-tighter"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="w-full sm:w-80 relative shrink-0">
          <div
            className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${
              isSearching ? "text-green-500 animate-pulse" : "text-slate-400"
            }`}
          >
            {isSearching ? (
              <div className="size-3.5 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
            ) : (
              <IconSearch size={14} />
            )}
          </div>
          <input
            type="text"
            placeholder={`Quick Search (Booking No / ${AP.orders.singular} / Finished Good / Warehouse)`}
            className="w-full h-8 pl-8 pr-7 bg-white border-2 border-green-200/60 rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 placeholder:text-slate-400"
            value={quickSearch}
            onChange={(e) => handleQuickSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                handleQuickSearchChange(quickSearch);
              }
            }}
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
        <div className="border-t border-slate-100 px-2.5 py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 bg-slate-50/30">
          <Input
            name="booking_no"
            label="Booking No"
            placeholder="Search..."
            value={localValues.booking_no}
            onChange={(e) => handleChange("booking_no", e.target.value)}
          />

          <Input
            name="order_no"
            label={AP.orders.orderNo}
            placeholder="Search..."
            value={localValues.order_no}
            onChange={(e) => handleChange("order_no", e.target.value)}
          />

          <Select
            name="warehouse_id"
            label="Warehouse"
            placeholder="All"
            value={localValues.warehouse_id || ""}
            onChange={(e) => handleChange("warehouse_id", e.target.value)}
            disabled={loadingWarehouses}
          >
            <MenuItem value="">All</MenuItem>
            {warehouseOptions.map((w) => (
              <MenuItem key={w.id} value={String(w.id)}>
                {w.name}
              </MenuItem>
            ))}
          </Select>

          <AutocompleteField
            usePortal
            name="fg_product_id"
            label="Finished Good"
            options={[]}
            asyncLoadOptions={async (query) => {
              const res = await productService.getProducts({
                q: query || undefined,
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
            {PRODUCTION_BOOKING_STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>

          <DateField
            name="booking_date_from"
            label="Booking Date From"
            value={localValues.booking_date_from}
            onChange={(e) => handleChange("booking_date_from", e.target.value)}
          />
          <DateField
            name="booking_date_to"
            label="Booking Date To"
            value={localValues.booking_date_to}
            onChange={(e) => handleChange("booking_date_to", e.target.value)}
          />

          <div className="flex items-end justify-end gap-1.5 sm:col-span-2 lg:col-span-6 pt-2">
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
