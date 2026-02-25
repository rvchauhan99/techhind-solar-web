"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FIELD_HEIGHT_CLASS_SMALL, FIELD_TEXT_SMALL } from "@/utils/formConstants";

/**
 * Normalize value to datetime-local format (YYYY-MM-DDTHH:mm).
 * Accepts: ISO string, Date, or empty.
 */
function toDateTimeLocal(value) {
  if (value == null || value === "") return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (!(d instanceof Date) || isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

/**
 * Convert datetime-local string (YYYY-MM-DDTHH:mm) to ISO string.
 */
function fromDateTimeLocal(str) {
  if (!str || typeof str !== "string") return "";
  const d = new Date(str);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

/**
 * Standardized DateTime field (date + time) for use across the project.
 * Value/onChange use ISO strings (e.g. for APIs). Same API as other common fields.
 * Use for "Contacted At", "Next Follow-Up", scheduled times, etc.
 */
const DateTimeField = forwardRef(function DateTimeField(
  {
    name,
    label,
    value,
    onChange,
    error = false,
    helperText = null,
    fullWidth = true,
    size = "small",
    disabled = false,
    required = false,
    min,
    max,
    className,
    ...otherProps
  },
  ref
) {
  const inputValue = toDateTimeLocal(value);
  const minStr = min != null ? toDateTimeLocal(min) : undefined;
  const maxStr = max != null ? toDateTimeLocal(max) : undefined;

  const handleChange = (e) => {
    const next = e.target.value;
    const iso = fromDateTimeLocal(next);
    if (onChange) {
      onChange({ target: { name, value: iso } });
    }
  };

  return (
    <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")}>
      {label && (
        <Label htmlFor={name} className="mb-1.5 block text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <Input
        ref={ref}
        type="datetime-local"
        id={name}
        name={name}
        value={inputValue}
        onChange={handleChange}
        disabled={disabled}
        min={minStr}
        max={maxStr}
        className={cn(
          size === "small" && `${FIELD_HEIGHT_CLASS_SMALL} ${FIELD_TEXT_SMALL}`,
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        {...otherProps}
      />
      {error && helperText && (
        <p className="mt-1.5 text-xs text-destructive">{helperText}</p>
      )}
    </div>
  );
});

DateTimeField.displayName = "DateTimeField";

export default DateTimeField;
