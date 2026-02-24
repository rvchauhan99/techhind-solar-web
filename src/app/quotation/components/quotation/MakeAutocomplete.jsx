"use client";

import { useMemo } from "react";
import Input from "@/components/common/Input";

/**
 * Product Make display field.
 * We no longer allow changing the make from this form – it is derived from the selected product / project.
 * This component now only displays the resolved make name(s) in a normal disabled input.
 *
 * @param {{
 *   label: string;
 *   valueIds: number[] | string[];
 *   options: Array<{ id: number | string; name?: string }>;
 *   fallbackMake?: { id: number | string; name: string } | null;
 * }} props
 */
export default function MakeAutocomplete({
    label,
    valueIds = [],
    options = [],
    fallbackMake = null,
}) {
    const opts = Array.isArray(options) ? options : [];
    const ids = Array.isArray(valueIds) ? valueIds : [];

    // Resolve display objects from ids or fallbackMake (so value keeps showing after any re-render).
    const selectedObjects = useMemo(() => {
        if ((!ids || ids.length === 0) && fallbackMake) {
            return [fallbackMake];
        }

        return (ids || []).map((id) => {
            const found = opts.find((m) => m.id == id);
            if (found) return found;
            if (fallbackMake && fallbackMake.id == id) return fallbackMake;
            return null;
        }).filter(Boolean);
    }, [ids, opts, fallbackMake]);

    const displayLabel = selectedObjects.map((o) => o.name).join(", ");

    return (
        <Input
            fullWidth
            label={label}
            value={displayLabel}
            disabled
            sx={{ "& .MuiOutlinedInput-root.Mui-disabled": { bgcolor: "grey.300" } }}
        />
    );
}
