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

export const ATTENDANCE_REPORT_TYPE_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late mark" },
  { value: "half_day", label: "Half day" },
  { value: "absent", label: "Absent" },
  { value: "leave", label: "On leave" },
  { value: "lwp", label: "LWP" },
  { value: "holiday", label: "Holiday" },
  { value: "week_off", label: "Week off" },
  { value: "mis_punch", label: "Mis punch" },
];

const CHIP_LABELS = {
  q: "Search",
  from: "From",
  to: "To",
  year: "Year",
  month: "Month",
  department_id: "Department",
  designation_id: "Designation",
  employee_id: "Employee",
  attendance_type: "Type",
};

/**
 * Advanced filter toolbar for /hrms/reports/attendance —
 * year/month presets + from/to day range + org + type + quick search.
 */
export default function AttendanceReportFilterPanel({
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
  resolveDepartment,
  resolveDesignation,
  resolveEmployee,
}) {
  const chips = useMemo(
    () =>
      buildFilterChips(values, CHIP_LABELS, {
        attendance_type: (raw) => optionLabel(ATTENDANCE_REPORT_TYPE_OPTIONS, raw),
        month: (raw) =>
          monthOptions.find((o) => String(o.value) === String(raw))?.label || raw,
      }),
    [values, monthOptions]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="attendance-report-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Employee Name / Emp Code)"
      quickSearchId="attendance-report-quick-search"
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
        const bounds = monthDateBounds(year, month);
        let from = draft.from || "";
        let to = draft.to || "";
        if (!from || !to) {
          from = from || bounds.from;
          to = to || bounds.to;
        }
        return {
          ...draft,
          year: String(year),
          month: String(month),
          from,
          to,
        };
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
                label="From date"
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
                label="To date"
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
              <Select
                name="attendance_type"
                label="Attendance type"
                value={draft.attendance_type ?? ""}
                onChange={(e) => setDraftValue("attendance_type", e.target.value)}
                size="small"
                fullWidth
              >
                <MenuItem value="">All types</MenuItem>
                {ATTENDANCE_REPORT_TYPE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
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
