"use client";

import { usePathname } from "next/navigation";
import DashboardLayout from "./DashboardLayout";

export default function ConditionalLayout({ children }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/auth");
  const isAdminRoute = pathname?.startsWith("/admin");
  const isVerifyRoute = pathname?.startsWith("/verify");
  const isRootRoute = pathname === "/";
  const shouldUseDashboardLayout = !isAuthRoute && !isAdminRoute && !isVerifyRoute && !isRootRoute;

  if (shouldUseDashboardLayout) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }
  return children;
}
