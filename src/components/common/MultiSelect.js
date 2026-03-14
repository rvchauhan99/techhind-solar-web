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
        className,
        ...otherProps
    },
    ref
) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

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
        if (!disabled) setIsOpen(!isOpen);
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

    const selectedOptions = options.filter((o) => safeValue.includes(o.value));

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
                <IconChevronDown className="h-4 w-4 opacity-50 shrink-0" />
            </div>

            {isOpen && (
                <div className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80">
                    <div className="p-1">
                        {options.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No options found.
                            </div>
                        ) : (
                            options.map((option) => {
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
