"use client";

import { cn } from "@/lib/utils";
import { COMPACT_SECTION_HEADER_CLASS } from "@/utils/formConstants";

/**
 * Section block for forms. Renders a section title with compact ERP styling and children.
 * Use Tailwind only; no MUI.
 *
 * @param {string} title - Section title (e.g. "Inquiry Details", "Customer Info")
 * @param {React.ReactNode} children - Section content (typically FormGrid with fields)
 * @param {string} [className] - Optional class for the wrapper
 */
export default function FormSection({ title, children, className }) {
  return (
    <div className={cn("w-full", className)}>
      {title && (
        <div className={COMPACT_SECTION_HEADER_CLASS}>{title}</div>
      )}
      {children}
    </div>
  );
}
