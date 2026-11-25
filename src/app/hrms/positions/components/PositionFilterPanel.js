"use client";

import { useMemo } from "react";
import Select, { MenuItem } from "@/components/common/Select";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import HrmsAdvancedFilterShell, {
  buildFilterChips,
  optionLabel,
} from "@/components/common/HrmsAdvancedFilterShell";

export const POSITION_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const CHIP_LABELS = {
  q: "Search",
  status: "Status",
  branch_id: "Branch",
};

/**
 * Advanced filter toolbar for /hrms/positions.
 */
export default function PositionFilterPanel({
  values = {},
  quickSearch = "",
  branchOptions = [],
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
        status: (raw) => optionLabel(POSITION_STATUS_OPTIONS, raw),
        branch_id: (raw) =>
          branchOptions.find((o) => String(o.value) === String(raw))?.label || String(raw),
      }),
    [values, branchOptions]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="position-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Position title)"
      quickSearchId="position-quick-search"
      activeCount={activeCount}
      defaultOpen={defaultOpen}
      resetLabel="Reset filters"
      onQuickSearch={onQuickSearch}
      onApply={onApply}
      onReset={onReset}
      onRemove={onRemove}
    >
      {({ draft, setDraftValue }) => (
        <FormGrid cols={3}>
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
              {POSITION_STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
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