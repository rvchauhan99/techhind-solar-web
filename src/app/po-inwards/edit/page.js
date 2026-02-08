"use client";

import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import AddEditPageShell from "@/components/common/AddEditPageShell";
import Loader from "@/components/common/Loader";
import POInwardForm from "../components/POInwardForm";
import poInwardService from "@/services/poInwardService";

function EditPOInwardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [serverError, setServerError] = useState(null);
  const [defaultValues, setDefaultValues] = useState({});

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      loadPOInward(id);
    } else {
      setServerError("PO Inward ID is required");
      setLoadingRecord(false);
    }
  }, [searchParams]);

  const loadPOInward = async (id) => {
    setLoadingRecord(true);
    setServerError(null);
    try {
      const response = await poInwardService.getPOInwardById(id);
      const result = response.result || response;

      const transformedData = {
        ...result,
        items:
          result.items?.map((item) => {
            const serialNumbers =
              item.serials?.map((s) =>
                typeof s === "string" ? s : s.serial_number
              ) || [];

            let lotNumber = "";
            let remarks = item.remarks || "";
            if (item.remarks && item.remarks.includes("Lot:")) {
              const parts = item.remarks.split("Lot:");
              if (parts.length > 1) {
                const lotPart = parts[1].split("|")[0]?.trim();
                lotNumber = lotPart || "";
                remarks = parts[1].split("|")[1]?.trim() || "";
              }
            }

            const productTrackingType =
              item.tracking_type || item.product?.tracking_type || "LOT";
            const productSerialRequired =
              item.serial_required || item.product?.serial_required || false;
            const trackingType =
              productTrackingType === "SERIAL" || productSerialRequired
                ? "SERIAL"
                : productTrackingType;

            return {
              purchase_order_item_id: item.purchase_order_item_id,
              product_id: item.product_id,
              product_name: item.product?.product_name || "",
              tracking_type: trackingType,
              serial_required: productSerialRequired,
              ordered_quantity: item.ordered_quantity,
              received_quantity: item.received_quantity,
              accepted_quantity: item.accepted_quantity,
              rejected_quantity: item.rejected_quantity,
              rate: item.rate,
              gst_percent: item.gst_percent,
              serials: serialNumbers,
              lot_number: lotNumber,
              remarks: remarks,
            };
          }) || [],
      };

      setDefaultValues(transformedData);
    } catch (error) {
      console.error("Error fetching PO Inward:", error);
      setServerError("Failed to load PO Inward");
    } finally {
      setLoadingRecord(false);
    }
  };

  const handleSubmit = async (payload) => {
    setLoading(true);
    setServerError(null);

    try {
      const id = searchParams.get("id");
      await poInwardService.updatePOInward(id, payload);
      toast.success("PO Inward (Goods Receipt) updated successfully");
      setTimeout(() => {
        router.push("/po-inwards");
      }, 1000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to update PO Inward";
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingRecord) {
    return (
      <AddEditPageShell title="Edit PO Inward" listHref="/po-inwards" listLabel="PO Inwards">
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader />
        </div>
      </AddEditPageShell>
    );
  }

  if (serverError && !defaultValues.id) {
    return (
      <AddEditPageShell title="Edit PO Inward" listHref="/po-inwards" listLabel="PO Inwards">
        <div role="alert" className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
          {serverError}
        </div>
      </AddEditPageShell>
    );
  }

  return (
    <AddEditPageShell title="Edit PO Inward (Goods Receipt)" listHref="/po-inwards" listLabel="PO Inwards">
      <POInwardForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        loading={loading}
        serverError={serverError}
        onClearServerError={() => setServerError(null)}
        onCancel={() => router.push("/po-inwards")}
      />
    </AddEditPageShell>
  );
}

function LoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[100vh]">
      <Loader />
    </div>
  );
}

export default function EditPOInward() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingFallback />}>
        <EditPOInwardContent />
      </Suspense>
    </ProtectedRoute>
  );
}
