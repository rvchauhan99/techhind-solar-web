"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCircle, IconChevronRight, IconFingerprint, IconLogin, IconLogout } from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import EmptyState from "@/components/common/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { getIcon } from "@/utils/iconMapper";
import { unwrap } from "@/lib/apiUnwrap";
import { toastSuccess, toastErrorFromApi } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

const GROUPS = [
  { title: "People", keys: ["hrms_employees", "hrms_departments", "hrms_designations"] },
  {
    title: "Recruitment (links)",
    keys: ["hrms_recruitment", "hrms_positions", "hrms_candidates"],
  },
  {
    title: "Time & Attendance",
    keys: ["hrms_attendance", "hrms_attendance_requests", "hrms_attendance_settings"],
  },
  {
    title: "Leave",
    keys: [
      "hrms_leaves",
      "hrms_holidays",
      "hrms_leave_types",
      "hrms_compensatory",
      "hrms_leave_balance_approvals",
    ],
  },
  { title: "Payroll", keys: ["hrms_annexure", "hrms_penalties", "hrms_penalty_issues", "hrms_payroll"] },
  { title: "Communications", keys: ["hrms_letter_templates", "hrms_policies", "hrms_announcements"] },
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
  hrms_recruitment: "Recruitment hub — positions, pipeline, interviews",
  hrms_positions: "Open hiring roles",
  hrms_candidates: "Candidate pipeline with screening and evaluation",
  hrms_interviews: "Schedule interview rounds for candidates",
  hrms_attendance: "Punch records and monthly attendance",
  hrms_attendance_requests: "Correction requests with L1 → L2 approval",
  hrms_attendance_settings: "Shift, late penalty, week-off and visibility policy",
  hrms_leaves: "Leave applications and approvals",
  hrms_holidays: "Company holiday calendar",
  hrms_leave_types: "Leave types and quarterly entitlement",
  hrms_compensatory: "Comp-off earned for holiday or weekend work",
  hrms_leave_balance_approvals: "Confirm or dispute FY leave balance",
  hrms_letter_templates: "HR letter templates with placeholders",
  hrms_policies: "Company policy PDF library",
  hrms_announcements: "Department-targeted company announcements",
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
  const [punchStatus, setPunchStatus] = useState(null);
  const [punching, setPunching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hrmsService
      .getAttendanceStatus()
      .then((r) => {
        if (!cancelled) setPunchStatus(unwrap(r));
      })
      .catch(() => {
        if (!cancelled) setPunchStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onHubPunch = async (action) => {
    setPunching(true);
    try {
      await hrmsService.punchAttendance({ action, channel: "WEB" });
      toastSuccess(`Punch ${action} recorded`);
      const r = await hrmsService.getAttendanceStatus();
      setPunchStatus(unwrap(r));
    } catch (err) {
      toastErrorFromApi(err, "Punch failed");
    } finally {
      setPunching(false);
    }
  };

  const tiles = useMemo(() => {
    const root = (user?.modules || []).find((m) => m.key === "hrms");
    const out = [];
    const walk = (nodes) => {
      for (const n of nodes || []) {
        if (n?.route) out.push(n);
        if (Array.isArray(n?.submodules) && n.submodules.length) walk(n.submodules);
      }
    };
    walk(root?.submodules || []);
    // de-dupe by key
    const seen = new Set();
    return out.filter((m) => {
      if (!m?.key || seen.has(m.key)) return false;
      seen.add(m.key);
      return true;
    });
  }, [user?.modules]);
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
      // Keep Communications even with zero module tiles so My Announcements can show
      if (g.title === "Communications") return { title: g.title, items };
      return { title: g.title, items };
    }).filter((s) => s.title === "Communications" || s.items.length > 0);
    // Drop empty Communications only when HRMS has no modules at all
    const filtered =
      tiles.length === 0
        ? sections.filter((s) => s.items.length > 0)
        : sections;
    const rest = tiles.filter((t) => !used.has(t.key));
    if (rest.length) filtered.push({ title: "More", items: rest });
    return filtered;
  }, [tiles]);

  return (
    <ProtectedRoute>
      <div className="p-4 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">HRMS</h1>
            <p className="text-sm text-muted-foreground">
              People, time, leave, payroll and reports. Pending approvals are highlighted.
            </p>
          </div>
          {punchStatus !== null || tiles.some((t) => t.key === "hrms_attendance") ? (
            <Card className="flex items-center gap-2 px-3 py-2">
              <IconFingerprint className="size-4 text-primary" />
              <StatusBadge status={punchStatus?.status || (punchStatus?.open ? "IN" : "OUT")} />
              <Button
                size="sm"
                disabled={
                  punching || Boolean(punchStatus?.already_punched_today && !punchStatus?.open)
                }
                onClick={() => onHubPunch("IN")}
              >
                <IconLogin className="size-4" /> In
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={punching}
                onClick={() => onHubPunch("OUT")}
              >
                <IconLogout className="size-4" /> Out
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push("/hrms/attendance")}
              >
                Open
              </Button>
            </Card>
          ) : null}
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
                {section.title === "Communications" ? (
                  <Card
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push("/hrms/announcements/feed")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push("/hrms/announcements/feed");
                      }
                    }}
                    className="group cursor-pointer p-4 transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start gap-3">
                      <span className="rounded-md bg-primary/10 p-2 text-primary">
                        <IconCircle className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">My Announcements</div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          Active items for your department
                        </div>
                      </div>
                      <IconChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </Card>
                ) : null}
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

