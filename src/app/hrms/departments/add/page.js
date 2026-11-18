"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import DepartmentForm from "../DepartmentForm";
import { toastSuccess, toastErrorFromApi, getApiErrorMessage } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsDepartmentAddPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (payload) => {
    setSaving(true);
    setServerError(null);
    try {
      await hrmsService.createDepartment(payload);
      toastSuccess("Department created");
      router.push("/hrms/departments");
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Create failed"));
      toastErrorFromApi(err, "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add Department" listHref="/hrms/departments" listLabel="Departments">
        <DepartmentForm
          onSubmit={handleSubmit}
          loading={saving}
          serverError={serverError}
          onCancel={() => router.back()}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
