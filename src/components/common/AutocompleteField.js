"use client";

import { forwardRef, useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FIELD_HEIGHT_CLASS_SMALL, FIELD_TEXT_SMALL } from "@/utils/formConstants";
import mastersService from "@/services/mastersService";

const DROPDOWN_Z_INDEX = 9999;
const DROPDOWN_MAX_HEIGHT = 192; // max-h-48 = 12rem = 192px

/**
 * AutocompleteField (shadcn-based). Same API: options, getOptionLabel, value, onChange(e, newValue), label, placeholder, error, helperText, multiple.
 * When asyncLoadOptions is provided, runs in async mode: debounced API fetch, loading/error/empty states, selected-option cache.
 */
const AutocompleteField = forwardRef(function AutocompleteField(
  {
    options = [],
    getOptionLabel = (opt) => (typeof opt === "string" ? opt : opt?.label ?? String(opt)),
    value,
    onChange,
    label,
    placeholder = "Type to search...",
    error = false,
    helperText = null,
    fullWidth = true,
    size = "small",
    multiple = false,
    disabled = false,
    loading: externalLoading = false,
    required = false,
    className,
    // Async/API-backed mode
    asyncLoadOptions,
    asyncDefaultOptions = [],
    asyncDebounceMs = 300,
    resolveOptionById,
    referenceModel,
    ...otherProps
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState(null);

  const isAsyncMode = Boolean(asyncLoadOptions);
  const resolveById = resolveOptionById ?? (referenceModel ? (id) => mastersService.getReferenceOptionById(referenceModel, id) : null);
  const resolveByIdRef = useRef(resolveById);
  resolveByIdRef.current = resolveById;
  const asyncLoadOptionsRef = useRef(asyncLoadOptions);
  asyncLoadOptionsRef.current = asyncLoadOptions;
  const [asyncOptions, setAsyncOptions] = useState(asyncDefaultOptions);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [asyncError, setAsyncError] = useState(null);
  const [defaultResolving, setDefaultResolving] = useState(false);
  const debounceTimeoutRef = useRef(null);
  const loadingDelayRef = useRef(null);
  const initialOptionsLoadedRef = useRef(false);
  const defaultResolveValueIdRef = useRef(null); // valueId we last attempted to resolve (so we only pre-load once per value)
  const selectedOptionCacheRef = useRef(null);
  const openRef = useRef(open);
  const inputValueRef = useRef(inputValue);

  // Normalize value to a primitive id when it's an object (e.g. { id: 123 }) to avoid "[object Object]" and match options correctly
  const valueId =
    value == null
      ? null
      : multiple
        ? value
        : typeof value === "object" && value !== null
          ? value?.id ?? value?.value
          : value;

  const displayOptions = isAsyncMode ? asyncOptions : options;
  const filterOptions = isAsyncMode
    ? displayOptions
    : options.filter((opt) => {
        const lbl = getOptionLabel(opt);
        return String(lbl).toLowerCase().includes(String(inputValue).toLowerCase());
      });

  // Keep selected option cache in sync when value or options change
  useEffect(() => {
    if (value == null) {
      selectedOptionCacheRef.current = null;
      return;
    }
    if (multiple) return;
    const id = valueId;
    const found =
      options.find((o) => (o?.id ?? o?.value) == id) ??
      asyncOptions.find((o) => (o?.id ?? o?.value) == id);
    if (found) {
      selectedOptionCacheRef.current = found;
    } else if (
      !selectedOptionCacheRef.current ||
      (selectedOptionCacheRef.current?.id ?? selectedOptionCacheRef.current?.value) != id
    ) {
      // Fallback cache: use primitive id so label is never "[object Object]"
      selectedOptionCacheRef.current = { id: id, value: id, label: id != null ? String(id) : "" };
    }
  }, [value, valueId, options, asyncOptions, multiple]);

  // Reset resolve ref when value is cleared so we can resolve again if the same id is set later
  useEffect(() => {
    if (valueId == null) defaultResolveValueIdRef.current = null;
  }, [valueId]);

  // Pre-load default options when we have a selected value (valueId) but no options yet, so we can show the display label instead of the id.
  // Use resolveByIdRef so parent re-renders (new function ref) don't cancel the in-flight request.
  useEffect(() => {
    if (!isAsyncMode || valueId == null || multiple) return;
    const found = asyncOptions.find((o) => (o?.id ?? o?.value) == valueId);
    if (found) return;
    if (defaultResolveValueIdRef.current === valueId) return; // already attempted for this value
    defaultResolveValueIdRef.current = valueId;
    setDefaultResolving(true);
    let cancelled = false;
    const resolver = resolveByIdRef.current;
    const loader = asyncLoadOptionsRef.current;
    (async () => {
      try {
        if (resolver) {
          const option = await resolver(valueId);
          if (cancelled) return;
          if (option != null) {
            selectedOptionCacheRef.current = option;
            setAsyncOptions((prev) => {
              const has = prev.some((o) => (o?.id ?? o?.value) == valueId);
              if (has) return prev;
              return [...prev, option];
            });
          }
          return;
        }
        if (!loader) return;
        const loaded = await loader("");
        if (cancelled) return;
        const list = Array.isArray(loaded) ? loaded : [];
        setAsyncOptions((prev) => {
          const hasValue = list.some((o) => (o?.id ?? o?.value) == valueId);
          if (hasValue || list.length > 0) return list;
          return prev;
        });
      } catch {
        // ignore; label will stay as id
      } finally {
        if (!cancelled) setDefaultResolving(false);
      }
    })();
    return () => {
      cancelled = true;
      defaultResolveValueIdRef.current = null;
      setDefaultResolving(false);
    };
  }, [isAsyncMode, valueId, multiple]);

  const displayValue =
    value != null
      ? multiple
        ? (Array.isArray(value) ? value : []).map(getOptionLabel).join(", ")
        : (typeof value === "object" && value !== null && (value?.name ?? value?.label ?? value?.username ?? value?.source_name) != null
            ? getOptionLabel(value)
            : getOptionLabel(
                options.find((o) => (o?.id ?? o?.value) == valueId) ??
                  asyncOptions.find((o) => (o?.id ?? o?.value) == valueId) ??
                  selectedOptionCacheRef.current
              ))
      : "";

  const loadAsyncOptions = useCallback(
    async (inputVal) => {
      if (!asyncLoadOptions) return;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      setAsyncError(null);
      if (loadingDelayRef.current) {
        clearTimeout(loadingDelayRef.current);
        loadingDelayRef.current = null;
      }
      loadingDelayRef.current = setTimeout(() => {
        setAsyncLoading(true);
        loadingDelayRef.current = null;
      }, asyncDebounceMs / 2);

      debounceTimeoutRef.current = setTimeout(async () => {
        if (loadingDelayRef.current) {
          clearTimeout(loadingDelayRef.current);
          loadingDelayRef.current = null;
        }
        try {
          if (!openRef.current) {
            setAsyncLoading(false);
            return;
          }
          setAsyncLoading(true);
          const loaded = await asyncLoadOptions(inputVal);
          if (openRef.current && inputValueRef.current === inputVal) {
            setAsyncOptions(Array.isArray(loaded) ? loaded : []);
            const id = value != null && typeof value === "object" && value !== null ? value?.id ?? value?.value : value;
            if (id != null) {
              const found = (Array.isArray(loaded) ? loaded : []).find(
                (o) => (o?.id ?? o?.value) == id
              );
              if (found) selectedOptionCacheRef.current = found;
            }
          }
        } catch (err) {
          if (openRef.current) {
            setAsyncError(err?.message ?? "Failed to load options");
          }
        } finally {
          setAsyncLoading(false);
          debounceTimeoutRef.current = null;
        }
      }, asyncDebounceMs);
    },
    [asyncLoadOptions, asyncDebounceMs, value]
  );

  useEffect(() => {
    if (isAsyncMode && open && !initialOptionsLoadedRef.current) {
      if (asyncDefaultOptions?.length > 0) {
        setAsyncOptions(asyncDefaultOptions);
        initialOptionsLoadedRef.current = true;
      } else {
        loadAsyncOptions("");
        initialOptionsLoadedRef.current = true;
      }
    }
  }, [open, isAsyncMode, asyncDefaultOptions, loadAsyncOptions]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);
  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  useEffect(() => {
    if (!isAsyncMode || !open) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      if (loadingDelayRef.current) {
        clearTimeout(loadingDelayRef.current);
        loadingDelayRef.current = null;
      }
      setAsyncLoading(false);
      return;
    }
    loadAsyncOptions(inputValue);
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      if (loadingDelayRef.current) {
        clearTimeout(loadingDelayRef.current);
        loadingDelayRef.current = null;
      }
      setAsyncLoading(false);
    };
  }, [inputValue, isAsyncMode, open, loadAsyncOptions]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
    };
  }, []);

  // Update dropdown position for portal (viewport coordinates for position: fixed)
  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current || !open) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openDown = spaceBelow >= Math.min(DROPDOWN_MAX_HEIGHT, spaceAbove) || spaceBelow >= spaceAbove;
    setDropdownPosition({
      top: openDown ? rect.bottom : rect.top - DROPDOWN_MAX_HEIGHT,
      left: rect.left,
      width: rect.width,
      openDown,
    });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setDropdownPosition(null);
      return;
    }
    updateDropdownPosition();
    const onScrollOrResize = () => updateDropdownPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      const inContainer = containerRef.current?.contains(e.target);
      const inDropdown = dropdownRef.current?.contains(e.target);
      if (!inContainer && !inDropdown) {
        setOpen(false);
        if (isAsyncMode) initialOptionsLoadedRef.current = false;
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, isAsyncMode]);

  const handleSelect = (option) => {
    if (option) selectedOptionCacheRef.current = option;
    if (multiple) {
      const arr = Array.isArray(value) ? [...value] : [];
      const optVal = option?.id ?? option?.value;
      const idx = arr.findIndex((v) => (v?.id ?? v?.value ?? v) === optVal);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(option);
      onChange?.({ target: { value: null } }, arr);
    } else {
      onChange?.({ target: { value: null } }, option);
      setInputValue("");
      setOpen(false);
      if (isAsyncMode) initialOptionsLoadedRef.current = false;
    }
  };

  const isLoading = externalLoading || asyncLoading;

  if (multiple) {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className={cn("w-full", fullWidth ? "max-w-full" : "max-w-md")} ref={containerRef}>
        {label && (
          <Label className="mb-1.5 block text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        )}
        <div className="flex flex-wrap gap-2 rounded-lg border border-input bg-background p-2 min-h-10">
          {selected.map((opt, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleSelect(opt)}
            >
              {getOptionLabel(opt)} ×
            </Badge>
          ))}
          <input
            ref={ref}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={selected.length === 0 ? placeholder : ""}
            disabled={disabled}
            className="flex-1 min-w-[120px] border-0 bg-transparent outline-none text-sm"
          />
        </div>
        {open &&
          dropdownPosition &&
          typeof document !== "undefined" &&
          createPortal(
            <ul
              ref={dropdownRef}
              className="max-h-48 overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
              style={{
                position: "fixed",
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                zIndex: DROPDOWN_Z_INDEX,
              }}
            >
              {isLoading && (
                <li className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                  <span className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full" />
                  Loading options...
                </li>
              )}
              {asyncError && !isLoading && (
                <li className="px-3 py-2 text-sm text-destructive">{asyncError}</li>
              )}
              {!isLoading && !asyncError && filterOptions.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  {isAsyncMode ? "No options found. Try a different search." : "No options found"}
                </li>
              )}
              {!isLoading &&
                !asyncError &&
                filterOptions.map((opt, i) => (
                  <li
                    key={i}
                    role="option"
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => handleSelect(opt)}
                  >
                    {getOptionLabel(opt)}
                  </li>
                ))}
            </ul>,
            document.body
          )}
        {error && helperText && (
          <p className="mt-1.5 text-xs text-destructive">{helperText}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", fullWidth ? "max-w-full" : "max-w-md")} ref={containerRef}>
      {label && (
        <Label className="mb-1.5 block text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          ref={ref}
          value={open ? inputValue : (defaultResolving ? "" : displayValue)}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={defaultResolving ? "" : placeholder}
          disabled={disabled}
          className={cn(
            size === "small" && `${FIELD_HEIGHT_CLASS_SMALL} ${FIELD_TEXT_SMALL}`,
            error && "border-destructive",
            className
          )}
          {...otherProps}
        />
        {defaultResolving && !open && (
          <div className="absolute inset-y-0 left-0 flex items-center px-3 pointer-events-none">
            <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
          </div>
        )}
      </div>
      {open &&
        dropdownPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={dropdownRef}
            className="max-h-48 overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              zIndex: DROPDOWN_Z_INDEX,
            }}
          >
            {isLoading && (
              <li className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                <span className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full" />
                Loading options...
              </li>
            )}
            {asyncError && !isLoading && (
              <li className="px-3 py-2 text-sm text-destructive">{asyncError}</li>
            )}
            {!isLoading && !asyncError && filterOptions.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                {isAsyncMode ? "No options found. Try a different search." : "No options found"}
              </li>
            )}
            {!isLoading &&
              !asyncError &&
              filterOptions.map((opt, i) => (
                <li
                  key={i}
                  role="option"
                  className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => handleSelect(opt)}
                >
                  {getOptionLabel(opt)}
                </li>
              ))}
          </ul>,
          document.body
        )}
      {error && helperText && (
        <p className="mt-1.5 text-xs text-destructive">{helperText}</p>
      )}
    </div>
  );
});

AutocompleteField.displayName = "AutocompleteField";

export default AutocompleteField;
