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

export const EMPLOYEE_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "disabled", label: "Disabled" },
  { value: "all", label: "All statuses" },
];

export const REMAINING_STATUS_OPTIONS = [
  { value: "", label: "Any remaining" },
  { value: "positive", label: "Has balance (> 0)" },
  { value: "zero", label: "Zero remaining" },
  { value: "negative", label: "Negative (overdrawn)" },
  { value: "low", label: "Low (0–2 days)" },
];

const CHIP_LABELS = {
  q: "Search",
  fy_year: "FY",
  as_of: "As of",
  department_id: "Department",
  designation_id: "Designation",
  employee_id: "Employee",
  leave_type_id: "Leave type",
  employee_status: "Emp status",
  remaining_status: "Remaining",
  joining_from: "Joined from",
  joining_to: "Joined to",
};

/**
 * Advanced filter toolbar for /hrms/reports/leave-balance —
 * same UX as Attendance / Attendance Requests: chips + quick search + collapsible fields.
 */
export default function LeaveBalanceFilterPanel({
  values = {},
  quickSearch = "",
  fyYearOptions = [],
  activeCount = 0,
  defaultOpen = false,
  onQuickSearch,
  onApply,
  onReset,
  onRemove,
  loadDepartments,
  loadDesignations,
  loadEmployees,
  loadLeaveTypes,
  resolveDepartment,
  resolveDesignation,
  resolveEmployee,
  resolveLeaveType,
}) {
  const chips = useMemo(
    () =>
      buildFilterChips(values, CHIP_LABELS, {
        fy_year: (raw) =>
          fyYearOptions.find((o) => String(o.value) === String(raw))?.label ||
          `${raw}–${Number(raw) + 1}`,
        employee_status: (raw) => {
          if (String(raw) === "active") return null;
          return optionLabel(EMPLOYEE_STATUS_OPTIONS, raw);
        },
        remaining_status: (raw) => optionLabel(REMAINING_STATUS_OPTIONS, raw),
      }),
    [values, fyYearOptions]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="leave-balance-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Name / Emp Code / Email)"
      quickSearchId="leave-balance-quick-search"
      activeCount={activeCount}
      defaultOpen={defaultOpen}
      resetLabel="Reset to current FY"
      onQuickSearch={onQuickSearch}
      onApply={onApply}
      onReset={onReset}
      onRemove={onRemove}
    >
      {({ draft, setDraft, setDraftValue }) => (
        <FormGrid cols={4}>
          <FormField>
            <Select
              name="fy_year"
              label="Financial year"
              value={draft.fy_year ?? ""}
              onChange={(e) => setDraftValue("fy_year", e.target.value)}
              size="small"
              fullWidth
            >
              {fyYearOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField>
            <DateField
              name="as_of"
              label="Balance as of"
              value={draft.as_of ?? ""}
              onChange={(e) => setDraftValue("as_of", e.target.value)}
            />
          </FormField>
          <FormField>
            <DateField
              name="joining_from"
              label="Joined from"
              value={draft.joining_from ?? ""}
              onChange={(e) => setDraftValue("joining_from", e.target.value)}
            />
          </FormField>
          <FormField>
            <DateField
              name="joining_to"
              label="Joined to"
              value={draft.joining_to ?? ""}
              onChange={(e) => setDraftValue("joining_to", e.target.value)}
            />
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
            <AutocompleteField
              label="Leave type"
              placeholder="Type to search…"
              asyncLoadOptions={loadLeaveTypes}
              resolveOptionById={resolveLeaveType}
              getOptionLabel={(o) => o?.label ?? o?.title ?? ""}
              value={draft.leave_type_id || null}
              onChange={(_e, opt) =>
                setDraftValue("leave_type_id", opt?.id != null ? String(opt.id) : "")
              }
            />
          </FormField>

          <FormField>
            <Select
              name="employee_status"
              label="Employee status"
              value={draft.employee_status ?? "active"}
              onChange={(e) => setDraftValue("employee_status", e.target.value)}
              size="small"
              fullWidth
            >
              {EMPLOYEE_STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormField>
          <FormField>
            <Select
              name="remaining_status"
              label="Remaining balance"
              value={draft.remaining_status ?? ""}
              onChange={(e) => setDraftValue("remaining_status", e.target.value)}
              size="small"
              fullWidth
            >
              {REMAINING_STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value || "any-rem"} value={o.value}>
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