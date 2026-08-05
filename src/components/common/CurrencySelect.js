"use client";

import { useMemo } from "react";
import AutocompleteField from "@/components/common/AutocompleteField";
import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  normalizeCurrencyCode,
} from "@/constants/currencies";

const toOption = (item) =>
  typeof item === "string"
    ? { id: item, name: item, code: item }
    : {
        id: item.code,
        name: item.label || item.code,
        code: item.code,
      };

/**
 * Searchable currency field. Select from list only.
 * Default INR. Clear resets to INR.
 * Emits Select-like shape: onChange({ target: { name, value: currencyCode } }).
 */
export default function CurrencySelect({
  name = "currency_code",
  label = "Currency",
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
  const selected = normalizeCurrencyCode(value);

  const options = useMemo(() => {
    const base = CURRENCY_OPTIONS.map(toOption);
    if (selected && !base.some((o) => o.code === selected)) {
      return [toOption(selected), ...base];
    }
    return base;
  }, [selected]);

  const selectedOption = useMemo(
    () => options.find((o) => o.code === selected) || toOption(selected),
    [options, selected]
  );

  const handleChange = (_e, newValue) => {
    if (!onChange) return;
    const raw =
      typeof newValue === "string"
        ? newValue
        : newValue?.code ?? newValue?.id ?? newValue?.name ?? "";
    onChange({
      target: {
        name,
        value: normalizeCurrencyCode(raw),
      },
    });
  };

  return (
    <AutocompleteField
      name={name}
      label={label}
      options={options}
      getOptionLabel={(o) =>
        typeof o === "string" ? o : o?.name ?? o?.label ?? (o?.code != null ? String(o.code) : "")
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

export { DEFAULT_CURRENCY, CURRENCY_OPTIONS, normalizeCurrencyCode };
