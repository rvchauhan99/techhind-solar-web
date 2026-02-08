"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminApiKey } from "@/lib/api/adminAxios";
import { Button } from "@/components/ui/button";

function AdminNotConfigured() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-semibold">Admin not configured</h1>
      <p className="text-muted-foreground text-center text-sm">
        Set NEXT_PUBLIC_ADMIN_API_KEY to access the Tenant Management UI.
      </p>
      <Button asChild variant="outline">
        <Link href="/home">Back to app</Link>
      </Button>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  if (!adminApiKey) {
    return <AdminNotConfigured />;
  }

  return (
    <div className="min-h-screen border-t border-border bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-card px-4 py-3">
        <nav className="flex items-center gap-2">
          <Button asChild variant={pathname?.startsWith("/admin/tenants") ? "secondary" : "ghost"} size="sm">
            <Link href="/admin/tenants">Tenants</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/home">Back to app</Link>
          </Button>
        </nav>
        <span className="text-muted-foreground text-xs">Admin</span>
      </header>
      <main className="p-4 md:p-6">{children}</main>
    </div>
  );
}
