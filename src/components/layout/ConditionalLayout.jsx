"use client";

import { usePathname } from "next/navigation";
import DashboardLayout from "./DashboardLayout";

export default function ConditionalLayout({ children }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/auth");
  const isAdminRoute = pathname?.startsWith("/admin");
  const isVerifyRoute = pathname?.startsWith("/verify");
  const isCareersRoute = pathname?.startsWith("/careers");
  const isRootRoute = pathname === "/";
  const shouldUseDashboardLayout =
    !isAuthRoute && !isAdminRoute && !isVerifyRoute && !isCareersRoute && !isRootRoute;

  if (shouldUseDashboardLayout) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }
  return children;
}
