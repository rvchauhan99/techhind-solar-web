"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconFilter, IconChevronDown, IconChevronUp, IconX } from "@tabler/icons-react";
import OrderListQuickSearch from "@/components/common/OrderListQuickSearch";

/**
 * Shared Advanced Filters chrome for HRMS list/report pages.
 * Page-specific panels supply chips + field children via render prop.
 *
 * children({ draft, setDraft, setDraftValue }) => ReactNode
 */
export default function HrmsAdvancedFilterShell({
  panelId = "hrms-advanced-filters",
  values = {},
  chips = [],
  quickSearch = "",
  quickSearchPlaceholder = "Quick Search…",
  quickSearchId,
  activeCount = 0,
  defaultOpen = false,
  resetLabel = "Reset to this month",
  applyLabel = "Apply Filters",
  onQuickSearch,
  onApply,
  onReset,
  onRemove,
  prepareApply,
  children,
}) {
  // Product rule: drawer always starts closed regardless of legacy defaultOpen props.
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => ({ ...values }));
  const valuesKey = useMemo(() => JSON.stringify(values || {}), [values]);

  useEffect(() => {
    setDraft((prev) => ({ ...prev, ...(values || {}) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesKey]);

  const [searchInput, setSearchInput] = useState(quickSearch);
  useEffect(() => setSearchInput(quickSearch), [quickSearch]);
  const debounceRef = useRef(null);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleQuickChange = (val) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onQuickSearch?.(val), 450);
  };

  const setDraftValue = (key, value) => setDraft((p) => ({ ...p, [key]: value ?? "" }));

  const handleApply = () => {
    const next = typeof prepareApply === "function" ? prepareApply(draft) : draft;
    onApply?.(next);
    setOpen(false);
  };

  return (
    <Card className="mb-2 overflow-visible rounded-xl border-slate-200 bg-white shadow-sm">
      <div className="flex h-auto flex-col items-center gap-2 px-2.5 py-1.5 sm:h-12 sm:flex-row">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-50 focus:outline-none"
        >
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-slate-700">
            <IconFilter size={14} /> Advanced Filters
            {activeCount > 0 && (
              <Badge
                variant="secondary"
                className="h-4 border-green-200 bg-green-100 px-1 text-[10px] leading-none text-green-700"
              >
                {activeCount}
              </Badge>
            )}
          </span>
          {open ? (
            <IconChevronUp size={14} className="text-slate-400" />
          ) : (
            <IconChevronDown size={14} className="text-slate-400" />
          )}
        </button>

        <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto py-1">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onRemove?.(chip.key)}
              title={`Remove ${chip.label} filter`}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-green-700 transition-colors hover:bg-green-100"
            >
              <span>{chip.label}:</span> {chip.text}
              <IconX size={10} />
            </button>
          ))}
        </div>

        <OrderListQuickSearch
          value={searchInput}
          onValueChange={handleQuickChange}
          onEnter={(v) => {
            clearTimeout(debounceRef.current);
            onQuickSearch?.(v);
          }}
          inputId={quickSearchId || `${panelId}-quick-search`}
          placeholder={quickSearchPlaceholder}
          className="w-full sm:w-80"
        />
      </div>

      {open && (
        <div id={panelId} className="border-t border-slate-100 bg-slate-50/30 px-2.5 py-2.5">
          {typeof children === "function"
            ? children({ draft, setDraft, setDraftValue })
            : children}
          <div className="mt-2 flex items-center justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => onReset?.()}>
              {resetLabel}
            </Button>
            <Button size="sm" onClick={handleApply}>
              {applyLabel}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Build chips from CHIP_LABELS map + optional formatters. */
export function buildFilterChips(values, chipLabels, formatters = {}) {
  return Object.entries(chipLabels)
    .map(([key, label]) => {
      const raw = values?.[key];
      if (raw == null || String(raw).trim() === "") return null;
      if (typeof formatters[key] === "function") {
        const formatted = formatters[key](raw, values);
        if (formatted == null) return null;
        return { key, label, text: String(formatted) };
      }
      return { key, label, text: String(raw) };
    })
    .filter(Boolean);
}

export function optionLabel(options, raw) {
  return options.find((o) => String(o.value) === String(raw))?.label || String(raw);
}
