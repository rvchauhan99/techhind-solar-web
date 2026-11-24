"use client";

import { Suspense } from "react";
import InterviewAddForm from "./InterviewAddForm";

export default function HrmsInterviewAddPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
      <InterviewAddForm />
    </Suspense>
  );
}
