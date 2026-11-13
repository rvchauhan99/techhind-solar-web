"use client";

import { useParams } from "next/navigation";
import PenaltyForm from "../../PenaltyForm";

export default function HrmsPenaltyEditPage() {
  const params = useParams();
  return <PenaltyForm penaltyId={params?.id} />;
}
