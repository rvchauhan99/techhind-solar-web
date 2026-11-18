"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import PenaltyIssueForm from "../../PenaltyIssueForm";
import { toastSuccess, toastErrorFromApi, getApiErrorMessage } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { unwrap } from "@/lib/apiUnwrap";

export default function HrmsPenaltyIssueEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await hrmsService.getPenaltyIssue(id);
        if (!cancelled) setRecord(unwrap(res));
      } catch (err) {
        if (!cancelled) {
          toastErrorFromApi(err, "Load failed");
          router.push("/hrms/penalty-issues");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    setServerError(null);
    try {
      await hrmsService.updatePenaltyIssue(id, payload);
      toastSuccess("Penalty issue updated");
      router.push("/hrms/penalty-issues");
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Update failed"));
      toastErrorFromApi(err, "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Edit Penalty Issue" listHref="/hrms/penalty-issues" listLabel="Penalty Issues">
        {loading ? (
          <Loader />
        ) : (
          <PenaltyIssueForm
            defaultValues={record}
            onSubmit={handleSubmit}
            loading={saving}
            serverError={serverError}
            onCancel={() => router.back()}
          />
        )}
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
