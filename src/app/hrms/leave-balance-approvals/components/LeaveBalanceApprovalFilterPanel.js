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
import { currentFyYear, fyLabel } from "@/components/common/hrmsFilterDates";

export const LEAVE_BALANCE_ACK_STATUS_OPTIONS = [
  { value: "approved", label: "Confirmed" },
  { value: "rejected", label: "Disputed" },
];

const CHIP_LABELS = {
  q: "Search",
  fy_year: "FY",
  status: "Status",
  employee_id: "Employee",
};

/**
 * Advanced filter toolbar for /hrms/leave-balance-approvals.
 */
export default function LeaveBalanceApprovalFilterPanel({
  values = {},
  quickSearch = "",
  fyYearOptions = [],
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
        fy_year: (raw) => {
          if (String(raw) === currentFyYear()) return null;
          const opt = fyYearOptions.find((o) => String(o.value) === String(raw));
          return opt?.label || fyLabel(raw);
        },
        status: (raw) => optionLabel(LEAVE_BALANCE_ACK_STATUS_OPTIONS, raw),
      }),
    [values, fyYearOptions]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="leave-balance-approval-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Name / Emp Code)"
      quickSearchId="leave-balance-approval-quick-search"
      activeCount={activeCount}
      defaultOpen={defaultOpen}
      resetLabel="Reset to current FY"
      onQuickSearch={onQuickSearch}
      onApply={onApply}
      onReset={onReset}
      onRemove={onRemove}
      prepareApply={(draft) => ({
        ...draft,
        fy_year: draft.fy_year || currentFyYear(),
      })}
    >
      {({ draft, setDraftValue }) => (
        <FormGrid cols={3}>
          <FormField>
            <Select
              name="fy_year"
              label="Financial year"
              value={draft.fy_year ?? ""}
              onChange={(e) => setDraftValue("fy_year", e.target.value)}
              size="small"
              fullWidth
            >
              {fyYearOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
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
              {LEAVE_BALANCE_ACK_STATUS_OPTIONS.map((o) => (
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
        </FormGrid>
      )}
    </HrmsAdvancedFilterShell>
  );
}