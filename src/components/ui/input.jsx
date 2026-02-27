import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// MUI-style props that must not be forwarded to the DOM (strip and apply inputProps contents instead)
const DOM_EXCLUDED_PROPS = [
  "InputLabelProps",
  "InputProps",
  "inputProps",
  "FormControlProps",
  "FormHelperTextProps",
  "SelectProps",
  "startAdornment",
  "endAdornment",
];

const Input = forwardRef(function Input({ className, type, ...props }, ref) {
  const domProps = { ...props };
  const inputProps = domProps.inputProps;
  DOM_EXCLUDED_PROPS.forEach((key) => delete domProps[key]);
  if (inputProps && typeof inputProps === "object" && !Array.isArray(inputProps)) {
    Object.assign(domProps, inputProps);
  }
  // Satisfy React: value without onChange must be read-only
  if ("value" in domProps && domProps.onChange == null) {
    domProps.readOnly = true;
  }
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "w-full h-9 border border-slate-300 rounded-md px-2.5 py-1.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-colors placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
        className
      )}
      {...domProps}
    />
  );
});

export { Input };
