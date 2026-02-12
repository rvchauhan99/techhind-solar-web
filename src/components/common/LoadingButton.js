"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Standard loading button used across forms.
 * - Shows a small spinner when loading
 * - Disables itself while loading
 */
export default function LoadingButton({
  loading = false,
  disabled = false,
  className,
  children,
  ...props
}) {
  const isDisabled = loading || disabled;

  return (
    <Button
      disabled={isDisabled}
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      {loading && (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </Button>
  );
}

