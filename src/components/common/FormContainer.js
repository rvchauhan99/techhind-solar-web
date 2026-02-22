"use client";

import { Children, isValidElement } from "react";
import { cn } from "@/lib/utils";

/**
 * FormContainer: scrollable form area + sticky FormActions at bottom.
 * Same API: children, maxHeight, sx (ignored; use className for Tailwind).
 */
export default function FormContainer({
  children,
  maxHeight = null,
  className,
  sx = {},
}) {
  const formActions = [];
  const otherChildren = [];

  Children.forEach(children, (child) => {
    if (
      isValidElement(child) &&
      (child.type?.displayName === "FormActions" || child.type?.name === "FormActions")
    ) {
      formActions.push(child);
    } else {
      otherChildren.push(child);
    }
  });

  return (
    <div
      className={cn(
        "flex flex-col min-h-0 flex-1",
        maxHeight && "max-h-[var(--form-max-height)]",
        className
      )}
      style={maxHeight ? { "--form-max-height": maxHeight } : undefined}
    >
      <div
        className={cn(
          "flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 w-full max-w-full",
          "[scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30"
        )}
      >
        {otherChildren}
      </div>
      {formActions.length > 0 && (
        <div className="shrink-0">{formActions}</div>
      )}
    </div>
  );
}

/**
 * FormActions: sticky action buttons at bottom.
 */
export function FormActions({ children, className, sx = {} }) {
  return (
    <div
      className={cn(
        "shrink-0 p-3 flex gap-3 justify-end relative",
        className
      )}
    >
      {children}
    </div>
  );
}

FormActions.displayName = "FormActions";
