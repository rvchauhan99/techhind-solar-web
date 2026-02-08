"use client";

import { usePathname } from "next/navigation";
import DashboardLayout from "./DashboardLayout";

export default function ConditionalLayout({ children }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/auth");
  const isRootRoute = pathname === "/";
  const shouldUseDashboardLayout = !isAuthRoute && !isRootRoute;

  if (shouldUseDashboardLayout) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }
  return children;
}
