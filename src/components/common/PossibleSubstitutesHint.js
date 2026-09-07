"use client";

/**
 * Dense read-only hint of possible BOM substitutes under a product field.
 */
export default function PossibleSubstitutesHint({ substitutes }) {
    const list = Array.isArray(substitutes) ? substitutes.filter((s) => s?.product_name || s?.name) : [];
    if (list.length === 0) return null;

    const label = list
        .map((s) => {
            const name = s.product_name || s.name;
            const make = s.product_make_name;
            return make ? `${name} (${make})` : name;
        })
        .join(", ");

    return (
        <p className="mt-0.5 mb-0 text-[10px] leading-snug text-muted-foreground" title={label}>
            <span className="font-semibold text-foreground/80">Possible substitutes:</span>{" "}
            {label}
        </p>
    );
}
