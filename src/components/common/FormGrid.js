"use client";

import { cn } from "@/lib/utils";

/**
 * Responsive grid for form fields. Uses gap-2 (compact ERP spacing).
 * Columns: 1 on mobile, 2 on md, 3 on lg. Use for consistent form layout.
 *
 * @param {React.ReactNode} children - Grid items (field components)
 * @param {string} [className] - Optional class for the grid
 * @param {number} [cols] - Optional override: 1, 2, or 3 for max columns (default 3 on lg)
 */
export default function FormGrid({
  children,
  className,
  cols = 3,
}) {
  const gridColsClass =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div
      className={cn(
        "grid gap-2 w-full",
        gridColsClass,
        className
      )}
    >
      {children}
    </div>
  );
}
