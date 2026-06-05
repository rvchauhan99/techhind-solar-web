"use client";

import { useState } from "react";
import { IconEye, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { toastError } from "@/utils/toast";

/**
 * Opens payment receipt/cheque proof in a new tab via signed URL.
 * @param {object} props
 * @param {number|string} props.paymentId
 * @param {boolean} props.hasFile - row.receipt_cheque_file truthy
 * @param {(id: number|string) => Promise<string|null>} props.fetchUrl
 * @param {string} [props.label]
 * @param {string} [props.className]
 */
export default function PaymentProofViewButton({
  paymentId,
  hasFile,
  fetchUrl,
  label = "View",
  className = "h-7 px-2 text-xs gap-1",
}) {
  const [loading, setLoading] = useState(false);

  if (!hasFile || paymentId == null || paymentId === "") {
    return <span className="text-[10px] text-slate-400">—</span>;
  }

  const handleView = async () => {
    setLoading(true);
    try {
      const url = await fetchUrl(paymentId);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toastError("No attachment available");
      }
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "Failed to open attachment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={loading}
      onClick={handleView}
    >
      {loading ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconEye className="size-3.5" />}
      {label}
    </Button>
  );
}
