"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import {
  IconCurrencyRupee,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconCalendar,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import Input from "@/components/common/Input";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import SettledCommissionHistoryView from "./components/SettledCommissionHistoryView";
import {
  buildFilterChips,
  countActiveFilterFields,
  clearFilterField,
  masterAutocompleteValue,
  referenceAutocompleteDisplay,
} from "../utils/filterChips";

const PERMISSION_MODULE_KEY = "/commission-settlements/history";

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
  approved_from: "",
  approved_to: "",
  paid_from: "",
  paid_to: "",
  accrued_from: "",
  accrued_to: "",
  submitted_from: "",
  submitted_to: "",
  branch_id: null,
  branch_label: "",
  beneficiary_user_id: null,
  beneficiary_label: "",
  order_type_id: null,
  order_type_label: "",
  project_scheme_id: null,
  project_scheme_label: "",
  submitted_by: null,
  submitted_by_label: "",
  approved_by: null,
  approved_by_label: "",
  order_number: "",
  settlement_number: "",
  payout_number: "",
  bank_reference: "",
  role: "",
  min_amount: "",
  max_amount: "",
};

const DATE_PRESETS = [
  {
    label: "This Month",
    fn: () => {
      const n = new Date();
      return {
        approved_from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0],
        approved_to: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0],
      };
    },
  },
  {
    label: "Last 3M",
    fn: () => {
      const n = new Date();
      const p = new Date(n);
      p.setMonth(n.getMonth() - 3);
      return { approved_from: p.toISOString().split("T")[0], approved_to: n.toISOString().split("T")[0] };
    },
  },
  {
    label: "This Year",
    fn: () => {
      const n = new Date();
      return {
        approved_from: new Date(n.getFullYear(), 0, 1).toISOString().split("T")[0],
        approved_to: new Date(n.getFullYear(), 11, 31).toISOString().split("T")[0],
      };
    },
  },
];

const ROLE_FILTER_OPTIONS = [
  { value: "handled_by", label: "Handled by" },
  { value: "channel_partner", label: "Channel partner" },
  { value: "fabricator", label: "Fabricator" },
  { value: "installer", label: "Installer" },
  { value: "fabricator_installer", label: "Fabricator & installer" },
];

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "handled_by", label: "Handled by" },
  { value: "channel_partner", label: "Channel partner" },
];

const FILTER_LABELS = {
  approved_from: "Approved from",
  approved_to: "Approved to",
  paid_from: "Payout from",
  paid_to: "Payout to",
  payout_number: "Payout #",
  bank_reference: "UTR / Ref",
  accrued_from: "Accrued from",
  accrued_to: "Accrued to",
  branch_id: "Branch",
  beneficiary_user_id: "Beneficiary",
  order_type_id: "Order type",
  project_scheme_id: "Scheme",
  order_number: "Order #",
  settlement_number: "Settlement #",
  role: "Role",
  submitted_from: "Submitted from",
  submitted_to: "Submitted to",
  submitted_by: "Submitted by",
  approved_by: "Approved by",
};

function getChips(filters) {
  return buildFilterChips(filters, {
    filterLabels: FILTER_LABELS,
    enumResolvers: {
      role: (v) => ROLE_OPTIONS.find((o) => o.value === v)?.label || v,
    },
  });
}

export default function CommissionSettledHistoryPage() {
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

  const fc = (key, val) => setFilters((p) => ({ ...p, [key]: val }));
  const activeCount = countActiveFilterFields(appliedFilters);
  const chips = getChips(appliedFilters);

  const handleApply = () => {
    setAppliedFilters({ ...filters });
    setActivePreset(null);
    setRefreshKey((k) => k + 1);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setActivePreset(null);
    setRefreshKey((k) => k + 1);
  };

  const handlePreset = (preset) => {
    const dates = preset.fn();
    const next = { ...INITIAL_FILTERS, ...dates };
    setFilters(next);
    setAppliedFilters(next);
    setActivePreset(preset.label);
    setRefreshKey((k) => k + 1);
  };

  const removeChip = (key) => {
    const next = clearFilterField(appliedFilters, key, INITIAL_FILTERS);
    setFilters(next);
    setAppliedFilters(next);
    setRefreshKey((k) => k + 1);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-full bg-slate-50 font-sans text-slate-900">
        <div className="mx-auto max-w-[1440px] space-y-2.5 px-3 py-3 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/10 p-1.5">
                <IconCurrencyRupee size={16} className="text-emerald-600" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight tracking-tight">Settled commission history</h1>
                <p className="text-[11px] text-slate-500">Settled (paid) commissions only · Dashboard · Export</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <IconCalendar size={11} /> Approved:
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

          <Card className="overflow-visible rounded-xl border-slate-200 bg-white shadow-sm">
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
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-3 py-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                <DateField
                  label="Approved from"
                  name="approved_from"
                  value={filters.approved_from || ""}
                  onChange={(e) => fc("approved_from", e.target.value || "")}
                />
                <DateField
                  label="Approved to"
                  name="approved_to"
                  value={filters.approved_to || ""}
                  onChange={(e) => fc("approved_to", e.target.value || "")}
                />
                <DateField
                  label="Payout from"
                  name="paid_from"
                  value={filters.paid_from || ""}
                  onChange={(e) => fc("paid_from", e.target.value || "")}
                />
                <DateField
                  label="Payout to"
                  name="paid_to"
                  value={filters.paid_to || ""}
                  onChange={(e) => fc("paid_to", e.target.value || "")}
                />
                <DateField
                  label="Accrued from"
                  name="accrued_from"
                  value={filters.accrued_from || ""}
                  onChange={(e) => fc("accrued_from", e.target.value || "")}
                />
                <DateField
                  label="Accrued to"
                  name="accrued_to"
                  value={filters.accrued_to || ""}
                  onChange={(e) => fc("accrued_to", e.target.value || "")}
                />
                <AutocompleteField
                  usePortal
                  name="beneficiary_user_id"
                  label="Beneficiary"
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
                <AutocompleteField
                  usePortal
                  name="branch_id"
                  label="Branch"
                  asyncLoadOptions={(q) => getReferenceOptionsSearch("company_branch.model", { q, limit: 20 })}
                  referenceModel="company_branch.model"
                  getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                  value={masterAutocompleteValue(filters.branch_id, filters.branch_label)}
                  onChange={(e, v) => {
                    fc("branch_id", v?.id ?? null);
                    fc("branch_label", referenceAutocompleteDisplay(v));
                  }}
                  placeholder="Branch…"
                />
                <AutocompleteField
                  usePortal
                  name="order_type_id"
                  label="Order type"
                  asyncLoadOptions={(q) => getReferenceOptionsSearch("order_type.model", { q, limit: 20 })}
                  referenceModel="order_type.model"
                  getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                  value={masterAutocompleteValue(filters.order_type_id, filters.order_type_label)}
                  onChange={(e, v) => {
                    fc("order_type_id", v?.id ?? null);
                    fc("order_type_label", referenceAutocompleteDisplay(v));
                  }}
                  placeholder="Type…"
                />
                <AutocompleteField
                  usePortal
                  name="project_scheme_id"
                  label="Scheme"
                  asyncLoadOptions={(q) => getReferenceOptionsSearch("project_scheme.model", { q, limit: 20 })}
                  referenceModel="project_scheme.model"
                  getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
                  value={masterAutocompleteValue(
                    filters.project_scheme_id,
                    filters.project_scheme_label
                  )}
                  onChange={(e, v) => {
                    fc("project_scheme_id", v?.id ?? null);
                    fc("project_scheme_label", referenceAutocompleteDisplay(v));
                  }}
                  placeholder="Scheme…"
                />
                <DateField
                  label="Submitted from"
                  name="submitted_from"
                  value={filters.submitted_from || ""}
                  onChange={(e) => fc("submitted_from", e.target.value || "")}
                />
                <DateField
                  label="Submitted to"
                  name="submitted_to"
                  value={filters.submitted_to || ""}
                  onChange={(e) => fc("submitted_to", e.target.value || "")}
                />
                <AutocompleteField
                  usePortal
                  name="submitted_by"
                  label="Submitted by"
                  asyncLoadOptions={(q) =>
                    getReferenceOptionsSearch("user.model", { q, limit: 20, status: "active" })
                  }
                  referenceModel="user.model"
                  getOptionLabel={(o) => o?.name ?? o?.email ?? ""}
                  value={masterAutocompleteValue(filters.submitted_by, filters.submitted_by_label)}
                  onChange={(e, v) => {
                    fc("submitted_by", v?.id ?? null);
                    fc("submitted_by_label", referenceAutocompleteDisplay(v));
                  }}
                  placeholder="Submitted by…"
                />
                <AutocompleteField
                  usePortal
                  name="approved_by"
                  label="Approved by"
                  asyncLoadOptions={(q) =>
                    getReferenceOptionsSearch("user.model", { q, limit: 20, status: "active" })
                  }
                  referenceModel="user.model"
                  getOptionLabel={(o) => o?.name ?? o?.email ?? ""}
                  value={masterAutocompleteValue(filters.approved_by, filters.approved_by_label)}
                  onChange={(e, v) => {
                    fc("approved_by", v?.id ?? null);
                    fc("approved_by_label", referenceAutocompleteDisplay(v));
                  }}
                  placeholder="Approved by…"
                />
                <AutocompleteField
                  usePortal
                  name="role"
                  label="Role"
                  options={ROLE_FILTER_OPTIONS}
                  getOptionLabel={(o) => o?.label ?? ""}
                  value={
                    filters.role
                      ? ROLE_FILTER_OPTIONS.find((o) => o.value === filters.role) ?? null
                      : null
                  }
                  onChange={(e, v) => fc("role", v?.value ?? "")}
                  clearable
                  placeholder="All roles"
                />
                <Input
                  name="order_number"
                  label="Order #"
                  value={filters.order_number || ""}
                  onChange={(e) => fc("order_number", e.target.value || "")}
                />
                <Input
                  name="settlement_number"
                  label="Settlement #"
                  value={filters.settlement_number || ""}
                  onChange={(e) => fc("settlement_number", e.target.value || "")}
                />
                <Input
                  name="payout_number"
                  label="Payout #"
                  value={filters.payout_number || ""}
                  onChange={(e) => fc("payout_number", e.target.value || "")}
                />
                <Input
                  name="bank_reference"
                  label="UTR / Ref"
                  value={filters.bank_reference || ""}
                  onChange={(e) => fc("bank_reference", e.target.value || "")}
                />
                <Input
                  name="min_amount"
                  label="Min amount"
                  value={filters.min_amount || ""}
                  onChange={(e) => fc("min_amount", e.target.value || "")}
                />
                <Input
                  name="max_amount"
                  label="Max amount"
                  value={filters.max_amount || ""}
                  onChange={(e) => fc("max_amount", e.target.value || "")}
                />
              </div>
            )}
          </Card>

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map(({ key, label, value }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => removeChip(key)}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary/80 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                >
                  {label}: <span className="font-semibold">{value}</span>
                  <IconX size={9} />
                </button>
              ))}
            </div>
          )}

          <SettledCommissionHistoryView filters={appliedFilters} refreshKey={refreshKey} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
