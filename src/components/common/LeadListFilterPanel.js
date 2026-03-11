"use client";

import { useState, useEffect, useCallback } from "react";
import { IconFilter, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Input from "@/components/common/Input";
import DateField from "@/components/common/DateField";
import companyService from "@/services/companyService";
import mastersService from "@/services/mastersService";
import MultiSelect from "@/components/common/MultiSelect";

const FILTER_KEYS = [
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
  const [userOptions, setUserOptions] = useState([]);
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
      mastersService.getReferenceOptions("user.model").then((r) => {
        const data = r?.result ?? r?.data ?? r;
        return Array.isArray(data) ? data : [];
      }),
    ])
      .then(([branches, sources, users]) => {
        setBranchOptions(branches);
        setSourceOptions(sources);
        setUserOptions(users);
      })
      .catch(() => {
        setBranchOptions([]);
        setSourceOptions([]);
        setUserOptions([]);
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  const handleChange = useCallback((key, value) => {
    setLocalValues((prev) => ({ ...prev, [key]: value ?? "" }));
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
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-50 transition-colors rounded-xl"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-1.5">
            <IconFilter size={14} /> Advanced Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1 leading-none">
                {activeCount}
              </Badge>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1 ml-2 border-l border-slate-200 pl-2 overflow-hidden">
            {appliedSummary.map((label) => (
              <span
                key={label}
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] bg-green-50 text-green-700 border border-green-200 whitespace-nowrap"
              >
                {label}
              </span>
            ))}
          </div>
        </span>
        {open ? (
          <IconChevronUp size={14} className="text-slate-400" />
        ) : (
          <IconChevronDown size={14} className="text-slate-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-2.5 py-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
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
              { value: "contacted", label: "Contacted" },
              { value: "follow_up", label: "Follow Up" },
              { value: "interested", label: "Interested" },
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
            options={userOptions.map((u) => ({
              value: String(u.id),
              label: u.name ?? u.label ?? `User #${u.id}`,
            }))}
            value={
              Array.isArray(localValues.assigned_to)
                ? localValues.assigned_to
                : localValues.assigned_to
                  ? [localValues.assigned_to]
                  : []
            }
            onChange={(e) => handleChange("assigned_to", e.target.value)}
            disabled={loadingOptions}
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

