"use client";

import { IconSearch, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/**
 * Green-accent quick search input used across order listing pages.
 * Purely presentational — callers own debounce / apply logic.
 */
export default function OrderListQuickSearch({
  value = "",
  onValueChange,
  isSearching = false,
  placeholder = "Quick Search (Name/Mobile/Order #)",
  className,
  disabled = false,
}) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
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
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-10 pl-10 pr-8 bg-white border-2 border-green-200/60 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all placeholder:text-slate-400 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] disabled:opacity-50"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onValueChange?.(value);
        }}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onValueChange?.("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors"
        >
          <IconX size={14} />
        </button>
      )}
    </div>
  );
}
