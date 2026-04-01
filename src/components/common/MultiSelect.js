"use client";

import { forwardRef, useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FIELD_HEIGHT_CLASS_SMALL, FIELD_TEXT_SMALL } from "@/utils/formConstants";
import { IconChevronDown, IconCheck, IconX } from "@tabler/icons-react";

/**
 * A MultiSelect component designed to look similar to the shadcn-based Select component.
 * Supports searching and multiple selections.
 * 
 * Props:
 * - name: string
 * - label: string
 * - options: Array<{ value: string|number, label: string }>
 * - value: Array<string|number>
 * - onChange: (event: { target: { name: string, value: Array<string|number> } }) => void
 * - error: boolean
 * - helperText: string
 * - fullWidth: boolean
 * - required: boolean
 * - disabled: boolean
 * - placeholder: string
 */
const MultiSelect = forwardRef(function MultiSelect(
    {
        name,
        label,
        options = [],
        value = [],
        onChange,
        error = false,
        helperText = null,
        fullWidth = true,
        size = "small",
        disabled = false,
        required = false,
        placeholder = "Select options...",
        clearable = true,
        searchable = false,
        searchPlaceholder = "Search...",
        asyncLoadOptions,
        asyncDebounceMs = 300,
        className,
        ...otherProps
    },
    ref
) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef(null);
    const [asyncOptions, setAsyncOptions] = useState([]);
    const [asyncLoading, setAsyncLoading] = useState(false);
    const debounceRef = useRef(null);

    const safeValue = Array.isArray(value) ? value : [];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleOutsideClick);
        }
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [isOpen]);

    const handleToggle = () => {
        if (!disabled) {
            const next = !isOpen;
            setIsOpen(next);
            if (!next && searchTerm) {
                setSearchTerm("");
            }
        }
    };

    const handleSelect = (optionValue) => {
        if (disabled) return;
        const isSelected = safeValue.includes(optionValue);
        const newValue = isSelected
            ? safeValue.filter((v) => v !== optionValue)
            : [...safeValue, optionValue];

        if (onChange) {
            onChange({ target: { name, value: newValue } });
        }
    };

    // Async loading of options when asyncLoadOptions is provided
    useEffect(() => {
        if (!asyncLoadOptions || !isOpen) return;

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        const query = searchable ? searchTerm : "";

        debounceRef.current = setTimeout(async () => {
            try {
                setAsyncLoading(true);
                const loaded = await asyncLoadOptions(query);
                setAsyncOptions(Array.isArray(loaded) ? loaded : []);
            } catch {
                setAsyncOptions([]);
            } finally {
                setAsyncLoading(false);
            }
        }, asyncDebounceMs);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [asyncLoadOptions, asyncDebounceMs, isOpen, searchable, searchTerm]);

    // When we already have selected values but no async options yet (e.g. page reload),
    // pre-load the specific option labels so we can show labels instead of raw ids.
    useEffect(() => {
        if (!asyncLoadOptions) return;
        if (!safeValue || safeValue.length === 0) return;
        
        // Check if all selected values already have labels in current asyncOptions
        const allFound = safeValue.every(v => asyncOptions.some(o => String(o.value) === String(v)));
        if (allFound) return;

        let cancelled = false;
        (async () => {
            try {
                setAsyncLoading(true);
                // Fetch labels for all selected IDs
                // We pass the ID to asyncLoadOptions to get the specific record
                const promises = safeValue.map(v => asyncLoadOptions("", v));
                const results = await Promise.all(promises);
                if (cancelled) return;
                
                const newOptions = results.flat().filter(Boolean);
                setAsyncOptions(prev => {
                    const existingIds = new Set(prev.map(o => String(o.value)));
                    const uniqueNew = newOptions.filter(o => !existingIds.has(String(o.value)));
                    return [...prev, ...uniqueNew];
                });
            } catch (err) {
                console.error("[MultiSelect] failed to resolve labels:", err);
            } finally {
                if (!cancelled) setAsyncLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [asyncLoadOptions, safeValue]); // Removed asyncOptions from deps to avoid loop

    const baseOptions = asyncLoadOptions ? asyncOptions : options;

    const selectedOptions = safeValue.map((v) => {
        const found = baseOptions.find((o) => String(o.value) === String(v));
        return found || { value: v, label: String(v) };
    });

    const visibleOptions =
        !searchable || !searchTerm
            ? baseOptions
            : baseOptions.filter((option) =>
                  String(option.label ?? "")
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
              );

    return (
        <div
            className={cn("w-full relative", fullWidth ? "max-w-full" : "max-w-md")}
            ref={(node) => {
                containerRef.current = node;
                if (typeof ref === "function") ref(node);
                else if (ref) ref.current = node;
            }}
        >
            {label && (
                <Label className="mb-1.5 block text-sm font-medium text-foreground">
                    {label}
                    {required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
            )}

            <div
                onClick={handleToggle}
                className={cn(
                    "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer",
                    size === "small" && `min-h-9 ${FIELD_TEXT_SMALL} py-1`,
                    error && "border-destructive focus-visible:ring-destructive",
                    disabled && "cursor-not-allowed opacity-50",
                    isOpen && "ring-2 ring-ring ring-offset-2",
                    className
                )}
                {...otherProps}
            >
                <div className="flex flex-wrap gap-1 items-center flex-1 overflow-hidden pr-2">
                    {selectedOptions.length > 0 ? (
                        <>
                            {selectedOptions.length <= 2 ? (
                                selectedOptions.map((opt) => (
                                    <span
                                        key={opt.value}
                                        className="flex items-center gap-1 bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded text-xs whitespace-nowrap"
                                    >
                                        <span className="truncate max-w-[120px]">{opt.label}</span>
                                        <IconX
                                            size={12}
                                            className="cursor-pointer hover:text-destructive shrink-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelect(opt.value);
                                            }}
                                        />
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm truncate">
                                    {selectedOptions.length} selected
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-muted-foreground truncate">{placeholder}</span>
                    )}
                </div>
                {clearable && !disabled && selectedOptions.length > 0 && (
                    <IconX
                        size={14}
                        className="ml-1 mr-1 cursor-pointer text-muted-foreground hover:text-destructive shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onChange) {
                                onChange({ target: { name, value: [] } });
                            }
                        }}
                        aria-label="Clear selection"
                        title="Clear selection"
                    />
                )}
                <IconChevronDown className="h-4 w-4 opacity-50 shrink-0" />
            </div>

            {isOpen && (
                <div className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80">
                    <div className="p-1">
                        {searchable && (
                            <div className="mb-1 px-1">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder={searchPlaceholder}
                                        className={cn(
                                            "w-full rounded-sm border border-input bg-background px-2 py-1 text-xs outline-none",
                                            FIELD_TEXT_SMALL
                                        )}
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-1 flex items-center text-muted-foreground hover:text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSearchTerm("");
                                            }}
                                        >
                                            <IconX className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        {asyncLoadOptions && asyncLoading && (
                            <div className="py-2 text-center text-xs text-muted-foreground">
                                Loading...
                            </div>
                        )}
                        {visibleOptions.length === 0 && !asyncLoading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No options found.
                            </div>
                        ) : (
                            visibleOptions.map((option) => {
                                const isSelected = safeValue.includes(option.value);
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => handleSelect(option.value)}
                                        className={cn(
                                            "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                            isSelected && "font-semibold"
                                        )}
                                    >
                                        {isSelected && (
                                            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                                <IconCheck className="h-4 w-4" />
                                            </span>
                                        )}
                                        <span className="truncate">{option.label}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {error && helperText && (
                <p className="mt-1.5 text-xs text-destructive">{helperText}</p>
            )}
        </div>
    );
});

MultiSelect.displayName = "MultiSelect";

export default MultiSelect;
