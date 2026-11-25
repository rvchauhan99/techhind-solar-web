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

export { monthDateBounds };

export const ATTENDANCE_STATUS_OPTIONS = [
  { value: "IN", label: "In" },
  { value: "OUT", label: "Out" },
  { value: "BREAK_IN", label: "Break in" },
  { value: "BREAK_OUT", label: "Break out" },
];

export const ATTENDANCE_OPEN_OPTIONS = [
  { value: "", label: "All punches" },
  { value: "1", label: "Open (not punched out)" },
  { value: "0", label: "Completed" },
];

export const ATTENDANCE_CHANNEL_OPTIONS = [
  { value: "", label: "All channels" },
  { value: "WEB", label: "Web" },
  { value: "APP", label: "App" },
];

export const ATTENDANCE_YES_NO_OPTIONS = [
  { value: "", label: "All" },
  { value: "1", label: "Yes" },
  { value: "0", label: "No" },
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
  status: "Status",
  open: "Punch state",
  channel: "Channel",
  auto_checked_out: "Auto punch-out",
  is_half_day: "Half day",
};

/**
 * Advanced filter toolbar for /hrms/attendance — date range + every list field.
 */
export default function AttendanceFilterPanel({
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
        status: (raw) => optionLabel(ATTENDANCE_STATUS_OPTIONS, raw),
        open: (raw) => optionLabel(ATTENDANCE_OPEN_OPTIONS, raw),
        channel: (raw) => optionLabel(ATTENDANCE_CHANNEL_OPTIONS, raw),
        auto_checked_out: (raw) => optionLabel(ATTENDANCE_YES_NO_OPTIONS, raw),
        is_half_day: (raw) => optionLabel(ATTENDANCE_YES_NO_OPTIONS, raw),
        month: (raw) =>
          monthOptions.find((o) => String(o.value) === String(raw))?.label || raw,
      }),
    [values, monthOptions]
  );

  return (
    <HrmsAdvancedFilterShell
      panelId="attendance-advanced-filters"
      values={values}
      chips={chips}
      quickSearch={quickSearch}
      quickSearchPlaceholder="Quick Search (Employee Name / Emp Code)"
      quickSearchId="attendance-quick-search"
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
                name="status"
                label="Punch status"
                value={draft.status ?? ""}
                onChange={(e) => setDraftValue("status", e.target.value)}
                size="small"
                fullWidth
              >
                <MenuItem value="">All statuses</MenuItem>
                {ATTENDANCE_STATUS_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormField>

            <FormField>
              <Select
                name="open"
                label="Punch state"
                value={draft.open ?? ""}
                onChange={(e) => setDraftValue("open", e.target.value)}
                size="small"
                fullWidth
              >
                {ATTENDANCE_OPEN_OPTIONS.map((o) => (
                  <MenuItem key={o.value || "all"} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormField>
            <FormField>
              <Select
                name="channel"
                label="Channel"
                value={draft.channel ?? ""}
                onChange={(e) => setDraftValue("channel", e.target.value)}
                size="small"
                fullWidth
              >
                {ATTENDANCE_CHANNEL_OPTIONS.map((o) => (
                  <MenuItem key={o.value || "all-ch"} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormField>
            <FormField>
              <Select
                name="auto_checked_out"
                label="Auto punch-out"
                value={draft.auto_checked_out ?? ""}
                onChange={(e) => setDraftValue("auto_checked_out", e.target.value)}
                size="small"
                fullWidth
              >
                {ATTENDANCE_YES_NO_OPTIONS.map((o) => (
                  <MenuItem key={`auto-${o.value || "all"}`} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormField>
            <FormField>
              <Select
                name="is_half_day"
                label="Half day"
                value={draft.is_half_day ?? ""}
                onChange={(e) => setDraftValue("is_half_day", e.target.value)}
                size="small"
                fullWidth
              >
                {ATTENDANCE_YES_NO_OPTIONS.map((o) => (
                  <MenuItem key={`half-${o.value || "all"}`} value={o.value}>
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
