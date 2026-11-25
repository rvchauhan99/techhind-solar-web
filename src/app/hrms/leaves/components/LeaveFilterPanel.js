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
import { monthDateBounds } from "@/components/common/hrmsFilterDates";
import {
  LEAVE_STATUS_OPTIONS,
  LEAVE_KIND_OPTIONS,
  LEAVE_LWP_OPTIONS,
  LEAVE_DURATION_OPTIONS,
  LEAVE_LEVEL_OPTIONS,
  LEAVE_REVERTED_OPTIONS,
} from "../../reports/leave/components/LeaveReportFilterPanel";

export {
  LEAVE_STATUS_OPTIONS,
  LEAVE_KIND_OPTIONS,
  LEAVE_LWP_OPTIONS,
  LEAVE_DURATION_OPTIONS,
  LEAVE_LEVEL_OPTIONS,
  LEAVE_REVERTED_OPTIONS,
};

const CHIP_LABELS = {
  q: "Search",
  from: "Start from",
  to: "Start to",
  end_from: "End from",
  end_to: "End to",
  created_from: "Applied from",
  created_to: "Applied to",
  year: "Year",
  month: "Month",
  department_id: "Department",
  designation_id: "Designation",
  employee_id: "Employee",
  leave_type_id: "Leave type",
  status: "Status",
  is_emergency: "Kind",
  is_lwp: "LWP",
  duration: "Duration",
  level1_status: "L1 status",
  level2_status: "L2 status",
  is_reverted_by_attendance: "Reverted",
};

/**
 * Advanced filter toolbar for /hrms/leaves — same field set as leave report.
 */
export default function LeaveFilterPanel({
  values = {},
  quickSearch = "",
  yearOptions = [],
  monthOptions = [],
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
        status: (raw) => optionLabel(LEAVE_STATUS_OPTIONS, raw),
        is_emergency: (raw) => optionLabel(LEAVE_KIND_OPTIONS, raw),
        is_lwp: (raw) => optionLabel(LEAVE_LWP_OPTIONS, raw),
        duration: (raw) => optionLabel(LEAVE_DURATION_OPTIONS, raw),
        level1_status: (raw) => optionLabel(LEAVE_LEVEL_OPTIONS, raw),
        level2_status: (raw) => optionLabel(LEAVE_LEVEL_OPTIONS, raw),
        is_reverted_by_attendance: (raw) => optionLabel(LEAVE_REVERTED_OPTIONS, raw),
        month: (raw) =>
          monthOptions.find((o) => String(o.value) === String(raw))?.label || raw,
      }),
    [values, monthOptions]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="leave-list-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Name / Emp Code / Reason)"
      quickSearchId="leave-list-quick-search"
      activeCount={activeCount}
      defaultOpen={defaultOpen}
      resetLabel="Reset to this month"
      onQuickSearch={onQuickSearch}
      onApply={onApply}
      onReset={onReset}
      onRemove={onRemove}
      prepareApply={(draft) => {
        const year = draft.year || String(new Date().getFullYear());
        const month = draft.month || String(new Date().getMonth() + 1);
        let from = draft.from || "";
        let to = draft.to || "";
        if (!from || !to) {
          const bounds = monthDateBounds(year, month);
          from = from || bounds.from;
          to = to || bounds.to;
        }
        return { ...draft, year: String(year), month: String(month), from, to };
      }}
    >
      {({ draft, setDraft, setDraftValue }) => {
        const applyYearMonth = (year, month) => {
          const bounds = monthDateBounds(year, month);
          setDraft((p) => ({
            ...p,
            year: String(year),
            month: String(month),
            from: bounds.from,
            to: bounds.to,
          }));
        };

        return (
          <FormGrid cols={4}>
            <FormField>
              <DateField
                name="from"
                label="Start date from"
                value={draft.from ?? ""}
                onChange={(e) => {
                  const from = e.target.value || "";
                  setDraft((p) => {
                    const next = { ...p, from };
                    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
                      next.year = from.slice(0, 4);
                      next.month = String(Number(from.slice(5, 7)));
                    }
                    return next;
                  });
                }}
              />
            </FormField>
            <FormField>
              <DateField
                name="to"
                label="Start date to"
                value={draft.to ?? ""}
                onChange={(e) => setDraftValue("to", e.target.value)}
              />
            </FormField>
            <FormField>
              <Select
                name="year"
                label="Year (month preset)"
                value={draft.year ?? ""}
                onChange={(e) =>
                  applyYearMonth(e.target.value, draft.month || String(new Date().getMonth() + 1))
                }
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
                name="month"
                label="Month (preset)"
                value={draft.month ?? ""}
                onChange={(e) =>
                  applyYearMonth(draft.year || String(new Date().getFullYear()), e.target.value)
                }
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
              <DateField
                name="end_from"
                label="End date from"
                value={draft.end_from ?? ""}
                onChange={(e) => setDraftValue("end_from", e.target.value)}
              />
            </FormField>
            <FormField>
              <DateField
                name="end_to"
                label="End date to"
                value={draft.end_to ?? ""}
                onChange={(e) => setDraftValue("end_to", e.target.value)}
              />
            </FormField>
            <FormField>
              <DateField
                name="created_from"
                label="Applied from"
                value={draft.created_from ?? ""}
                onChange={(e) => setDraftValue("created_from", e.target.value)}
              />
            </FormField>
            <FormField>
              <DateField
                name="created_to"
                label="Applied to"
                value={draft.created_to ?? ""}
                onChange={(e) => setDraftValue("created_to", e.target.value)}
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
                asyncLoadOptions={loadDesignations}
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
                name="status"
                label="Status"
                value={draft.status ?? ""}
                onChange={(e) => setDraftValue("status", e.target.value)}
                size="small"
                fullWidth
              >
                <MenuItem value="">All statuses</MenuItem>
                {LEAVE_STATUS_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormField>
            <FormField>
              <Select
                name="is_emergency"
                label="Kind"
                value={draft.is_emergency ?? ""}
                onChange={(e) => setDraftValue("is_emergency", e.target.value)}
                size="small"
                fullWidth
              >
                {LEAVE_KIND_OPTIONS.map((o) => (
                  <MenuItem key={`kind-${o.value || "all"}`} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormField>
            <FormField>
              <Select
                name="is_lwp"
                label="LWP"
                value={draft.is_lwp ?? ""}
                onChange={(e) => setDraftValue("is_lwp", e.target.value)}
                size="small"
                fullWidth
              >
                {LEAVE_LWP_OPTIONS.map((o) => (
                  <MenuItem key={`lwp-${o.value || "all"}`} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormField>
            <FormField>
              <Select
                name="duration"
                label="Duration"
                value={draft.duration ?? ""}
                onChange={(e) => setDraftValue("duration", e.target.value)}
                size="small"
                fullWidth
              >
                {LEAVE_DURATION_OPTIONS.map((o) => (
                  <MenuItem key={`dur-${o.value || "all"}`} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormField>

            <FormField>
              <Select
                name="level1_status"
                label="L1 status"
                value={draft.level1_status ?? ""}
                onChange={(e) => setDraftValue("level1_status", e.target.value)}
                size="small"
                fullWidth
              >
                {LEAVE_LEVEL_OPTIONS.map((o) => (
                  <MenuItem key={`l1-${o.value || "all"}`} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormField>
            <FormField>
              <Select
                name="level2_status"
                label="L2 status"
                value={draft.level2_status ?? ""}
                onChange={(e) => setDraftValue("level2_status", e.target.value)}
                size="small"
                fullWidth
              >
                {LEAVE_LEVEL_OPTIONS.map((o) => (
                  <MenuItem key={`l2-${o.value || "all"}`} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormField>
            <FormField>
              <Select
                name="is_reverted_by_attendance"
                label="Attendance revert"
                value={draft.is_reverted_by_attendance ?? ""}
                onChange={(e) => setDraftValue("is_reverted_by_attendance", e.target.value)}
                size="small"
                fullWidth
              >
                {LEAVE_REVERTED_OPTIONS.map((o) => (
                  <MenuItem key={`rev-${o.value || "all"}`} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormField>
          </FormGrid>
        );
      }}
    </HrmsAdvancedFilterShell>
  );
}