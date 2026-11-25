"use client";

import { useMemo } from "react";
import Select, { MenuItem } from "@/components/common/Select";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import HrmsAdvancedFilterShell, {
  buildFilterChips,
  optionLabel,
} from "@/components/common/HrmsAdvancedFilterShell";

export const HOLIDAY_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const CHIP_LABELS = {
  q: "Search",
  year: "Year",
  status: "Status",
};

/**
 * Advanced filter toolbar for /hrms/holidays.
 */
export default function HolidayFilterPanel({
  values = {},
  quickSearch = "",
  yearOptions = [],
  defaultYear = "",
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
        year: (raw) => {
          if (defaultYear && String(raw) === String(defaultYear)) return null;
          return yearOptions.find((o) => String(o.value) === String(raw))?.label || String(raw);
        },
        status: (raw) => optionLabel(HOLIDAY_STATUS_OPTIONS, raw),
      }),
    [values, yearOptions, defaultYear]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="holiday-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Holiday name)"
      quickSearchId="holiday-quick-search"
      activeCount={activeCount}
      defaultOpen={defaultOpen}
      resetLabel="Reset to this year"
      onQuickSearch={onQuickSearch}
      onApply={onApply}
      onReset={onReset}
      onRemove={onRemove}
      prepareApply={(draft) => ({
        ...draft,
        year: draft.year || defaultYear,
      })}
    >
      {({ draft, setDraftValue }) => (
        <FormGrid cols={3}>
          <FormField>
            <Select
              name="year"
              label="Year"
              value={draft.year ?? ""}
              onChange={(e) => setDraftValue("year", e.target.value)}
              size="small"
              fullWidth
            >
              {yearOptions.map((o) => (
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
              {HOLIDAY_STATUS_OPTIONS.map((o) => (
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