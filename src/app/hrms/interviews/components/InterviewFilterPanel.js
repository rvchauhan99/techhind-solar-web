"use client";

import { useMemo } from "react";
import Select, { MenuItem } from "@/components/common/Select";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import HrmsAdvancedFilterShell, {
  buildFilterChips,
  optionLabel,
} from "@/components/common/HrmsAdvancedFilterShell";

const CHIP_LABELS = {
  q: "Search",
  round: "Round",
  status: "Status",
};

/**
 * Advanced filter toolbar for /hrms/interviews.
 */
export default function InterviewFilterPanel({
  values = {},
  quickSearch = "",
  roundOptions = [],
  statusOptions = [],
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
        round: (raw) => optionLabel(roundOptions, raw),
        status: (raw) => optionLabel(statusOptions, raw),
      }),
    [values, roundOptions, statusOptions]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="interview-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Candidate / Position)"
      quickSearchId="interview-quick-search"
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
              {statusOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField>
            <Select
              name="round"
              label="Round"
              value={draft.round ?? ""}
              onChange={(e) => setDraftValue("round", e.target.value)}
              size="small"
              fullWidth
            >
              <MenuItem value="">All rounds</MenuItem>
              {roundOptions.map((o) => (
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