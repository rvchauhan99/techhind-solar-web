"use client";

import { cn } from "@/lib/utils";

/**
 * FormField: wrapper for consistent field styling and error display.
 * Same API: children, error, helperText, sx (use className).
 */
export default function FormField({
  children,
  error = false,
  helperText = null,
  className,
  sx = {},
}) {
  return (
    <div className={cn("w-full", className)}>
      {children}
      {error && helperText && (
        <p className="mt-1.5 text-xs text-destructive ml-0">{helperText}</p>
      )}
    </div>
  );
}
