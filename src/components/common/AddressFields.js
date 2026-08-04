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
 * India: state master dropdown (filtered by country=India). Other: free-text State/Province.
 * Emits Select-like events via onChange({ target: { name, value } }).
 */
export default function AddressFields({
  values = {},
  onChange,
  errors = {},
  fieldNames: fieldNamesProp,
  requiredState = true,
  requiredPostal = false,
  showPostal = true,
  disabled = false,
  className,
}) {
  const names = { ...DEFAULT_FIELD_NAMES, ...(fieldNamesProp || {}) };
  const country = normalizeCountry(values[names.country] ?? values.country);
  const india = isIndiaCountry(country);
  const postalRule = getPostalRule(country);

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
    if (isIndiaCountry(next)) {
      emit(names.state, "");
    } else {
      emit(names.state_id, "");
    }
  };

  const loadStates = useMemo(
    () => (q) =>
      getReferenceOptionsSearch("state.model", {
        q,
        limit: 40,
        country: india ? country : "India",
      }),
    [india, country]
  );

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

      {india ? (
        <AutocompleteField
          fullWidth
          name={names.state_id}
          label="State"
          asyncLoadOptions={loadStates}
          referenceModel="state.model"
          getOptionLabel={(o) => o?.name ?? o?.label ?? ""}
          value={stateId ? { id: stateId } : null}
          onChange={(_e, newValue) => {
            emit(names.state_id, newValue?.id ?? "");
            emit(names.state, newValue?.name ?? newValue?.label ?? "");
          }}
          placeholder="Type to search..."
          required={requiredState}
          error={!!(errors[names.state_id] || errors.state_id)}
          helperText={errors[names.state_id] || errors.state_id}
          disabled={disabled}
        />
      ) : (
        <Input
          fullWidth
          name={names.state}
          label="State / Province"
          value={stateText || ""}
          onChange={(e) => emit(names.state, e.target.value)}
          required={requiredState}
          error={!!(errors[names.state] || errors.state_text || errors.state)}
          helperText={errors[names.state] || errors.state_text || errors.state}
          disabled={disabled}
        />
      )}

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
