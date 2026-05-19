"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import {
  IconBuildingBank,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconCalendar,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import CommissionLedgerReportView from "./components/CommissionLedgerReportView";
import { masterAutocompleteValue, referenceAutocompleteDisplay } from "../utils/filterChips";

const PERMISSION_MODULE_KEY = "/commission-settlements/ledger-report";

function findModuleRecursive(list, matchPredicate) {
  for (const mod of list || []) {
    if (matchPredicate(mod)) return mod;
    if (mod.submodules?.length) {
      const found = findModuleRecursive(mod.submodules, matchPredicate);
      if (found) return found;
    }
  }
  return null;
}

function findModuleByPermissionKey(modules, moduleKey) {
  const matchPredicate = (m) =>
    m &&
    (m.key === moduleKey ||
      m.route === moduleKey ||
      m.key === moduleKey.replace(/[-\s]/g, "_") ||
      m.key === moduleKey.replace(/\//g, "_"));
  return findModuleRecursive(modules, matchPredicate);
}

const INITIAL_FILTERS = {
  beneficiary_user_id: null,
  beneficiary_label: "",
  date_from: "",
  date_to: "",
  role: "",
  settlement_status: "",
  include_unsettled: true,
};

const DATE_PRESETS = [
  {
    label: "This Month",
    fn: () => {
      const n = new Date();
      return {
        date_from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0],
        date_to: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0],
      };
    },
  },
  {
    label: "Last 3M",
    fn: () => {
      const n = new Date();
      const p = new Date(n);
      p.setMonth(n.getMonth() - 3);
      return { date_from: p.toISOString().split("T")[0], date_to: n.toISOString().split("T")[0] };
    },
  },
  {
    label: "This FY",
    fn: () => {
      const n = new Date();
      const fyStartMonth = 3;
      const year = n.getMonth() >= fyStartMonth ? n.getFullYear() : n.getFullYear() - 1;
      return {
        date_from: `${year}-04-01`,
        date_to: n.toISOString().split("T")[0],
      };
    },
  },
];

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "handled_by", label: "Handled by" },
  { value: "channel_partner", label: "Channel partner" },
];

const STATUS_CHIPS = [
  { value: "in_settlement", label: "In settlement" },
  { value: "approved", label: "Approved" },
  { value: "settled", label: "Settled" },
];

function countActive(f) {
  let n = 0;
  if (f.beneficiary_user_id) n += 1;
  if (f.date_from || f.date_to) n += 1;
  if (f.role) n += 1;
  if (f.settlement_status) n += 1;
  if (f.include_unsettled === false) n += 1;
  return n;
}

export default function CommissionLedgerReportPage() {
  const { user, fetchPermissionForModule } = useAuth();
  const permModule = useMemo(
    () => findModuleByPermissionKey(user?.modules || [], PERMISSION_MODULE_KEY),
    [user?.modules]
  );

  useEffect(() => {
    if (permModule?.id) fetchPermissionForModule(permModule.id);
  }, [permModule?.id, fetchPermissionForModule]);

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [activePreset, setActivePreset] = useState(null);
  const [selectedStatuses, setSelectedStatuses] = useState([]);

  const fc = (key, val) => setFilters((p) => ({ ...p, [key]: val }));
  const activeCount = countActive(appliedFilters);

  const toggleStatus = (value) => {
    const next = selectedStatuses.includes(value)
      ? selectedStatuses.filter((s) => s !== value)
      : [...selectedStatuses, value];
    setSelectedStatuses(next);
    fc("settlement_status", next.length ? next.join(",") : "");
  };

  const handleApply = () => {
    setAppliedFilters({ ...filters });
    setActivePreset(null);
    setRefreshKey((k) => k + 1);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setSelectedStatuses([]);
    setActivePreset(null);
    setRefreshKey((k) => k + 1);
  };

  const handlePreset = (preset) => {
    const dates = preset.fn();
    const next = { ...filters, ...dates };
    setFilters(next);
    setAppliedFilters(next);
    setActivePreset(preset.label);
    setRefreshKey((k) => k + 1);
  };

  const apiFilters = useMemo(
    () => ({
      beneficiary_user_id: appliedFilters.beneficiary_user_id,
      date_from: appliedFilters.date_from || undefined,
      date_to: appliedFilters.date_to || undefined,
      role: appliedFilters.role || undefined,
      settlement_status: appliedFilters.settlement_status || undefined,
      include_unsettled: appliedFilters.include_unsettled !== false,
    }),
    [appliedFilters]
  );

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-slate-50 font-sans text-slate-900 print:bg-white">
        <style jsx global>{`
          @media print {
            nav,
            aside,
            header,
            .print\\:hidden {
              display: none !important;
            }
          }
        `}</style>
        <div className="mx-auto max-w-[1440px] space-y-2 px-3 py-2 pb-6 print:max-w-none print:px-2">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <IconBuildingBank size={16} className="text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight tracking-tight">
                  Commission ledger report
                </h1>
                <p className="text-[11px] text-slate-500">
                  Bank statement · Credits, settlements, running balance
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <IconCalendar size={11} /> Period:
              </span>
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={[
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all",
                    activePreset === p.label
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-slate-200 bg-white text-slate-500 hover:border-primary hover:text-primary",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
              {activeCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {activeCount} active
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={handleReset} className="h-7 gap-1 px-2 text-xs">
                <IconRefresh size={11} /> Reset
              </Button>
              <Button size="sm" onClick={handleApply} className="h-7 gap-1 px-2 text-xs">
                <IconFilter size={11} /> Apply
              </Button>
            </div>
          </div>

          <Card className="overflow-visible rounded-xl border-slate-200 bg-white shadow-sm print:hidden">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-slate-50"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <IconFilter size={12} /> Filters
                {activeCount > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {activeCount}
                  </Badge>
                )}
              </span>
              {filtersOpen ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
            </button>
            {filtersOpen && (
              <div className="space-y-2 border-t border-slate-100 px-3 py-2.5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  <AutocompleteField
                    usePortal
                    name="beneficiary_user_id"
                    label="Beneficiary *"
                    asyncLoadOptions={(q) =>
                      getReferenceOptionsSearch("user.model", { q, limit: 20, status: "active" })
                    }
                    referenceModel="user.model"
                    getOptionLabel={(o) => o?.name ?? o?.email ?? ""}
                    value={masterAutocompleteValue(
                      filters.beneficiary_user_id,
                      filters.beneficiary_label
                    )}
                    onChange={(e, v) => {
                      fc("beneficiary_user_id", v?.id ?? null);
                      fc("beneficiary_label", referenceAutocompleteDisplay(v));
                    }}
                    placeholder="Search user…"
                  />
                  <DateField
                    label="From"
                    name="date_from"
                    value={filters.date_from || ""}
                    onChange={(e) => fc("date_from", e.target.value || "")}
                  />
                  <DateField
                    label="To"
                    name="date_to"
                    value={filters.date_to || ""}
                    onChange={(e) => fc("date_to", e.target.value || "")}
                  />
                  <AutocompleteField
                    usePortal
                    name="role"
                    label="Role"
                    options={ROLE_OPTIONS}
                    getOptionLabel={(o) => o?.label ?? ""}
                    value={ROLE_OPTIONS.find((o) => o.value === filters.role) ?? ROLE_OPTIONS[0]}
                    onChange={(e, v) => fc("role", v?.value ?? "")}
                    clearable={false}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-[10px] text-slate-500 shrink-0">Line status:</Label>
                  {STATUS_CHIPS.map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => toggleStatus(chip.value)}
                      className={[
                        "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all",
                        selectedStatuses.includes(chip.value)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                      ].join(" ")}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-600">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border-slate-300"
                    checked={filters.include_unsettled !== false}
                    onChange={(e) => fc("include_unsettled", e.target.checked)}
                  />
                  Include in-settlement & approved transactions
                </label>
              </div>
            )}
          </Card>

          <CommissionLedgerReportView filters={apiFilters} refreshKey={refreshKey} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
