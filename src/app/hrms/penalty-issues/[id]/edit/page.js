"use client";

import { useParams } from "next/navigation";
import PenaltyIssueForm from "../../PenaltyIssueForm";

export default function HrmsPenaltyIssueEditPage() {
  const params = useParams();
  return <PenaltyIssueForm issueId={params?.id} />;
}
