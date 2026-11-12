"use client";

import { IconInbox } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

/** Consistent empty state: icon + title + description + optional CTA. */
export default function EmptyState({
  icon: Icon = IconInbox,
  title = "Nothing here yet",
  description,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-6 py-10 text-center ${className || ""}`}
    >
      <Icon className="h-8 w-8 text-muted-foreground" />
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {description ? <div className="max-w-sm text-xs text-muted-foreground">{description}</div> : null}
      {actionLabel && onAction ? (
        <Button size="sm" className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
