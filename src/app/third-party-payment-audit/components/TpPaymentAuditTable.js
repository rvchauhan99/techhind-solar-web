"use client";

import { useState } from "react";
import { Box, Chip, Tooltip } from "@mui/material";
import moment from "moment";
import Link from "next/link";
import {
  IconCheck, IconX, IconPrinter, IconLoader2, IconEye, IconMessageQuestion,
} from "@tabler/icons-react";
import PaginatedTable from "@/components/common/PaginatedTable";
import thirdPartyPaymentAuditService from "@/services/thirdPartyPaymentAuditService";
import orderPaymentsService from "@/services/orderPaymentsService";
import Input from "@/components/common/Input";
import { toastSuccess, toastError } from "@/utils/toast";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button as UiButton } from "@/components/ui/button";
import AutocompleteField from "@/components/common/AutocompleteField";
import PaymentProofViewButton from "@/components/common/PaymentProofViewButton";

const CHANNEL = "b2c";
const calculatedTableHeight = () => `calc(100vh - 220px)`;

const TP_STATUS_META = {
  pending: { label: "Pending", color: "warning" },
  approved: { label: "Approved", color: "success" },
  rejected: { label: "Rejected", color: "error" },
  query_raised: { label: "Query Raised", color: "info" },
};

function flattenB2cRow(row) {
  if (!row) return row;
  return {
    ...row,
    order_id: row.order_id || row.order?.id || null,
    order_number: row.order?.order_number || row.order_number || null,
    customer_name: row.order?.customer?.customer_name || row.customer_name || null,
    branch_name: row.order?.branch?.name || row.branch_name || null,
    handled_by_name: row.order?.handledBy?.name || row.handled_by_name || null,
    order_project_cost: row.order?.project_cost ?? row.order_project_cost ?? null,
    payment_mode_name: row.paymentMode?.name || row.payment_mode_name || null,
    company_bank_name: row.companyBankAccount?.bank_name || row.company_bank_name || null,
    company_bank_account_number:
      row.companyBankAccount?.bank_account_number || row.company_bank_account_number || null,
    approved_by_name: row.approvedByUser?.name || row.approved_by_name || null,
    tp_audited_by_name: row.tpAuditedByUser?.name || row.tp_audited_by_name || null,
    tp_audit_status: row.tp_audit_status || "pending",
  };
}

function PaymentVerificationDetails({ payment }) {
  if (!payment) return null;
  const statusMeta = TP_STATUS_META[payment.tp_audit_status] || TP_STATUS_META.pending;

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2 space-y-1.5">
      <div className="text-[11px] font-semibold text-slate-700">Payment Verification Details</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] leading-4">
        <span className="text-slate-500">Order</span>
        <span className="font-medium text-slate-800">{payment.order_number || "-"}</span>
        <span className="text-slate-500">Customer</span>
        <span className="font-medium text-slate-800">{payment.customer_name || "-"}</span>
        <span className="text-slate-500">Branch</span>
        <span className="font-medium text-slate-800">{payment.branch_name || "-"}</span>
        <span className="text-slate-500">Payment Date</span>
        <span className="font-medium text-slate-800">
          {payment.date_of_payment ? moment(payment.date_of_payment).format("DD-MM-YYYY") : "-"}
        </span>
        <span className="text-slate-500">Amount</span>
        <span className="font-medium text-slate-800">
          {payment.payment_amount != null ? `₹${Number(payment.payment_amount).toLocaleString("en-IN")}` : "-"}
        </span>
        <span className="text-slate-500">Payment Mode</span>
        <span className="font-medium text-slate-800">{payment.payment_mode_name || "-"}</span>
        <span className="text-slate-500">Txn/Cheque No.</span>
        <span className="font-medium text-slate-800">{payment.transaction_cheque_number || "-"}</span>
        <span className="text-slate-500">Accountant</span>
        <span className="font-medium text-slate-800">{payment.approved_by_name || "-"}</span>
        <span className="text-slate-500">Receipt #</span>
        <span className="font-medium text-slate-800">{payment.receipt_number || "-"}</span>
        <span className="text-slate-500">TP Audit Status</span>
        <span className="font-medium text-slate-800">{statusMeta.label}</span>
      </div>
      {(payment.payment_remarks || payment.approval_remarks || payment.tp_audit_remarks) && (
        <div className="border-t border-slate-200 pt-1 space-y-0.5 text-[11px]">
          {payment.payment_remarks && (
            <div className="text-slate-700"><strong>Receive:</strong> {payment.payment_remarks}</div>
          )}
          {payment.approval_remarks && (
            <div className="text-slate-700"><strong>Internal Approve:</strong> {payment.approval_remarks}</div>
          )}
          {payment.tp_audit_remarks && (
            <div className="text-slate-700"><strong>TP Audit:</strong> {payment.tp_audit_remarks}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TpPaymentAuditTable({ filterParams = {} }) {
  const [loadingReceipt, setLoadingReceipt] = useState(new Set());
  const [loadingProof, setLoadingProof] = useState(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  const [approveDialog, setApproveDialog] = useState({
    open: false, paymentId: null, remarks: "", paymentSnapshot: null, reload: null,
  });
  const [rejectDialog, setRejectDialog] = useState({
    open: false, paymentId: null, reasonId: null, reasonLabel: "", remarks: "",
    paymentSnapshot: null, reload: null,
  });
  const [queryDialog, setQueryDialog] = useState({
    open: false, paymentId: null, remarks: "", paymentSnapshot: null, reload: null,
  });

  const handleCloseApproveDialog = () => {
    if (actionLoading) return;
    setApproveDialog({ open: false, paymentId: null, remarks: "", paymentSnapshot: null, reload: null });
  };

  const handleConfirmApprove = async () => {
    const { paymentId, remarks, reload } = approveDialog;
    setActionLoading(true);
    try {
      await thirdPartyPaymentAuditService.approve(paymentId, { channel: CHANNEL, remarks });
      toastSuccess("Third-party audit approved");
      handleCloseApproveDialog();
      if (reload) await reload();
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseRejectDialog = () => {
    if (actionLoading) return;
    setRejectDialog({
      open: false, paymentId: null, reasonId: null, reasonLabel: "", remarks: "",
      paymentSnapshot: null, reload: null,
    });
  };

  const handleConfirmReject = async () => {
    const { paymentId, reasonLabel, remarks, reload } = rejectDialog;
    const trimmedReason = String(reasonLabel || "").trim();
    if (!trimmedReason && !String(remarks || "").trim()) {
      toastError("Rejection reason or remarks is required");
      return;
    }
    setActionLoading(true);
    try {
      await thirdPartyPaymentAuditService.reject(paymentId, {
        channel: CHANNEL,
        rejection_reason: trimmedReason || remarks,
        remarks: String(remarks || "").trim() || undefined,
      });
      toastSuccess("Third-party audit rejected");
      handleCloseRejectDialog();
      if (reload) await reload();
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseQueryDialog = () => {
    if (actionLoading) return;
    setQueryDialog({ open: false, paymentId: null, remarks: "", paymentSnapshot: null, reload: null });
  };

  const handleConfirmQuery = async () => {
    const { paymentId, remarks, reload } = queryDialog;
    if (!String(remarks || "").trim()) {
      toastError("Remarks are required to raise a query");
      return;
    }
    setActionLoading(true);
    try {
      await thirdPartyPaymentAuditService.raiseQuery(paymentId, {
        channel: CHANNEL,
        remarks: String(remarks).trim(),
      });
      toastSuccess("Query raised");
      handleCloseQueryDialog();
      if (reload) await reload();
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "Failed to raise query");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintReceipt = async (id) => {
    setLoadingReceipt((prev) => new Set(prev).add(id));
    try {
      const { blob, filename } = await orderPaymentsService.downloadReceiptPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "Failed to download receipt");
    } finally {
      setLoadingReceipt((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const handleViewPaymentProof = async (id) => {
    setLoadingProof((prev) => new Set(prev).add(id));
    try {
      const url = await orderPaymentsService.getReceiptUrl(id);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toastError("No payment proof available");
    } catch (err) {
      toastError(err?.response?.data?.message || err?.message || "No payment proof available");
    } finally {
      setLoadingProof((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const fetchPayments = async (params) => {
    const { status: filterStatus, ...restFilters } = filterParams || {};
    const statusParam = Array.isArray(filterStatus)
      ? filterStatus.join(",")
      : filterStatus || params?.status || undefined;
    const { status: _ignored, ...restParams } = params || {};
    const response = await thirdPartyPaymentAuditService.list({
      channel: CHANNEL,
      ...restFilters,
      ...restParams,
      ...(statusParam ? { tp_audit_status: statusParam } : {}),
    });
    const payload = response?.result ?? response ?? {};
    const rows = Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
    return {
      data: rows.map(flattenB2cRow),
      meta: {
        total: payload.meta?.total ?? payload.pagination?.total ?? rows.length,
        page: payload.meta?.page ?? payload.pagination?.page ?? 1,
      },
    };
  };

  const columns = [
    {
      id: "date_of_payment",
      label: "Payment Date",
      field: "date_of_payment",
      sortable: true,
      stickyLeft: true,
      stickyWidth: 100,
      render: (row) => (row.date_of_payment ? moment(row.date_of_payment).format("DD-MM-YYYY") : "-"),
    },
    {
      id: "order_number",
      label: "Order #",
      field: "order_number",
      stickyLeft: true,
      stickyWidth: 95,
      render: (row) =>
        row.order_id ? (
          <Link href={`/order/view?id=${row.order_id}`} style={{ color: "inherit" }}>
            {row.order_number || row.order_id}
          </Link>
        ) : (
          row.order_number || "-"
        ),
    },
    {
      id: "customer_name",
      label: "Customer",
      field: "customer_name",
      stickyLeft: true,
      stickyWidth: 140,
      stickyShadow: true,
      render: (row) => row.customer_name || "-",
    },
    {
      id: "branch_name",
      label: "Branch",
      field: "branch_name",
      render: (row) => row.branch_name || "-",
    },
    {
      id: "handled_by_name",
      label: "Handled By",
      field: "handled_by_name",
      render: (row) => row.handled_by_name || "-",
    },
    {
      id: "approved_by_name",
      label: "Accountant",
      field: "approved_by_name",
      render: (row) => row.approved_by_name || "-",
    },
    {
      id: "payment_amount",
      label: "Amount",
      field: "payment_amount",
      render: (row) => {
        const n = Number(row.payment_amount);
        const isRev = Number.isFinite(n) && n < 0;
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
            <Box component="span" sx={{ fontSize: "0.75rem", color: isRev ? "warning.main" : "inherit" }}>
              ₹{Number.isFinite(n) ? n.toLocaleString("en-IN") : "-"}
            </Box>
            {isRev && <Chip label="REV" size="small" color="warning" />}
          </Box>
        );
      },
    },
    {
      id: "tp_audit_status",
      label: "TP Status",
      field: "tp_audit_status",
      render: (row) => {
        const meta = TP_STATUS_META[row.tp_audit_status] || TP_STATUS_META.pending;
        return <Chip label={meta.label} color={meta.color} size="small" />;
      },
    },
    {
      id: "payment_mode_name",
      label: "Payment Mode",
      field: "payment_mode_name",
      render: (row) => row.payment_mode_name || "-",
    },
    {
      id: "receipt_number",
      label: "Receipt #",
      field: "receipt_number",
      render: (row) => row.receipt_number || "-",
    },
    {
      id: "attachment",
      label: "Proof",
      field: "receipt_cheque_file",
      isActionColumn: true,
      render: (row) => (
        <PaymentProofViewButton
          paymentId={row.id}
          hasFile={!!row.receipt_cheque_file}
          fetchUrl={orderPaymentsService.getReceiptUrl}
          label="View"
        />
      ),
    },
    {
      id: "transaction_cheque_number",
      label: "Txn/Cheque No.",
      field: "transaction_cheque_number",
      render: (row) => row.transaction_cheque_number || "-",
    },
    {
      id: "tp_audit_remarks",
      label: "TP Remarks",
      field: "tp_audit_remarks",
      render: (row) =>
        row.tp_audit_remarks ? (
          <Tooltip title={row.tp_audit_remarks}>
            <span style={{ fontSize: "0.7rem", lineHeight: 1.2 }}>{row.tp_audit_remarks}</span>
          </Tooltip>
        ) : (
          "-"
        ),
    },
    {
      id: "tp_audited_by",
      label: "Audited By / Date",
      field: "tp_audited_at",
      render: (row) =>
        row.tp_audited_at
          ? `${row.tp_audited_by_name || ""} (${moment(row.tp_audited_at).format("DD-MM-YYYY")})`
          : "-",
    },
    {
      id: "actions",
      label: "Actions",
      field: "actions",
      isActionColumn: true,
      render: (row, reload, perms) => {
        const canUpdate = perms?.can_update;
        const canRead = perms?.can_read;
        const status = row.tp_audit_status || "pending";
        const isPending = status === "pending";
        const isQuery = status === "query_raised";
        const canAct = canUpdate && (isPending || isQuery);
        const hasProof = !!row.receipt_cheque_file;

        return (
          <Box display="flex" gap={0.5} flexWrap="nowrap">
            {canAct && (
              <Tooltip title="Approve" arrow placement="top">
                <UiButton
                  variant="success"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={() =>
                    setApproveDialog({
                      open: true, paymentId: row.id, remarks: "", paymentSnapshot: row, reload,
                    })
                  }
                >
                  <IconCheck className="size-4" />
                </UiButton>
              </Tooltip>
            )}
            {canAct && (
              <Tooltip title="Reject" arrow placement="top">
                <UiButton
                  variant="outline"
                  size="icon-sm"
                  className="text-destructive border-destructive/40 hover:bg-destructive/5 shrink-0"
                  onClick={() =>
                    setRejectDialog({
                      open: true, paymentId: row.id, reasonId: null, reasonLabel: "",
                      remarks: "", paymentSnapshot: row, reload,
                    })
                  }
                >
                  <IconX className="size-4" />
                </UiButton>
              </Tooltip>
            )}
            {canUpdate && isPending && (
              <Tooltip title="Raise Query" arrow placement="top">
                <UiButton
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0 text-blue-600 border-blue-300 hover:bg-blue-50"
                  onClick={() =>
                    setQueryDialog({
                      open: true, paymentId: row.id, remarks: "", paymentSnapshot: row, reload,
                    })
                  }
                >
                  <IconMessageQuestion className="size-4" />
                </UiButton>
              </Tooltip>
            )}
            {hasProof && (
              <Tooltip title="View Proof" arrow placement="top">
                <UiButton
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0"
                  disabled={loadingProof.has(row.id)}
                  onClick={() => handleViewPaymentProof(row.id)}
                >
                  {loadingProof.has(row.id)
                    ? <IconLoader2 className="size-4 animate-spin" />
                    : <IconEye className="size-4" />}
                </UiButton>
              </Tooltip>
            )}
            {(canRead || canUpdate) && row.status === "approved" && (
              <Tooltip title="Print Receipt" arrow placement="top">
                <UiButton
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0"
                  disabled={loadingReceipt.has(row.id)}
                  onClick={() => handlePrintReceipt(row.id)}
                >
                  {loadingReceipt.has(row.id)
                    ? <IconLoader2 className="size-4 animate-spin" />
                    : <IconPrinter className="size-4" />}
                </UiButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <>
      <PaginatedTable
        columns={columns}
        fetcher={fetchPayments}
        initialPage={1}
        initialLimit={25}
        showSearch={false}
        height={calculatedTableHeight()}
        getRowKey={(row) => row.id}
        filterParams={filterParams}
        moduleKey="third_party_payment_audit"
      />

      <Dialog
        open={approveDialog.open}
        onOpenChange={(open) => !open && !actionLoading && handleCloseApproveDialog()}
      >
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => actionLoading && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Approve Third-Party Audit</DialogTitle>
          </DialogHeader>
          <PaymentVerificationDetails payment={approveDialog.paymentSnapshot} />
          <p className="text-sm text-muted-foreground mb-1">Remarks (optional):</p>
          <Input
            fullWidth multiline rows={2}
            value={approveDialog.remarks}
            onChange={(e) => setApproveDialog((p) => ({ ...p, remarks: e.target.value }))}
          />
          <DialogFooter className="pt-3">
            <UiButton variant="outline" size="sm" onClick={handleCloseApproveDialog} disabled={actionLoading}>
              Cancel
            </UiButton>
            <UiButton variant="default" size="sm" onClick={handleConfirmApprove} disabled={actionLoading}>
              {actionLoading ? <IconLoader2 className="size-4 mr-1.5 animate-spin" /> : <IconCheck className="size-4 mr-1.5" />}
              Confirm Approve
            </UiButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && !actionLoading && handleCloseRejectDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Third-Party Audit</DialogTitle>
          </DialogHeader>
          <PaymentVerificationDetails payment={rejectDialog.paymentSnapshot} />
          <p className="text-sm text-muted-foreground mb-1">Rejection reason:</p>
          <AutocompleteField
            name="payment_rejection_reason"
            label="Rejection Reason"
            asyncLoadOptions={(q) =>
              getReferenceOptionsSearch("reason.model", {
                q, limit: 20, reason_type: "payment_rejection", is_active: "true",
              })
            }
            referenceModel="reason.model"
            getOptionLabel={(o) => o?.reason ?? o?.label ?? ""}
            value={rejectDialog.reasonId ? { id: rejectDialog.reasonId, reason: rejectDialog.reasonLabel } : null}
            onChange={(e, v) =>
              setRejectDialog((p) => ({
                ...p,
                reasonId: v?.id ?? null,
                reasonLabel: v?.reason ?? v?.label ?? "",
              }))
            }
            placeholder="Search reason…"
          />
          <p className="text-sm text-muted-foreground mt-2 mb-1">Additional remarks (optional):</p>
          <Input
            fullWidth multiline rows={2}
            value={rejectDialog.remarks}
            onChange={(e) => setRejectDialog((p) => ({ ...p, remarks: e.target.value }))}
          />
          <DialogFooter className="pt-3">
            <UiButton variant="outline" size="sm" onClick={handleCloseRejectDialog} disabled={actionLoading}>
              Cancel
            </UiButton>
            <UiButton
              variant="destructive"
              size="sm"
              onClick={handleConfirmReject}
              disabled={actionLoading || (!String(rejectDialog.reasonLabel || "").trim() && !String(rejectDialog.remarks || "").trim())}
            >
              <IconX className="size-4 mr-1.5" />
              Reject
            </UiButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={queryDialog.open} onOpenChange={(open) => !open && !actionLoading && handleCloseQueryDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Raise Query</DialogTitle>
          </DialogHeader>
          <PaymentVerificationDetails payment={queryDialog.paymentSnapshot} />
          <p className="text-sm text-muted-foreground mb-1">Query remarks (required):</p>
          <Input
            fullWidth multiline rows={3}
            value={queryDialog.remarks}
            onChange={(e) => setQueryDialog((p) => ({ ...p, remarks: e.target.value }))}
          />
          <DialogFooter className="pt-3">
            <UiButton variant="outline" size="sm" onClick={handleCloseQueryDialog} disabled={actionLoading}>
              Cancel
            </UiButton>
            <UiButton
              variant="default"
              size="sm"
              onClick={handleConfirmQuery}
              disabled={actionLoading || !String(queryDialog.remarks || "").trim()}
            >
              {actionLoading ? <IconLoader2 className="size-4 mr-1.5 animate-spin" /> : <IconMessageQuestion className="size-4 mr-1.5" />}
              Raise Query
            </UiButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
