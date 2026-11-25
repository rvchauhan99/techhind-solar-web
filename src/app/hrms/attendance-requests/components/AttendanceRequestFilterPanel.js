"use client";

import { useMemo } from "react";
import Select, { MenuItem } from "@/components/common/Select";
import FormGrid from "@/components/common/FormGrid";
import FormField from "@/components/common/FormField";
import DateField from "@/components/common/DateField";
import AutocompleteField from "@/components/common/AutocompleteField";
import HrmsAdvancedFilterShell, {
  buildFilterChips,
  optionLabel,
} from "@/components/common/HrmsAdvancedFilterShell";
import { currentMonthDefaults } from "@/components/common/hrmsFilterDates";

export const REQUEST_STATUS_OPTIONS = [
  { value: "pending_l1", label: "Pending L1" },
  { value: "pending_l2", label: "Pending L2" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const REQUEST_TYPE_OPTIONS = [
  { value: "check_in", label: "Punch in" },
  { value: "check_out", label: "Punch out" },
  { value: "break_in", label: "Break in" },
  { value: "break_out", label: "Break out" },
];

export const REQUEST_SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "system_auto_checkout", label: "Auto punch-out" },
];

export const LEVEL_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const CHIP_LABELS = {
  q: "Search",
  status: "Status",
  request_type: "Type",
  source: "Source",
  department_id: "Department",
  designation_id: "Designation",
  employee_id: "Employee",
  level1_status: "L1 status",
  level2_status: "L2 status",
  from: "Requested from",
  to: "Requested to",
  created_from: "Created from",
  created_to: "Created to",
};

/**
 * Advanced filter toolbar for /hrms/attendance-requests — same UX as Attendance /
 * B2B report bars: collapsible advanced fields, chips, debounced quick search.
 */
export default function AttendanceRequestFilterPanel({
  values = {},
  quickSearch = "",
  activeCount = 0,
  defaultOpen = false,
  onQuickSearch,
  onApply,
  onReset,
  onRemove,
  loadDepartments,
  loadDesignations,
  loadEmployees,
  resolveDepartment,
  resolveDesignation,
  resolveEmployee,
}) {
  const chips = useMemo(
    () =>
      buildFilterChips(values, CHIP_LABELS, {
        status: (raw) => optionLabel(REQUEST_STATUS_OPTIONS, raw),
        request_type: (raw) => optionLabel(REQUEST_TYPE_OPTIONS, raw),
        source: (raw) => optionLabel(REQUEST_SOURCE_OPTIONS, raw),
        level1_status: (raw) => optionLabel(LEVEL_STATUS_OPTIONS, raw),
        level2_status: (raw) => optionLabel(LEVEL_STATUS_OPTIONS, raw),
        from: (raw) => {
          const defaults = currentMonthDefaults();
          if (String(raw) === defaults.from) return null;
          return String(raw);
        },
        to: (raw) => {
          const defaults = currentMonthDefaults();
          if (String(raw) === defaults.to) return null;
          return String(raw);
        },
      }),
    [values]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="attendance-request-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Name / Emp Code / Reason)"
      quickSearchId="attendance-request-quick-search"
      activeCount={activeCount}
      defaultOpen={defaultOpen}
      resetLabel="Reset to this month"
      onQuickSearch={onQuickSearch}
      onApply={onApply}
      onReset={onReset}
      onRemove={onRemove}
    >
      {({ draft, setDraft, setDraftValue }) => (
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
              {REQUEST_STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField>
            <Select
              name="request_type"
              label="Request type"
              value={draft.request_type ?? ""}
              onChange={(e) => setDraftValue("request_type", e.target.value)}
              size="small"
              fullWidth
            >
              <MenuItem value="">All types</MenuItem>
              {REQUEST_TYPE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField>
            <Select
              name="source"
              label="Source"
              value={draft.source ?? ""}
              onChange={(e) => setDraftValue("source", e.target.value)}
              size="small"
              fullWidth
            >
              <MenuItem value="">All sources</MenuItem>
              {REQUEST_SOURCE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField>
            <AutocompleteField
              label="Department"
              placeholder="Type to search…"
              asyncLoadOptions={loadDepartments}
              resolveOptionById={resolveDepartment}
              getOptionLabel={(o) => o?.label ?? o?.title ?? ""}
              value={draft.department_id || null}
              onChange={(_e, opt) =>
                setDraft((p) => ({
                  ...p,
                  department_id: opt?.id != null ? String(opt.id) : "",
                  designation_id: "",
                  employee_id: "",
                }))
              }
            />
          </FormField>
          <FormField>
            <AutocompleteField
              label="Designation"
              placeholder="Type to search…"
              asyncLoadOptions={(q) => loadDesignations?.(q, draft.department_id)}
              resolveOptionById={resolveDesignation}
              getOptionLabel={(o) => o?.label ?? o?.title ?? ""}
              value={draft.designation_id || null}
              onChange={(_e, opt) =>
                setDraft((p) => ({
                  ...p,
                  designation_id: opt?.id != null ? String(opt.id) : "",
                  employee_id: "",
                }))
              }
            />
          </FormField>
          <FormField>
            <AutocompleteField
              label="Employee"
              placeholder="Type to search…"
              asyncLoadOptions={(q) =>
                loadEmployees?.(q, {
                  department_id: draft.department_id,
                  designation_id: draft.designation_id,
                })
              }
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
              name="level1_status"
              label="Manager (L1) status"
              value={draft.level1_status ?? ""}
              onChange={(e) => setDraftValue("level1_status", e.target.value)}
              size="small"
              fullWidth
            >
              <MenuItem value="">All L1</MenuItem>
              {LEVEL_STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField>
            <Select
              name="level2_status"
              label="HR (L2) status"
              value={draft.level2_status ?? ""}
              onChange={(e) => setDraftValue("level2_status", e.target.value)}
              size="small"
              fullWidth
            >
              <MenuItem value="">All L2</MenuItem>
              {LEVEL_STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField>
            <DateField
              label="Requested from"
              name="from"
              value={draft.from || ""}
              onChange={(e) => setDraftValue("from", e.target.value)}
            />
          </FormField>
          <FormField>
            <DateField
              label="Requested to"
              name="to"
              value={draft.to || ""}
              onChange={(e) => setDraftValue("to", e.target.value)}
            />
          </FormField>
          <FormField>
            <DateField
              label="Created from"
              name="created_from"
              value={draft.created_from || ""}
              onChange={(e) => setDraftValue("created_from", e.target.value)}
            />
          </FormField>
          <FormField>
            <DateField
              label="Created to"
              name="created_to"
              value={draft.created_to || ""}
              onChange={(e) => setDraftValue("created_to", e.target.value)}
            />
          </FormField>
        </FormGrid>
      )}
    </HrmsAdvancedFilterShell>
  );
}