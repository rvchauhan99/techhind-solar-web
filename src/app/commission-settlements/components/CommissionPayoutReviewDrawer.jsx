"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import DetailsSidebar from "@/components/common/DetailsSidebar";
import OrderDetailsDrawer from "@/components/common/OrderDetailsDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import commissionSettlementService from "@/services/commissionSettlementService";
import SettlementByUserSummary from "./SettlementByUserSummary";
import {
  fmtMoney,
  payableAmount,
  hasOutstandingOffset,
  getOffsetOrders,
} from "../utils/settlementMoney";
import { formatOrderNumberFromRow } from "../utils/formatOrderNumberLabel";

function KpiCard({ label, value }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold leading-tight">{value}</div>
    </div>
  );
}

function statusLabel(status) {
  if (status === "pending_approval") return "Pending approval";
  if (status === "approved") return "Approved for payment";
  if (status === "paid") return "Paid";
  if (status === "rejected") return "Rejected";
  return status || "—";
}

export default function CommissionPayoutReviewDrawer({
  open,
  payoutId,
  onClose,
  onActionComplete,
  canApproveReject = false,
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadDetail = useCallback(async () => {
    if (!payoutId) return;
    setLoading(true);
    setDetail(null);
    try {
      const res = await commissionSettlementService.getPayoutRequestById(payoutId);
      setDetail(res?.result ?? res);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load payout");
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [payoutId, onClose]);

  useEffect(() => {
    if (open && payoutId) {
      setRemarks("");
      loadDetail();
    } else if (!open) {
      setDetail(null);
      setRemarks("");
    }
  }, [open, payoutId, loadDetail]);

  const lines = detail?.lines || [];
  const byUser = detail?.by_user || [];
  const orderOffsets = detail?.order_offsets || detail?.meta?.order_offsets || [];
  const showOffset = hasOutstandingOffset(lines) || orderOffsets.length > 0;
  const lineCount = lines.length;
  const isPending = detail?.status === "pending_approval";

  const openOrder = (orderId) => {
    if (!orderId) return;
    setSelectedOrder({ id: orderId });
    setOrderDrawerOpen(true);
  };

  const downloadVoucher = async () => {
    if (!payoutId) return;
    setDownloading(true);
    try {
      const blob = await commissionSettlementService.downloadPayoutVoucher(payoutId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payout-voucher-${detail?.payout_number || payoutId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Voucher download failed");
    } finally {
      setDownloading(false);
    }
  };

  const runAction = async (actionType) => {
    if (!payoutId || !actionType) return;
    if (actionType === "reject" && !String(remarks).trim()) {
      toast.error("Rejection remarks are required");
      return;
    }
    setSubmitting(true);
    try {
      if (actionType === "approve") {
        await commissionSettlementService.approvePayoutRequest(payoutId, {
          remarks: remarks.trim() || undefined,
        });
        toast.success("Payout approved for payment");
      } else {
        await commissionSettlementService.rejectPayoutRequest(payoutId, {
          rejection_remarks: remarks.trim(),
        });
        toast.success("Payout request rejected");
      }
      onActionComplete?.();
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const title = detail?.payout_number
    ? `Payout ${detail.payout_number}`
    : payoutId
      ? `Payout #${payoutId}`
      : "Payout review";

  const settlementLabel = useMemo(
    () => (detail?.settlement_numbers || []).join(", ") || "—",
    [detail?.settlement_numbers]
  );

  return (
    <>
      <DetailsSidebar
        open={open}
        onClose={onClose}
        title={title}
        closeOnBackdropClick={!submitting}
        panelClassName="sm:max-w-[min(96vw,1100px)] lg:max-w-[min(96vw,1100px)]"
      >
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading payout…</p>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground py-4">No data</p>
        ) : (
          <div className="flex flex-col gap-3 pb-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary" className="text-[10px]">
                {statusLabel(detail.status)}
              </Badge>
              <span className="text-muted-foreground">
                Requested {detail.requested_at ? String(detail.requested_at).slice(0, 16) : "—"}
                {detail.requested_by_name ? ` · ${detail.requested_by_name}` : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <KpiCard label="Net payable" value={`₹ ${fmtMoney(payableAmount(detail))}`} />
              <KpiCard label="Gross" value={`₹ ${fmtMoney(detail.gross_line_total ?? detail.total_amount)}`} />
              <KpiCard
                label="Deduction"
                value={`₹ ${fmtMoney(detail.total_outstanding_deduction ?? 0)}`}
              />
              <KpiCard label="Lines" value={String(lineCount)} />
              <KpiCard label="Beneficiary" value={detail.beneficiary_name || "—"} />
              <KpiCard label="Settlements" value={settlementLabel} />
            </div>

            {showOffset ? (
              <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 space-y-1">
                <p className="font-semibold">Outstanding offset</p>
                <ul className="text-[10px] list-disc pl-4 space-y-0.5">
                  {(orderOffsets.length ? orderOffsets : getOffsetOrders(lines)).map((o) => (
                    <li key={o.order_id}>
                      {formatOrderNumberFromRow(o, { emptyFallback: `Order #${o.order_id}` })}: deduction ₹{" "}
                      {fmtMoney(o.deduction_amount ?? o.order_outstanding)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-xs font-semibold text-muted-foreground">By beneficiary</p>
            <SettlementByUserSummary
              byUser={byUser}
              lines={lines}
              showDeduction={showOffset || Number(detail.total_outstanding_deduction) > 0}
            />

            <div className="overflow-auto rounded border border-slate-200">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">Order</th>
                    <th className="px-2 py-1.5 font-semibold">Settlement</th>
                    <th className="px-2 py-1.5 font-semibold">Role</th>
                    <th className="px-2 py-1.5 font-semibold">Line status</th>
                    <th className="px-2 py-1.5 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => openOrder(l.order_id)}
                        >
                          {formatOrderNumberFromRow(l)}
                        </button>
                      </td>
                      <td className="px-2 py-1.5">{l.settlement_number || "—"}</td>
                      <td className="px-2 py-1.5">{l.role || "—"}</td>
                      <td className="px-2 py-1.5">
                        {l.settlement_status === "in_payout"
                          ? "In payout"
                          : l.settlement_status === "settled"
                            ? "Settled"
                            : l.settlement_status === "approved"
                              ? "Approved"
                              : l.settlement_status || "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        ₹{fmtMoney(l.line_net_amount ?? l.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={downloadVoucher}
                disabled={downloading}
              >
                {downloading ? "Downloading…" : "Download Voucher"}
              </Button>
              {canApproveReject && isPending ? (
                <>
                  <div className="min-w-[200px] flex-1 space-y-1">
                    <Label className="text-[10px]">Remarks (required to reject)</Label>
                    <Input
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="Optional for approve"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8"
                    onClick={() => runAction("approve")}
                    disabled={submitting}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-8"
                    onClick={() => runAction("reject")}
                    disabled={submitting}
                  >
                    Reject
                  </Button>
                </>
              ) : null}
            </div>
            {detail.rejection_remarks ? (
              <p className="text-[11px] text-red-700">Rejection: {detail.rejection_remarks}</p>
            ) : null}
            {detail.status === "approved" ? (
              <p className="text-[11px] text-muted-foreground">
                Approved {detail.approved_at ? String(detail.approved_at).slice(0, 16) : ""}
                {detail.approved_by_name ? ` · ${detail.approved_by_name}` : ""}. Accounts can confirm payment on Payout screen.
              </p>
            ) : null}
          </div>
        )}
      </DetailsSidebar>

      <OrderDetailsDrawer
        open={orderDrawerOpen}
        onClose={() => {
          setOrderDrawerOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        showPrint={false}
      />
    </>
  );
}
