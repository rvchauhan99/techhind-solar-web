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
    onCheckedChange,
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
    // Support Radix/shadcn-style onCheckedChange(boolean) callback
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
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
            "checkbox-theme-green size-4 shrink-0 rounded border border-input bg-background",
            "appearance-none cursor-pointer",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors duration-150",
            "checked:border-[#00823b]",
            "checked:bg-no-repeat checked:bg-center checked:bg-[length:100%_100%]",
            error && "border-destructive"
          )}
          style={
            checked
              ? {
                  backgroundColor: "#00823b",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' d='M13 4L6 11L3 8'/%3E%3C/svg%3E")`,
                }
              : undefined
          }
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
