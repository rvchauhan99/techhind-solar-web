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
  fmtSignedMoney,
  payableAmount,
  hasOutstandingOffset,
  getOffsetOrders,
  hasLineAdjustments,
  formatAdjustmentBadge,
} from "../utils/settlementMoney";

function fmtDate(v) {
  if (!v) return "—";
  return String(v).slice(0, 10);
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold leading-tight">{value}</div>
    </div>
  );
}

export default function CommissionSettlementReviewDrawer({
  open,
  settlementId,
  onClose,
  onActionComplete,
  canApproveReject = false,
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadDetail = useCallback(async () => {
    if (!settlementId) return;
    setLoading(true);
    setDetail(null);
    try {
      const res = await commissionSettlementService.getCommissionSettlementById(settlementId);
      setDetail(res?.result ?? res);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load settlement");
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [settlementId, onClose]);

  useEffect(() => {
    if (open && settlementId) {
      setRemarks("");
      loadDetail();
    } else if (!open) {
      setDetail(null);
      setRemarks("");
    }
  }, [open, settlementId, loadDetail]);

  const lines = detail?.lines || [];
  const byUser = detail?.by_user || [];
  const orderOffsets = detail?.order_offsets || detail?.meta?.order_offsets || [];
  const showOffset = hasOutstandingOffset(lines) || orderOffsets.length > 0;
  const adjustmentSummary = detail?.adjustment_summary || detail?.meta?.adjustment_summary;
  const showAdjustments =
    detail?.has_line_adjustments ||
    (adjustmentSummary?.count ?? 0) > 0 ||
    hasLineAdjustments(lines);
  const lineCount = lines.length;
  const beneficiaryCount = useMemo(
    () => new Set(lines.map((l) => l.beneficiary_user_id).filter(Boolean)).size,
    [lines]
  );

  const openOrder = (orderId) => {
    if (!orderId) return;
    setSelectedOrder({ id: orderId });
    setOrderDrawerOpen(true);
  };

  const runAction = async (actionType) => {
    if (!settlementId || !actionType) return;
    if (actionType === "reject" && !String(remarks).trim()) {
      toast.error("Rejection remarks are required");
      return;
    }
    setSubmitting(true);
    try {
      if (actionType === "approve") {
        await commissionSettlementService.approveCommissionSettlement(settlementId, {
          remarks: remarks.trim() || undefined,
        });
        toast.success("Settlement approved for payout");
      } else {
        await commissionSettlementService.rejectCommissionSettlement(settlementId, {
          rejection_remarks: remarks.trim(),
        });
        toast.success("Settlement rejected");
      }
      onActionComplete?.();
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const title = detail?.settlement_number
    ? `Settlement ${detail.settlement_number}`
    : settlementId
      ? `Settlement #${settlementId}`
      : "Settlement review";

  return (
    <>
      <DetailsSidebar
        open={open}
        onClose={onClose}
        title={title}
        closeOnBackdropClick={!submitting}
        panelClassName="sm:max-w-[min(96vw,1420px)] lg:max-w-[min(96vw,1420px)]"
      >
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading settlement…</p>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground py-4">No data</p>
        ) : (
          <div className="flex flex-col gap-3 pb-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary" className="text-[10px]">
                {detail.status || "pending_approval"}
              </Badge>
              <span className="text-muted-foreground">
                Submitted {detail.submitted_at ? String(detail.submitted_at).slice(0, 16) : "—"}
                {detail.submitted_by_name ? ` · ${detail.submitted_by_name}` : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <KpiCard label="Payable" value={`₹ ${fmtMoney(payableAmount(detail))}`} />
              <KpiCard
                label="Gross"
                value={`₹ ${fmtMoney(detail.gross_line_total ?? detail.total_line_amount)}`}
              />
              {showAdjustments ? (
                <KpiCard
                  label="Manual adjustments"
                  value={`${adjustmentSummary?.count ?? 0} lines`}
                />
              ) : null}
              {showOffset ? (
                <KpiCard
                  label="Outstanding cut"
                  value={`₹ ${fmtMoney(detail.total_outstanding_deduction ?? 0)}`}
                />
              ) : (
                <KpiCard label="Line total" value={`₹ ${fmtMoney(detail.total_line_amount)}`} />
              )}
              <KpiCard label="Round off" value={`₹ ${fmtSignedMoney(detail.total_round_off_amount ?? 0)}`} />
              <KpiCard label="Lines / users" value={`${lineCount} / ${beneficiaryCount}`} />
            </div>

            {showAdjustments ? (
              <div className="rounded border-2 border-violet-300 bg-violet-50 px-2 py-2 text-xs text-violet-950 space-y-1">
                <p className="font-bold">Manual commission adjustments — review carefully</p>
                <p className="text-[10px]">
                  Amounts were revised from system-calculated commission before settlement was submitted.
                </p>
                <p className="text-[10px] font-medium">
                  {adjustmentSummary?.count ?? 0} line(s) · total bonus +₹{" "}
                  {fmtMoney(adjustmentSummary?.bonus_total ?? 0)} · total deduction −₹{" "}
                  {fmtMoney(adjustmentSummary?.deduction_total ?? 0)}
                </p>
              </div>
            ) : null}

            {showOffset ? (
              <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 space-y-1">
                <p className="font-semibold">Outstanding offset (on approval)</p>
                <p className="text-[10px]">
                  {detail.status === "paid" || detail.status === "approved"
                    ? orderOffsets.some((o) => o.payment_id)
                      ? "Approved payments were recorded for affected orders when this batch was approved."
                      : "Net payable is after outstanding deduction applied at approval."
                    : "On approval, an approved payment will be recorded for each affected order; net payable is after deduction."}
                </p>
                <ul className="text-[10px] list-disc pl-4 space-y-0.5">
                  {(orderOffsets.length ? orderOffsets : getOffsetOrders(lines)).map((o) => (
                    <li key={o.order_id}>
                      {o.order_number || `Order #${o.order_id}`}: outstanding ₹{" "}
                      {fmtMoney(o.outstanding_at_approve ?? o.order_outstanding)} · deduction ₹{" "}
                      {fmtMoney(o.deduction_amount)}
                      {o.payment_id ? ` · payment #${o.payment_id}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detail.remarks?.trim() ? (
              <p className="text-xs text-slate-600 border border-slate-100 rounded px-2 py-1.5 bg-white">
                <span className="font-semibold text-muted-foreground">Submitter remarks: </span>
                {detail.remarks}
              </p>
            ) : null}

            {byUser.length > 0 && (
              <section>
                <h3 className="text-[11px] font-semibold text-slate-700 mb-1">Summary by beneficiary</h3>
                <SettlementByUserSummary byUser={byUser} lines={lines} showDeduction={showOffset} />
              </section>
            )}

            <section>
              <h3 className="text-[11px] font-semibold text-slate-700 mb-1">Line items ({lineCount})</h3>
              <div className="overflow-x-auto max-h-[min(50vh,420px)] overflow-y-auto rounded border border-slate-200">
                <table className="w-full text-[11px] min-w-0">
                  <thead className="bg-slate-50 text-left sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-1 font-medium">Order</th>
                      <th className="px-2 py-1 font-medium">Date</th>
                      <th className="px-2 py-1 font-medium">Branch</th>
                      <th className="px-2 py-1 font-medium">Beneficiary</th>
                      <th className="px-2 py-1 font-medium">Role</th>
                      <th className="px-2 py-1 font-medium text-right">Master rate</th>
                      <th className="px-2 py-1 font-medium text-right">Outstanding</th>
                      <th className="px-2 py-1 font-medium text-right">Combined</th>
                      <th className="px-2 py-1 font-medium text-right">System</th>
                      <th className="px-2 py-1 font-medium text-right">Adjustment</th>
                      <th className="px-2 py-1 font-medium">Reason</th>
                      <th className="px-2 py-1 font-medium text-right">Gross</th>
                      <th className="px-2 py-1 font-medium text-right">Deduction</th>
                      <th className="px-2 py-1 font-medium text-right">Net</th>
                      <th className="px-2 py-1 font-medium text-right">Per kW</th>
                      <th className="px-2 py-1 font-medium text-right">kW</th>
                      <th className="px-2 py-1 font-medium">Accrued</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((ln) => {
                      const adjBadge = formatAdjustmentBadge(ln);
                      const rowBg = ln.settlement_blocked
                        ? "bg-red-50/80"
                        : ln.adjustment_type === "bonus"
                          ? "bg-emerald-50/70 border-l-2 border-l-emerald-500"
                          : ln.adjustment_type === "deduction"
                            ? "bg-rose-50/70 border-l-2 border-l-rose-500"
                            : ln.outstanding_offset
                              ? "bg-amber-50/80"
                              : "";
                      return (
                      <tr
                        key={ln.id}
                        className={`border-t border-slate-100 hover:bg-slate-50/80 ${rowBg}`}
                      >
                        <td className="px-2 py-1">
                          {ln.order_id ? (
                            <button
                              type="button"
                              className="text-primary font-medium hover:underline"
                              onClick={() => openOrder(ln.order_id)}
                            >
                              {ln.order_number || ln.order_id}
                            </button>
                          ) : (
                            ln.order_number || "—"
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">{fmtDate(ln.order_date)}</td>
                        <td className="px-2 py-1">{ln.branch_name || "—"}</td>
                        <td className="px-2 py-1">{ln.beneficiary_name || "—"}</td>
                        <td className="px-2 py-1">{ln.role || "—"}</td>
                        <td
                          className="px-2 py-1 text-right whitespace-nowrap"
                          title={ln.master_setup_rate_detail || ln.master_setup_rate_label || undefined}
                        >
                          {ln.master_setup_rate != null ? (
                            <span className="inline-flex flex-col items-end leading-tight">
                              <span>₹ {fmtMoney(ln.master_setup_rate)}</span>
                              {ln.master_setup_rate_label ? (
                                <span className="text-[9px] font-normal text-muted-foreground">
                                  {ln.master_setup_rate_label}
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-2 py-1 text-right">₹ {fmtMoney(ln.order_outstanding ?? 0)}</td>
                        <td className="px-2 py-1 text-right">₹ {fmtMoney(ln.combined_commission_on_order ?? ln.amount)}</td>
                        <td className="px-2 py-1 text-right text-muted-foreground">
                          ₹ {fmtMoney(ln.original_amount ?? ln.amount)}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {adjBadge ? (
                            <span
                              className={`font-semibold ${
                                adjBadge.className === "bonus" ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {adjBadge.label} {adjBadge.sign}₹{fmtMoney(adjBadge.amount)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-2 py-1 max-w-[120px] truncate" title={ln.adjustment_reason || ""}>
                          {ln.adjustment_reason || "—"}
                        </td>
                        <td className="px-2 py-1 text-right">₹ {fmtMoney(ln.gross_amount ?? ln.amount)}</td>
                        <td className="px-2 py-1 text-right text-amber-800">
                          {Number(ln.line_deduction) > 0 ? `− ₹ ${fmtMoney(ln.line_deduction)}` : "—"}
                        </td>
                        <td className="px-2 py-1 text-right font-medium">₹ {fmtMoney(ln.line_net_amount ?? ln.amount)}</td>
                        <td className="px-2 py-1 text-right">{ln.per_kw != null ? fmtMoney(ln.per_kw) : "—"}</td>
                        <td className="px-2 py-1 text-right">{ln.capacity_kw != null ? fmtMoney(ln.capacity_kw) : "—"}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{fmtDate(ln.accrued_at)}</td>
                      </tr>
                    );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold">
                    <tr>
                      <td colSpan={9} className="px-2 py-1 text-right">
                        Total
                      </td>
                      <td className="px-2 py-1 text-right">₹ {fmtMoney(payableAmount(detail))}</td>
                      <td colSpan={7} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {canApproveReject && detail.status === "pending_approval" && (
              <div className="sticky bottom-0 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 border-t border-border bg-background mt-2 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Approval remarks (optional for approve, required for reject)</Label>
                  <Input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Notes for audit trail…"
                    disabled={submitting}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={submitting}
                    onClick={() => runAction("reject")}
                  >
                    {submitting ? "…" : "Reject"}
                  </Button>
                  <Button type="button" size="sm" disabled={submitting} onClick={() => runAction("approve")}>
                    {submitting ? "…" : "Approve"}
                  </Button>
                </div>
              </div>
            )}
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
