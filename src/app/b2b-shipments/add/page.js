"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useListReturnNavigation } from "@/hooks/useListReturnNavigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import B2bShipmentForm from "../components/B2bShipmentForm";
import b2bShipmentService from "@/services/b2bShipmentService";

function AddB2bShipmentContent() {
  const router = useRouter();
  const { goToList } = useListReturnNavigation("/b2b-shipments");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      await b2bShipmentService.createB2bShipment(payload);
      toast.success("B2B Shipment created");
      setTimeout(() => goToList(), 800);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to create shipment";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AddEditPageShell title="New B2B Shipment" listHref="/b2b-shipments" listLabel="B2B Shipments">
        <B2bShipmentForm
          onSubmit={handleSubmit}
          loading={loading}
          serverError={serverError}
          onClearServerError={() => setServerError(null)}
          onCancel={() => goToList()}
        />
      </AddEditPageShell>
    </ProtectedRoute>
  );
}

export default function AddB2bShipmentPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[100vh]"><Loader /></div>}>
      <AddB2bShipmentContent />
    </Suspense>
  );
}
