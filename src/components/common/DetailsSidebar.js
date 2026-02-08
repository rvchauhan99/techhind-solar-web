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
 * @param {React.ReactNode} children - entity-specific content
 */
export default function DetailsSidebar({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close sidebar"
      />
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:max-w-[672px] md:max-w-[768px] max-w-full",
          "bg-background border-border border-l shadow-xl",
          "flex flex-col transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-border flex-shrink-0">
          {title && (
            <h2 className="text-xl font-semibold">{title}</h2>
          )}
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
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-3 scrollbar-thin">
          {children}
        </div>
      </aside>
    </>
  );
}
