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

const CHIP_LABELS = {
  q: "Search",
  stage: "Stage",
  position_id: "Position",
};

/**
 * Advanced filter toolbar for /hrms/candidates — pipeline stage, position, quick search.
 */
export default function CandidateFilterPanel({
  values = {},
  quickSearch = "",
  stageOptions = [],
  activeCount = 0,
  defaultOpen = false,
  onQuickSearch,
  onApply,
  onReset,
  onRemove,
  loadPositions,
  resolvePosition,
}) {
  const chips = useMemo(
    () =>
      buildFilterChips(values, CHIP_LABELS, {
        stage: (raw) => optionLabel(stageOptions, raw),
      }),
    [values, stageOptions]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="candidate-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Name / Mobile / Email)"
      quickSearchId="candidate-quick-search"
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
              name="stage"
              label="Pipeline stage"
              value={draft.stage ?? ""}
              onChange={(e) => setDraftValue("stage", e.target.value)}
              size="small"
              fullWidth
            >
              <MenuItem value="">All stages</MenuItem>
              {stageOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField>
            <AutocompleteField
              label="Position"
              placeholder="Type to search…"
              asyncLoadOptions={loadPositions}
              resolveOptionById={resolvePosition}
              getOptionLabel={(o) => o?.label ?? ""}
              value={draft.position_id || null}
              onChange={(_e, opt) =>
                setDraftValue("position_id", opt?.id != null ? String(opt.id) : "")
              }
            />
          </FormField>
        </FormGrid>
      )}
    </HrmsAdvancedFilterShell>
  );
}