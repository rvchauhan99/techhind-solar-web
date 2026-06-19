"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import commissionSettlementService from "@/services/commissionSettlementService";
import SettlementByUserSummary from "./SettlementByUserSummary";
import {
  fmtMoney,
  fmtSignedMoney,
  payableAmount,
  hasOutstandingOffset,
} from "../utils/settlementMoney";
import { formatOrderNumberFromRow } from "../utils/formatOrderNumberLabel";

export default function CommissionSettlementDetailDialog({
  open,
  onOpenChange,
  settlementId,
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!settlementId) return;
    setLoading(true);
    setDetail(null);
    try {
      const res = await commissionSettlementService.getCommissionSettlementById(settlementId);
      setDetail(res?.result ?? res);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load settlement");
      onOpenChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [settlementId, onOpenChange]);

  useEffect(() => {
    if (open && settlementId) loadDetail();
    else if (!open) setDetail(null);
  }, [open, settlementId, loadDetail]);

  const showDeduction =
    hasOutstandingOffset(detail?.lines) ||
    (Array.isArray(detail?.order_offsets) && detail.order_offsets.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {detail?.settlement_number ? `Settlement ${detail.settlement_number}` : "Settlement detail"}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : detail ? (
          <div className="space-y-2 text-sm">
            <p>Status: {detail.status}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Payable </span>
                <span className="font-semibold">₹ {fmtMoney(payableAmount(detail))}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Line total </span>
                <span className="font-semibold">₹ {fmtMoney(detail.total_line_amount)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Round off </span>
                <span className="font-semibold">₹ {fmtSignedMoney(detail.total_round_off_amount ?? 0)}</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-muted-foreground pt-1">By beneficiary</p>
            <SettlementByUserSummary
              byUser={detail.by_user || []}
              lines={detail.lines || []}
              showDeduction={showDeduction}
            />
            <p className="text-xs font-semibold text-muted-foreground">Lines</p>
            <div className="max-h-48 overflow-y-auto space-y-0.5 text-xs">
              {(detail.lines || []).map((ln) => (
                <div key={ln.id} className="flex justify-between gap-2">
                  <span>
                    {formatOrderNumberFromRow(ln)} · {ln.role} · {ln.beneficiary_name}
                  </span>
                  <span className="tabular-nums text-right shrink-0">
                    {Number(ln.line_deduction) > 0 ? (
                      <>
                        <span className="text-muted-foreground">
                          ₹{fmtMoney(ln.gross_amount ?? ln.amount)}
                        </span>
                        <span className="text-amber-700 mx-0.5">
                          −₹{fmtMoney(ln.line_deduction)}
                        </span>
                        <span className="font-medium">
                          ₹{fmtMoney(ln.line_net_amount ?? ln.amount)}
                        </span>
                      </>
                    ) : (
                      fmtMoney(ln.line_net_amount ?? ln.amount)
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
