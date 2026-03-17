"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { IconFilter, IconChevronDown, IconChevronUp, IconSearch, IconX } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import companyService from "@/services/companyService";
import mastersService from "@/services/mastersService";
import MultiSelect from "@/components/common/MultiSelect";

const FILTER_KEYS = [
  "q",
  "lead_number",
  "customer_name",
  "mobile_number",
  "campaign_name",
  "status",
  "priority",
  "branch_id",
  "inquiry_source_id",
  "created_from",
  "created_to",
  "next_follow_up_from",
  "next_follow_up_to",
  "not_status",
  "assigned_to",
];

const EMPTY_VALUES = Object.fromEntries(FILTER_KEYS.map((k) => [k, ""]));

const MULTI_SELECT_KEYS = [
  "status",
  "priority",
  "branch_id",
  "inquiry_source_id",
  "assigned_to",
];

function normalizeLocalValues(values = {}) {
  const base = { ...EMPTY_VALUES, ...values };
  const normalized = { ...base };

  MULTI_SELECT_KEYS.forEach((key) => {
    const raw = base[key];
    if (Array.isArray(raw)) {
      normalized[key] = raw;
    } else if (raw != null && raw !== "") {
      normalized[key] = [String(raw)];
    } else {
      normalized[key] = [];
    }
  });

  return normalized;
}

/** Default filter: last 30 days (created_from / created_to). Values in YYYY-MM-DD for API. */
function getDefaultFilterLast30Days() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { ...EMPTY_VALUES, created_from: fmt(from), created_to: fmt(to) };
}

const DEFAULT_FILTER_LAST_30_DAYS = getDefaultFilterLast30Days();

export default function LeadListFilterPanel({
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

  const [branchOptions, setBranchOptions] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [localValues, setLocalValues] = useState(() =>
    normalizeLocalValues(values)
  );

  useEffect(() => {
    setLocalValues(normalizeLocalValues(values));
  }, [values]);

  useEffect(() => {
    setLoadingOptions(true);
    Promise.all([
      companyService.listBranches().then((r) => {
        const data = r?.result ?? r?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
      mastersService.getReferenceOptions("inquiry_source.model").then((r) => {
        const data = r?.result ?? r?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    ])
      .then(([branches, sources]) => {
        setBranchOptions(branches);
        setSourceOptions(sources);
      })
      .catch(() => {
        setBranchOptions([]);
        setSourceOptions([]);
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  const handleChange = useCallback((key, value) => {
    setLocalValues((prev) => ({ ...prev, [key]: value ?? "" }));
  }, []);

  const [quickSearch, setQuickSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef(null);

  const handleQuickSearchChange = (val) => {
    setQuickSearch(val);
    setIsSearching(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const nextValues = { ...localValues };

      // Clear previous specific quick search fields
      nextValues.lead_number = "";
      nextValues.customer_name = "";
      nextValues.mobile_number = "";

      // Set the generic search parameter
      nextValues.q = val;

      setLocalValues(nextValues);
      onApply?.(normalizeLocalValues(nextValues));
      setIsSearching(false);
    }, 500); // 500ms debounce
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleApply = useCallback(() => {
    const applied = normalizeLocalValues(localValues);
    onApply?.(applied);
    setOpen(false);
  }, [localValues, onApply, setOpen]);

  const handleClear = useCallback(() => {
    setLocalValues(normalizeLocalValues(EMPTY_VALUES));
    onClear?.();
  }, [onClear]);

  const activeCount = Object.values(values || {}).filter(
    (v) => (Array.isArray(v) ? v.length > 0 : v != null && v !== "")
  ).length;

  const getAppliedFiltersSummary = () => {
    const labels = {
      customer_name: "Name",
      mobile_number: "Mobile",
      campaign_name: "Campaign",
      status: "Status",
      priority: "Priority",
      branch_id: "Branch",
      inquiry_source_id: "Source",
      created_from: "From",
      created_to: "To",
      next_follow_up_from: "FU From",
      next_follow_up_to: "FU To",
      assigned_to: "Assigned",
    };

    return Object.entries(values || {})
      .filter(([key, val]) => (Array.isArray(val) ? val.length > 0 : val != null && val !== ""))
      .map(([key]) => labels[key] || key);
  };

  const appliedSummary = getAppliedFiltersSummary();

  return (
    <Card className="rounded-xl shadow-sm border-slate-200 bg-white mb-2 overflow-visible">
      <div className="flex flex-col sm:flex-row items-center gap-2 px-2.5 py-1.5 h-auto sm:h-12">
        {/* Advanced Filter Toggle */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors rounded-lg border border-slate-200 focus:outline-none shrink-0"
        >
          <span className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-tight">
            <IconFilter size={14} /> Advanced Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1 leading-none bg-green-100 text-green-700 border-green-200">
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

        {/* Applied Filters Chips */}
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

        {/* Integrated Quick Search */}
        <div className="w-full sm:w-80 relative shrink-0">
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? "text-green-500 animate-pulse" : "text-slate-400"}`}>
            {isSearching ? <div className="h-4 w-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin" /> : <IconSearch size={16} />}
          </div>
          <input 
            type="text"
            placeholder="Quick Search (Name/Mobile/Lead #)"
            className="w-full h-10 pl-10 pr-8 bg-white border-2 border-green-200/60 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all placeholder:text-slate-400 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
            value={quickSearch}
            onChange={(e) => handleQuickSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                handleQuickSearchChange(quickSearch); // Trigger immediately
              }
            }}
          />
          {quickSearch && (
            <button 
              onClick={() => handleQuickSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-2.5 py-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 bg-slate-50/30">
          <Input
            name="lead_number"
            label="Lead #"
            placeholder="Search..."
            value={localValues.lead_number}
            onChange={(e) => handleChange("lead_number", e.target.value)}
          />
          <Input
            name="customer_name"
            label="Name"
            placeholder="Lead name"
            value={localValues.customer_name}
            onChange={(e) => handleChange("customer_name", e.target.value)}
          />

          <Input
            name="mobile_number"
            label="Mobile"
            placeholder="Mobile number"
            value={localValues.mobile_number}
            onChange={(e) => handleChange("mobile_number", e.target.value)}
          />

          <Input
            name="campaign_name"
            label="Campaign"
            placeholder="Campaign"
            value={localValues.campaign_name}
            onChange={(e) => handleChange("campaign_name", e.target.value)}
          />

          <MultiSelect
            name="status"
            label="Status"
            placeholder="All statuses"
            options={[
              { value: "new", label: "New" },
              { value: "viewed", label: "Viewed" },
              { value: "follow_up", label: "Follow Up" },
              { value: "converted", label: "Converted" },
              { value: "not_interested", label: "Not Interested" },
              { value: "junk", label: "Junk" },
            ]}
            value={
              Array.isArray(localValues.status)
                ? localValues.status
                : localValues.status
                  ? [localValues.status]
                  : []
            }
            onChange={(e) => handleChange("status", e.target.value)}
          />

          <MultiSelect
            name="priority"
            label="Priority"
            placeholder="All priorities"
            options={[
              { value: "hot", label: "Hot" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
            value={
              Array.isArray(localValues.priority)
                ? localValues.priority
                : localValues.priority
                  ? [localValues.priority]
                  : []
            }
            onChange={(e) => handleChange("priority", e.target.value)}
          />

          <MultiSelect
            name="branch_id"
            label="Branch"
            placeholder="All branches"
            options={branchOptions.map((b) => ({
              value: String(b.id),
              label: b.name ?? b.label ?? b.id,
            }))}
            value={
              Array.isArray(localValues.branch_id)
                ? localValues.branch_id
                : localValues.branch_id
                  ? [localValues.branch_id]
                  : []
            }
            onChange={(e) => handleChange("branch_id", e.target.value)}
            disabled={loadingOptions}
          />

          <MultiSelect
            name="inquiry_source_id"
            label="Source"
            placeholder="All sources"
            options={sourceOptions.map((s) => ({
              value: String(s.id),
              label: s.source_name ?? s.label ?? s.name ?? s.id,
            }))}
            value={
              Array.isArray(localValues.inquiry_source_id)
                ? localValues.inquiry_source_id
                : localValues.inquiry_source_id
                  ? [localValues.inquiry_source_id]
                  : []
            }
            onChange={(e) => handleChange("inquiry_source_id", e.target.value)}
            disabled={loadingOptions}
          />

          <MultiSelect
            name="assigned_to"
            label="Assigned To"
            placeholder="All users"
            options={[]}
            value={
              Array.isArray(localValues.assigned_to)
                ? localValues.assigned_to
                : localValues.assigned_to
                  ? [localValues.assigned_to]
                  : []
            }
            onChange={(e) => handleChange("assigned_to", e.target.value)}
            disabled={loadingOptions}
            searchable
            searchPlaceholder="Search users..."
            asyncLoadOptions={(q) =>
              mastersService
                .getReferenceOptionsSearch("user.model", {
                  q,
                  limit: 20,
                  status_in: "active,inactive",
                })
                .then((res) => {
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

          <DateField
            name="created_from"
            label="Created From"
            value={localValues.created_from}
            onChange={(e) => handleChange("created_from", e.target.value)}
          />

          <DateField
            name="created_to"
            label="Created To"
            value={localValues.created_to}
            onChange={(e) => handleChange("created_to", e.target.value)}
          />

          <DateField
            name="next_follow_up_from"
            label="Next Follow-Up From"
            value={localValues.next_follow_up_from}
            onChange={(e) => handleChange("next_follow_up_from", e.target.value)}
          />

          <DateField
            name="next_follow_up_to"
            label="Next Follow-Up To"
            value={localValues.next_follow_up_to}
            onChange={(e) => handleChange("next_follow_up_to", e.target.value)}
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

export { FILTER_KEYS, EMPTY_VALUES, DEFAULT_FILTER_LAST_30_DAYS, getDefaultFilterLast30Days };

