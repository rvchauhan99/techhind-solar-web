"use client";

import { useEffect } from "react";
import Link from "next/link";
import { IconAlertCircle } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }) {
  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="bg-background flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <IconAlertCircle className="text-destructive h-12 w-12" aria-hidden />
        <h1 className="text-foreground text-xl font-semibold">
          Something went wrong
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          An unexpected error occurred. Please try again or return to the home
          page.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Button asChild>
          <Link href="/home">Go to home</Link>
        </Button>
      </div>
    </div>
  );
}
