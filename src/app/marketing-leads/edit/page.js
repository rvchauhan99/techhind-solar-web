"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Container from "@/components/container";
import MarketingLeadForm from "../components/MarketingLeadForm";
import marketingLeadsService from "@/services/marketingLeadsService";
import { toastError, toastSuccess } from "@/utils/toast";
import Loader from "@/components/common/Loader";
import AddEditPageShell from "@/components/common/AddEditPageShell";

function EditMarketingLeadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("id");
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!leadId) {
      setError("Lead id is required");
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await marketingLeadsService.getMarketingLeadById(leadId);
        const leadData = res?.result || res?.data || res;
        setLead(leadData);
      } catch (err) {
        const msg =
          err?.response?.data?.message || err?.message || "Failed to load lead";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [leadId]);

  const handleSubmit = async (values) => {
    if (!leadId) return;
    setSaving(true);
    try {
      await marketingLeadsService.updateMarketingLead(leadId, values);
      toastSuccess("Lead updated successfully");
      router.push(`/marketing-leads/view?id=${leadId}`);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to update lead";
      toastError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <AddEditPageShell
        title="Edit Marketing Lead"
        listHref="/marketing-leads"
        listLabel="Leads"
      >
        <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 mt-4">
          {error}
        </div>
      </AddEditPageShell>
    );
  }

  if (!lead) {
    return null;
  }

  return (
    <AddEditPageShell
      title={lead ? `Edit Lead #${lead.lead_number || lead.id}` : "Edit Marketing Lead"}
      listHref="/marketing-leads"
      listLabel="Leads"
    >
      <div className="min-h-full bg-gradient-to-b from-muted/30 to-transparent">
        <Container className="pt-2 px-2">
          <MarketingLeadForm
            defaultValues={lead}
            onSubmit={handleSubmit}
            loading={saving}
          />
        </Container>
      </div>
    </AddEditPageShell>
  );
}

export default function EditMarketingLeadPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="flex justify-center items-center min-h-[60vh]">
            <Loader />
          </div>
        }
      >
        <EditMarketingLeadContent />
      </Suspense>
    </ProtectedRoute>
  );
}
