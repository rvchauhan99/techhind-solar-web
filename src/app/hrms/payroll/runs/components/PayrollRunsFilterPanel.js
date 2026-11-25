"use client";

import { useMemo } from "react";
import Select, { MenuItem } from "@/components/common/Select";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import HrmsAdvancedFilterShell, {
  buildFilterChips,
  optionLabel,
} from "@/components/common/HrmsAdvancedFilterShell";
import { currentMonthKey } from "@/components/common/hrmsFilterDates";

export const PAYROLL_RUN_STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "running", label: "Running" },
  { value: "queued", label: "Queued" },
];

const CHIP_LABELS = {
  q: "Search",
  month: "Month",
  status: "Status",
};

/**
 * Advanced filter toolbar for /hrms/payroll/runs.
 */
export default function PayrollRunsFilterPanel({
  values = {},
  quickSearch = "",
  monthOptions = [],
  activeCount = 0,
  defaultOpen = false,
  onQuickSearch,
  onApply,
  onReset,
  onRemove,
}) {
  const chips = useMemo(
    () =>
      buildFilterChips(values, CHIP_LABELS, {
        month: (raw) => {
          if (String(raw) === currentMonthKey()) return null;
          return monthOptions.find((o) => String(o.value) === String(raw))?.label || String(raw);
        },
        status: (raw) => optionLabel(PAYROLL_RUN_STATUS_OPTIONS, raw),
        q: (raw) => String(raw),
      }),
    [values, monthOptions]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="payroll-runs-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Run id / note)"
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
        <FormGrid cols={3}>
          <FormField>
            <Select
              name="month"
              label="Salary month"
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
              {PAYROLL_RUN_STATUS_OPTIONS.map((o) => (
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