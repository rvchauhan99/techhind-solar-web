"use client";

import { useMemo } from "react";
import Select, { MenuItem } from "@/components/common/Select";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import HrmsAdvancedFilterShell, {
  buildFilterChips,
  optionLabel,
} from "@/components/common/HrmsAdvancedFilterShell";

export const COMPENSATORY_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const CHIP_LABELS = {
  q: "Search",
  status: "Status",
  employee_id: "Employee",
  worked_date: "Worked on",
  leave_date: "Leave on",
};

/**
 * Advanced filter toolbar for /hrms/compensatory.
 */
export default function CompensatoryFilterPanel({
  values = {},
  quickSearch = "",
  activeCount = 0,
  defaultOpen = false,
  onQuickSearch,
  onApply,
  onReset,
  onRemove,
  loadEmployees,
  resolveEmployee,
}) {
  const chips = useMemo(
    () =>
      buildFilterChips(values, CHIP_LABELS, {
        status: (raw) => optionLabel(COMPENSATORY_STATUS_OPTIONS, raw),
      }),
    [values]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="compensatory-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Name / Emp Code)"
      quickSearchId="compensatory-quick-search"
      activeCount={activeCount}
      defaultOpen={defaultOpen}
      resetLabel="Reset filters"
      onQuickSearch={onQuickSearch}
      onApply={onApply}
      onReset={onReset}
      onRemove={onRemove}
    >
      {({ draft, setDraftValue }) => (
        <FormGrid cols={4}>
          <FormField>
            <Select
              name="status"
              label="Status"
              value={draft.status ?? ""}
              onChange={(e) => setDraftValue("status", e.target.value)}
              size="small"
              fullWidth
            >
              <MenuItem value="">All statuses</MenuItem>
              {COMPENSATORY_STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField>
            <AutocompleteField
              label="Employee"
              placeholder="Type to search…"
              asyncLoadOptions={loadEmployees}
              resolveOptionById={resolveEmployee}
              getOptionLabel={(o) => o?.label ?? ""}
              value={draft.employee_id || null}
              onChange={(_e, opt) =>
                setDraftValue("employee_id", opt?.id != null ? String(opt.id) : "")
              }
            />
          </FormField>
          <FormField>
            <DateField
              name="worked_date"
              label="Worked on"
              value={draft.worked_date ?? ""}
              onChange={(e) => setDraftValue("worked_date", e.target.value)}
            />
          </FormField>
          <FormField>
            <DateField
              name="leave_date"
              label="Leave on"
              value={draft.leave_date ?? ""}
              onChange={(e) => setDraftValue("leave_date", e.target.value)}
            />
          </FormField>
        </FormGrid>
      )}
    </HrmsAdvancedFilterShell>
  );
}