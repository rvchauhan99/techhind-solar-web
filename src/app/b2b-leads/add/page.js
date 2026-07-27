"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import B2bLeadForm from "../components/B2bLeadForm";
import b2bLeadService from "@/services/b2bLeadService";

export default function AddB2bLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      const res = await b2bLeadService.createB2bLead(payload);
      const lead = res?.result ?? res;
      if (lead?.warnings?.length) {
        lead.warnings.forEach((w) => toast.warning(w.message));
      }
      toast.success("B2B lead created");
      router.push(`/b2b-leads/view?id=${lead.id}`);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to create lead";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="Add B2B Lead" listHref="/b2b-leads" listLabel="B2B Leads">
        <B2bLeadForm
          onSubmit={handleSubmit}
          loading={loading}
          serverError={serverError}
          onCancel={() => router.push("/b2b-leads")}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}
