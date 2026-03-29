"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    IconFilter, 
    IconChevronDown, 
    IconChevronUp, 
    IconSearch, 
    IconUser, 
    IconBuilding, 
    IconSourceCode, 
    IconLayoutGrid,
    IconX
} from "@tabler/icons-react";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsSearch } from "@/services/mastersService";

export const INQUIRY_STATUS_OPTIONS = [
    { value: "New", label: "New" },
    { value: "Connected", label: "Connected" },
    { value: "Site Visit Done", label: "Site Visit Done" },
    { value: "Quotation", label: "Quotation" },
    { value: "Under Discussion", label: "Under Discussion" },
    { value: "Converted", label: "Converted" },
];

const FILTER_KEYS = [
    "q", "inquiry_number", "status", "customer_name", "mobile_number", "inquiry_source", "reference_from",
    "branch_name", "handled_by", "inquiry_by", "channel_partner", "project_scheme",
    "capacity", "city_name", "state_name", "discom_name",
    "date_of_inquiry_from", "date_of_inquiry_to", "created_at_from", "created_at_to",
];

const EMPTY_VALUES = Object.fromEntries(FILTER_KEYS.map((k) => [k, ""]));

export default function InquiryFilterPanel({
    open: controlledOpen, onToggle, values = {}, onApply, onClear, defaultOpen = false,
}) {
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = useCallback(
        (next) => { if (controlledOpen === undefined) setInternalOpen(next); else onToggle?.(next); },
        [controlledOpen, onToggle]
    );

    const [localValues, setLocalValues] = useState(() => ({ ...EMPTY_VALUES, ...values }));

    useEffect(() => { setLocalValues((prev) => ({ ...EMPTY_VALUES, ...values })); }, [values]);

    const handleChange = useCallback((key, value) => { setLocalValues((p) => ({ ...p, [key]: value ?? "" })); }, []);
    const handleApply = useCallback(() => { onApply?.(localValues); }, [localValues, onApply]);
    const handleClear = useCallback(() => { setLocalValues({ ...EMPTY_VALUES }); onClear?.(); }, [onClear]);

    const activeCount = Object.values(values || {}).filter((v) => v != null && v !== "").length;

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

            // Clear previous specific quick search fields to avoid "AND" logic conflicts
            nextValues.inquiry_number = "";
            nextValues.customer_name = "";
            nextValues.mobile_number = "";
            nextValues.reference_from = "";
            
            // Set the generic search parameter
            nextValues.q = val;

            setLocalValues(nextValues);
            onApply?.(nextValues);
            setIsSearching(false);
        }, 500); // 500ms debounce
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, []);

    const quickFilterOptions = [
        { key: "status", label: "Stage", icon: <IconLayoutGrid size={16} />, options: INQUIRY_STATUS_OPTIONS },
        { key: "inquiry_source", label: "Source", icon: <IconSourceCode size={16} />, model: "inquiry_source.model" },
        { key: "branch_name", label: "Branch", icon: <IconBuilding size={16} />, model: "company_branch.model" },
        { key: "handled_by", label: "User", icon: <IconUser size={16} />, model: "user.model" },
    ];

    const getOptionLabel = (opt) => opt?.label ?? opt?.name ?? opt?.source_name ?? (opt?.id != null ? String(opt.id) : "");

    const getAppliedFiltersSummary = () => {
        const labels = {
            status: "Stage",
            customer_name: "Name",
            mobile_number: "Mobile",
            inquiry_source: "Source",
            reference_from: "Ref",
            branch_name: "Branch",
            handled_by: "User",
            inquiry_by: "Inquiry By",
            channel_partner: "Partner",
            project_scheme: "Scheme",
            capacity: "Capacity",
            city_name: "City",
            state_name: "State",
            discom_name: "Discom",
            date_of_inquiry_from: "Date From",
            date_of_inquiry_to: "Date To",
            created_at_from: "Created From",
            created_at_to: "Created To",
        };

        return Object.entries(values || {})
            .filter(([key, val]) => val != null && val !== "")
            .map(([key]) => labels[key] || key);
    };

    const appliedSummary = getAppliedFiltersSummary();

    return (
        <Card className="rounded-xl shadow-sm border-slate-200 bg-white mb-2 overflow-visible">
            <div className="flex flex-col sm:flex-row items-center gap-2 px-2.5 py-1.5 h-auto sm:h-12">
                {/* Advanced Filter Toggle (Button Style) */}
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors rounded-lg border border-slate-200 focus:outline-none shrink-0"
                >
                    <span className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-tight">
                        <IconFilter size={14} /> Advanced Filters
                        {activeCount > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 leading-none bg-green-100 text-green-700 border-green-200">{activeCount}</Badge>}
                    </span>
                    {open ? <IconChevronUp size={14} className="text-slate-400" /> : <IconChevronDown size={14} className="text-slate-400" />}
                </button>

                {/* Applied Filters Chips (Horizontal Scroll on small) */}
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
                        placeholder="Quick Search (Name/Mobile/Inquiry #)"
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
                    <Input name="inquiry_number" label="Inquiry #" placeholder="Search..." value={localValues.inquiry_number} onChange={(e) => handleChange("inquiry_number", e.target.value)} />
                    <Select name="status" label="Stage" value={localValues.status} onChange={(e) => handleChange("status", e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {INQUIRY_STATUS_OPTIONS.map((opt) => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                    </Select>
                    <Input name="customer_name" label="Customer Name" placeholder="Search..." value={localValues.customer_name} onChange={(e) => handleChange("customer_name", e.target.value)} />
                    <Input name="mobile_number" label="Mobile Number" placeholder="Search..." value={localValues.mobile_number} onChange={(e) => handleChange("mobile_number", e.target.value)} />

                    <AutocompleteField
                        usePortal={true}
                        name="inquiry_source"
                        label="Inquiry Source"
                        asyncLoadOptions={(q) => getReferenceOptionsSearch("inquiry_source.model", { q, limit: 20 })}
                        referenceModel="inquiry_source.model"
                        getOptionLabel={getOptionLabel}
                        value={localValues.inquiry_source ? { name: localValues.inquiry_source, source_name: localValues.inquiry_source } : null}
                        onChange={(e, newValue) => handleChange("inquiry_source", newValue ? getOptionLabel(newValue) : "")}
                        placeholder="Select Source..."
                    />

                    <Input name="reference_from" label="Reference" placeholder="Search..." value={localValues.reference_from} onChange={(e) => handleChange("reference_from", e.target.value)} />

                    <AutocompleteField
                        usePortal={true}
                        name="branch_name"
                        label="Branch"
                        asyncLoadOptions={(q) => getReferenceOptionsSearch("company_branch.model", { q, limit: 20 })}
                        referenceModel="company_branch.model"
                        getOptionLabel={getOptionLabel}
                        value={localValues.branch_name ? { name: localValues.branch_name } : null}
                        onChange={(e, newValue) => handleChange("branch_name", newValue ? getOptionLabel(newValue) : "")}
                        placeholder="Select Branch..."
                    />

                    <AutocompleteField
                        usePortal={true}
                        name="handled_by"
                        label="Handled By"
                        asyncLoadOptions={(q) => getReferenceOptionsSearch("user.model", { q, limit: 20, status_in: "active,inactive" })}
                        referenceModel="user.model"
                        getOptionLabel={getOptionLabel}
                        value={localValues.handled_by ? { name: localValues.handled_by } : null}
                        onChange={(e, newValue) => handleChange("handled_by", newValue ? getOptionLabel(newValue) : "")}
                        placeholder="Select User..."
                    />

                    <AutocompleteField
                        usePortal={true}
                        name="inquiry_by"
                        label="Inquiry By"
                        asyncLoadOptions={(q) => getReferenceOptionsSearch("user.model", { q, limit: 20, status_in: "active,inactive" })}
                        referenceModel="user.model"
                        getOptionLabel={getOptionLabel}
                        value={localValues.inquiry_by ? { name: localValues.inquiry_by } : null}
                        onChange={(e, newValue) => handleChange("inquiry_by", newValue ? getOptionLabel(newValue) : "")}
                        placeholder="Select User..."
                    />

                    <AutocompleteField
                        usePortal={true}
                        name="channel_partner"
                        label="Channel Partner"
                        asyncLoadOptions={(q) => getReferenceOptionsSearch("user.model", { q, limit: 20, status_in: "active,inactive" })}
                        referenceModel="user.model"
                        getOptionLabel={getOptionLabel}
                        value={localValues.channel_partner ? { name: localValues.channel_partner } : null}
                        onChange={(e, newValue) => handleChange("channel_partner", newValue ? getOptionLabel(newValue) : "")}
                        placeholder="Select User..."
                    />

                    <AutocompleteField
                        usePortal={true}
                        name="project_scheme"
                        label="Project Scheme"
                        asyncLoadOptions={(q) => getReferenceOptionsSearch("project_scheme.model", { q, limit: 20 })}
                        referenceModel="project_scheme.model"
                        getOptionLabel={getOptionLabel}
                        value={localValues.project_scheme ? { name: localValues.project_scheme } : null}
                        onChange={(e, newValue) => handleChange("project_scheme", newValue ? getOptionLabel(newValue) : "")}
                        placeholder="Select Scheme..."
                    />
                    <Input name="capacity" label="Capacity (kW)" placeholder="e.g. 3" value={localValues.capacity} onChange={(e) => handleChange("capacity", e.target.value)} />

                    <AutocompleteField
                        usePortal={true}
                        name="city_name"
                        label="City"
                        asyncLoadOptions={(q) => getReferenceOptionsSearch("city.model", { q, limit: 20 })}
                        referenceModel="city.model"
                        getOptionLabel={getOptionLabel}
                        value={localValues.city_name ? { name: localValues.city_name } : null}
                        onChange={(e, newValue) => handleChange("city_name", newValue ? getOptionLabel(newValue) : "")}
                        placeholder="Select City..."
                    />

                    <AutocompleteField
                        usePortal={true}
                        name="state_name"
                        label="State"
                        asyncLoadOptions={(q) => getReferenceOptionsSearch("state.model", { q, limit: 20 })}
                        referenceModel="state.model"
                        getOptionLabel={getOptionLabel}
                        value={localValues.state_name ? { name: localValues.state_name } : null}
                        onChange={(e, newValue) => handleChange("state_name", newValue ? getOptionLabel(newValue) : "")}
                        placeholder="Select State..."
                    />

                    <AutocompleteField
                        usePortal={true}
                        name="discom_name"
                        label="Discom"
                        asyncLoadOptions={(q) => getReferenceOptionsSearch("discom.model", { q, limit: 20 })}
                        referenceModel="discom.model"
                        getOptionLabel={getOptionLabel}
                        value={localValues.discom_name ? { name: localValues.discom_name } : null}
                        onChange={(e, newValue) => handleChange("discom_name", newValue ? getOptionLabel(newValue) : "")}
                        placeholder="Select Discom..."
                    />

                    <DateField name="date_of_inquiry_from" label="Inquiry Date From" value={localValues.date_of_inquiry_from} onChange={(e) => handleChange("date_of_inquiry_from", e.target.value)} />
                    <DateField name="date_of_inquiry_to" label="Inquiry Date To" value={localValues.date_of_inquiry_to} onChange={(e) => handleChange("date_of_inquiry_to", e.target.value)} />
                    <DateField name="created_at_from" label="Created From" value={localValues.created_at_from} onChange={(e) => handleChange("created_at_from", e.target.value)} />
                    <DateField name="created_at_to" label="Created To" value={localValues.created_at_to} onChange={(e) => handleChange("created_at_to", e.target.value)} />

                    <div className="col-span-1 sm:col-span-2 lg:col-span-6 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <Button variant="outline" size="sm" onClick={handleClear} className="h-8 px-3 text-xs w-20">Clear</Button>
                        <Button size="sm" onClick={handleApply} className="h-8 px-3 text-xs w-20">Apply</Button>
                    </div>
                </div>
            )}
        </Card>
    );
}

export { FILTER_KEYS as INQUIRY_FILTER_KEYS, EMPTY_VALUES };
