"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import B2bShipmentReturnForm from "../components/B2bShipmentReturnForm";
import b2bShipmentReturnService from "@/services/b2bShipmentReturnService";

function EditB2bShipmentReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnId = parseInt(searchParams.get("id"), 10);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [serverError, setServerError] = useState(null);
  const [eligibility, setEligibility] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!returnId) {
        setServerError("Return id is required");
        setInitialLoading(false);
        return;
      }
      try {
        const res = await b2bShipmentReturnService.getB2bShipmentReturnById(returnId);
        const record = res?.result ?? res;
        if (record?.status !== "DRAFT") {
          setServerError("Only DRAFT returns can be edited");
          return;
        }
        const elig = await b2bShipmentReturnService.getShipmentEligibilityForReturn(
          record.b2b_shipment_id,
          returnId
        );
        const existingItems = (record.items || []).map((it) => ({
          b2b_shipment_item_id: it.b2b_shipment_item_id,
          return_quantity: it.return_quantity,
          serials: (it.serials || []).map((s) => s.serial_number),
        }));
        setEligibility({
          ...elig,
          _defaults: {
            return_date: record.return_date,
            reason_id: record.reason_id,
            reason_text: record.reason_text,
            remarks: record.remarks,
            items: existingItems,
          },
        });
      } catch (err) {
        setServerError(err?.response?.data?.message || "Failed to load return");
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, [returnId]);

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);
    try {
      await b2bShipmentReturnService.updateB2bShipmentReturn(returnId, payload);
      toast.success("Return updated");
      setTimeout(() => router.push("/b2b-shipment-returns"), 800);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to update return";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Loader /></div>;
  }

  return (
    <AddEditPageShell
      title="Edit B2B Shipment Return"
      listHref="/b2b-shipment-returns"
      listLabel="B2B Shipment Returns"
    >
      <B2bShipmentReturnForm
        returnId={returnId}
        eligibility={eligibility}
        lockedShipmentId={eligibility?.shipment?.id}
        loading={loading}
        serverError={serverError}
        onClearServerError={() => setServerError(null)}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/b2b-shipment-returns")}
      />
    </AddEditPageShell>
  );
}

export default function EditB2bShipmentReturnPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="flex justify-center items-center min-h-[60vh]"><Loader /></div>}>
        <EditB2bShipmentReturnContent />
      </Suspense>
    </ProtectedRoute>
  );
}
