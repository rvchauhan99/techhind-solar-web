"use client";

import { Button } from "@/components/ui/button";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import DateField from "@/components/common/DateField";
import SearchInput from "@/components/common/SearchInput";

const FILTER_ALL_VALUE = "__all__";

/**
 * Config-driven filter bar for listing pages. Renders compact controls (Input, DateField, Select)
 * at standard height (h-10). Values and onChange are typically driven by URL state (useListingQueryState).
 */
export default function FilterBar({
  filterConfig = [],
  values = {},
  onChange,
  onClear,
}) {
  const hasAnyValue = Object.values(values).some(
    (v) => v != null && String(v).trim() !== ""
  );

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border-b border-border">
      {filterConfig.map((config) => {
        const { key, label, type, options = [] } = config;
        const value = values[key] ?? "";

        if (type === "search") {
          return (
            <div key={key} className="min-w-[200px] flex-1 flex-[1_1_200px]">
              <SearchInput
                placeholder={label}
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                fullWidth
                size="small"
              />
            </div>
          );
        }

        if (type === "date") {
          return (
            <div key={key} className="min-w-[160px] max-w-[200px]">
              <DateField
                name={key}
                label=""
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                size="small"
                fullWidth
              />
            </div>
          );
        }

        if (type === "select") {
          return (
            <div key={key} className="min-w-[160px] max-w-[220px]">
              <Select
                name={key}
                label=""
                value={value === "" || value == null ? FILTER_ALL_VALUE : value}
                onChange={(e) =>
                  onChange(key, e.target.value === FILTER_ALL_VALUE ? "" : e.target.value)
                }
                placeholder={label}
                size="small"
                fullWidth
              >
                <MenuItem value={FILTER_ALL_VALUE}>All</MenuItem>
                {options.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </div>
          );
        }

        return (
          <div key={key} className="min-w-[160px] max-w-[200px]">
            <Input
              name={key}
              label=""
              placeholder={label}
              value={value}
              onChange={(e) => onChange(key, e.target.value)}
              size="small"
              fullWidth
            />
          </div>
        );
      })}
      {onClear && hasAnyValue && (
        <Button size="sm" variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
