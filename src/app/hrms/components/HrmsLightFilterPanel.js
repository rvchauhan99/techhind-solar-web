"use client";

import { useMemo } from "react";
import Select, { MenuItem } from "@/components/common/Select";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import HrmsAdvancedFilterShell, {
  buildFilterChips,
  optionLabel,
} from "@/components/common/HrmsAdvancedFilterShell";

export const HRMS_LIGHT_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const DEFAULT_CHIP_LABELS = {
  q: "Search",
  status: "Status",
};

/** Active advanced-filter count for HRMS master lists (status + extras + quick search). */
export function countHrmsLightActiveFilters(filters, q, extraKeys = []) {
  let n = 0;
  if (filters?.status) n += 1;
  extraKeys.forEach((k) => {
    if (filters?.[k]) n += 1;
  });
  if (String(q || "").trim()) n += 1;
  return n;
}

export function createHrmsLightFilterHandlers(emptyFilters, { setFilters, setQ, setTableKey }) {
  return {
    onQuickSearch: (v) => {
      setQ(v || "");
      setTableKey((k) => k + 1);
    },
    onApply: (next) => {
      const patch = { ...emptyFilters };
      Object.keys(emptyFilters).forEach((k) => {
        patch[k] = next?.[k] ?? "";
      });
      setFilters(patch);
      setTableKey((k) => k + 1);
    },
    onReset: () => {
      setFilters({ ...emptyFilters });
      setQ("");
      setTableKey((k) => k + 1);
    },
    onRemove: (key) => {
      if (key === "q") {
        setQ("");
      } else {
        setFilters((prev) => ({ ...prev, [key]: emptyFilters[key] ?? "" }));
      }
      setTableKey((k) => k + 1);
    },
  };
}

/**
 * Light advanced filters for HRMS master list pages — status + optional selects + quick search.
 */
export default function HrmsLightFilterPanel({
  panelId = "hrms-light-advanced-filters",
  values = {},
  quickSearch = "",
  quickSearchPlaceholder = "Quick Search…",
  quickSearchId,
  activeCount = 0,
  defaultOpen = false,
  statusOptions = HRMS_LIGHT_STATUS_OPTIONS,
  statusDefault = "",
  extraSelects = [],
  chipLabels = {},
  chipFormatters = {},
  resetLabel = "Reset filters",
  gridCols = 4,
  onQuickSearch,
  onApply,
  onReset,
  onRemove,
  children,
}) {
  const mergedChipLabels = useMemo(() => {
    const fromSelects = extraSelects.reduce((acc, s) => ({ ...acc, [s.key]: s.label }), {});
    return { ...DEFAULT_CHIP_LABELS, ...fromSelects, ...chipLabels };
  }, [chipLabels, extraSelects]);

  const mergedFormatters = useMemo(() => {
    const fmt = { ...chipFormatters };
    extraSelects.forEach((s) => {
      if (!fmt[s.key] && s.options?.length) {
        fmt[s.key] = (raw) => optionLabel(s.options, raw);
      }
    });
    if (!fmt.status) {
      fmt.status = (raw) => (raw ? optionLabel(statusOptions, raw) : null);
    }
    return fmt;
  }, [chipFormatters, extraSelects, statusOptions]);

  const chips = useMemo(
    () => buildFilterChips(values, mergedChipLabels, mergedFormatters).filter(Boolean),
    [values, mergedChipLabels, mergedFormatters]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId={panelId}
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder={quickSearchPlaceholder}
      quickSearchId={quickSearchId}
      activeCount={activeCount}
      defaultOpen={defaultOpen}
      resetLabel={resetLabel}
      onQuickSearch={onQuickSearch}
      onApply={onApply}
      onReset={onReset}
      onRemove={onRemove}
    >
      {({ draft, setDraft, setDraftValue }) => (
        <FormGrid cols={gridCols}>
          <FormField>
            <Select
              name="status"
              label="Status"
              value={draft.status ?? statusDefault}
              onChange={(e) => setDraftValue("status", e.target.value)}
              size="small"
              fullWidth
            >
              {statusOptions.map((o) => (
                <MenuItem key={o.value === "" ? "__all_status__" : o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          {extraSelects.map((s) => (
            <FormField key={s.key}>
              <Select
                name={s.key}
                label={s.label}
                value={draft[s.key] ?? ""}
                onChange={(e) => setDraftValue(s.key, e.target.value)}
                size="small"
                fullWidth
              >
                <MenuItem value="">{s.emptyLabel || `All ${String(s.label).toLowerCase()}`}</MenuItem>
                {(s.options || []).map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormField>
          ))}
          {typeof children === "function"
            ? children({ draft, setDraft, setDraftValue })
            : children}
        </FormGrid>
      )}
    </HrmsAdvancedFilterShell>
  );
}