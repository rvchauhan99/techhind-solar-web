"use client";

import { useMemo } from "react";
import AutocompleteField from "@/components/common/AutocompleteField";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY } from "@/constants/countries";

const toOption = (country) => ({ id: country, name: country });

/**
 * Searchable country field (AutocompleteField). Select from list only — no free-text invent.
 * Static COUNTRY_OPTIONS; India default. Legacy values not in the list are prepended.
 * Emits the same shape as Select: onChange({ target: { name, value: countryString } }).
 */
export default function CountrySelect({
  name = "country",
  label = "Country",
  value,
  onChange,
  fullWidth = true,
  disabled = false,
  required = false,
  error = false,
  helperText = null,
  size = "small",
  className,
}) {
  const selected = value == null || value === "" ? DEFAULT_COUNTRY : String(value);

  const options = useMemo(() => {
    const names =
      selected && !COUNTRY_OPTIONS.includes(selected)
        ? [selected, ...COUNTRY_OPTIONS]
        : COUNTRY_OPTIONS;
    return names.map(toOption);
  }, [selected]);

  const selectedOption = useMemo(
    () => options.find((o) => o.id === selected) || toOption(selected),
    [options, selected]
  );

  const handleChange = (_e, newValue) => {
    if (!onChange) return;
    const next =
      typeof newValue === "string"
        ? newValue
        : newValue?.name ?? newValue?.id ?? newValue?.value ?? "";
    onChange({
      target: {
        name,
        value: next && String(next).trim() !== "" ? String(next) : DEFAULT_COUNTRY,
      },
    });
  };

  return (
    <AutocompleteField
      name={name}
      label={label}
      options={options}
      getOptionLabel={(o) =>
        typeof o === "string" ? o : o?.name ?? o?.label ?? (o?.id != null ? String(o.id) : "")
      }
      value={selectedOption}
      onChange={handleChange}
      placeholder="Type to search..."
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      error={error}
      helperText={helperText}
      size={size}
      className={className}
      clearable={false}
    />
  );
}

export { DEFAULT_COUNTRY, COUNTRY_OPTIONS };
