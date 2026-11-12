"use client";

import { cn } from "@/lib/utils";

/**
 * TableSkeleton — placeholder rows shown while a table loads.
 *
 * Render inside <tbody>. Returns `rows` <tr> elements, each with `columns` cells,
 * so the table header/column widths stay stable (no blank "Loading…" flash).
 *
 * @param {number} [rows] - Number of skeleton rows (default 6)
 * @param {number} [columns] - Number of cells per row (should match column count)
 * @param {boolean} [compact] - Compact density to match PaginatedTable compactDensity
 */
export default function TableSkeleton({ rows = 6, columns = 4, compact = false }) {
  const count = Math.max(1, Number(rows) || 1);
  const cols = Math.max(1, Number(columns) || 1);
  return (
    <>
      {Array.from({ length: count }).map((_, rowIndex) => (
        <tr key={`skeleton-row-${rowIndex}`} className="border-b border-border last:border-b-0">
          {Array.from({ length: cols }).map((__, colIndex) => (
            <td key={`skeleton-cell-${colIndex}`} className={compact ? "px-1 py-1.5" : "px-1.5 py-2"}>
              <span
                className={cn(
                  "block h-3.5 animate-pulse rounded bg-muted",
                  colIndex === 0 ? "w-32" : colIndex === cols - 1 ? "w-12" : "w-20"
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
