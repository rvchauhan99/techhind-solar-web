"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getAccessToken } from "@/lib/authStorage";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import {
  IconMenu2,
  IconX,
  IconArrowsMinimize,
  IconMaximize,
  IconMinimize,
} from "@tabler/icons-react";

const SIDEBAR_STORAGE_KEY = "solar-sidebar-collapsed";
const FOCUS_FULLSCREEN_KEY = "solar-focus-fullscreen";

function getStoredSidebarCollapsed() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function getStoredFocusFullscreen() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(FOCUS_FULLSCREEN_KEY) === "true";
}

function isDialogOpen() {
  if (typeof document === "undefined") return false;
  return !!document.querySelector(
    '[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"]'
  );
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
  const [focusFullscreen, setFocusFullscreen] = useState(() =>
    getStoredFocusFullscreen()
  );
  const [docFullscreen, setDocFullscreen] = useState(false);
  const [nativeFsSupported, setNativeFsSupported] = useState(false);

  // Determine the actual layout bounds vs floating state
  const isFloatingHover = sidebarCollapsed && sidebarHoverExpanded;
  const layoutSidebarExpanded = !sidebarCollapsed;

  const persistFocusFullscreen = useCallback((next) => {
    setFocusFullscreen(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(FOCUS_FULLSCREEN_KEY, String(next));
    }
  }, []);

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
    if (focusFullscreen) setSidebarOpen(false);
  }, [focusFullscreen]);

  useEffect(() => {
    if (!focusFullscreen && typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [focusFullscreen]);

  useEffect(() => {
    const sync = () => setDocFullscreen(!!document.fullscreenElement);
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    setNativeFsSupported(
      typeof document !== "undefined" && !!document.fullscreenEnabled
    );
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setFocusFullscreen((prev) => {
          const next = !prev;
          if (typeof window !== "undefined") {
            localStorage.setItem(FOCUS_FULLSCREEN_KEY, String(next));
          }
          return next;
        });
        return;
      }
      if (e.key === "Escape" && focusFullscreen) {
        if (isDialogOpen()) return;
        e.preventDefault();
        persistFocusFullscreen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [focusFullscreen, persistFocusFullscreen]);

  useEffect(() => {
    const hasToken = typeof window !== "undefined" && !!getAccessToken();
    if (!user && !hasToken && !pathname?.startsWith("/auth") && pathname !== "/") {
      const returnUrl = pathname ? `?returnUrl=${encodeURIComponent(pathname)}` : "";
      router.push(`/auth/login${returnUrl}`);
      return;
    }
    setIsCheckingAuth(false);
  }, [user, pathname, router]);

  const toggleDocumentFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

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
      {focusFullscreen && (
        <div className="fixed top-2 right-2 z-[1600] flex gap-1">
          {nativeFsSupported && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="bg-background/95 shadow-md backdrop-blur-sm min-h-10 min-w-10"
              onClick={toggleDocumentFullscreen}
              aria-label={
                docFullscreen
                  ? "Exit browser full screen"
                  : "Browser full screen"
              }
              title={
                docFullscreen
                  ? "Exit browser full screen"
                  : "Browser full screen (hide browser UI)"
              }
            >
              {docFullscreen ? (
                <IconMinimize className="h-5 w-5" />
              ) : (
                <IconMaximize className="h-5 w-5" />
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="bg-background/95 shadow-md backdrop-blur-sm min-h-10 min-w-10"
            onClick={() => persistFocusFullscreen(false)}
            aria-label="Exit full screen"
            title="Exit full screen (Esc)"
          >
            <IconArrowsMinimize className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Sidebar: hidden in focus fullscreen */}
      {!focusFullscreen && (
        <div
          className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${layoutSidebarExpanded || isFloatingHover ? "w-64" : "w-16"
            } ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${isFloatingHover ? "shadow-xl border-r border-border" : ""
            }`}
          onMouseEnter={() =>
            sidebarCollapsed && setSidebarHoverExpanded(true)
          }
          onMouseLeave={() => setSidebarHoverExpanded(false)}
        >
          <Sidebar
            setSidebarOpen={setSidebarOpen}
            collapsed={sidebarCollapsed && !sidebarHoverExpanded}
            onToggleCollapse={handleToggleCollapse}
            onEnterFocusFullscreen={() => persistFocusFullscreen(true)}
          />
        </div>
      )}

      {/* Sidebar Overlay (Mobile or when floating) */}
      {!focusFullscreen && (sidebarOpen || (isFloatingHover && false)) && (
        <div
          className="bg-background/80 fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
        />
      )}

      {/* Main Content: push layout; padding matching layout bounds, NOT floating hover bounds */}
      <div
        className={`flex flex-1 flex-col overflow-hidden transition-[padding] duration-300 ease-in-out ${focusFullscreen ? "lg:pl-0" : layoutSidebarExpanded ? "lg:pl-64" : "lg:pl-16"
          }`}
      >
        {/* Mobile bar: hidden in focus fullscreen */}
        {!focusFullscreen && (
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-w-10! ml-auto"
              onClick={() => persistFocusFullscreen(true)}
              aria-label="Full screen"
              title="Full screen"
            >
              <IconMaximize className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Page Content */}
        <main
          className={
            focusFullscreen
              ? "bg-content flex-1 overflow-y-auto py-1 px-2 lg:px-2"
              : "bg-content flex-1 overflow-y-auto py-2 lg:px-4"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
