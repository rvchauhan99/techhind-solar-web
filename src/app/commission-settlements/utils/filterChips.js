/** Parallel label fields for master/reference filters (not sent to API). */
export const REFERENCE_LABEL_BY_ID_FIELD = {
  beneficiary_user_id: "beneficiary_label",
  branch_id: "branch_label",
  order_type_id: "order_type_label",
  project_scheme_id: "project_scheme_label",
  submitted_by: "submitted_by_label",
  approved_by: "approved_by_label",
};

export const LABEL_ONLY_FILTER_KEYS = new Set(Object.values(REFERENCE_LABEL_BY_ID_FIELD));

export function referenceAutocompleteDisplay(option) {
  if (!option) return "";
  return option.name ?? option.label ?? option.email ?? "";
}

export function masterAutocompleteValue(id, label) {
  if (id == null || id === "") return null;
  return { id, name: label || undefined };
}

export function buildFilterChips(filters, { filterLabels = {}, enumResolvers = {} } = {}) {
  return Object.entries(filters || {})
    .filter(([key, v]) => !LABEL_ONLY_FILTER_KEYS.has(key) && v != null && v !== "")
    .map(([key, value]) => {
      const labelKey = REFERENCE_LABEL_BY_ID_FIELD[key];
      const displayValue = enumResolvers[key]
        ? enumResolvers[key](value, filters)
        : labelKey && filters[labelKey]
          ? filters[labelKey]
          : String(value);
      return {
        key,
        label: filterLabels[key] || key,
        value: displayValue,
      };
    });
}

export function countActiveFilterFields(filters, { excludeKeys = [] } = {}) {
  const exclude = new Set([...LABEL_ONLY_FILTER_KEYS, ...excludeKeys]);
  let n = 0;
  for (const [key, v] of Object.entries(filters || {})) {
    if (exclude.has(key)) continue;
    if (v != null && v !== "") n += 1;
  }
  return n;
}

export function clearFilterField(filters, key, initialFilters) {
  const next = { ...filters, [key]: initialFilters[key] };
  const labelKey = REFERENCE_LABEL_BY_ID_FIELD[key];
  if (labelKey) {
    next[labelKey] = initialFilters[labelKey] ?? "";
  }
  return next;
}

/** Remove display-only label fields before API calls. */
export function stripReferenceLabelsFromFilters(filters) {
  const out = { ...(filters || {}) };
  for (const key of LABEL_ONLY_FILTER_KEYS) {
    delete out[key];
  }
  return out;
}
