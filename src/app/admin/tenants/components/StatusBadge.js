"use client";

import { Badge } from "@/components/ui/badge";

export default function StatusBadge({ status }) {
  if (status === "active") {
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        Active
      </Badge>
    );
  }
  if (status === "suspended") {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
        Suspended
      </Badge>
    );
  }
  return <Badge variant="outline">{status || "—"}</Badge>;
}
