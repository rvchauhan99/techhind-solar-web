"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconHome, IconLockAccessOff } from "@tabler/icons-react";

/** Get parent path to avoid going back to the same forbidden page (prevents loop). */
function getBackPath(fromPath) {
  if (!fromPath || fromPath === "/" || fromPath === "/access-denied") return "/home";
  const segments = fromPath.replace(/\?.*$/, "").split("/").filter(Boolean);
  if (segments.length <= 1) return "/home";
  segments.pop();
  return "/" + segments.join("/");
}

export default function AccessDeniedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const backPath = getBackPath(from);

  const handleBack = () => {
    router.push(backPath);
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <IconLockAccessOff className="text-muted-foreground h-7 w-7" />
          </div>
          <CardTitle className="text-xl">Access denied</CardTitle>
          <CardDescription className="text-base">
            You don&apos;t have permission to access this section. Your role is not
            assigned to this module. Please contact your administrator if you
            believe you should have access.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handleBack}
          >
            <IconArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button asChild variant="default" className="gap-2">
            <Link href="/home">
              <IconHome className="h-4 w-4" />
              Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
