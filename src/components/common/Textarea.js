"use client";

import { forwardRef } from "react";
import { Textarea as UiTextarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FIELD_TEXT_SMALL } from "@/utils/formConstants";

/**
 * Standardized Textarea component for use across the project.
 * Same API as other common fields: name, label, value, onChange, error, helperText, fullWidth.
 * Use wherever multi-line text input is required (notes, remarks, descriptions, etc.).
 */
const Textarea = forwardRef(function Textarea(
  {
    name,
    label,
    value,
    onChange,
    error = false,
    helperText = null,
    fullWidth = true,
    size = "small",
    minRows = 3,
    rows,
    disabled = false,
    required = false,
    placeholder,
    className,
    ...otherProps
  },
  ref
) {
  const safeValue = value == null ? "" : value;
  const rowCount = rows ?? minRows;

  return (
    <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")}>
      {label && (
        <Label htmlFor={name} className="mb-1.5 block text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <UiTextarea
        ref={ref}
        id={name}
        name={name}
        value={safeValue}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        rows={rowCount}
        className={cn(
          size === "small" && FIELD_TEXT_SMALL,
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

Textarea.displayName = "Textarea";

export default Textarea;
