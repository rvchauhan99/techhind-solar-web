"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import ListingPageContainer from "@/components/common/ListingPageContainer";
import { unwrap } from "@/lib/apiUnwrap";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsRecruitmentHubPage() {
  const router = useRouter();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    hrmsService
      .getCandidatePipelineSummary()
      .then((res) => setSummary(unwrap(res) || null))
      .catch(() => setSummary(null));
  }, []);

  const cards = [
    {
      title: "Open Positions",
      href: "/hrms/positions",
      desc: "Manage active hiring roles",
    },
    {
      title: "Candidate Pipeline",
      href: "/hrms/candidates",
      desc: "Screening, interviews, selection",
      stats: summary
        ? `${summary.total_candidates || 0} total · ${summary.in_interview || 0} in interview`
        : null,
    },
    {
      title: "Interviews",
      href: "/hrms/interviews",
      desc: "Schedule and evaluate rounds",
    },
  ];

  return (
    <ProtectedRoute>
      <ListingPageContainer
        title="Recruitment"
        subtitle="ATS overview — positions, pipeline and interviews"
      >
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["Total Candidates", summary?.total_candidates],
            ["In Screening", summary?.in_screening],
            ["In Interview", summary?.in_interview],
            ["Selected", summary?.selected],
            ["Rejected", summary?.rejected],
          ].map(([label, value]) => (
            <Card key={label} className="px-3 py-2 shadow-sm">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </div>
              <div className="mt-0.5 text-xl font-semibold tabular-nums">{value ?? "—"}</div>
            </Card>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.href} className="flex flex-col gap-2 p-3 shadow-sm">
              <div className="text-sm font-semibold text-[#1b365d]">{c.title}</div>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
              {c.stats ? <p className="text-xs text-foreground">{c.stats}</p> : null}
              <Button size="sm" className="mt-auto w-fit" onClick={() => router.push(c.href)}>
                Open
              </Button>
            </Card>
          ))}
        </div>
      </ListingPageContainer>
    </ProtectedRoute>
  );
}
