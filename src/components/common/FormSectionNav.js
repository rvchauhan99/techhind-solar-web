"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * FormSectionNav — sticky chip nav for long forms.
 *
 * Sections are anchor targets rendered by `<FormSection variant="card" id="...">`.
 * Clicking a chip scrolls its section into view inside the form's scroll container;
 * the chip for the section currently in view is highlighted.
 *
 * @param {Array<{id: string, label: string, icon?: React.ReactNode}>} sections
 * @param {string} [className]
 */
export default function FormSectionNav({ sections = [], className }) {
  const [activeId, setActiveId] = useState(sections[0]?.id || "");
  const barRef = useRef(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || !sections.length) return;
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean);
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-72px 0px -60% 0px", threshold: [0, 0.25, 1] }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [sections]);

  const jump = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!sections.length) return null;

  return (
    <div
      ref={barRef}
      className={cn(
        "sticky top-0 z-20 -mx-1 mb-2 flex gap-1 overflow-x-auto rounded-md border border-border bg-card/95 px-1.5 py-1.5 backdrop-blur [scrollbar-width:thin]",
        className
      )}
      role="navigation"
      aria-label="Form sections"
    >
      {sections.map((s) => {
        const active = s.id === activeId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => jump(s.id)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-[#1b365d] text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {s.icon ? <span className="[&_svg]:size-3.5">{s.icon}</span> : null}
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
