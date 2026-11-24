"use client";
import { IconArrowUpRight, IconArrowDownRight, IconMinus } from "@tabler/icons-react";

/**
 * StatCard – Premium KPI card for dashboards.
 *
 * Props:
 *  icon        – React element, rendered in accent-colored circle
 *  label       – String label (shown above value)
 *  value       – Number or string (the big displayed metric)
 *  accentColor – Hex/CSS color for the left border accent and icon bg
 *  trend       – { direction: 'up'|'down'|'neutral', label: string }
 *  onClick     – Optional click handler (makes card pointer + hover)
 *  valueColor  – Optional override for the value text color
 *  subLabel    – Optional small subtitle below value (e.g. "64% of total")
 *  loading     – Boolean, shows skeleton placeholders
 */
export default function StatCard({
    icon,
    label,
    value,
    accentColor = "#3b82f6",
    trend,
    onClick,
    valueColor,
    subLabel,
    loading = false,
    compact = false,
    active = false,
}) {
    const trendIcon =
        trend?.direction === "up" ? (
            <IconArrowUpRight size={14} />
        ) : trend?.direction === "down" ? (
            <IconArrowDownRight size={14} />
        ) : (
            <IconMinus size={14} />
        );

    const trendColorClass =
        trend?.direction === "up"
            ? "text-emerald-600 bg-emerald-50"
            : trend?.direction === "down"
                ? "text-red-500 bg-red-50"
                : "text-slate-500 bg-slate-100";

    /** Compact: single-row KPI chip (~44px) for list-page headers. subLabel becomes a tooltip. */
    if (compact) {
        return (
            <div
                onClick={onClick}
                role={onClick ? "button" : undefined}
                aria-pressed={onClick ? !!active : undefined}
                title={subLabel || undefined}
                className={[
                    "relative flex h-11 items-center gap-2 overflow-hidden rounded-lg border bg-card pl-3 pr-3 shadow-sm",
                    active ? "border-primary ring-1 ring-primary/40 shadow-md" : "border-border",
                    onClick
                        ? "cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                        : "",
                ].join(" ")}
            >
                <div
                    className="absolute bottom-0 left-0 top-0 w-[3px] rounded-l-lg"
                    style={{ backgroundColor: accentColor }}
                />
                {icon && (
                    <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5"
                        style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                    >
                        {loading ? (
                            <span className="block h-3.5 w-3.5 animate-pulse rounded bg-muted" />
                        ) : (
                            icon
                        )}
                    </div>
                )}
                <span className="text-[10px] font-semibold uppercase leading-none tracking-wide text-muted-foreground">
                    {loading ? (
                        <span className="inline-block h-2.5 w-16 animate-pulse rounded bg-muted" />
                    ) : (
                        label
                    )}
                </span>
                <span
                    className="ml-auto text-base font-bold leading-none tabular-nums"
                    style={{ color: valueColor ?? "inherit" }}
                >
                    {loading ? (
                        <span className="inline-block h-4 w-8 animate-pulse rounded bg-muted" />
                    ) : (
                        value ?? "—"
                    )}
                </span>
                {trend && !loading ? (
                    <span
                        className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${trendColorClass}`}
                    >
                        {trendIcon}
                        {trend.label}
                    </span>
                ) : null}
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            role={onClick ? "button" : undefined}
            aria-pressed={onClick ? !!active : undefined}
            className={[
                "relative overflow-hidden rounded-xl border bg-card shadow-sm flex flex-col h-full",
                active ? "border-primary ring-1 ring-primary/40 shadow-md" : "border-border",
                onClick ? "cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5" : "",
            ].join(" ")}
        >
            {/* Left accent bar */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{ backgroundColor: accentColor }}
            />

            <div className="pl-4 pr-3 pt-3 pb-3 flex flex-col gap-2 h-full">
                {/* Icon + Label row */}
                <div className="flex items-center gap-2">
                    {icon && (
                        <div
                            className="flex items-center justify-center rounded-lg w-8 h-8 shrink-0"
                            style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                        >
                            {icon}
                        </div>
                    )}
                    <span className="text-xs font-medium text-muted-foreground leading-tight">
                        {loading ? (
                            <span className="inline-block w-24 h-3 bg-muted animate-pulse rounded" />
                        ) : (
                            label
                        )}
                    </span>
                </div>

                {/* Value */}
                <div
                    className="text-2xl font-bold tracking-tight leading-none"
                    style={{ color: valueColor ?? "inherit" }}
                >
                    {loading ? (
                        <span className="inline-block w-16 h-7 bg-muted animate-pulse rounded" />
                    ) : (
                        value ?? "—"
                    )}
                </div>

                {/* Sub label + Trend chip */}
                <div className="flex items-center justify-between mt-auto gap-1 flex-wrap">
                    {subLabel && (
                        <span className="text-xs text-muted-foreground leading-tight">
                            {loading ? (
                                <span className="inline-block w-20 h-3 bg-muted animate-pulse rounded" />
                            ) : (
                                subLabel
                            )}
                        </span>
                    )}
                    {trend && (
                        <span
                            className={`flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${trendColorClass}`}
                        >
                            {trendIcon}
                            {trend.label}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
