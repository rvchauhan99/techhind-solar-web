"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import B2bShipmentReturnForm from "../components/B2bShipmentReturnForm";
import b2bShipmentReturnService from "@/services/b2bShipmentReturnService";

function AddB2bShipmentReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shipmentId = searchParams.get("shipment_id");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      await b2bShipmentReturnService.createB2bShipmentReturn(payload);
      toast.success("B2B shipment return saved as draft");
      setTimeout(() => router.push("/b2b-shipment-returns"), 800);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to create return";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AddEditPageShell
      title="New B2B Shipment Return"
      listHref="/b2b-shipment-returns"
      listLabel="B2B Shipment Returns"
    >
      <B2bShipmentReturnForm
        lockedShipmentId={shipmentId ? parseInt(shipmentId, 10) : null}
        loading={loading}
        serverError={serverError}
        onClearServerError={() => setServerError(null)}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/b2b-shipment-returns")}
      />
    </AddEditPageShell>
  );
}

export default function AddB2bShipmentReturnPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="flex justify-center items-center min-h-[60vh]"><Loader /></div>}>
        <AddB2bShipmentReturnContent />
      </Suspense>
    </ProtectedRoute>
  );
}
