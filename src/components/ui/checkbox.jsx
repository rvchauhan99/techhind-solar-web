"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Controlled checkbox compatible with shadcn-style `checked` + `onCheckedChange(boolean)`.
 */
const Checkbox = React.forwardRef(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      role="checkbox"
      disabled={disabled}
      checked={Boolean(checked)}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(
        "size-4 shrink-0 cursor-pointer rounded border border-input bg-white accent-[#00823b] shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
