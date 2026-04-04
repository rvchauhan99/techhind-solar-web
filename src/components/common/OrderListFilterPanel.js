"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import companyService from "@/services/companyService";
import mastersService, { getReferenceOptionsSearch } from "@/services/mastersService";
import productService from "@/services/productService";

const FILTER_KEYS = [
  "q",
  "status",
  "customer_name",
  "consumer_no",
  "application_no",
  "reference_from",
  "mobile_number",
  "branch_id",
  "inquiry_source_id",
  "project_scheme_id",
  "handled_by",
  "order_number",
  "order_date_from",
  "order_date_to",
  "delivery_date_from",
  "delivery_date_to",
  "current_stage_key",
  "cancelled_stage",
  "cancelled_at_stage_key",
  "capacity_kw_from",
  "capacity_kw_to",
  "solar_panel_id",
  "inverter_id",
];

export const ORDER_STAGE_OPTIONS = [
  { value: "estimate_generated", label: "Estimate Generated" },
  { value: "estimate_paid", label: "Estimate Paid" },
  { value: "planner", label: "Planner" },
  { value: "delivery", label: "Delivery" },
  { value: "assign_fabricator_and_installer", label: "Assign Fabricator & Installer" },
  { value: "fabrication", label: "Fabrication" },
  { value: "installation", label: "Installation" },
{ value: "netmeter_apply", label: "Netmeter Apply" },
  { value: "netmeter_installed", label: "Netmeter Installed" },
  { value: "subsidy_claim", label: "Subsidy Claim" },
  { value: "subsidy_disbursed", label: "Subsidy Disbursed" },
  { value: "order_completed", label: "Order Completed" },
  { value: "payment_outstanding", label: "Order Completed but payment pending" },
];

async function searchProductsByTypeCi(q, productTypeCi) {
  const res = await productService.getProducts({
    q: q?.trim() ? q.trim() : undefined,
    limit: 30,
    product_type_ci: productTypeCi,
    visibility: "active",
  });
  const payload = res?.result ?? res?.data ?? res;
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.map((row) => ({
    id: row.id,
    name: row.product_name,
    label: row.product_name,
    product_name: row.product_name,
  }));
}

const CANCELLED_STAGE_OPTIONS = [
  { value: "before_confirmation", label: "Before Confirmation" },
  { value: "after_confirmation", label: "After Confirmation" },
];

const EMPTY_VALUES = Object.fromEntries(FILTER_KEYS.map((k) => [k, ""]));

export default function OrderListFilterPanel({
  open: controlledOpen,
  onToggle,
  values = {},
  onApply,
  onClear,
  defaultOpen = false,
  variant = "dashboard", // "dashboard" | "confirm" | "closed" | "cancelled"
  excludeKeys = [],
  showDeliveryDateRange = false,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (next) => { if (controlledOpen === undefined) setInternalOpen(next); else onToggle?.(next); },
    [controlledOpen, onToggle]
  );

  const effectiveExcludeKeys = useMemo(() => {
    const base = Array.isArray(excludeKeys) ? excludeKeys : [];
    if (variant === "cancelled") {
      return [...base, "status", "current_stage_key"];
    }
    return base;
  }, [excludeKeys, variant]);

  const [branchOptions, setBranchOptions] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [localValues, setLocalValues] = useState(() => ({ ...EMPTY_VALUES, ...values }));

  const showStatus = variant === "dashboard";

  const dashboardStatusMenuValue = useMemo(() => {
    const st = localValues.status;
    const sk = String(localValues.current_stage_key || "").trim();
    if (st === "confirmed" && !sk) return "confirmed";
    if (st === "all" && sk === "order_completed") return "completed";
    if (st === "all" && !sk) return "all";
    if (st === "pending" && !sk) return "pending";
    if (st === "cancelled" && !sk) return "cancelled";
    if (st === "cancelled") return "cancelled";
    return "all";
  }, [localValues.status, localValues.current_stage_key]);

  useEffect(() => {
    setLocalValues((prev) => ({ ...EMPTY_VALUES, ...values }));
  }, [values]);

  useEffect(() => {
    // Keep quick search input in sync with external q filter (e.g. URL/query state)
    const nextQ = values?.q ?? "";
    setQuickSearch(nextQ);
  }, [values?.q]);

  useEffect(() => {
    setLoadingOptions(true);
    Promise.all([
      companyService.listBranches().then((r) => Array.isArray(r?.result ?? r?.data ?? r) ? (r?.result ?? r?.data ?? r) : []),
      mastersService.getReferenceOptions("inquiry_source.model").then((r) => Array.isArray(r?.result ?? r?.data ?? r) ? (r?.result ?? r?.data ?? r) : []),
    ]).then(([branches, sources]) => {
      setBranchOptions(branches); setSourceOptions(sources);
    }).catch(() => { }).finally(() => setLoadingOptions(false));
  }, []);

  const handleChange = useCallback((key, value) => {
    setLocalValues((p) => ({ ...p, [key]: value ?? "" }));
  }, []);
  const handleApply = useCallback(() => {
    const next = { ...localValues };
    const from = String(next.capacity_kw_from ?? "").trim();
    const to = String(next.capacity_kw_to ?? "").trim();
    if (from && !to) next.capacity_kw_to = from;
    if (variant === "dashboard") {
      if (next.status === "active") {
        next.status = "confirmed";
        next.current_stage_key = next.current_stage_key ?? "";
      } else if (next.status === "completed") {
        next.status = "all";
        next.current_stage_key = "order_completed";
      } else if (next.status === "pending") {
        next.current_stage_key = "";
      } else if (next.status === "cancelled") {
        next.current_stage_key = "";
      }
    }
    onApply?.(next);
  }, [localValues, onApply, variant]);
  const handleClear = useCallback(() => {
    setLocalValues({ ...EMPTY_VALUES });
    setQuickSearch("");
    onClear?.();
  }, [onClear]);

  const isKeyVisible = useCallback(
    (key) => {
      if (effectiveExcludeKeys.includes(key)) return false;
      if (key === "status" && !showStatus) return false;
      return true;
    },
    [effectiveExcludeKeys, showStatus]
  );

  const activeCount = Object.entries(values || {}).filter(
    ([key, v]) => isKeyVisible(key) && v != null && v !== ""
  ).length;

  const [quickSearch, setQuickSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchFeedbackTimerRef = useRef(null);

  const handleQuickSearchChange = (val) => {
    setQuickSearch(val);
    setIsSearching(true);

    if (searchFeedbackTimerRef.current) clearTimeout(searchFeedbackTimerRef.current);
    searchFeedbackTimerRef.current = setTimeout(() => setIsSearching(false), 500);

    const nextValues = { ...localValues };

    // Clear specific fields so quick search remains broad/parallel
    nextValues.customer_name = "";
    nextValues.mobile_number = "";
    nextValues.order_number = "";
    nextValues.consumer_no = "";
    nextValues.application_no = "";
    nextValues.reference_from = "";

    nextValues.q = val;

    setLocalValues(nextValues);
    onApply?.(nextValues);
  };

  const getAppliedFiltersSummary = () => {
    const labels = {
      status: "Status",
      customer_name: "Name",
      mobile_number: "Mobile",
      consumer_no: "Consumer No",
      application_no: "App No",
      reference_from: "Ref",
      branch_id: "Branch",
      inquiry_source_id: "Source",
      project_scheme_id: "Project Scheme",
      handled_by: "User",
      current_stage_key: "Stage",
      order_number: "Order No",
      order_date_from: "Date From",
      order_date_to: "Date To",
      delivery_date_from: "Delivery Date From",
      delivery_date_to: "Delivery Date To",
      cancelled_stage: "Cancelled Stage",
      cancelled_at_stage_key: "Cancelled At",
      capacity_kw_from: "kW From",
      capacity_kw_to: "kW To",
      solar_panel_id: "Solar panel",
      inverter_id: "Inverter",
    };

    return Object.entries(values || {})
      .filter(([key, val]) => isKeyVisible(key) && val != null && val !== "")
      .map(([key]) => labels[key] || key);
  };

  const appliedSummary = getAppliedFiltersSummary();

  const hasQuickSearch = String(quickSearch ?? "").trim() !== "";
  const showQuickClear =
    activeCount > 0 || hasQuickSearch;

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

        <div className="w-full sm:w-80 relative shrink-0">
          <div
            className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
              isSearching ? "text-green-500 animate-pulse" : "text-slate-400"
            }`}
          >
            {isSearching ? (
              <div className="h-4 w-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
            ) : (
              <IconSearch size={16} />
            )}
          </div>
          <input
            type="text"
            placeholder="Quick Search (Name/Mobile/Order #)"
            className="w-full h-10 pl-10 pr-8 bg-white border-2 border-green-200/60 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all placeholder:text-slate-400 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="border-t border-slate-100 px-2.5 py-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          {showStatus && (
            <Select
              name="status"
              label="Status"
              value={dashboardStatusMenuValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "confirmed") {
                  setLocalValues((p) => ({ ...p, status: "confirmed", current_stage_key: "" }));
                } else if (v === "completed") {
                  setLocalValues((p) => ({ ...p, status: "all", current_stage_key: "order_completed" }));
                } else if (v === "all") {
                  setLocalValues((p) => ({ ...p, status: "all", current_stage_key: "" }));
                } else if (v === "pending") {
                  setLocalValues((p) => ({ ...p, status: "pending", current_stage_key: "" }));
                } else if (v === "cancelled") {
                  setLocalValues((p) => ({ ...p, status: "cancelled", current_stage_key: "" }));
                }
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="confirmed">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          )}
          <Input name="customer_name" label="Customer Name" placeholder="Search..." value={localValues.customer_name} onChange={(e) => handleChange("customer_name", e.target.value)} />
          <Input name="mobile_number" label="Mobile Number" placeholder="Search..." value={localValues.mobile_number} onChange={(e) => handleChange("mobile_number", e.target.value)} />
          <Input name="consumer_no" label="Consumer No" placeholder="Search..." value={localValues.consumer_no} onChange={(e) => handleChange("consumer_no", e.target.value)} />
          <Input name="application_no" label="Application No" placeholder="Search..." value={localValues.application_no} onChange={(e) => handleChange("application_no", e.target.value)} />
          <Input name="reference_from" label="Reference" placeholder="Search..." value={localValues.reference_from} onChange={(e) => handleChange("reference_from", e.target.value)} />
          <Select name="branch_id" label="Branch" value={localValues.branch_id} onChange={(e) => handleChange("branch_id", e.target.value)} disabled={loadingOptions}>
            <MenuItem value="">All Branches</MenuItem>
            {branchOptions.map((b) => <MenuItem key={b.id} value={String(b.id)}>{b.name ?? b.label ?? b.id}</MenuItem>)}
          </Select>
          <Select name="inquiry_source_id" label="Source" value={localValues.inquiry_source_id} onChange={(e) => handleChange("inquiry_source_id", e.target.value)} disabled={loadingOptions}>
            <MenuItem value="">All Sources</MenuItem>
            {sourceOptions.map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.source_name ?? s.label ?? s.name ?? s.id}</MenuItem>)}
          </Select>
          <AutocompleteField
            usePortal={true}
            name="project_scheme_id"
            label="Project Scheme"
            asyncLoadOptions={(q) => getReferenceOptionsSearch("project_scheme.model", { q, limit: 20 })}
            referenceModel="project_scheme.model"
            getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
            value={localValues.project_scheme_id ? { id: localValues.project_scheme_id } : null}
            onChange={(e, newValue) => handleChange("project_scheme_id", newValue?.id ? String(newValue.id) : "")}
            placeholder="Select Scheme..."
          />
          <AutocompleteField
            usePortal={true}
            name="handled_by"
            label="Handled By"
            asyncLoadOptions={(q) =>
              getReferenceOptionsSearch("user.model", { q, limit: 20, status_in: "active,inactive" })
            }
            referenceModel="user.model"
            getOptionLabel={(o) => o?.name ?? o?.email ?? ""}
            value={localValues.handled_by ? { id: localValues.handled_by } : null}
            onChange={(e, v) => handleChange("handled_by", v?.id ? String(v.id) : "")}
            placeholder="Search user…"
          />
          {variant !== "cancelled" && (
            <Select name="current_stage_key" label="Order Stage" value={localValues.current_stage_key} onChange={(e) => handleChange("current_stage_key", e.target.value)}>
              <MenuItem value="">All Stages</MenuItem>
              {ORDER_STAGE_OPTIONS.map((opt) => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
            </Select>
          )}
          {variant === "cancelled" && (
            <>
              <Select
                name="cancelled_stage"
                label="Cancelled Stage"
                value={localValues.cancelled_stage}
                onChange={(e) => handleChange("cancelled_stage", e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {CANCELLED_STAGE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
              <Select
                name="cancelled_at_stage_key"
                label="Cancelled At Stage"
                value={localValues.cancelled_at_stage_key}
                onChange={(e) => handleChange("cancelled_at_stage_key", e.target.value)}
              >
                <MenuItem value="">All Stages</MenuItem>
                <MenuItem value="__none__">None</MenuItem>
                {ORDER_STAGE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </>
          )}
          <Input name="order_number" label="Order Number" placeholder="Search..." value={localValues.order_number} onChange={(e) => handleChange("order_number", e.target.value)} />
          <DateField name="order_date_from" label="Order Date From" value={localValues.order_date_from} onChange={(e) => handleChange("order_date_from", e.target.value)} />
          <DateField name="order_date_to" label="Order Date To" value={localValues.order_date_to} onChange={(e) => handleChange("order_date_to", e.target.value)} />
          {(variant === "confirm" ||
            variant === "closed" ||
            variant === "cancelled" ||
            variant === "dashboard") && (
            <>
              <Input
                name="capacity_kw_from"
                label="Capacity from (kW)"
                placeholder="e.g. 3"
                type="number"
                inputProps={{ step: "any" }}
                value={localValues.capacity_kw_from}
                onChange={(e) => handleChange("capacity_kw_from", e.target.value)}
                onBlur={() => {
                  setLocalValues((prev) => {
                    const from = String(prev.capacity_kw_from ?? "").trim();
                    const to = String(prev.capacity_kw_to ?? "").trim();
                    if (from && !to) return { ...prev, capacity_kw_to: from };
                    return prev;
                  });
                }}
              />
              <Input
                name="capacity_kw_to"
                label="Capacity to (kW)"
                placeholder="Match “from” if empty"
                type="number"
                inputProps={{ step: "any" }}
                value={localValues.capacity_kw_to}
                onChange={(e) => handleChange("capacity_kw_to", e.target.value)}
              />
              <AutocompleteField
                usePortal={true}
                name="solar_panel_id"
                label="Solar panel"
                asyncLoadOptions={(q) => searchProductsByTypeCi(q, "panel")}
                getOptionLabel={(o) => o?.product_name ?? o?.label ?? o?.name ?? ""}
                resolveOptionById={async (id) => {
                  try {
                    const res = await productService.getProductById(id);
                    const p = res?.result ?? res?.data ?? res;
                    if (!p?.id) return null;
                    return {
                      id: p.id,
                      product_name: p.product_name,
                      label: p.product_name,
                    };
                  } catch {
                    return null;
                  }
                }}
                value={localValues.solar_panel_id ? { id: localValues.solar_panel_id } : null}
                onChange={(e, newValue) =>
                  handleChange("solar_panel_id", newValue?.id != null ? String(newValue.id) : "")
                }
                placeholder="Search panel product…"
              />
              <AutocompleteField
                usePortal={true}
                name="inverter_id"
                label="Inverter"
                asyncLoadOptions={(q) => searchProductsByTypeCi(q, "inverter")}
                getOptionLabel={(o) => o?.product_name ?? o?.label ?? o?.name ?? ""}
                resolveOptionById={async (id) => {
                  try {
                    const res = await productService.getProductById(id);
                    const p = res?.result ?? res?.data ?? res;
                    if (!p?.id) return null;
                    return {
                      id: p.id,
                      product_name: p.product_name,
                      label: p.product_name,
                    };
                  } catch {
                    return null;
                  }
                }}
                value={localValues.inverter_id ? { id: localValues.inverter_id } : null}
                onChange={(e, newValue) =>
                  handleChange("inverter_id", newValue?.id != null ? String(newValue.id) : "")
                }
                placeholder="Search inverter…"
              />
            </>
          )}
          {showDeliveryDateRange && (
            <>
              <DateField name="delivery_date_from" label="Delivery Date From" value={localValues.delivery_date_from} onChange={(e) => handleChange("delivery_date_from", e.target.value)} />
              <DateField name="delivery_date_to" label="Delivery Date To" value={localValues.delivery_date_to} onChange={(e) => handleChange("delivery_date_to", e.target.value)} />
            </>
          )}

          <div className="col-span-1 sm:col-span-2 lg:col-span-6 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={handleClear} className="h-8 px-3 text-xs w-20">Clear</Button>
            <Button size="sm" onClick={handleApply} className="h-8 px-3 text-xs w-20">Apply</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export { FILTER_KEYS, EMPTY_VALUES };
