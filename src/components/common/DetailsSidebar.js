"use client";

import { Button } from "@/components/ui/button";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/**
 * Reusable right-hand details panel. Use for view-details-on-click from listing rows.
 * Karebo-style: overlay, header with title and close, scrollable content.
 *
 * @param {boolean} open
 * @param {function(): void} onClose
 * @param {string} [title] - optional sidebar title
 * @param {React.ReactNode} [headerActions] - optional actions (e.g. Download PDF) shown in header top-right, left of close
 * @param {boolean} [closeOnBackdropClick=true] - if false, drawer stays open when clicking backdrop (close only via X)
 * @param {React.ReactNode} children - entity-specific content
 */
export default function DetailsSidebar({ open, onClose, title, headerActions, closeOnBackdropClick = true, children }) {
  if (!open) return null;

  const handleBackdropClick = closeOnBackdropClick ? onClose : undefined;
  const handleBackdropKeyDown = closeOnBackdropClick ? (e) => e.key === "Escape" && onClose() : undefined;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
        onClick={handleBackdropClick}
        onKeyDown={handleBackdropKeyDown}
        role={handleBackdropClick ? "button" : "presentation"}
        tabIndex={handleBackdropClick ? 0 : undefined}
        aria-label={handleBackdropClick ? "Close sidebar" : undefined}
      />
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:max-w-[672px] md:max-w-[768px] max-w-full",
          "bg-background border-border border-l shadow-xl",
          "flex flex-col transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 lg:px-6 py-4 border-b border-border flex-shrink-0">
          {title && (
            <h2 className="text-xl font-semibold truncate flex-1 min-w-0">{title}</h2>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {headerActions}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
              className="size-8"
            >
              <IconX className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-3 scrollbar-thin">
          {children}
        </div>
      </aside>
    </>
  );
}
