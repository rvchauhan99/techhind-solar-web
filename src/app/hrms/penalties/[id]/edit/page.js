"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import PenaltyForm from "../../PenaltyForm";
import { toastSuccess, toastErrorFromApi, getApiErrorMessage } from "@/utils/toast";
import * as hrmsService from "@/services/hrmsService";
import { unwrap } from "@/lib/apiUnwrap";

export default function HrmsPenaltyEditPage() {
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
        const res = await hrmsService.getPenalty(id);
        if (!cancelled) setRecord(unwrap(res));
      } catch (err) {
        if (!cancelled) {
          toastErrorFromApi(err, "Load failed");
          router.push("/hrms/penalties");
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
      await hrmsService.updatePenalty(id, payload);
      toastSuccess("Penalty updated");
      router.push("/hrms/penalties");
    } catch (err) {
      setServerError(getApiErrorMessage(err, "Update failed"));
      toastErrorFromApi(err, "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Edit Penalty" listHref="/hrms/penalties" listLabel="Penalties">
        {loading ? (
          <Loader />
        ) : (
          <PenaltyForm
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
