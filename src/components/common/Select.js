"use client";

import { forwardRef, Children, isValidElement } from "react";
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FIELD_HEIGHT_CLASS_SMALL, FIELD_TEXT_SMALL } from "@/utils/formConstants";

/**
 * MenuItem-compatible option for use with Select. Use like: <Select><MenuItem value="x">Label</MenuItem></Select>
 */
export function MenuItem({ value, children }) {
  return (
    <SelectItem value={value == null ? "" : String(value)}>
      {children}
    </SelectItem>
  );
}

/**
 * Standardized Select (shadcn-based). Same API: name, label, value, onChange, children (MenuItem or SelectItem), error, helperText.
 * onChange receives event with event.target.value.
 */
const Select = forwardRef(function Select(
  {
    name,
    label,
    value,
    onChange,
    children,
    error = false,
    helperText = null,
    fullWidth = true,
    size = "small",
    multiple = false,
    disabled = false,
    required = false,
    renderValue = null,
    placeholder = "Select...",
    className,
    ...otherProps
  },
  ref
) {
  const stringValue = value == null ? "" : String(value);

  const options = Children.toArray(children)
    .filter(
      (child) =>
        isValidElement(child) &&
        (child.type === SelectItem ||
          child.type === MenuItem ||
          child.props?.value != null)
    )
    .map((child) => {
      const v = child.props?.value;
      const labelText =
        typeof child.props?.children === "string"
          ? child.props.children
          : child.props?.children;
      return {
        value: v == null ? "" : String(v),
        label: labelText ?? String(v),
      };
    });

  const handleValueChange = (v) => {
    if (onChange) {
      const syntheticEvent = {
        target: { name, value: v ?? "" },
      };
      onChange(syntheticEvent);
    }
  };

  if (multiple) {
    return (
      <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")}>
        {label && (
          <Label className="mb-1.5 block text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        )}
        <p className="text-sm text-muted-foreground">
          Multiple select: use a multi-select component. This Select supports single only.
        </p>
        {error && helperText && (
          <p className="mt-1.5 text-xs text-destructive">{helperText}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")} ref={ref}>
      {label && (
        <Label htmlFor={name} className="mb-1.5 block text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <ShadcnSelect
        value={stringValue === "" ? "__empty__" : stringValue}
        onValueChange={(v) => handleValueChange(v === "__empty__" ? "" : v)}
        disabled={disabled}
        {...otherProps}
      >
        <SelectTrigger
          id={name}
          className={cn(
            "w-full",
            size === "small" && `${FIELD_HEIGHT_CLASS_SMALL} ${FIELD_TEXT_SMALL}`,
            error && "border-destructive",
            className
          )}
        >
          <SelectValue placeholder={placeholder}>
            {renderValue
              ? renderValue(stringValue)
              : stringValue
                ? options.find((o) => o.value === stringValue)?.label ?? stringValue
                : placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__empty__">{placeholder}</SelectItem>
          {Children.map(children, (child) => {
            if (!isValidElement(child)) return null;
            const v = child.props?.value;
            if (v == null && child.type !== SelectItem && child.type !== MenuItem)
              return null;
            const val = v == null ? "" : String(v);
            if (val === "__empty__" || val === "") return null;
            return (
              <SelectItem key={val} value={val}>
                {child.props?.children}
              </SelectItem>
            );
          })}
        </SelectContent>
      </ShadcnSelect>
      {error && helperText && (
        <p className="mt-1.5 text-xs text-destructive">{helperText}</p>
      )}
    </div>
  );
});

Select.displayName = "Select";

export default Select;
