"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AutocompleteField from "@/components/common/AutocompleteField";
import Input from "@/components/common/Input";
import mastersService from "@/services/mastersService";

export default function B2bCancelOrderDialog({
  open,
  onOpenChange,
  order,
  eligibility,
  onConfirm,
  loading = false,
}) {
  const [cancelReasonId, setCancelReasonId] = useState("");
  const [cancelRemarks, setCancelRemarks] = useState("");
  const [cancelReasonOptions, setCancelReasonOptions] = useState([]);
  const [cancelReasonLoading, setCancelReasonLoading] = useState(false);

  const requiresReason = eligibility?.requiresReason === true;
  const mode = eligibility?.mode;
  const isRemaining = mode === "remaining";

  useEffect(() => {
    if (!open) {
      setCancelReasonId("");
      setCancelRemarks("");
      return;
    }
    if (!requiresReason) return;

    let cancelled = false;
    (async () => {
      try {
        setCancelReasonLoading(true);
        const options = await mastersService.getReferenceOptionsSearch("reason.model", {
          reason_type: "b2b_sales_order_cancellation",
          is_active: true,
        });
        if (!cancelled) setCancelReasonOptions(Array.isArray(options) ? options : []);
      } catch {
        if (!cancelled) setCancelReasonOptions([]);
      } finally {
        if (!cancelled) setCancelReasonLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, requiresReason]);

  const handleConfirm = () => {
    if (requiresReason && !cancelReasonId) return;
    const selectedReason = cancelReasonOptions.find((o) => String(o.id) === String(cancelReasonId));
    onConfirm?.({
      cancellation_reason_id: cancelReasonId || undefined,
      cancellation_reason: selectedReason?.label || selectedReason?.reason || undefined,
      cancellation_remarks: cancelRemarks?.trim() || undefined,
    });
  };

  const title = isRemaining ? "Cancel remaining quantity?" : "Cancel order?";

  const descriptionText = requiresReason
    ? isRemaining
      ? "Remaining open quantity will be cancelled. Shipped quantities will not be affected."
      : "This will cancel the entire order. This action cannot be undone."
    : "Are you sure you want to cancel this draft order? The order will be marked as cancelled.";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{descriptionText}</AlertDialogDescription>
        </AlertDialogHeader>

        {requiresReason && (
          <div className="space-y-3 text-sm">
            {isRemaining && eligibility?.totalPendingQty != null && (
              <p className="font-medium text-foreground">
                Pending qty to cancel: {eligibility.totalPendingQty}
              </p>
            )}
            <AutocompleteField
              options={cancelReasonOptions}
              loading={cancelReasonLoading}
              value={cancelReasonOptions.find((o) => String(o.id) === String(cancelReasonId)) || null}
              onChange={(e, v) => setCancelReasonId(v?.id || "")}
              getOptionLabel={(o) => o?.label || o?.reason || ""}
              placeholder="Select cancellation reason"
              label="Reason"
              name="cancellation_reason_id"
              required
              fullWidth
            />
            <Input
              fullWidth
              label="Remarks (optional)"
              name="cancellation_remarks"
              value={cancelRemarks}
              onChange={(e) => setCancelRemarks(e.target.value)}
              multiline
              rows={3}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>No</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || (requiresReason && !cancelReasonId)}
          >
            {loading ? "Cancelling…" : "Yes, cancel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
