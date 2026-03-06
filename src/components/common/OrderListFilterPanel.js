"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconFilter, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import companyService from "@/services/companyService";
import mastersService from "@/services/mastersService";

const FILTER_KEYS = [
  "status", "customer_name", "consumer_no", "application_no", "reference_from", "mobile_number",
  "branch_id", "inquiry_source_id", "handled_by", "order_number", "order_date_from", "order_date_to", "current_stage_key",
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

const EMPTY_VALUES = Object.fromEntries(FILTER_KEYS.map((k) => [k, ""]));

export default function OrderListFilterPanel({
  open: controlledOpen, onToggle, values = {}, onApply, onClear, defaultOpen = false,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (next) => { if (controlledOpen === undefined) setInternalOpen(next); else onToggle?.(next); },
    [controlledOpen, onToggle]
  );

  const [branchOptions, setBranchOptions] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [localValues, setLocalValues] = useState(() => ({ ...EMPTY_VALUES, ...values }));

  useEffect(() => { setLocalValues((prev) => ({ ...EMPTY_VALUES, ...values })); }, [values]);

  useEffect(() => {
    setLoadingOptions(true);
    Promise.all([
      companyService.listBranches().then((r) => Array.isArray(r?.result ?? r?.data ?? r) ? (r?.result ?? r?.data ?? r) : []),
      mastersService.getReferenceOptions("inquiry_source.model").then((r) => Array.isArray(r?.result ?? r?.data ?? r) ? (r?.result ?? r?.data ?? r) : []),
      mastersService.getReferenceOptions("user.model").then((r) => Array.isArray(r?.result ?? r?.data ?? r) ? (r?.result ?? r?.data ?? r) : []),
    ]).then(([branches, sources, users]) => {
      setBranchOptions(branches); setSourceOptions(sources); setUserOptions(users);
    }).catch(() => { }).finally(() => setLoadingOptions(false));
  }, []);

  const handleChange = useCallback((key, value) => { setLocalValues((p) => ({ ...p, [key]: value ?? "" })); }, []);
  const handleApply = useCallback(() => { onApply?.(localValues); }, [localValues, onApply]);
  const handleClear = useCallback(() => { setLocalValues({ ...EMPTY_VALUES }); onClear?.(); }, [onClear]);

  const activeCount = Object.values(values || {}).filter((v) => v != null && v !== "").length;

  return (
    <Card className="rounded-xl shadow-sm border-slate-200 bg-white mb-2 overflow-visible">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-50 transition-colors rounded-xl"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <IconFilter size={14} /> Advanced Filters
          {activeCount > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 leading-none">{activeCount}</Badge>}
        </span>
        {open ? <IconChevronUp size={14} className="text-slate-400" /> : <IconChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 px-2.5 py-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <Select name="status" label="Status" value={localValues.status} onChange={(e) => handleChange("status", e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
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
          <Select name="handled_by" label="Handled By" value={localValues.handled_by} onChange={(e) => handleChange("handled_by", e.target.value)} disabled={loadingOptions}>
            <MenuItem value="">All Users</MenuItem>
            {userOptions.map((u) => <MenuItem key={u.id} value={String(u.id)}>{u.name ?? u.label ?? `User #${u.id}`}</MenuItem>)}
          </Select>
          <Select name="current_stage_key" label="Order Stage" value={localValues.current_stage_key} onChange={(e) => handleChange("current_stage_key", e.target.value)}>
            <MenuItem value="">All Stages</MenuItem>
            {ORDER_STAGE_OPTIONS.map((opt) => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
          </Select>
          <Input name="order_number" label="Order Number" placeholder="Search..." value={localValues.order_number} onChange={(e) => handleChange("order_number", e.target.value)} />
          <DateField name="order_date_from" label="Order Date From" value={localValues.order_date_from} onChange={(e) => handleChange("order_date_from", e.target.value)} />
          <DateField name="order_date_to" label="Order Date To" value={localValues.order_date_to} onChange={(e) => handleChange("order_date_to", e.target.value)} />

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
