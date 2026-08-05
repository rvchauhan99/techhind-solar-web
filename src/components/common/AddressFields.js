"use client";

import { useMemo } from "react";
import CountrySelect, { DEFAULT_COUNTRY } from "@/components/common/CountrySelect";
import AutocompleteField from "@/components/common/AutocompleteField";
import Input from "@/components/common/Input";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { getPostalRule, isIndiaCountry, normalizeCountry } from "@/constants/postalRules";

const DEFAULT_FIELD_NAMES = {
  country: "country",
  state_id: "state_id",
  state: "state_text",
  pincode: "pincode",
};

/**
 * Shared country → state → postal block.
 * Country and State always from masters; State filtered by selected country.
 * Emits state name text always; emits state_id when includeStateId is true.
 */
export default function AddressFields({
  values = {},
  onChange,
  errors = {},
  fieldNames: fieldNamesProp,
  includeStateId = true,
  requiredState = true,
  requiredPostal = false,
  showPostal = true,
  disabled = false,
  className,
}) {
  const names = { ...DEFAULT_FIELD_NAMES, ...(fieldNamesProp || {}) };
  const country = normalizeCountry(values[names.country] ?? values.country);
  const postalRule = getPostalRule(country);
  const persistStateId = includeStateId !== false;

  const stateId = values[names.state_id] ?? values.state_id ?? "";
  const stateText = values[names.state] ?? values.state_text ?? values.state ?? "";
  const pincode = values[names.pincode] ?? values.pincode ?? values.pin_code ?? "";

  const emit = (name, value) => {
    if (!onChange) return;
    onChange({ target: { name, value } });
  };

  const handleCountryChange = (e) => {
    const next = normalizeCountry(e?.target?.value);
    emit(names.country, next);
    emit(names.state, "");
    if (persistStateId) {
      emit(names.state_id, "");
    }
  };

  const loadStates = useMemo(
    () => (q) =>
      getReferenceOptionsSearch("state.model", {
        q,
        limit: 40,
        country,
      }),
    [country]
  );

  const stateValue = useMemo(() => {
    if (persistStateId && stateId) {
      return { id: stateId, name: stateText || undefined };
    }
    if (stateText) {
      return { name: stateText };
    }
    return null;
  }, [persistStateId, stateId, stateText]);

  return (
    <>
      <CountrySelect
        fullWidth
        name={names.country}
        label="Country"
        value={country}
        onChange={handleCountryChange}
        disabled={disabled}
        className={className}
      />

      <AutocompleteField
        fullWidth
        name={persistStateId ? names.state_id : names.state}
        label="State"
        asyncLoadOptions={loadStates}
        referenceModel={persistStateId ? "state.model" : undefined}
        getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
        value={stateValue}
        onChange={(_e, newValue) => {
          const stateName = newValue?.name ?? newValue?.label ?? "";
          emit(names.state, stateName);
          if (persistStateId) {
            emit(names.state_id, newValue?.id ?? "");
          }
        }}
        placeholder="Type to search..."
        required={requiredState}
        error={
          !!(
            errors[names.state_id] ||
            errors.state_id ||
            errors[names.state] ||
            errors.state_text ||
            errors.state
          )
        }
        helperText={
          errors[names.state_id] ||
          errors.state_id ||
          errors[names.state] ||
          errors.state_text ||
          errors.state
        }
        disabled={disabled}
      />

      {showPostal && (
        <Input
          fullWidth
          name={names.pincode}
          label={postalRule.label}
          value={pincode || ""}
          onChange={(e) => emit(names.pincode, e.target.value)}
          required={requiredPostal}
          error={!!(errors[names.pincode] || errors.pincode || errors.pin_code)}
          helperText={errors[names.pincode] || errors.pincode || errors.pin_code}
          placeholder={postalRule.placeholder}
          inputProps={postalRule.maxLength ? { maxLength: postalRule.maxLength } : undefined}
          disabled={disabled}
        />
      )}
    </>
  );
}

export { DEFAULT_COUNTRY, isIndiaCountry, normalizeCountry, getPostalRule };
