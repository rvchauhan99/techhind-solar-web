"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { IconFilter, IconChevronDown, IconChevronUp, IconX } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import Select, { MenuItem } from "@/components/common/Select";
import OrderListQuickSearch from "@/components/common/OrderListQuickSearch";

export const B2B_SO_FILTER_KEYS = [
  "q",
  "order_no",
  "client_name",
  "ship_to_name",
  "planned_warehouse_name",
  "remarks",
  "order_date",
  "order_date_to",
  "due_date",
  "due_date_to",
  "status",
  "grand_total",
  "grand_total_to",
  "grand_total_op",
  "payment_outstanding",
];

export const EMPTY_VALUES = Object.fromEntries(B2B_SO_FILTER_KEYS.map((k) => [k, ""]));

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PARTIAL_SHIPPED", label: "Partial Shipped" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const CHIP_LABELS = {
  q: "Search",
  order_no: "Order #",
  client_name: "Client",
  ship_to_name: "Ship To",
  planned_warehouse_name: "Warehouse",
  remarks: "Remarks",
  order_date: "Date From",
  order_date_to: "Date To",
  due_date: "Due From",
  due_date_to: "Due To",
  status: "Status",
  grand_total: "Total From",
  grand_total_to: "Total To",
  payment_outstanding: "Payment outstanding",
};

function normalizeValues(values = {}) {
  return { ...EMPTY_VALUES, ...values };
}

function buildApplyPayload(localValues) {
  const next = normalizeValues(localValues);
  const hasTotal =
    String(next.grand_total ?? "").trim() !== "" ||
    String(next.grand_total_to ?? "").trim() !== "";
  next.grand_total_op = hasTotal ? "inRange" : "";
  return next;
}

function isActiveFilterKey(key, val) {
  if (key === "grand_total_op") return false;
  if (val == null || val === "") return false;
  return true;
}

export default function B2bSalesOrderFilterPanel({
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

  const [localValues, setLocalValues] = useState(() => normalizeValues(values));
  const [quickSearch, setQuickSearch] = useState(() => String(values?.q ?? ""));
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    setLocalValues(normalizeValues(values));
  }, [values]);

  useEffect(() => {
    setQuickSearch(String(values?.q ?? ""));
  }, [values?.q]);

  useEffect(
    () => () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    },
    []
  );

  const handleChange = useCallback((key, value) => {
    setLocalValues((prev) => ({ ...prev, [key]: value ?? "" }));
  }, []);

  const handleApply = useCallback(() => {
    onApply?.(buildApplyPayload(localValues));
    setOpen(false);
  }, [localValues, onApply, setOpen]);

  const handleClear = useCallback(() => {
    setLocalValues(normalizeValues(EMPTY_VALUES));
    setQuickSearch("");
    onClear?.();
  }, [onClear]);

  const handleQuickSearchChange = (val) => {
    setQuickSearch(val);
    setIsSearching(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const nextValues = buildApplyPayload({
        ...localValues,
        order_no: "",
        client_name: "",
        ship_to_name: "",
        q: val,
      });
      setLocalValues(nextValues);
      onApply?.(nextValues);
      setIsSearching(false);
    }, 500);
  };

  const togglePaymentOutstanding = () => {
    const nextFlag = String(localValues.payment_outstanding) === "true" ? "" : "true";
    const nextValues = buildApplyPayload({
      ...localValues,
      payment_outstanding: nextFlag,
    });
    setLocalValues(nextValues);
    onApply?.(nextValues);
  };

  const activeCount = useMemo(
    () =>
      Object.entries(values || {}).filter(([key, v]) => isActiveFilterKey(key, v)).length,
    [values]
  );

  const appliedSummary = useMemo(
    () =>
      Object.entries(values || {})
        .filter(([key, val]) => isActiveFilterKey(key, val))
        .map(([key, val]) => {
          if (key === "payment_outstanding" && (val === "true" || val === true || val === "1")) {
            return CHIP_LABELS.payment_outstanding;
          }
          if (key === "status") {
            const opt = STATUS_OPTIONS.find((o) => o.value === val);
            return opt ? `Status: ${opt.label}` : CHIP_LABELS.status;
          }
          return CHIP_LABELS[key] || key;
        }),
    [values]
  );

  const showQuickClear = activeCount > 0 || String(quickSearch ?? "").trim() !== "";
  const paymentOutstandingOn =
    String(localValues.payment_outstanding) === "true" ||
    String(values?.payment_outstanding) === "true";

  return (
    <Card className="rounded-xl shadow-sm border-slate-200 bg-white mb-2 overflow-visible">
      <div className="flex flex-col sm:flex-row items-center gap-2 px-2.5 py-1.5 h-auto sm:h-12">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors rounded-lg border border-slate-200 focus:outline-none shrink-0"
        >
          <span className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-tight">
            <IconFilter size={14} /> Advanced Filters
            {activeCount > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] h-4 px-1 leading-none bg-green-100 text-green-700 border-green-200"
              >
                {activeCount}
              </Badge>
            )}
          </span>
          {open ? (
            <IconChevronUp size={14} className="text-slate-400" />
          ) : (
            <IconChevronDown size={14} className="text-slate-400" />
          )}
        </button>

        <Button
          type="button"
          size="sm"
          variant={paymentOutstandingOn ? "default" : "outline"}
          className="h-8 shrink-0 px-2 text-[10px] font-semibold uppercase tracking-tight"
          onClick={togglePaymentOutstanding}
        >
          Payment outstanding
        </Button>

        {showQuickClear && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 px-2 text-[10px] font-semibold uppercase tracking-tight border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
            onClick={handleClear}
          >
            <IconX size={12} className="mr-0.5" />
            Clear filters
          </Button>
        )}

        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {appliedSummary.map((label) => (
            <span
              key={label}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-200 whitespace-nowrap uppercase tracking-tighter"
            >
              {label}
            </span>
          ))}
        </div>

        <OrderListQuickSearch
          value={quickSearch}
          onValueChange={handleQuickSearchChange}
          isSearching={isSearching}
          placeholder="Order # / Client / Ship To"
          className="w-full sm:w-80"
        />
      </div>

      {open && (
        <div className="border-t border-slate-100 px-2.5 py-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 bg-slate-50/30">
          <Input
            name="order_no"
            label="Order #"
            placeholder="SO…"
            value={localValues.order_no}
            onChange={(e) => handleChange("order_no", e.target.value)}
          />
          <Input
            name="client_name"
            label="Client"
            placeholder="Client name"
            value={localValues.client_name}
            onChange={(e) => handleChange("client_name", e.target.value)}
          />
          <Input
            name="ship_to_name"
            label="Ship To"
            placeholder="Ship-to name"
            value={localValues.ship_to_name}
            onChange={(e) => handleChange("ship_to_name", e.target.value)}
          />
          <Input
            name="planned_warehouse_name"
            label="Warehouse"
            placeholder="Warehouse"
            value={localValues.planned_warehouse_name}
            onChange={(e) => handleChange("planned_warehouse_name", e.target.value)}
          />
          <Select
            name="status"
            label="Status"
            value={localValues.status || ""}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <MenuItem value="">All statuses</MenuItem>
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
          <Input
            name="remarks"
            label="Remarks"
            placeholder="Remarks"
            value={localValues.remarks}
            onChange={(e) => handleChange("remarks", e.target.value)}
          />
          <DateField
            name="order_date"
            label="Order date from"
            value={localValues.order_date}
            onChange={(e) => handleChange("order_date", e.target.value)}
          />
          <DateField
            name="order_date_to"
            label="Order date to"
            value={localValues.order_date_to}
            onChange={(e) => handleChange("order_date_to", e.target.value)}
          />
          <DateField
            name="due_date"
            label="Due date from"
            value={localValues.due_date}
            onChange={(e) => handleChange("due_date", e.target.value)}
          />
          <DateField
            name="due_date_to"
            label="Due date to"
            value={localValues.due_date_to}
            onChange={(e) => handleChange("due_date_to", e.target.value)}
          />
          <Input
            name="grand_total"
            label="Total from"
            type="number"
            placeholder="Min"
            value={localValues.grand_total}
            onChange={(e) => handleChange("grand_total", e.target.value)}
          />
          <Input
            name="grand_total_to"
            label="Total to"
            type="number"
            placeholder="Max"
            value={localValues.grand_total_to}
            onChange={(e) => handleChange("grand_total_to", e.target.value)}
          />
          <div className="sm:col-span-2 lg:col-span-6 flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleClear}>
              Clear
            </Button>
            <Button type="button" size="sm" className="h-8 text-xs" onClick={handleApply}>
              Apply filters
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
