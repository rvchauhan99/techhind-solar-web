"use client";

import { forwardRef } from "react";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FIELD_HEIGHT_CLASS_SMALL, FIELD_TEXT_SMALL } from "@/utils/formConstants";

/**
 * Standardized Input component (shadcn-based).
 * Same API: name, label, value, onChange, error, helperText, fullWidth, size, multiline, rows.
 * For type="number", value is normalized to a string for the native input so keyboard input
 * and paste both work reliably; parents may still pass number or string.
 */
const Input = forwardRef(function Input(
  {
    name,
    label,
    value,
    onChange,
    type,
    error = false,
    helperText = null,
    fullWidth = true,
    size = "small",
    multiline = false,
    rows,
    disabled = false,
    required = false,
    className,
    inputProps = {},
    ...otherProps
  },
  ref
) {
  // For type="number", always use string so controlled input works reliably across all forms
  const safeValue =
    type === "number"
      ? (value == null || value === "" ? "" : String(value))
      : (value == null ? "" : value);
  const numberInputProps =
    type === "number"
      ? { inputMode: "decimal", step: inputProps.step ?? "0.01", ...inputProps }
      : inputProps;

  if (multiline) {
    return (
      <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")}>
        {label && (
          <Label htmlFor={name} className="mb-1.5 block text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        )}
        <Textarea
          ref={ref}
          id={name}
          name={name}
          value={safeValue}
          onChange={onChange}
          disabled={disabled}
          rows={rows ?? 3}
          className={cn(
            size === "small" && `min-h-9 ${FIELD_TEXT_SMALL}`,
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...inputProps}
          {...otherProps}
        />
        {error && helperText && (
          <p className="mt-1.5 text-xs text-destructive">{helperText}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")}>
      {label && (
        <Label htmlFor={name} className="mb-1.5 block text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <ShadcnInput
        ref={ref}
        id={name}
        name={name}
        type={type}
        value={safeValue}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          size === "small" && `${FIELD_HEIGHT_CLASS_SMALL} ${FIELD_TEXT_SMALL}`,
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        {...(type === "number" ? numberInputProps : inputProps)}
        {...otherProps}
      />
      {error && helperText && (
        <p className="mt-1.5 text-xs text-destructive">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
