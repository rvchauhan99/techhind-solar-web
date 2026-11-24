"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconBriefcase,
  IconUsers,
  IconSearch,
  IconMessageCircle,
  IconCircleCheck,
  IconUserOff,
  IconFileCheck,
  IconCalendarEvent,
  IconPlus,
} from "@tabler/icons-react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import StatCard from "@/components/common/StatCard";
import { unwrap } from "@/lib/apiUnwrap";
import * as hrmsService from "@/services/hrmsService";

function BarRow({ label, value, max, tone = "#1b365d" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="tabular-nums font-semibold text-foreground">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: tone }}
        />
      </div>
    </div>
  );
}

export default function HrmsRecruitmentHubPage() {
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    hrmsService
      .getCandidatePipelineSummary()
      .then((res) => setSummary(unwrap(res) || null))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  const goPipeline = (kpi) => {
    router.push(`/hrms/candidates?pipeline_kpi=${encodeURIComponent(kpi)}`);
  };

  const kpiCards = useMemo(
    () => [
      {
        key: "openings",
        label: "Openings",
        value: summary?.total_openings,
        icon: IconBriefcase,
        accent: "#0f766e",
        onClick: () => router.push("/hrms/positions?status=active"),
      },
      {
        key: "total",
        label: "Candidates",
        value: summary?.total_candidates,
        icon: IconUsers,
        accent: "#1b365d",
        onClick: () => goPipeline("total"),
      },
      {
        key: "screening",
        label: "Screening",
        value: summary?.in_screening,
        icon: IconSearch,
        accent: "#f37021",
        onClick: () => goPipeline("screening"),
      },
      {
        key: "interview",
        label: "In Interview",
        value: summary?.in_interview,
        icon: IconMessageCircle,
        accent: "#2563eb",
        onClick: () => goPipeline("interview"),
      },
      {
        key: "interviews_done",
        label: "Interviews Done",
        value: summary?.interviews_done,
        icon: IconCalendarEvent,
        accent: "#7c3aed",
        onClick: () => router.push("/hrms/interviews?status=completed"),
      },
      {
        key: "selected",
        label: "Selected",
        value: summary?.selected,
        icon: IconCircleCheck,
        accent: "#00823b",
        onClick: () => goPipeline("selected"),
      },
      {
        key: "offers",
        label: "Offers Released",
        value: summary?.offers_released,
        icon: IconFileCheck,
        accent: "#0891b2",
        onClick: () => goPipeline("selected"),
      },
      {
        key: "rejected",
        label: "Rejected",
        value: summary?.rejected,
        icon: IconUserOff,
        accent: "#dc2626",
        onClick: () => goPipeline("rejected"),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [summary]
  );

  const sources = summary?.sources || [];
  const departments = summary?.departments || [];
  const locations = summary?.locations || [];
  const recent = summary?.recent || [];
  const sourceMax = Math.max(1, ...sources.map((s) => Number(s.count) || 0));
  const deptMax = Math.max(1, ...departments.map((d) => Number(d.applied) || 0));
  const locMax = Math.max(1, ...locations.map((l) => Number(l.applied) || 0));

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Recruitment"
        subtitle="ATS overview — openings, pipeline, interviews and offers"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push("/hrms/positions")}>
              Manage Jobs
            </Button>
            <Button size="sm" onClick={() => router.push("/hrms/candidates/add")}>
              <IconPlus className="mr-1 h-4 w-4" />
              Add Candidate
            </Button>
          </div>
        }
      >
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {kpiCards.map((c) => (
            <StatCard
              key={c.key}
              compact
              loading={loading}
              label={c.label}
              value={c.value ?? "—"}
              accentColor={c.accent}
              icon={<c.icon />}
              onClick={c.onClick}
            />
          ))}
        </div>

        <div className="mb-3 grid gap-3 lg:grid-cols-3">
          <Card className="p-3 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-[#1b365d]">Candidate Sources</div>
            {sources.length === 0 ? (
              <div className="text-xs text-muted-foreground">No source data yet</div>
            ) : (
              <div className="space-y-2">
                {sources.slice(0, 8).map((s) => (
                  <BarRow key={s.label} label={s.label} value={s.count} max={sourceMax} tone="#2563eb" />
                ))}
              </div>
            )}
          </Card>
          <Card className="p-3 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-[#1b365d]">Position-wise hiring</div>
            {departments.length === 0 ? (
              <div className="text-xs text-muted-foreground">No position data yet</div>
            ) : (
              <div className="space-y-2">
                {departments.slice(0, 8).map((d) => (
                  <BarRow
                    key={d.label}
                    label={`${d.label} (${d.joined || 0} joined)`}
                    value={d.applied}
                    max={deptMax}
                    tone="#00823b"
                  />
                ))}
              </div>
            )}
          </Card>
          <Card className="p-3 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-[#1b365d]">Location-wise hiring</div>
            {locations.length === 0 ? (
              <div className="text-xs text-muted-foreground">No location data yet</div>
            ) : (
              <div className="space-y-2">
                {locations.slice(0, 8).map((l) => (
                  <BarRow
                    key={l.label}
                    label={`${l.label} (${l.joined || 0} joined)`}
                    value={l.applied}
                    max={locMax}
                    tone="#f37021"
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="p-3 shadow-sm lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#1b365d]">Recent applications</div>
              <Button size="sm" variant="ghost" onClick={() => goPipeline("total")}>
                View pipeline
              </Button>
            </div>
            {recent.length === 0 ? (
              <div className="text-xs text-muted-foreground">No recent applications</div>
            ) : (
              <div className="divide-y">
                {recent.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-muted/40"
                    onClick={() => router.push(`/hrms/candidates/${r.id}`)}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{r.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.position_title || "—"}
                        {r.reference ? ` · ${r.reference}` : ""}
                      </div>
                    </div>
                    <Badge variant={Number(r.stage) === 0 ? "destructive" : "secondary"}>
                      {r.stage_label || `Stage ${r.stage}`}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-2 p-3 shadow-sm">
            <div className="text-sm font-semibold text-[#1b365d]">Quick actions</div>
            <Button size="sm" variant="outline" onClick={() => router.push("/hrms/positions")}>
              Open Positions
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/hrms/candidates")}>
              Candidate Pipeline
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/hrms/interviews")}>
              Interviews
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/careers")}>
              Public Careers page
            </Button>
          </Card>
        </div>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
