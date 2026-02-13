"use client";

import { useMemo } from "react";
import { Autocomplete, Chip } from "@mui/material";
import Input from "@/components/common/Input";

/**
 * Reusable Make Autocomplete. Display does NOT depend on productMakes option list.
 * Uses product_make_id for value and product_make_name from API (via fallbackMake) for display.
 *
 * @param {{
 *   label: string;
 *   valueIds: number[] | string[];
 *   options: Array<{ id: number | string; name?: string }>;
 *   fallbackMake?: { id: number | string; name: string } | null;
 *   onChange: (ids: (number | string)[]) => void;
 *   disabled?: boolean;
 * }} props
 */
export default function MakeAutocomplete({
    label,
    valueIds = [],
    options = [],
    fallbackMake = null,
    onChange,
    disabled = false,
}) {
    const opts = Array.isArray(options) ? options : [];
    const ids = Array.isArray(valueIds) ? valueIds : [];

    // Build selected objects: from options or fallbackMake (API display). Use == so 7 and "7" match.
    const selectedObjects = useMemo(() => {
        return (ids || []).map((id) => {
            const found = opts.find((m) => m.id == id);
            if (found) return found;
            if (fallbackMake && fallbackMake.id == id) return fallbackMake;
            return null;
        }).filter(Boolean);
    }, [ids, opts, fallbackMake]);

    // Include fallbackMake in dropdown options when not already present so it can be shown and selected
    const optionsForDropdown = useMemo(() => {
        if (!fallbackMake || opts.some((m) => m.id == fallbackMake.id)) return opts;
        return [fallbackMake, ...opts];
    }, [opts, fallbackMake]);

    return (
        <Autocomplete
            multiple
            size="small"
            disabled={disabled}
            options={optionsForDropdown}
            getOptionLabel={(option) => option?.name ?? ""}
            isOptionEqualToValue={(opt, val) => opt?.id == val?.id}
            value={selectedObjects}
            onChange={(e, newValue) => {
                onChange((newValue || []).map((v) => v.id));
            }}
            renderInput={(params) => <Input {...params} label={label} />}
            renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                        <Chip
                            key={option?.id ?? key}
                            label={option?.name ?? ""}
                            size="small"
                            {...tagProps}
                        />
                    );
                })
            }
        />
    );
}
