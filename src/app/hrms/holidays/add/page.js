"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import HolidayForm from "../HolidayForm";
import { toastSuccess, toastErrorFromApi, getApiErrorMessage } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";

export default function HrmsHolidayAddPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (payload) => {
    setSaving(true);
    setServerError(null);
    try {
      await hrmsService.createHoliday(payload);
      toastSuccess("Holiday created");
      router.push("/hrms/holidays");
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Create failed"));
      toastErrorFromApi(err, "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add Holiday" listHref="/hrms/holidays" listLabel="Holidays">
        <HolidayForm
          onSubmit={handleSubmit}
          loading={saving}
          serverError={serverError}
          onCancel={() => router.back()}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
