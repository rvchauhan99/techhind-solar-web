import { buildFilterChips } from "./filterChips";

export const ROLE_FILTER_OPTIONS = [
  { value: "handled_by", label: "Handled by" },
  { value: "channel_partner", label: "Channel partner" },
  { value: "fabricator", label: "Fabricator" },
  { value: "installer", label: "Installer" },
  { value: "fabricator_installer", label: "Fabricator & installer", shortLabel: "Fab & inst" },
];

export const QUICK_ROLE_FILTERS = ROLE_FILTER_OPTIONS;

export function roleLabel(value) {
  return ROLE_FILTER_OPTIONS.find((o) => o.value === value)?.label || value;
}

export function normalizeFilterRoles(filters) {
  const roles = Array.isArray(filters?.roles) ? filters.roles.filter(Boolean) : [];
  if (roles.length) return roles;
  const single = String(filters?.role || "").trim();
  return single ? [single] : [];
}

export function roleFilterQueryParam(filters) {
  const roles = normalizeFilterRoles(filters);
  return roles.length ? roles.join(",") : undefined;
}

export function buildRoleFilterChips(filters, { filterLabels = {}, enumResolvers = {} } = {}) {
  const activeRoles = normalizeFilterRoles(filters);
  const chipSource = { ...filters, role: "", roles: "" };
  const chips = buildFilterChips(chipSource, {
    filterLabels,
    enumResolvers: { role: (v) => roleLabel(v), ...enumResolvers },
  });
  if (activeRoles.length) {
    chips.push({
      key: "roles",
      label: filterLabels.roles || "Roles",
      value: activeRoles.map(roleLabel).join(", "),
    });
  }
  return chips;
}

/** Omit empty role fields so active filter count stays correct. */
export function filtersForActiveCount(filters) {
  const f = { ...filters };
  if (!normalizeFilterRoles(f).length) {
    delete f.roles;
    delete f.role;
  }
  return f;
}
