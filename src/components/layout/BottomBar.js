"use client";

import Link from "next/link";

export default function BottomBar() {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-[1000] flex h-[42px] items-center justify-between border-t border-border bg-white/95 px-4 text-[13px] text-muted-foreground backdrop-blur-sm"
    >
      <span className="text-[13px]">
        © {new Date().getFullYear()} Nexora Solution · All rights reserved
      </span>

      <nav className="flex gap-4">
        {[
          { label: "Privacy", href: "/privacy-policy" },
          { label: "Terms", href: "/terms" },
          { label: "Contact", href: "/contact" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="text-[13px] opacity-80 transition-opacity hover:opacity-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
