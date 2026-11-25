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

export const PAYOUT_ACK_OPTIONS = [
  { value: "", label: "All" },
  { value: "true", label: "Acknowledged" },
  { value: "false", label: "Not acknowledged" },
];

export const PAYOUT_QUERY_STATUS_OPTIONS = [
  { value: "", label: "All queries" },
  { value: "open", label: "Open query" },
  { value: "solved", label: "Solved query" },
];

const CHIP_LABELS = {
  q: "Search",
  month: "Month",
  employee_id: "Employee",
  is_acknowledged: "Acknowledged",
  query_status: "Query",
};

/**
 * Advanced filter toolbar for /hrms/reports/payout.
 */
export default function PayoutReportFilterPanel({
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
  resolveEmployee,
}) {
  const chips = useMemo(
    () =>
      buildFilterChips(values, CHIP_LABELS, {
        month: (raw) =>
          monthOptions.find((o) => String(o.value) === String(raw))?.label || String(raw),
        is_acknowledged: (raw) => optionLabel(PAYOUT_ACK_OPTIONS, raw),
        query_status: (raw) => optionLabel(PAYOUT_QUERY_STATUS_OPTIONS, raw),
      }),
    [values, monthOptions]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="payout-report-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Name / Emp Code)"
      quickSearchId="payout-report-quick-search"
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
            <Select
              name="is_acknowledged"
              label="Acknowledged"
              value={draft.is_acknowledged ?? ""}
              onChange={(e) => setDraftValue("is_acknowledged", e.target.value)}
              size="small"
              fullWidth
            >
              {PAYOUT_ACK_OPTIONS.map((o) => (
                <MenuItem key={`ack-${o.value || "all"}`} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField>
            <Select
              name="query_status"
              label="Payroll query"
              value={draft.query_status ?? ""}
              onChange={(e) => setDraftValue("query_status", e.target.value)}
              size="small"
              fullWidth
            >
              {PAYOUT_QUERY_STATUS_OPTIONS.map((o) => (
                <MenuItem key={`qst-${o.value || "all"}`} value={o.value}>
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