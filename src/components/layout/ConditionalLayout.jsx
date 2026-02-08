"use client";

import { usePathname } from "next/navigation";
import DashboardLayout from "./DashboardLayout";

export default function ConditionalLayout({ children }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/auth");
  const isAdminRoute = pathname?.startsWith("/admin");
  const isRootRoute = pathname === "/";
  const shouldUseDashboardLayout = !isAuthRoute && !isAdminRoute && !isRootRoute;

  if (shouldUseDashboardLayout) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }
  return children;
}
