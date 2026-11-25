"use client";

import { IconSearch, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/**
 * Green-accent quick search input used across listing/report pages.
 * Purely presentational — callers own debounce / apply logic.
 *
 * Optional backward-compatible props:
 * - inputId / inputAriaLabel (defaults to the placeholder) / clearAriaLabel
 * - onEnter(value): immediate apply on Enter; falls back to onValueChange.
 */
export default function OrderListQuickSearch({
  value = "",
  onValueChange,
  onEnter = null,
  isSearching = false,
  placeholder = "Quick Search (Name/Mobile/Order #)",
  inputId,
  inputAriaLabel,
  clearAriaLabel = "Clear quick search",
  className,
  disabled = false,
}) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        aria-hidden="true"
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 transition-colors",
          isSearching ? "text-green-500 animate-pulse" : "text-slate-400",
        )}
      >
        {isSearching ? (
          <div className="h-4 w-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
        ) : (
          <IconSearch size={16} />
        )}
      </div>
      <input
        id={inputId}
        type="text"
        aria-label={inputAriaLabel || placeholder}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-10 pl-10 pr-8 bg-white border-2 border-green-200/60 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all placeholder:text-slate-400 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] disabled:opacity-50"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (onEnter) onEnter(value);
            else onValueChange?.(value);
          }
        }}
      />
      {value && !disabled && (
        <button
          type="button"
          aria-label={clearAriaLabel}
          title={clearAriaLabel}
          onClick={() => onValueChange?.("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors"
        >
          <IconX size={14} />
        </button>
      )}
    </div>
  );
}
