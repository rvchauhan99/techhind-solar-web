"use client";

import { Badge } from "@/components/ui/badge";

/**
 * Single source of truth for status → badge. Use everywhere in HRMS.
 * Pass `label` to override the default text.
 */
const MAP = {
  active: ["success", "Active"],
  inactive: ["secondary", "Inactive"],
  pending: ["accent", "Pending"],
  disabled: ["secondary", "Disabled"],
  deleted: ["destructive", "Deleted"],
  pending_l1: ["accent", "Pending L1"],
  pending_l2: ["accent", "Pending L2"],
  approved: ["success", "Approved"],
  rejected: ["destructive", "Rejected"],
  cancelled: ["secondary", "Cancelled"],
  reverted: ["navy", "Reverted"],
  skipped: ["secondary", "Skipped"],
  submitted: ["accent", "Submitted"],
  // Plan 07 — penalty + compensatory
  issued: ["navy", "Issued"],
  waived: ["secondary", "Waived"],
  compensated: ["success", "Compensated"],
  IN: ["success", "In"],
  OUT: ["secondary", "Out"],
  BREAK_IN: ["accent", "Break in"],
  BREAK_OUT: ["navy", "Break out"],
};

export default function StatusBadge({ status, label, className }) {
  const key = status == null ? "" : String(status);
  const [variant, defaultLabel] = MAP[key] || ["secondary", key ? key.replace(/_/g, " ") : "—"];
  return <Badge variant={variant} className={className}>{label ?? defaultLabel}</Badge>;
}
