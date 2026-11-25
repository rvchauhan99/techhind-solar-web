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
import { currentMonthKey } from "@/components/common/hrmsFilterDates";

export const PENALTY_ISSUE_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" },
];

const CHIP_LABELS = {
  q: "Search",
  month: "Month",
  status: "Status",
  employee_id: "Employee",
  penalty_id: "Penalty",
};

/**
 * Advanced filter toolbar for /hrms/penalty-issues.
 */
export default function PenaltyIssueFilterPanel({
  values = {},
  quickSearch = "",
  monthOptions = [],
  activeCount = 0,
  defaultOpen = false,
  onQuickSearch,
  onApply,
  onReset,
  onRemove,
  loadEmployees,
  loadPenalties,
  resolveEmployee,
  resolvePenalty,
}) {
  const chips = useMemo(
    () =>
      buildFilterChips(values, CHIP_LABELS, {
        month: (raw) => {
          if (String(raw) === currentMonthKey()) return null;
          return monthOptions.find((o) => String(o.value) === String(raw))?.label || String(raw);
        },
        status: (raw) => optionLabel(PENALTY_ISSUE_STATUS_OPTIONS, raw),
      }),
    [values, monthOptions]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="penalty-issue-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Employee / Penalty)"
      activeCount={activeCount}
      defaultOpen={defaultOpen}
      resetLabel="Reset to this month"
      onQuickSearch={onQuickSearch}
      onApply={onApply}
      onReset={onReset}
      onRemove={onRemove}
      prepareApply={(draft) => ({
        ...draft,
        month: draft.month || currentMonthKey(),
      })}
    >
      {({ draft, setDraftValue }) => (
        <FormGrid cols={4}>
          <FormField>
            <Select
              name="month"
              label="Penalty month"
              value={draft.month ?? ""}
              onChange={(e) => setDraftValue("month", e.target.value)}
              size="small"
              fullWidth
            >
              {monthOptions.map((o) => (
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
              {PENALTY_ISSUE_STATUS_OPTIONS.map((o) => (
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
            <AutocompleteField
              label="Penalty type"
              placeholder="Type to search…"
              asyncLoadOptions={loadPenalties}
              resolveOptionById={resolvePenalty}
              getOptionLabel={(o) => o?.label ?? ""}
              value={draft.penalty_id || null}
              onChange={(_e, opt) =>
                setDraftValue("penalty_id", opt?.id != null ? String(opt.id) : "")
              }
            />
          </FormField>
        </FormGrid>
      )}
    </HrmsAdvancedFilterShell>
  );
}