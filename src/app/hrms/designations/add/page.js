"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import DesignationForm from "../DesignationForm";
import { toastSuccess, toastErrorFromApi, getApiErrorMessage } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsDesignationAddPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (payload) => {
    setSaving(true);
    setServerError(null);
    try {
      await hrmsService.createDesignation(payload);
      toastSuccess("Designation created");
      router.push("/hrms/designations");
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Create failed"));
      toastErrorFromApi(err, "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add Designation" listHref="/hrms/designations" listLabel="Designations">
        <DesignationForm
          onSubmit={handleSubmit}
          loading={saving}
          serverError={serverError}
          onCancel={() => router.back()}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
