"use client";

/**
 * ChartCard – Standard wrapper for Recharts chart panels.
 *
 * Props:
 *  title       – Card heading
 *  subtitle    – Optional small subtitle below heading
 *  height      – Content area height (number px or CSS string, default 300)
 *  action      – Optional React element rendered top-right (e.g. toggle tabs)
 *  children    – Chart content (e.g. <ResponsiveContainer>)
 *  isEmpty     – If true, renders empty state instead of children
 *  emptyText   – Custom empty state message
 *  loading     – Shows loading skeleton overlay
 *  className   – Extra class for the outer wrapper
 */
export default function ChartCard({
    title,
    subtitle,
    height = 260,
    action,
    children,
    isEmpty = false,
    emptyText = "No data available for the selected filters.",
    loading = false,
    className = "",
}) {
    const contentHeight = typeof height === "number" ? `${height}px` : height;

    return (
        <div
            className={`rounded-xl border border-border bg-card shadow-sm flex flex-col overflow-hidden ${className}`}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-1.5 shrink-0">
                <div>
                    <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                    )}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>

            {/* Divider */}
            <div className="border-t border-border/50 mx-3" />

            {/* Chart area */}
            <div
                className="relative flex-1 px-1.5 py-1.5"
                style={{ minHeight: contentHeight }}
            >
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            <span className="text-xs text-muted-foreground">Loading…</span>
                        </div>
                    </div>
                ) : isEmpty ? (
                    <div className="flex items-center justify-center h-full" style={{ minHeight: contentHeight }}>
                        <div className="text-center">
                            <div className="text-3xl mb-2">📊</div>
                            <p className="text-sm text-muted-foreground max-w-[200px]">{emptyText}</p>
                        </div>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}
