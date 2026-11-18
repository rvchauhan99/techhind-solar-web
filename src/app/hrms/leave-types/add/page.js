"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import LeaveTypeForm from "../LeaveTypeForm";
import { toastSuccess, toastErrorFromApi, getApiErrorMessage } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsLeaveTypeAddPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (payload) => {
    setSaving(true);
    setServerError(null);
    try {
      await hrmsService.createLeaveType(payload);
      toastSuccess("Leave type created");
      router.push("/hrms/leave-types");
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Create failed"));
      toastErrorFromApi(err, "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add Leave Type" listHref="/hrms/leave-types" listLabel="Leave Types">
        <LeaveTypeForm
          onSubmit={handleSubmit}
          loading={saving}
          serverError={serverError}
          onCancel={() => router.back()}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
