"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { IconMenu2, IconX } from "@tabler/icons-react";

const SIDEBAR_STORAGE_KEY = "solar-sidebar-collapsed";

function getStoredSidebarCollapsed() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

export default function DashboardLayout({ children }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    getStoredSidebarCollapsed()
  );
  const [sidebarHoverExpanded, setSidebarHoverExpanded] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const effectiveSidebarExpanded =
    !sidebarCollapsed || sidebarHoverExpanded;

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    const hasToken =
      typeof window !== "undefined" &&
      (localStorage.getItem("auth_token") ||
        document.cookie.includes("auth_token="));
    if (!user && !hasToken && !pathname?.startsWith("/auth") && pathname !== "/") {
      router.push("/auth/login");
      return;
    }
    setIsCheckingAuth(false);
  }, [user, pathname, router]);

  if (isCheckingAuth) {
    return (
      <div className="bg-background flex h-dvh overflow-hidden">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background relative flex h-screen overflow-hidden">
      {/* Sidebar: mobile w-64 overlay; desktop width by collapse state; hover expands when collapsed */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          effectiveSidebarExpanded ? "lg:w-64" : "lg:w-16"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        onMouseEnter={() =>
          sidebarCollapsed && setSidebarHoverExpanded(true)
        }
        onMouseLeave={() => setSidebarHoverExpanded(false)}
      >
        <Sidebar
          setSidebarOpen={setSidebarOpen}
          collapsed={sidebarCollapsed && !sidebarHoverExpanded}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="bg-background/80 fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
        />
      )}

      {/* Main Content: push layout; padding matches sidebar width on desktop */}
      <div
        className={`flex flex-1 flex-col overflow-hidden transition-[padding] duration-300 ease-in-out ${
          effectiveSidebarExpanded ? "lg:pl-64" : "lg:pl-16"
        }`}
      >
        {/* Mobile bar: hamburger + logo only (user and search are in sidebar) */}
        <div className="border-border bg-background flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:hidden">
          <Button
            variant="outline"
            size="icon"
            className="min-w-10!"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <IconX className="h-5 w-5" />
            ) : (
              <IconMenu2 className="h-5 w-5" />
            )}
          </Button>
          <Link href="/home" className="flex items-center gap-0.5">
            <span className="text-lg font-semibold text-foreground">
              Solar
            </span>
          </Link>
        </div>

        {/* Page Content */}
        <main className="bg-content flex-1 overflow-y-auto py-2 lg:px-4">
          {children}
        </main>
      </div>
    </div>
  );
}
