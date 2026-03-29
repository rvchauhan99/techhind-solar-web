"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { IconFilter, IconChevronDown, IconChevronUp, IconSearch, IconX } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import Select, { MenuItem } from "@/components/common/Select";
import Checkbox from "@/components/common/Checkbox";
import AutocompleteField from "@/components/common/AutocompleteField";
import companyService from "@/services/companyService";
import { getReferenceOptionsSearch } from "@/services/mastersService";

const FILTER_KEYS = [
  "q",
  "delivery_status",
  "challan_no",
  "challan_date_from",
  "challan_date_to",
  "order_number",
  "customer_name",
  "customer_mobile",
  "is_reversed",
  "handled_by",
  "warehouse_name",
  "transporter",
  "created_by",
  "created_at_from",
  "created_at_to",
];

const EMPTY_VALUES = Object.fromEntries(FILTER_KEYS.map((k) => [k, ""]));

const DELIVERY_STATUS_OPTIONS = [
  { value: "partial", label: "Partial" },
  { value: "complete", label: "Complete" },
];

export default function DeliveryChallanFilterPanel({
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
        // Backend filters by warehouse "name", not id, so keep only options with a usable name.
        const cleaned = list
          .map((w) => ({ id: w?.id, name: w?.name ?? w?.label }))
          .filter((w) => w?.name != null && String(w.name).trim() !== "");
        setWarehouseOptions(cleaned);
      })
      .catch(() => setWarehouseOptions([]))
      .finally(() => setLoadingWarehouses(false));
  }, []);

  const handleQuickSearchChange = useCallback(
    (val) => {
      setQuickSearch(val);
      setIsSearching(Boolean(val));

      // Cancel previous debounce and schedule apply.
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      const nextQ = val ?? "";
      const nextValues = { ...localValues, q: nextQ };
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
      delivery_status: "Status",
      challan_no: "Challan",
      order_number: "Order",
      customer_name: "Customer",
      customer_mobile: "Mobile",
      is_reversed: "Reversed",
      handled_by: "Handled By",
      warehouse_name: "Warehouse",
      transporter: "Transporter",
      created_by: "Created By",
      challan_date_from: "Challan From",
      challan_date_to: "Challan To",
      created_at_from: "Created From",
      created_at_to: "Created To",
    };

    return Object.entries(values || {})
      .filter(([key, v]) => FILTER_KEYS.includes(key) && v != null && String(v).trim() !== "")
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

        <div className="w-full sm:w-72 relative shrink-0">
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
            placeholder="Quick Search (Challan No / Transporter / Customer Name / Contact Number)"
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

          {quickSearch && (
            <button
              type="button"
              onClick={() => handleQuickSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500"
            >
              <IconX size={12} />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-2.5 py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 bg-slate-50/30">
          <Select
            name="delivery_status"
            label="Status"
            placeholder="All"
            value={localValues.delivery_status || ""}
            onChange={(e) => handleChange("delivery_status", e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {DELIVERY_STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>

          <Input
            name="challan_no"
            label="Challan No"
            placeholder="Search..."
            value={localValues.challan_no}
            onChange={(e) => handleChange("challan_no", e.target.value)}
          />

          <DateField
            name="challan_date_from"
            label="Challan Date From"
            value={localValues.challan_date_from}
            onChange={(e) => handleChange("challan_date_from", e.target.value)}
          />

          <DateField
            name="challan_date_to"
            label="Challan Date To"
            value={localValues.challan_date_to}
            onChange={(e) => handleChange("challan_date_to", e.target.value)}
          />

          <Input
            name="order_number"
            label="Order Number"
            placeholder="Search..."
            value={localValues.order_number}
            onChange={(e) => handleChange("order_number", e.target.value)}
          />

          <Input
            name="customer_name"
            label="Customer Name"
            placeholder="Search..."
            value={localValues.customer_name}
            onChange={(e) => handleChange("customer_name", e.target.value)}
          />

          <Input
            name="customer_mobile"
            label="Customer Mobile"
            placeholder="Search..."
            value={localValues.customer_mobile}
            onChange={(e) => handleChange("customer_mobile", e.target.value)}
          />

          <Checkbox
            name="is_reversed"
            label="Reversed Challans"
            checked={localValues.is_reversed === true || localValues.is_reversed === "true"}
            onCheckedChange={(checked) => handleChange("is_reversed", checked ? "true" : "")}
          />

          <Select
            name="warehouse_name"
            label="Warehouse"
            placeholder="All"
            value={localValues.warehouse_name || ""}
            onChange={(e) => handleChange("warehouse_name", e.target.value)}
            disabled={loadingWarehouses}
          >
            <MenuItem value="">All</MenuItem>
            {warehouseOptions.map((w) => (
              <MenuItem key={w.id ?? w.name} value={String(w.name)}>
                {w.name}
              </MenuItem>
            ))}
          </Select>

          <Input
            name="transporter"
            label="Transporter"
            placeholder="Search..."
            value={localValues.transporter}
            onChange={(e) => handleChange("transporter", e.target.value)}
          />

          <AutocompleteField
            usePortal={true}
            name="handled_by"
            label="Handled By"
            asyncLoadOptions={(q) =>
              getReferenceOptionsSearch("user.model", {
                q,
                limit: 20,
                status_in: "active,inactive",
              })
            }
            referenceModel="user.model"
            getOptionLabel={(o) => o?.name ?? o?.email ?? ""}
            value={localValues.handled_by ? { id: localValues.handled_by } : null}
            onChange={(e, v) => handleChange("handled_by", v?.id ? String(v.id) : "")}
            placeholder="Select user…"
          />

          <AutocompleteField
            usePortal={true}
            name="created_by"
            label="Created By"
            asyncLoadOptions={(q) =>
              getReferenceOptionsSearch("user.model", {
                q,
                limit: 20,
                status_in: "active,inactive",
              })
            }
            referenceModel="user.model"
            getOptionLabel={(o) => o?.name ?? o?.email ?? ""}
            value={localValues.created_by ? { id: localValues.created_by } : null}
            onChange={(e, v) => handleChange("created_by", v?.id ? String(v.id) : "")}
            placeholder="Select user…"
          />

          <DateField
            name="created_at_from"
            label="Created From"
            value={localValues.created_at_from}
            onChange={(e) => handleChange("created_at_from", e.target.value)}
          />

          <DateField
            name="created_at_to"
            label="Created To"
            value={localValues.created_at_to}
            onChange={(e) => handleChange("created_at_to", e.target.value)}
          />

          <div className="col-span-1 sm:col-span-2 lg:col-span-6 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={handleClear} className="h-8 px-3 text-xs w-20">
              Clear
            </Button>
            <Button size="sm" onClick={handleApply} className="h-8 px-3 text-xs w-20">
              Apply
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

