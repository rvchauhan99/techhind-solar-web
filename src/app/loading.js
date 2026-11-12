/**
 * Route-level fallback while a page chunk loads.
 * Renders a neutral app skeleton (header + panels) instead of a lone spinner,
 * so navigation never flashes an empty white screen.
 */
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col gap-3 p-4" role="status" aria-label="Loading page">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-6 w-56 animate-pulse rounded bg-muted" />
          <div className="h-3 w-80 animate-pulse rounded bg-muted/70" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 animate-pulse rounded-md bg-muted/70" />
          <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted/40" />
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-2 rounded-lg border border-border bg-card p-3">
        <div className="h-8 w-full animate-pulse rounded bg-muted/60" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-6 w-full animate-pulse rounded bg-muted/40" />
        ))}
      </div>
    </div>
  );
}
