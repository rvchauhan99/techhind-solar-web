"use client";

import { IconList } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/**
 * Small, professional result-count chip for listing pages.
 *
 * Render it above a `PaginatedTable` and feed `total` from the table's
 * `onTotalChange` callback. Shows "N records" (singular/plural aware) so every
 * list page has a compact, always-visible count that matches the filtered result.
 *
 * @param {number|null} total      Total rows returned for the current filters (null => loading)
 * @param {boolean} [loading]      Force the skeleton state
 * @param {string} [labelOne]      Singular noun (default "record")
 * @param {string} [labelMany]     Plural noun (default "records")
 * @param {string} [context]       Optional qualifier, e.g. "matching filters"
 * @param {string} [className]     Extra classes
 */
export default function ListCount({
  total,
  loading = false,
  labelOne = "record",
  labelMany = "records",
  context,
  className,
}) {
  if (loading || total == null) {
    return (
      <span
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5",
          className
        )}
        aria-hidden="true"
      >
        <span className="h-2.5 w-14 animate-pulse rounded bg-muted" />
      </span>
    );
  }

  const n = Number.isFinite(total) ? total : 0;

  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 text-xs font-medium text-muted-foreground",
        className
      )}
      role="status"
      aria-label={`${n} ${n === 1 ? labelOne : labelMany}${context ? ` ${context}` : ""}`}
    >
      <IconList className="size-3.5 shrink-0 text-[#1b365d]" />
      <span className="font-semibold tabular-nums text-foreground">{n.toLocaleString()}</span>
      <span>{n === 1 ? labelOne : labelMany}</span>
      {context ? <span className="hidden text-muted-foreground/70 sm:inline">· {context}</span> : null}
    </span>
  );
}
