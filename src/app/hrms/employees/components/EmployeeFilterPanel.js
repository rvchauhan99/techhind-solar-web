"use client";

import { useMemo } from "react";
import Select, { MenuItem } from "@/components/common/Select";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import AutocompleteField from "@/components/common/AutocompleteField";
import HrmsAdvancedFilterShell, {
  buildFilterChips,
  optionLabel,
} from "@/components/common/HrmsAdvancedFilterShell";

export const EMPLOYEE_LIST_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "disabled", label: "Disabled" },
  { value: "all", label: "All statuses" },
];

const CHIP_LABELS = {
  q: "Search",
  status: "Status",
  department_id: "Department",
  designation_id: "Designation",
  branch_id: "Branch",
};

/**
 * Advanced filter toolbar for /hrms/employees — org filters + quick search (no date range).
 */
export default function EmployeeFilterPanel({
  values = {},
  quickSearch = "",
  branchOptions = [],
  activeCount = 0,
  defaultOpen = false,
  onQuickSearch,
  onApply,
  onReset,
  onRemove,
  loadDepartments,
  loadDesignations,
  resolveDepartment,
  resolveDesignation,
}) {
  const chips = useMemo(
    () =>
      buildFilterChips(values, CHIP_LABELS, {
        status: (raw) => {
          if (String(raw) === "active") return null;
          return optionLabel(EMPLOYEE_LIST_STATUS_OPTIONS, raw);
        },
        branch_id: (raw) =>
          branchOptions.find((o) => String(o.value) === String(raw))?.label || String(raw),
      }).filter(Boolean),
    [values, branchOptions]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="employee-list-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Name / Emp Code / Email)"
      quickSearchId="employee-list-quick-search"
      activeCount={activeCount}
      defaultOpen={defaultOpen}
      resetLabel="Reset filters"
      onQuickSearch={onQuickSearch}
      onApply={onApply}
      onReset={onReset}
      onRemove={onRemove}
    >
      {({ draft, setDraft, setDraftValue }) => (
        <FormGrid cols={4}>
          <FormField>
            <Select
              name="status"
              label="Status"
              value={draft.status ?? "active"}
              onChange={(e) => setDraftValue("status", e.target.value)}
              size="small"
              fullWidth
            >
              {EMPLOYEE_LIST_STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField>
            <AutocompleteField
              label="Department"
              placeholder="Type to search…"
              asyncLoadOptions={loadDepartments}
              resolveOptionById={resolveDepartment}
              getOptionLabel={(o) => o?.label ?? o?.title ?? ""}
              value={draft.department_id || null}
              onChange={(_e, opt) =>
                setDraftValue("department_id", opt?.id != null ? String(opt.id) : "")
              }
            />
          </FormField>
          <FormField>
            <AutocompleteField
              label="Designation"
              placeholder="Type to search…"
              asyncLoadOptions={(q) => loadDesignations?.(q, draft.department_id)}
              resolveOptionById={resolveDesignation}
              getOptionLabel={(o) => o?.label ?? o?.title ?? ""}
              value={draft.designation_id || null}
              onChange={(_e, opt) =>
                setDraftValue("designation_id", opt?.id != null ? String(opt.id) : "")
              }
            />
          </FormField>
          <FormField>
            <Select
              name="branch_id"
              label="Branch"
              value={draft.branch_id ?? ""}
              onChange={(e) => setDraftValue("branch_id", e.target.value)}
              size="small"
              fullWidth
            >
              <MenuItem value="">All branches</MenuItem>
              {branchOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
        </FormGrid>
      )}
    </HrmsAdvancedFilterShell>
  );
}