"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import PenaltyIssueForm from "../PenaltyIssueForm";
import { toastSuccess, toastErrorFromApi, getApiErrorMessage } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsPenaltyIssueAddPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (payload) => {
    setSaving(true);
    setServerError(null);
    try {
      await hrmsService.createPenaltyIssue(payload);
      toastSuccess("Penalty issued");
      router.push("/hrms/penalty-issues");
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Could not issue penalty"));
      toastErrorFromApi(err, "Could not issue penalty");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Issue Penalty" listHref="/hrms/penalty-issues" listLabel="Penalty Issues">
        <PenaltyIssueForm
          onSubmit={handleSubmit}
          loading={saving}
          serverError={serverError}
          onCancel={() => router.back()}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
