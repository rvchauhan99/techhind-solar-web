"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { COMPACT_SECTION_HEADER_CLASS } from "@/utils/formConstants";

/**
 * Section block for forms. Renders a section title with compact ERP styling and children.
 * Use Tailwind only; no MUI.
 *
 * Default (`variant="plain"`) keeps the classic compact header used across the CRM.
 * `variant="card"` renders a bordered card with an icon, optional step number,
 * one-line description and optional collapse — use it for long forms (HRMS) so a
 * wall of fields reads as a set of clear groups.
 *
 * @param {string} title - Section title (e.g. "Inquiry Details", "Customer Info")
 * @param {React.ReactNode} children - Section content (typically FormGrid with fields)
 * @param {string} [className] - Optional class for the wrapper
 * @param {string} [description] - One-line explanation shown under the title (card variant)
 * @param {React.ReactNode} [icon] - Icon element shown in the header (card variant)
 * @param {string|number} [step] - Step number/badge shown before the title (card variant)
 * @param {"plain"|"card"} [variant] - Visual style; default "plain"
 * @param {boolean} [collapsible] - Render the card header as a disclosure toggle
 * @param {boolean} [defaultOpen] - Initial open state when collapsible (default true)
 * @param {React.ReactNode} [actions] - Right-aligned header slot (e.g. a button)
 * @param {string} [id] - DOM id so a section nav can anchor to it
 */
export default function FormSection({
  title,
  children,
  className,
  description,
  icon,
  step,
  variant = "plain",
  collapsible = false,
  defaultOpen = true,
  actions = null,
  id,
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (variant !== "card") {
    return (
      <div id={id} className={cn("w-full", className)}>
        {title && (
          <div className={COMPACT_SECTION_HEADER_CLASS}>{title}</div>
        )}
        {children}
      </div>
    );
  }

  const expanded = collapsible ? open : true;

  return (
    <section
      id={id}
      className={cn(
        "w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-border bg-muted/40 px-3 py-2">
        {icon ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[#1b365d]/10 text-[#1b365d]">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {step != null ? (
              <span className="flex size-4 items-center justify-center rounded-full bg-[#00823b] text-[10px] font-bold text-white">
                {step}
              </span>
            ) : null}
            <h3 className="truncate text-sm font-semibold text-[#1b365d]">{title}</h3>
          </div>
          {description ? (
            <p className="mt-0.5 text-xs leading-tight text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <IconChevronDown
              className={cn("size-4 transition-transform", expanded ? "rotate-180" : "rotate-0")}
            />
          </button>
        ) : null}
      </div>
      {expanded ? <div className="p-3">{children}</div> : null}
    </section>
  );
}
