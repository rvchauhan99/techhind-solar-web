"use client";

import { forwardRef, useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FIELD_HEIGHT_CLASS_SMALL, FIELD_TEXT_SMALL } from "@/utils/formConstants";

/**
 * AutocompleteField (shadcn-based). Same API: options, getOptionLabel, value, onChange(e, newValue), label, placeholder, error, helperText, multiple.
 */
const AutocompleteField = forwardRef(function AutocompleteField(
  {
    options = [],
    getOptionLabel = (opt) => (typeof opt === "string" ? opt : opt?.label ?? String(opt)),
    value,
    onChange,
    label,
    placeholder = "Type to search...",
    error = false,
    helperText = null,
    fullWidth = true,
    size = "small",
    multiple = false,
    disabled = false,
    loading = false,
    required = false,
    className,
    ...otherProps
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef(null);

  const displayValue = value != null ? (multiple ? value.map(getOptionLabel).join(", ") : getOptionLabel(value)) : "";
  const filterOptions = options.filter((opt) => {
    const label = getOptionLabel(opt);
    return String(label).toLowerCase().includes(String(inputValue).toLowerCase());
  });

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (option) => {
    if (multiple) {
      const arr = Array.isArray(value) ? [...value] : [];
      const idx = arr.findIndex((o) => getOptionLabel(o) === getOptionLabel(option));
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(option);
      onChange?.({ target: { value: null } }, arr);
    } else {
      onChange?.({ target: { value: null } }, option);
      setInputValue("");
      setOpen(false);
    }
  };

  if (multiple) {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")} ref={containerRef}>
        {label && (
          <Label className="mb-1.5 block text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        )}
        <div className="flex flex-wrap gap-2 rounded-lg border border-input bg-background p-2 min-h-10">
          {selected.map((opt, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleSelect(opt)}
            >
              {getOptionLabel(opt)} ×
            </Badge>
          ))}
          <input
            ref={ref}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={selected.length === 0 ? placeholder : ""}
            disabled={disabled}
            className="flex-1 min-w-[120px] border-0 bg-transparent outline-none text-sm"
          />
        </div>
        {open && filterOptions.length > 0 && (
          <ul className="mt-1 max-h-48 overflow-auto rounded-md border border-border bg-popover py-1 shadow-md z-50">
            {filterOptions.map((opt, i) => (
              <li
                key={i}
                role="option"
                className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
                onClick={() => handleSelect(opt)}
              >
                {getOptionLabel(opt)}
              </li>
            ))}
          </ul>
        )}
        {error && helperText && (
          <p className="mt-1.5 text-xs text-destructive">{helperText}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", fullWidth ? "max-w-full" : "max-w-md")} ref={containerRef}>
      {label && (
        <Label className="mb-1.5 block text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <Input
        ref={ref}
        value={open ? inputValue : displayValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          size === "small" && `${FIELD_HEIGHT_CLASS_SMALL} ${FIELD_TEXT_SMALL}`,
          error && "border-destructive",
          className
        )}
        {...otherProps}
      />
      {open && filterOptions.length > 0 && (
        <ul className="mt-1 max-h-48 overflow-auto rounded-md border border-border bg-popover py-1 shadow-md z-50 absolute left-0 right-0 top-full">
          {filterOptions.map((opt, i) => (
            <li
              key={i}
              role="option"
              className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
              onClick={() => handleSelect(opt)}
            >
              {getOptionLabel(opt)}
            </li>
          ))}
        </ul>
      )}
      {error && helperText && (
        <p className="mt-1.5 text-xs text-destructive">{helperText}</p>
      )}
    </div>
  );
});

AutocompleteField.displayName = "AutocompleteField";

export default AutocompleteField;
