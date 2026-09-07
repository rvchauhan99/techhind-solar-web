"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/**
 * Compact portal picker for BOM substitute products in dense planner tables.
 */
export default function SubstituteProductPicker({
    options = [],
    value = null,
    onChange,
    disabled = false,
    isSubstituted = false,
    displayName = "",
}) {
    const [open, setOpen] = useState(false);
    const [style, setStyle] = useState({});
    const triggerRef = useRef(null);
    const panelRef = useRef(null);

    const selectedId = value?.id != null ? Number(value.id) : null;
    const titleName = displayName || value?.product_name || "Select product";

    const updatePosition = () => {
        if (!triggerRef.current || !open) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const panelWidth = Math.max(280, Math.min(360, window.innerWidth - 16));
        let left = rect.left;
        if (left + panelWidth > window.innerWidth - 8) {
            left = Math.max(8, window.innerWidth - panelWidth - 8);
        }
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const preferTop = spaceBelow < 220 && rect.top > spaceBelow;
        setStyle({
            position: "fixed",
            left,
            width: panelWidth,
            zIndex: 9999,
            ...(preferTop
                ? { bottom: window.innerHeight - rect.top + 4, maxHeight: Math.min(256, rect.top - 12) }
                : { top: rect.bottom + 4, maxHeight: Math.min(256, spaceBelow) }),
        });
    };

    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();
    }, [open, options.length]);

    useEffect(() => {
        if (!open) return;
        const onScrollOrResize = () => updatePosition();
        const onKeyDown = (e) => {
            if (e.key === "Escape") setOpen(false);
        };
        const onPointerDown = (e) => {
            const inTrigger = triggerRef.current?.contains(e.target);
            const inPanel = panelRef.current?.contains(e.target);
            if (!inTrigger && !inPanel) setOpen(false);
        };
        window.addEventListener("scroll", onScrollOrResize, true);
        window.addEventListener("resize", onScrollOrResize);
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("mousedown", onPointerDown);
        return () => {
            window.removeEventListener("scroll", onScrollOrResize, true);
            window.removeEventListener("resize", onScrollOrResize);
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("mousedown", onPointerDown);
        };
    }, [open]);

    const handleSelect = (opt) => {
        onChange?.(opt);
        setOpen(false);
    };

    return (
        <div className="min-w-[200px] max-w-[280px]">
            <div className="flex items-start gap-1">
                <button
                    ref={triggerRef}
                    type="button"
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-label="Choose substitute product"
                    title={titleName}
                    onClick={() => {
                        if (!disabled) setOpen((prev) => !prev);
                    }}
                    className={cn(
                        "flex-1 min-w-0 text-left rounded border border-input bg-background px-1.5 py-1 text-xs leading-snug",
                        "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                        disabled && "opacity-60 cursor-not-allowed"
                    )}
                >
                    <span className="flex items-center gap-1">
                        <span className="truncate font-medium text-foreground">{titleName}</span>
                        <IconChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                    </span>
                </button>
            </div>
            {isSubstituted && (
                <span className="mt-0.5 inline-flex items-center rounded px-1 py-0 text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    Substituted
                </span>
            )}

            {open &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        ref={panelRef}
                        role="listbox"
                        aria-label="Substitute products"
                        className="overflow-hidden rounded-md border border-border bg-popover shadow-lg"
                        style={style}
                    >
                        <div className="flex items-center justify-between gap-2 border-b border-border px-2.5 py-1.5 bg-muted/40">
                            <span className="text-xs font-semibold text-foreground">Choose product</span>
                            <span className="text-[10px] text-muted-foreground">{options.length} options</span>
                        </div>
                        <ul className="overflow-y-auto py-1" style={{ maxHeight: "inherit" }}>
                            {options.map((opt) => {
                                const id = Number(opt.id);
                                const selected = selectedId === id;
                                const meta = [
                                    opt.product_type_name,
                                    opt.product_make_name,
                                    opt.available_qty != null && Number.isFinite(Number(opt.available_qty))
                                        ? `Avail ${opt.available_qty}`
                                        : null,
                                ]
                                    .filter(Boolean)
                                    .join(" · ");
                                return (
                                    <li key={id} role="option" aria-selected={selected}>
                                        <button
                                            type="button"
                                            className={cn(
                                                "w-full text-left px-2.5 py-1.5 transition-colors",
                                                selected ? "bg-muted" : "hover:bg-muted/70"
                                            )}
                                            onClick={() => handleSelect(opt)}
                                        >
                                            <div className="flex items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-xs font-medium text-foreground break-words">
                                                            {opt.product_name || `Product #${id}`}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                "shrink-0 rounded px-1 py-0 text-[10px] font-medium border",
                                                                opt.is_original
                                                                    ? "bg-sky-50 text-sky-800 border-sky-200"
                                                                    : "bg-violet-50 text-violet-800 border-violet-200"
                                                            )}
                                                        >
                                                            {opt.is_original ? "Original" : "Alt"}
                                                        </span>
                                                    </div>
                                                    {meta && (
                                                        <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                                                            {meta}
                                                        </p>
                                                    )}
                                                </div>
                                                {selected && (
                                                    <IconCheck className="size-3.5 shrink-0 text-primary mt-0.5" />
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>,
                    document.body
                )}
        </div>
    );
}
