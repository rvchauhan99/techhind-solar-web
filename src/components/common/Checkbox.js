"use client";

import { forwardRef, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FIELD_TEXT_SMALL } from "@/utils/formConstants";

/**
 * Standardized Checkbox (Tailwind + ui Label). Same API as MUI FormControlLabel + Checkbox:
 * name, label, checked, onChange, error, helperText, disabled.
 * Use for all form checkboxes; do not use raw MUI Checkbox or FormControlLabel.
 */
const Checkbox = forwardRef(function Checkbox(
  {
    name,
    label,
    checked = false,
    indeterminate = false,
    onChange,
    error = false,
    helperText = null,
    disabled = false,
    required = false,
    className,
    ...otherProps
  },
  ref
) {
  const inputRef = useRef(null);
  const resolvedRef = ref || inputRef;

  useEffect(() => {
    if (resolvedRef?.current) {
      resolvedRef.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate, resolvedRef]);

  const handleChange = (e) => {
    if (onChange) {
      const syntheticEvent = {
        target: { name, value: e.target.checked, checked: e.target.checked },
      };
      onChange(syntheticEvent);
    }
  };

  return (
    <div className={cn("w-full flex flex-col gap-0.5", className)}>
      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          ref={resolvedRef}
          type="checkbox"
          id={name}
          name={name}
          checked={!!checked}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "size-4 rounded border-input border bg-background accent-primary",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive"
          )}
          {...otherProps}
        />
        {label && (
          <Label
            htmlFor={name}
            className={cn(
              FIELD_TEXT_SMALL,
              "font-medium cursor-pointer group-disabled:opacity-50"
            )}
          >
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        )}
      </label>
      {error && helperText && (
        <p className="mt-1.5 text-xs text-destructive">{helperText}</p>
      )}
    </div>
  );
});

Checkbox.displayName = "Checkbox";

export default Checkbox;
