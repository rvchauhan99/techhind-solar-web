"use client";

import Link from "next/link";
import ProtectedRoute from "@/components/common/ProtectedRoute";

const LINKS = [
  { href: "/hrms/employees", label: "Employees" },
  { href: "/hrms/departments", label: "Departments" },
  { href: "/hrms/designations", label: "Designations" },
  { href: "/hrms/holidays", label: "Holidays" },
  { href: "/hrms/leave-types", label: "Leave Types" },
  { href: "/hrms/attendance", label: "Attendance" },
  { href: "/hrms/attendance-requests", label: "Attendance Requests" },
  { href: "/hrms/leaves", label: "Leaves" },
  { href: "/hrms/reports/attendance", label: "Attendance Report" },
  { href: "/hrms/reports/leave", label: "Leave Report" },
  { href: "/hrms/reports/leave-balance", label: "Leave Balance Report" },
];

export default function HrmsHubPage() {
  return (
    <ProtectedRoute>
      <div className="p-3 space-y-3">
        <h1 className="text-lg font-semibold">HRMS</h1>
        <p className="text-sm text-muted-foreground">
          Org masters and HR workflows. Access is controlled by Role Module and the HRMS feature gate.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 max-w-xl">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="block rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </ProtectedRoute>
  );
}
