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
        "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 file:text-foreground placeholder:text-muted-foreground h-11 w-full min-w-0 rounded-lg border bg-white px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-[3px] md:text-sm",
        className
      )}
      {...domProps}
    />
  );
});

export { Input };
