"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCircle, IconChevronRight } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import EmptyState from "@/components/common/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { getIcon } from "@/utils/iconMapper";
import { unwrap } from "@/lib/apiUnwrap";
import * as hrmsService from "@/services/hrmsService";

const GROUPS = [
  { title: "People", keys: ["hrms_employees", "hrms_departments", "hrms_designations"] },
  { title: "Time & Attendance", keys: ["hrms_attendance", "hrms_attendance_requests"] },
  { title: "Leave", keys: ["hrms_leaves", "hrms_holidays", "hrms_leave_types", "hrms_compensatory"] },
  { title: "Payroll", keys: ["hrms_annexure", "hrms_penalties", "hrms_penalty_issues", "hrms_payroll"] },
  {
    title: "Reports",
    keys: [
      "hrms_reports_attendance",
      "hrms_reports_leave",
      "hrms_reports_leave_balance",
      "hrms_reports_compensatory",
      "hrms_reports_payout",
    ],
  },
];

const DESCRIPTIONS = {
  hrms_employees: "Employee master, profiles and status",
  hrms_departments: "Departments and department heads",
  hrms_designations: "Job titles mapped to departments",
  hrms_attendance: "Punch records and monthly attendance",
  hrms_attendance_requests: "Correction requests with L1 → L2 approval",
  hrms_leaves: "Leave applications and approvals",
  hrms_holidays: "Company holiday calendar",
  hrms_leave_types: "Leave types and quarterly entitlement",
  hrms_compensatory: "Comp-off earned for holiday or weekend work",
  hrms_annexure: "Salary structure and increments",
  hrms_penalties: "Penalty types and standard amounts",
  hrms_penalty_issues: "Monthly penalties deducted in payroll",
  hrms_reports_attendance: "Attendance register export",
  hrms_reports_leave: "Leave report export",
  hrms_reports_leave_balance: "Financial-year leave balance report",
  hrms_reports_compensatory: "Comp-off granted for the financial year",
  hrms_payroll: "Monthly salary runs, slips and payout",
  hrms_reports_payout: "Bank-ready monthly payout export",
};

const COUNT_LABEL = {
  hrms_attendance_requests: "pending corrections",
  hrms_leaves: "pending leaves",
  hrms_compensatory: "pending comp-off",
};

export default function HrmsHubPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [counts, setCounts] = useState({});

  const tiles = useMemo(
    () => ((user?.modules || []).find((m) => m.key === "hrms")?.submodules || []).filter((m) => m?.route),
    [user?.modules]
  );
  const tilesKey = tiles.map((t) => t.key).join(",");

  useEffect(() => {
    const keys = new Set(tiles.map((t) => t.key));
    let cancelled = false;
    const set = (key, value) => { if (!cancelled) setCounts((c) => ({ ...c, [key]: value })); };
    const sumPending = (fn) =>
      Promise.allSettled([fn("pending_l1"), fn("pending_l2")]).then((rs) =>
        rs.reduce((acc, r) => acc + (r.status === "fulfilled" ? unwrap(r.value)?.meta?.total || 0 : 0), 0)
      );
    (async () => {
      if (keys.has("hrms_attendance_requests")) {
        set("hrms_attendance_requests", await sumPending((s) => hrmsService.listAttendanceRequests({ status: s, limit: 1 })));
      }
      if (keys.has("hrms_leaves")) {
        set("hrms_leaves", await sumPending((s) => hrmsService.listLeaves({ status: s, limit: 1 })));
      }
      if (keys.has("hrms_compensatory")) {
        set(
          "hrms_compensatory",
          await hrmsService
            .listCompensatory({ status: "pending", limit: 1 })
            .then((r) => unwrap(r)?.summary?.pending ?? unwrap(r)?.meta?.total ?? 0)
            .catch(() => 0)
        );
      }
    })().catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tilesKey]);

  const grouped = useMemo(() => {
    const byKey = new Map(tiles.map((t) => [t.key, t]));
    const used = new Set();
    const sections = GROUPS.map((g) => {
      const items = g.keys.map((k) => byKey.get(k)).filter(Boolean);
      items.forEach((m) => used.add(m.key));
      return { title: g.title, items };
    }).filter((s) => s.items.length > 0);
    const rest = tiles.filter((t) => !used.has(t.key));
    if (rest.length) sections.push({ title: "More", items: rest });
    return sections;
  }, [tiles]);

  return (
    <ProtectedRoute>
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">HRMS</h1>
          <p className="text-sm text-muted-foreground">
            People, time, leave, payroll and reports. Pending approvals are highlighted.
          </p>
        </div>

        {tiles.length === 0 ? (
          <EmptyState
            title="No HRMS modules available"
            description="Your role has no HRMS access, or the HRMS feature is turned off for this company."
          />
        ) : (
          grouped.map((section) => (
            <section key={section.title} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {section.title}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {section.items.map((m) => {
                  const Icon = getIcon(m.icon) || IconCircle;
                  const count = counts[m.key];
                  const open = () => router.push(m.route);
                  return (
                    <Card
                      key={m.id || m.key}
                      role="button"
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          open();
                        }
                      }}
                      className="group cursor-pointer p-4 transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-start gap-3">
                        <span className="rounded-md bg-primary/10 p-2 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-sm font-semibold">{m.name}</div>
                            {typeof count === "number" && count > 0 ? (
                              <Badge variant="accent" title={COUNT_LABEL[m.key] || "pending"}>
                                {count}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {DESCRIPTIONS[m.key] || "Open module"}
                          </div>
                        </div>
                        <IconChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </ProtectedRoute>
  );
}

