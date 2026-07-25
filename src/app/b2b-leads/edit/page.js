"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import B2bLeadForm from "../components/B2bLeadForm";
import b2bLeadService from "@/services/b2bLeadService";

export default function EditB2bLeadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setFetching(true);
      try {
        const res = await b2bLeadService.getB2bLeadById(id);
        const data = res?.result ?? res;
        if (data?.status === "converted") {
          toast.error("Converted leads cannot be edited");
          router.replace(`/b2b-leads/view?id=${id}`);
          return;
        }
        setLead(data);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load lead");
        router.push("/b2b-leads");
      } finally {
        setFetching(false);
      }
    })();
  }, [id, router]);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      const res = await b2bLeadService.updateB2bLead(id, payload);
      const updated = res?.result ?? res;
      if (updated?.warnings?.length) {
        updated.warnings.forEach((w) => toast.warning(w.message));
      }
      toast.success("B2B lead updated");
      router.push(`/b2b-leads/view?id=${id}`);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to update lead";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <ProtectedRoute>
        <AddEditPageShell title="Edit B2B Lead" listHref="/b2b-leads" listLabel="B2B Leads">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </AddEditPageShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AddEditPageShell title={`Edit ${lead?.lead_number || "B2B Lead"}`} listHref="/b2b-leads" listLabel="B2B Leads">
        <B2bLeadForm
          defaultValues={lead}
          onSubmit={handleSubmit}
          loading={loading}
          serverError={serverError}
          onCancel={() => router.push(`/b2b-leads/view?id=${id}`)}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
