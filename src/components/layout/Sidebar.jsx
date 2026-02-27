"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  IconChevronDown,
  IconChevronRight,
  IconChevronLeft,
  IconSettings,
  IconLogout,
  IconSearch,
  IconCircle,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { getIcon } from "@/utils/iconMapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = () => setIsDesktop(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

function MenuItemComponent({ item, level = 0, setSidebarOpen }) {
  const pathname = usePathname();
  const hasChildren = item.submodules?.length > 0;
  const isActive = pathname === item.route;
  const hasActiveChild =
    hasChildren &&
    item.submodules.some(
      (child) =>
        child.route === pathname ||
        (child.submodules &&
          child.submodules.some((c) => c.route === pathname))
    );
  const [isOpen, setIsOpen] = useState(hasActiveChild || isActive);
  const paddingLeft = level === 0 ? 12 : 12 + level * 12;
  const IconComponent = getIcon(item?.icon) || IconCircle;

  const handleLinkClick = () => {
    setSidebarOpen?.(false);
  };

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors border-l-4",
            hasActiveChild || isActive
              ? "bg-[#142847] text-white border-[#00823b]"
              : "text-blue-100 hover:bg-[#142847] hover:text-white border-transparent"
          )}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <IconComponent className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-left">{item.name}</span>
          <div className="relative h-4 w-4 shrink-0">
            <IconChevronDown
              className={cn(
                "absolute inset-0 h-4 w-4 transition-all duration-300 ease-in-out",
                isOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
              )}
            />
            <IconChevronRight
              className={cn(
                "absolute inset-0 h-4 w-4 transition-all duration-300 ease-in-out",
                isOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
              )}
            />
          </div>
        </button>
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="border-sidebar-border mt-1 ml-[19px] border-l pl-2">
            {item.submodules?.map((child, index) => (
              <div
                key={child.id || `${child.name}-${index}`}
                className={cn(
                  "transition-all duration-300 ease-in-out",
                  isOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
                )}
                style={{
                  transitionDelay: isOpen ? `${index * 30}ms` : "0ms",
                }}
              >
                <MenuItemComponent
                  item={child}
                  level={level + 1}
                  setSidebarOpen={setSidebarOpen}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={item.route || "#"}
      onClick={handleLinkClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors border-l-4",
        isActive
          ? "bg-[#142847] text-white border-[#00823b]"
          : "text-blue-100 hover:bg-[#142847] hover:text-white border-transparent"
      )}
      style={{ paddingLeft: `${paddingLeft}px` }}
    >
      <IconComponent className="h-5 w-5 shrink-0" />
      <span>{item.name}</span>
    </Link>
  );
}

function getFirstRoute(item) {
  if (item.route) return item.route;
  if (item.submodules?.length) return getFirstRoute(item.submodules[0]);
  return "#";
}

function flattenMenuItems(items, parents = []) {
  let result = [];
  if (!items?.length) return result;
  items.forEach((item) => {
    const fullPath = [...parents, item.name].join(" > ");
    result.push({ ...item, fullPath, parents: [...parents] });
    if (item.submodules?.length) {
      result = result.concat(
        flattenMenuItems(item.submodules, [...parents, item.name])
      );
    }
  });
  return result;
}

function routeMatchesItem(pathname, item) {
  if (pathname === item.route) return true;
  if (item.submodules?.length) {
    return item.submodules.some(
      (child) =>
        pathname === child.route ||
        (child.submodules &&
          child.submodules.some((c) => pathname === c.route))
    );
  }
  return false;
}

export default function Sidebar({
  setSidebarOpen,
  collapsed = false,
  onToggleCollapse = () => { },
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchContainerRef = useRef(null);
  const modules = user?.modules || [];
  const showCollapsed = collapsed && isDesktop;

  const flatItems = useMemo(
    () => flattenMenuItems(modules),
    [modules]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return flatItems
      .filter(
        (item) =>
          item.name?.toLowerCase().includes(q) ||
          item.fullPath?.toLowerCase().includes(q) ||
          item.route?.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [searchQuery, flatItems]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchQuery.trim() &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchQuery]);

  const handleSearchSelect = (item) => {
    const route = item.route || getFirstRoute(item);
    if (route && route !== "#") {
      router.push(route);
      setSearchQuery("");
      setSidebarOpen?.(false);
    }
  };

  const handleLogout = () => {
    logout();
    setShowLogoutDialog(false);
  };

  const sidebarToggleButton = (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:bg-sidebar-accent hidden shrink-0 lg:flex"
      onClick={onToggleCollapse}
      aria-label={showCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {showCollapsed ? (
        <IconChevronRight className="h-5 w-5" />
      ) : (
        <IconChevronLeft className="h-5 w-5" />
      )}
    </Button>
  );

  if (showCollapsed) {
    return (
      <aside className="border-[#0f1f3a] bg-[#1b365d] flex h-dvh w-full flex-col transition-all duration-300 ease-in-out border-r">
        <div className="flex h-full flex-col overflow-y-auto px-2 py-4 custom-scrollbar">
          {/* User: avatar only */}
          <div className="mb-4 flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <span
                  className="hover:bg-[#142847] flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors text-blue-100"
                  title={user?.name || user?.email || "User"}
                >
                  <span className="bg-[#00823b] text-white flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium">
                    {user?.name?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"}
                  </span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" className="w-56">
                <DropdownMenuItem
                  onClick={() => router.push("/user-profile")}
                  className="flex cursor-pointer items-center gap-1.5"
                >
                  <IconSettings className="h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowLogoutDialog(true)}
                  variant="destructive"
                >
                  <IconLogout className="h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Nav: icon only, top-level */}
          <nav className="mb-4 flex flex-1 flex-col items-center gap-1">
            {modules.map((item, index) => {
              const IconComponent = getIcon(item?.icon) || IconCircle;
              const route = getFirstRoute(item);
              const isActive = routeMatchesItem(pathname, item);
              return (
                <Link
                  key={item.id || `${item.name}-${index}`}
                  href={route}
                  onClick={() => setSidebarOpen?.(false)}
                  title={item.name}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors border-l-2",
                    isActive
                      ? "bg-[#142847] text-white border-[#00823b]"
                      : "text-blue-100 hover:bg-[#142847] hover:text-white border-transparent"
                  )}
                >
                  <IconComponent className="h-5 w-5" />
                </Link>
              );
            })}
          </nav>

          {sidebarToggleButton}

          <AlertDialog
            open={showLogoutDialog}
            onOpenChange={setShowLogoutDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Logout Confirmation</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to logout? You will need to login again
                  to access your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogout}
                  variant="destructive"
                >
                  Logout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-[#1b365d] border-r border-[#0f1f3a] flex h-dvh w-full flex-col transition-all duration-300 ease-in-out">
      <div className="flex h-full flex-col overflow-y-auto px-3 py-4 custom-scrollbar">
        {/* User Profile Section */}
        <div className="mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full">
              <div className="hover:bg-[#142847] flex w-full items-center gap-2 rounded-md p-2 transition-colors">
                <div className="bg-[#00823b] text-white flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
                  {user?.name?.[0]?.toUpperCase() ||
                    user?.email?.[0]?.toUpperCase() ||
                    "U"}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-blue-100 truncate text-sm font-medium">
                    {user?.name || "User"}
                  </p>
                  <p className="text-blue-200/70 w-30 truncate text-xs">
                    {user?.email || "User"}
                  </p>
                </div>
                <IconChevronDown className="text-blue-200/70 h-4 w-4 shrink-0" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem
                onClick={() => router.push("/user-profile")}
                className="flex cursor-pointer items-center gap-1.5"
              >
                <IconSettings className="h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowLogoutDialog(true)}
                variant="destructive"
              >
                <IconLogout className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Logout Confirmation</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to logout? You will need to login again
                  to access your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} variant="destructive">
                  Logout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Search menus */}
        <div
          ref={searchContainerRef}
          className="relative mb-4"
          aria-expanded={!!searchQuery.trim()}
        >
          <div className="relative">
            <IconSearch className="text-muted-foreground absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search menus..."
              className="w-full pl-9 pr-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchQuery("");
              }}
            />
          </div>
          {searchQuery.trim() && (
            <div
              className="border-border bg-popover absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-md"
              role="listbox"
            >
              {searchResults.length > 0 ? (
                <ul className="p-1">
                  {searchResults.map((item, index) => {
                    const IconComponent = getIcon(item?.icon) || IconCircle;
                    return (
                      <li key={`${item.fullPath}-${index}`} role="option">
                        <button
                          type="button"
                          className="hover:bg-[#142847] flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-blue-100 transition-colors"
                          onClick={() => handleSearchSelect(item)}
                        >
                          <IconComponent className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.fullPath}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-muted-foreground px-3 py-3 text-sm">
                  No menu matches
                </p>
              )}
            </div>
          )}
        </div>

        {/* Main Menu */}
        <nav className="mb-6 space-y-1">
          {modules.map((item, index) => (
            <MenuItemComponent
              key={item.id || `${item.name}-${index}`}
              item={item}
              setSidebarOpen={setSidebarOpen}
            />
          ))}
        </nav>

        {/* Collapse button: desktop only */}
        <div className="mt-auto flex justify-end pt-2">
          {sidebarToggleButton}
        </div>
      </div>
    </aside>
  );
}
