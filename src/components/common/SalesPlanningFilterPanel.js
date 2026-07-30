"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { IconFilter, IconChevronDown, IconChevronUp, IconX } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import MultiSelect from "@/components/common/MultiSelect";
import Select, { MenuItem } from "@/components/common/Select";
import AutocompleteField from "@/components/common/AutocompleteField";
import OrderListQuickSearch from "@/components/common/OrderListQuickSearch";
import b2bClientService from "@/services/b2bClientService";
import b2bSalesPlanningService from "@/services/b2bSalesPlanningService";
import { getReferenceOptionsSearch } from "@/services/mastersService";

export const STATUS_OPTIONS = [
  { value: "DUE_TODAY", label: "Due Today" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "PIPELINE", label: "Pipeline" },
  { value: "PIPELINE_OVERDUE", label: "Pipeline Overdue" },
  { value: "COMPLETED", label: "Completed" },
  { value: "BROKEN", label: "Broken" },
];

export const EMPTY_SALES_PLANNING_FILTERS = {
  q: "",
  status: [],
  assigned_to: [],
  client_id: "",
  client_name: "",
  plan_no: "",
  plan_date_from: "",
  plan_date_to: "",
  completed_from: "",
  completed_to: "",
  pipeline_reason: [],
  pipeline_age_min: "",
  pipeline_age_max: "",
  has_active_so: "",
  date_filter_field: "plan_date",
};

export const DEFAULT_PIPELINE_FILTERS = {
  ...EMPTY_SALES_PLANNING_FILTERS,
  status: ["PIPELINE", "PIPELINE_OVERDUE"],
};

const MULTI_KEYS = ["status", "assigned_to", "pipeline_reason"];
const UI_ONLY_KEYS = new Set(["date_filter_field"]);
/** Status is driven by quick toolbar / StatCards — not advanced panel badge */
const TOOLBAR_MANAGED_KEYS = new Set(["status"]);
const QUICK_SEARCH_DEBOUNCE_MS = 300;

const FILTER_CHIP_LABELS = {
  status: "Status",
  assigned_to: "Assigned",
  client_id: "Client",
  client_name: "Client Name",
  plan_no: "Plan No",
  plan_date_from: "Plan From",
  plan_date_to: "Plan To",
  completed_from: "Completed From",
  completed_to: "Completed To",
  pipeline_reason: "Reason",
  pipeline_age_min: "Age Min",
  pipeline_age_max: "Age Max",
  has_active_so: "Active SO",
};

function normalizeLocalValues(values = {}) {
  const base = { ...EMPTY_SALES_PLANNING_FILTERS, ...values };
  const normalized = { ...base };
  MULTI_KEYS.forEach((key) => {
    const raw = base[key];
    if (Array.isArray(raw)) normalized[key] = raw;
    else if (raw != null && raw !== "") normalized[key] = [String(raw)];
    else normalized[key] = [];
  });
  if (!normalized.date_filter_field) normalized.date_filter_field = "plan_date";
  return normalized;
}

export function filtersToApiParams(filters = {}) {
  const params = {};
  const f = normalizeLocalValues(filters);
  if (f.q) params.q = f.q;
  if (f.status.length) params.status = f.status.join(",");
  if (f.assigned_to.length) params.assigned_to = f.assigned_to.join(",");
  if (f.client_id) params.client_id = f.client_id;
  if (f.client_name) params.client_name = f.client_name;
  if (f.plan_no) params.plan_no = f.plan_no;
  if (f.plan_date_from) params.plan_date_from = f.plan_date_from;
  if (f.plan_date_to) params.plan_date_to = f.plan_date_to;
  if (f.completed_from) params.completed_from = f.completed_from;
  if (f.completed_to) params.completed_to = f.completed_to;
  if (f.pipeline_reason.length) params.pipeline_reason = f.pipeline_reason.join(",");
  if (f.pipeline_age_min !== "" && f.pipeline_age_min != null) {
    params.pipeline_age_min = f.pipeline_age_min;
  }
  if (f.pipeline_age_max !== "" && f.pipeline_age_max != null) {
    params.pipeline_age_max = f.pipeline_age_max;
  }
  if (f.has_active_so !== "" && f.has_active_so != null) {
    params.has_active_so = f.has_active_so;
  }
  return params;
}

function isAdvancedFilterActive(key, val) {
  if (UI_ONLY_KEYS.has(key) || TOOLBAR_MANAGED_KEYS.has(key) || key === "q") return false;
  if (MULTI_KEYS.includes(key)) return Array.isArray(val) && val.length > 0;
  return val != null && val !== "";
}

export default function SalesPlanningFilterPanel({
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

  const [localValues, setLocalValues] = useState(() => normalizeLocalValues(values));
  const [pipelineReasonOptions, setPipelineReasonOptions] = useState([]);
  const [clients, setClients] = useState([]);
  const [quickSearch, setQuickSearch] = useState(() => values?.q ?? "");
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef(null);
  const searchFeedbackTimerRef = useRef(null);
  const localValuesRef = useRef(localValues);
  localValuesRef.current = localValues;

  useEffect(() => {
    setLocalValues(normalizeLocalValues(values));
  }, [values]);

  useEffect(() => {
    setQuickSearch(values?.q ?? "");
  }, [values?.q]);

  useEffect(
    () => () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (searchFeedbackTimerRef.current) clearTimeout(searchFeedbackTimerRef.current);
    },
    []
  );

  useEffect(() => {
    b2bSalesPlanningService
      .getB2bSalesPlanningConfig()
      .then((res) => {
        const cfg = res?.result ?? res ?? {};
        const reasons = cfg.pipeline_reasons || [];
        setPipelineReasonOptions(reasons.map((r) => ({ value: r, label: r })));
      })
      .catch(() => setPipelineReasonOptions([]));

    b2bClientService
      .getB2bClients({ limit: 200 })
      .then((res) => {
        const rows = res?.result?.rows ?? res?.result?.data ?? res?.rows ?? [];
        setClients(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setClients([]));
  }, []);

  const handleChange = useCallback((key, value) => {
    setLocalValues((prev) => ({ ...prev, [key]: value ?? "" }));
  }, []);

  const handleApply = useCallback(() => {
    onApply?.(normalizeLocalValues(localValues));
    setOpen(false);
  }, [localValues, onApply, setOpen]);

  const applyQuickSearch = useCallback(
    (val) => {
      const next = normalizeLocalValues({
        ...localValuesRef.current,
        q: val,
        plan_no: "",
        client_name: "",
      });
      setLocalValues(next);
      onApply?.(next);
    },
    [onApply]
  );

  const handleQuickSearchChange = useCallback(
    (val) => {
      const nextVal = val ?? "";
      const pending = Boolean(debounceTimerRef.current);
      // Enter re-fires same value while debounce pending — flush immediately
      const flushNow = nextVal === "" || (pending && nextVal === quickSearch);

      setQuickSearch(nextVal);
      setIsSearching(true);

      if (searchFeedbackTimerRef.current) clearTimeout(searchFeedbackTimerRef.current);
      searchFeedbackTimerRef.current = setTimeout(() => setIsSearching(false), 500);

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      if (flushNow) {
        applyQuickSearch(nextVal);
        return;
      }

      debounceTimerRef.current = setTimeout(() => {
        applyQuickSearch(nextVal);
      }, QUICK_SEARCH_DEBOUNCE_MS);
    },
    [applyQuickSearch, quickSearch]
  );

  const handleClear = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setQuickSearch("");
    setIsSearching(false);
    setLocalValues(normalizeLocalValues(EMPTY_SALES_PLANNING_FILTERS));
    onClear?.();
  }, [onClear]);

  const activeCount = Object.entries(values || {}).filter(([key, val]) =>
    isAdvancedFilterActive(key, val)
  ).length;

  const hasQuickSearch = String(quickSearch ?? "").trim() !== "";
  const showQuickClear = activeCount > 0 || hasQuickSearch;

  const appliedSummary = Object.entries(values || {})
    .filter(([key, val]) => isAdvancedFilterActive(key, val))
    .map(([key]) => FILTER_CHIP_LABELS[key] || key);

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
          placeholder="Quick Search (Plan No / Client / Reason)"
          className="w-full sm:w-80"
        />
      </div>

      {open && (
        <div className="border-t border-slate-100 px-2.5 py-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            <MultiSelect
              name="status"
              label="Status"
              placeholder="All statuses"
              options={STATUS_OPTIONS}
              value={localValues.status}
              onChange={(e) => handleChange("status", e.target.value)}
            />
            <Input
              name="plan_no"
              label="Plan No"
              value={localValues.plan_no}
              onChange={(e) => handleChange("plan_no", e.target.value)}
            />
            <DateField
              name="plan_date_from"
              label="Plan Date From"
              value={localValues.plan_date_from}
              onChange={(e) => handleChange("plan_date_from", e.target.value)}
            />
            <DateField
              name="plan_date_to"
              label="Plan Date To"
              value={localValues.plan_date_to}
              onChange={(e) => handleChange("plan_date_to", e.target.value)}
            />
            <DateField
              name="completed_from"
              label="Completed From"
              value={localValues.completed_from}
              onChange={(e) => handleChange("completed_from", e.target.value)}
            />
            <DateField
              name="completed_to"
              label="Completed To"
              value={localValues.completed_to}
              onChange={(e) => handleChange("completed_to", e.target.value)}
            />
            <div className="lg:col-span-2">
              <AutocompleteField
                label="Client"
                options={clients}
                getOptionLabel={(c) =>
                  c
                    ? `${c.client_code ?? ""} – ${c.client_name ?? ""}`.trim() ||
                      String(c?.id ?? "")
                    : ""
                }
                value={
                  clients.find((c) => String(c.id) === String(localValues.client_id)) ||
                  (localValues.client_id ? { id: localValues.client_id } : null)
                }
                onChange={(e, newValue) => {
                  handleChange("client_id", newValue?.id ?? "");
                  handleChange("client_name", "");
                }}
              />
            </div>
            <Input
              name="client_name"
              label="Client Name"
              value={localValues.client_name}
              onChange={(e) => handleChange("client_name", e.target.value)}
            />
            <MultiSelect
              name="assigned_to"
              label="Assigned To"
              placeholder="All users"
              options={[]}
              value={localValues.assigned_to}
              onChange={(e) => handleChange("assigned_to", e.target.value)}
              searchable
              searchPlaceholder="Search users..."
              asyncLoadOptions={(q, id) =>
                getReferenceOptionsSearch("user.model", {
                  q,
                  id,
                  limit: id ? 1 : 20,
                  status_in: "active,inactive",
                }).then((res) => {
                  const data = res?.result ?? res?.data ?? res;
                  return Array.isArray(data)
                    ? data.map((u) => ({
                        value: String(u.id),
                        label: u.name ?? u.label ?? `User #${u.id}`,
                      }))
                    : [];
                })
              }
            />
            <MultiSelect
              name="pipeline_reason"
              label="Pipeline Reason"
              placeholder="All reasons"
              options={pipelineReasonOptions}
              value={localValues.pipeline_reason}
              onChange={(e) => handleChange("pipeline_reason", e.target.value)}
            />
            <Input
              name="pipeline_age_min"
              label="Pipeline Age Min (days)"
              type="number"
              value={localValues.pipeline_age_min}
              onChange={(e) => handleChange("pipeline_age_min", e.target.value)}
            />
            <Input
              name="pipeline_age_max"
              label="Pipeline Age Max (days)"
              type="number"
              value={localValues.pipeline_age_max}
              onChange={(e) => handleChange("pipeline_age_max", e.target.value)}
            />
            <Select
              name="has_active_so"
              label="Active SO"
              value={localValues.has_active_so}
              onChange={(e) => handleChange("has_active_so", e.target.value)}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="true">Has Active SO</MenuItem>
              <MenuItem value="false">No Active SO</MenuItem>
            </Select>
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleClear}>
              Clear
            </Button>
            <Button type="button" size="sm" className="h-7 text-xs" onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
