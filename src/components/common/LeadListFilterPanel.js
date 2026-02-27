"use client";

import { useState, useEffect, useCallback } from "react";
import { IconFilter, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import companyService from "@/services/companyService";
import mastersService from "@/services/mastersService";
import { cn } from "@/lib/utils";
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

  const hasActiveFilters = Object.values(values || {}).some(
    (v) =>
      Array.isArray(v)
        ? v.length > 0
        : v != null && v !== ""
  );

  return (
    <Card className="mb-2 w-full border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-1.5 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-1.5">
          <IconFilter className="size-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold tracking-tight text-foreground m-0">
            Search Option
          </h3>
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] uppercase font-bold rounded">
              Active
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:bg-muted/80"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
          aria-label={open ? "Collapse filter" : "Expand filter"}
        >
          {open ? <IconChevronUp className="size-3.5" /> : <IconChevronDown className="size-3.5" />}
        </Button>
      </div>

      {/* Body */}
      <div
        className={cn(
          "transition-all duration-200 overflow-hidden border-t border-border",
          open ? "block" : "hidden"
        )}
      >
        <CardContent className="p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 xl:gap-2">

            {/* Row 1 */}
            <div className="col-span-1">
              <Input
                name="customer_name"
                label="Name"
                placeholder="Lead name"
                value={localValues.customer_name}
                onChange={(e) => handleChange("customer_name", e.target.value)}
                size="small"
                fullWidth
              />
            </div>
            <div className="col-span-1">
              <Input
                name="mobile_number"
                label="Mobile"
                placeholder="Mobile number"
                value={localValues.mobile_number}
                onChange={(e) => handleChange("mobile_number", e.target.value)}
                size="small"
                fullWidth
              />
            </div>
            <div className="col-span-1">
              <Input
                name="campaign_name"
                label="Campaign"
                placeholder="Campaign"
                value={localValues.campaign_name}
                onChange={(e) => handleChange("campaign_name", e.target.value)}
                size="small"
                fullWidth
              />
            </div>
            <div className="col-span-1">
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
                size="small"
                fullWidth
              />
            </div>
            <div className="col-span-1">
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
                size="small"
                fullWidth
              />
            </div>
            <div className="col-span-1">
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
                size="small"
                fullWidth
                disabled={loadingOptions}
              />
            </div>

            {/* Row 2 */}
            <div className="col-span-1">
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
                onChange={(e) =>
                  handleChange("inquiry_source_id", e.target.value)
                }
                size="small"
                fullWidth
                disabled={loadingOptions}
              />
            </div>
            <div className="col-span-1">
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
                size="small"
                fullWidth
                disabled={loadingOptions}
              />
            </div>
            <div className="col-span-1">
              <DateField
                name="created_from"
                label="Created From"
                value={localValues.created_from}
                onChange={(e) => handleChange("created_from", e.target.value)}
                size="small"
                fullWidth
              />
            </div>
            <div className="col-span-1">
              <DateField
                name="created_to"
                label="Created To"
                value={localValues.created_to}
                onChange={(e) => handleChange("created_to", e.target.value)}
                size="small"
                fullWidth
              />
            </div>
            <div className="col-span-1">
              <DateField
                name="next_follow_up_from"
                label="Next Follow-Up From"
                value={localValues.next_follow_up_from}
                onChange={(e) =>
                  handleChange("next_follow_up_from", e.target.value)
                }
                size="small"
                fullWidth
              />
            </div>
            <div className="col-span-1">
              <DateField
                name="next_follow_up_to"
                label="Next Follow-Up To"
                value={localValues.next_follow_up_to}
                onChange={(e) =>
                  handleChange("next_follow_up_to", e.target.value)
                }
                size="small"
                fullWidth
              />
            </div>

            {/* Buttons */}
            <div className="col-span-full flex items-end justify-end mt-2">
              <div className="flex gap-2 w-full max-w-md justify-end">
                <Button size="sm" variant="outline" onClick={handleClear} className="w-full">
                  Clear
                </Button>
                <Button size="sm" variant="default" onClick={handleApply} className="bg-green-600 hover:bg-green-700 text-white w-full">
                  Apply
                </Button>
              </div>
            </div>

          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export { FILTER_KEYS, EMPTY_VALUES, DEFAULT_FILTER_LAST_30_DAYS, getDefaultFilterLast30Days };
