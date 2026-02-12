"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Input from "@/components/common/Input";
import Select, { MenuItem } from "@/components/common/Select";
import {
  COUNTRY_DIAL_CODES,
  parseE164ForInput,
  formatE164,
} from "@/utils/countryCodes";

/**
 * Mobile number field with country code dropdown. Default country: India (+91).
 * Outputs a single E.164 value (e.g. +918123456789) via onChange so parent keeps one mobile_number field.
 */
export default function PhoneField({
  name = "mobile_number",
  label = "Mobile Number",
  value,
  onChange,
  error = false,
  helperText = null,
  required = false,
  disabled = false,
  fullWidth = true,
  size = "small",
  className,
}) {
  const parsed = parseE164ForInput(value);
  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [localNumber, setLocalNumber] = useState(parsed.localNumber);

  useEffect(() => {
    const next = parseE164ForInput(value);
    setCountryCode(next.countryCode);
    setLocalNumber(next.localNumber);
  }, [value]);

  const emitChange = (code, local) => {
    const full = formatE164(code, local);
    if (onChange) {
      onChange({ target: { name, value: full } });
    }
  };

  const handleCountryChange = (e) => {
    const code = e.target.value || "+91";
    setCountryCode(code);
    emitChange(code, localNumber);
  };

  const handleNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    setLocalNumber(raw);
    emitChange(countryCode, raw);
  };

  const id = `phone-${name}`;
  const errorId = `${id}-error`;

  return (
    <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")}>
      {label && (
        <Label htmlFor={id} className="mb-1.5 block text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <div
        className={cn(
          "flex h-11 w-full overflow-hidden rounded-lg border bg-white text-base transition-colors md:text-sm",
          "border-input focus-within:ring-ring/50 focus-within:ring-[3px] focus-within:border-ring",
          error && "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
          disabled && "pointer-events-none cursor-not-allowed opacity-50"
        )}
      >
        <div
          className={cn(
            "w-[120px] shrink-0 border-r bg-muted/30",
            error ? "border-destructive" : "border-input"
          )}
        >
          <Select
            name={`${name}_country`}
            value={countryCode}
            onChange={handleCountryChange}
            disabled={disabled}
            className="h-full min-h-0 w-full border-0 rounded-none bg-transparent shadow-none focus:ring-0 focus-within:ring-0"
            size={size}
          >
            {COUNTRY_DIAL_CODES.map(({ code, label: optionLabel }) => (
              <MenuItem key={code} value={code}>
                {optionLabel}
              </MenuItem>
            ))}
          </Select>
        </div>
        <Input
          id={id}
          name={`${name}_local`}
          type="tel"
          inputMode="numeric"
          placeholder="e.g. 8123456789"
          value={localNumber}
          onChange={handleNumberChange}
          disabled={disabled}
          error={false}
          className="min-w-0 flex-1 rounded-none border-0 border-l-0 bg-transparent px-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          inputProps={{ maxLength: 15 }}
          aria-describedby={error && helperText ? errorId : undefined}
        />
      </div>
      {error && helperText && (
        <p id={errorId} className="mt-1.5 text-xs text-destructive">
          {helperText}
        </p>
      )}
    </div>
  );
}
