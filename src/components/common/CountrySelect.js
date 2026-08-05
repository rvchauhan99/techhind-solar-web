"use client";

import { useMemo } from "react";
import AutocompleteField from "@/components/common/AutocompleteField";
import { DEFAULT_COUNTRY } from "@/constants/countries";
import { getReferenceOptionsSearch } from "@/services/mastersService";

/**
 * Searchable country field from Country master. Emits country name string.
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

  const loadCountries = useMemo(
    () => (q) => getReferenceOptionsSearch("country.model", { q, limit: 40 }),
    []
  );

  const handleChange = (_e, newValue) => {
    if (!onChange) return;
    const next =
      typeof newValue === "string"
        ? newValue
        : newValue?.name ?? newValue?.label ?? newValue?.value ?? newValue?.id ?? "";
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
      asyncLoadOptions={loadCountries}
      getOptionLabel={(o) =>
        typeof o === "string" ? o : o?.name ?? o?.label ?? (o?.id != null ? String(o.id) : "")
      }
      value={selected ? { name: selected } : null}
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

export { DEFAULT_COUNTRY };
