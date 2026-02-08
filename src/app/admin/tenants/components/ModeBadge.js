"use client";

import { Badge } from "@/components/ui/badge";

export default function ModeBadge({ mode }) {
  if (mode === "shared") {
    return (
      <Badge variant="secondary">
        Shared
      </Badge>
    );
  }
  if (mode === "dedicated") {
    return (
      <Badge variant="outline">
        Dedicated
      </Badge>
    );
  }
  return <Badge variant="outline">{mode || "—"}</Badge>;
}
