"use client";

import { useState } from "react";
import { Box, Chip, Tooltip } from "@mui/material";
import moment from "moment";
import Link from "next/link";
import { IconCheck, IconX, IconPrinter, IconLoader2, IconEye } from "@tabler/icons-react";
import PaginatedTable from "@/components/common/PaginatedTable";
import b2bOrderPaymentsService from "@/services/b2bOrderPaymentsService";
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

const calculatedTableHeight = () => `calc(100vh - 220px)`;

const getPaymentStatusLabel = (status) =>
  status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending";

function B2bPaymentVerificationDetails({ payment }) {
  if (!payment) return null;

  const hasReceive = !!payment.payment_remarks;
  const hasApprove = payment.status === "approved" && !!payment.approval_remarks;
  const hasReject = payment.status === "rejected" && !!payment.rejection_reason;

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2 space-y-2">
      <div className="text-[11px] font-semibold text-slate-700">Payment Verification Details</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-4">
        <span className="text-slate-500">Order</span>
        <span className="font-medium text-slate-800">{payment.order_no || "-"}</span>
        <span className="text-slate-500">Client</span>
        <span className="font-medium text-slate-800">{payment.client_name || "-"}</span>
        <span className="text-slate-500">Warehouse</span>
        <span className="font-medium text-slate-800">{payment.warehouse_name || "-"}</span>
        <span className="text-slate-500">Payment Date</span>
        <span className="font-medium text-slate-800">
          {payment.date_of_payment ? moment(payment.date_of_payment).format("DD-MM-YYYY") : "-"}
        </span>
        <span className="text-slate-500">Amount</span>
        <span className="font-medium text-slate-800">
          {payment.payment_amount != null
            ? `₹${Number(payment.payment_amount).toLocaleString("en-IN")}`
            : "-"}
        </span>
        <span className="text-slate-500">Payment Mode</span>
        <span className="font-medium text-slate-800">{payment.payment_mode_name || "-"}</span>
        <span className="text-slate-500">Txn/Cheque No.</span>
        <span className="font-medium text-slate-800">{payment.transaction_cheque_number || "-"}</span>
        <span className="text-slate-500">Bank/Account</span>
        <span className="font-medium text-slate-800">
          {payment.company_bank_name && payment.company_bank_account_number
            ? `${payment.company_bank_name} - ${payment.company_bank_account_number}`
            : "-"}
        </span>
        <span className="text-slate-500">Receipt #</span>
        <span className="font-medium text-slate-800">{payment.receipt_number || "-"}</span>
        <span className="text-slate-500">Status</span>
        <span className="font-medium text-slate-800">{getPaymentStatusLabel(payment.status)}</span>
      </div>
      <div className="border-t border-slate-200 pt-1.5">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">Remarks</div>
        {!hasReceive && !hasApprove && !hasReject ? (
          <div className="text-[11px] text-slate-600">-</div>
        ) : (
          <div className="space-y-0.5 text-[11px]">
            {hasReceive && (
              <div className="text-slate-700">
                <strong>Receive:</strong> {payment.payment_remarks}
              </div>
            )}
            {hasApprove && (
              <div className="text-slate-700">
                <strong>Approve:</strong> {payment.approval_remarks}
              </div>
            )}
            {hasReject && (
              <div className="text-slate-700">
                <strong>Reject:</strong> {payment.rejection_reason}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function B2bPaymentAuditTable({ filterParams = {} }) {
  const [loadingReceipt, setLoadingReceipt] = useState(new Set());
  const [loadingProof, setLoadingProof] = useState(new Set());

  const [approveDialog, setApproveDialog] = useState({
    open: false,
    paymentId: null,
    approvalRemarks: "",
    paymentSnapshot: null,
    reload: null,
  });
  const [approveConfirmLoading, setApproveConfirmLoading] = useState(false);

  const [rejectDialog, setRejectDialog] = useState({
    open: false,
    paymentId: null,
    reasonId: null,
    reasonLabel: "",
    remarks: "",
    paymentSnapshot: null,
    reload: null,
  });

  const handleCloseApproveDialog = () => {
    if (approveConfirmLoading) return;
    setApproveDialog({
      open: false,
      paymentId: null,
      approvalRemarks: "",
      paymentSnapshot: null,
      reload: null,
    });
  };

  const handleConfirmApprove = async () => {
    const { paymentId, approvalRemarks, reload } = approveDialog;
    setApproveConfirmLoading(true);
    try {
      await b2bOrderPaymentsService.approvePayment(paymentId, approvalRemarks);
      toastSuccess("Payment approved");
      handleCloseApproveDialog();
      if (reload) await reload();
    } catch (err) {
      console.error("Failed to approve B2B payment:", err);
      toastError(err?.response?.data?.message || err?.message || "Failed to approve payment");
    } finally {
      setApproveConfirmLoading(false);
    }
  };

  const handleCloseRejectDialog = () => {
    setRejectDialog({
      open: false,
      paymentId: null,
      reasonId: null,
      reasonLabel: "",
      remarks: "",
      paymentSnapshot: null,
      reload: null,
    });
  };

  const handleConfirmReject = async () => {
    const { paymentId, reasonLabel, remarks, reload } = rejectDialog;
    try {
      const trimmedReason = String(reasonLabel || "").trim();
      const trimmedRemarks = String(remarks || "").trim();
      const rejectionReason =
        trimmedReason && trimmedRemarks
          ? `${trimmedReason} - ${trimmedRemarks}`
          : trimmedReason || null;

      await b2bOrderPaymentsService.rejectPayment(paymentId, rejectionReason);
      toastSuccess("Payment rejected");
      handleCloseRejectDialog();
      if (reload) await reload();
    } catch (err) {
      console.error("Failed to reject B2B payment:", err);
      toastError(err?.response?.data?.message || err?.message || "Failed to reject payment");
    }
  };

  const handlePrintReceipt = async (id) => {
    setLoadingReceipt((prev) => new Set(prev).add(id));
    try {
      const { blob, filename } = await b2bOrderPaymentsService.downloadReceiptPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download payment receipt:", err);
      toastError(err?.response?.data?.message || err?.message || "Failed to download payment receipt");
    } finally {
      setLoadingReceipt((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const handleViewPaymentProof = async (id) => {
    setLoadingProof((prev) => new Set(prev).add(id));
    try {
      const url = await b2bOrderPaymentsService.getReceiptUrl(id);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toastError("No payment proof available");
      }
    } catch (err) {
      console.error("Failed to get payment proof URL:", err);
      toastError(err?.response?.data?.message || err?.message || "No payment proof available");
    } finally {
      setLoadingProof((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const fetchPayments = async (params) => {
    const statusParam =
      filterParams?.status && Array.isArray(filterParams.status)
        ? filterParams.status.join(",")
        : filterParams?.status;
    const response = await b2bOrderPaymentsService.getPayments({
      ...filterParams,
      ...params,
      status: statusParam ?? params.status,
    });
    return {
      data: response.result || [],
      meta: {
        total: response.pagination?.total ?? 0,
        page: response.pagination?.page ?? 1,
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
      stickyWidth: 110,
      render: (row) => moment(row.date_of_payment).format("DD-MM-YYYY"),
    },
    {
      id: "order_no",
      label: "Order #",
      field: "order_no",
      stickyLeft: true,
      stickyWidth: 100,
      render: (row) =>
        row.b2b_sales_order_id ? (
          <Link href={`/b2b-sales-orders/view?id=${row.b2b_sales_order_id}`} className="text-primary hover:underline">
            {row.order_no || row.b2b_sales_order_id}
          </Link>
        ) : (
          row.order_no || "-"
        ),
    },
    {
      id: "client_name",
      label: "Client",
      field: "client_name",
      stickyLeft: true,
      stickyWidth: 150,
      stickyShadow: true,
      render: (row) => row.client_name || "-",
    },
    {
      id: "warehouse_name",
      label: "Warehouse",
      field: "warehouse_name",
      render: (row) => row.warehouse_name || "-",
    },
    {
      id: "order_payable_amount",
      label: "Total Payable",
      field: "order_payable_amount",
      render: (row) =>
        row.order_payable_amount != null
          ? `₹${Number(row.order_payable_amount).toLocaleString("en-IN")}`
          : "-",
    },
    {
      id: "payment_amount",
      label: "Payment Amount",
      field: "payment_amount",
      render: (row) => {
        const n = Number(row.payment_amount);
        const isRev = Number.isFinite(n) && n < 0;
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
            <Box component="span" sx={{ fontSize: "0.75rem", color: isRev ? "warning.main" : "inherit" }}>
              ₹{n.toLocaleString("en-IN")}
            </Box>
            {isRev && <Chip label="REV" size="small" color="warning" />}
          </Box>
        );
      },
    },
    {
      id: "status",
      label: "Status",
      field: "status",
      render: (row) => {
        const label = getPaymentStatusLabel(row.status);
        const color =
          row.status === "approved" ? "success" : row.status === "rejected" ? "error" : "warning";
        return <Chip label={label} color={color} size="small" />;
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
      label: "Attachment",
      field: "receipt_cheque_file",
      isActionColumn: true,
      render: (row) => (
        <PaymentProofViewButton
          paymentId={row.id}
          hasFile={!!row.receipt_cheque_file}
          fetchUrl={b2bOrderPaymentsService.getReceiptUrl}
          label="View"
        />
      ),
    },
    {
      id: "transaction_cheque_number",
      label: "Transaction/Cheque No.",
      field: "transaction_cheque_number",
      render: (row) => row.transaction_cheque_number || "-",
    },
    {
      id: "payment_remarks",
      label: "Remarks",
      field: "payment_remarks",
      render: (row) => {
        const hasReceive = !!row.payment_remarks;
        const hasApprove = row.status === "approved" && !!row.approval_remarks;
        const hasReject = row.status === "rejected" && !!row.rejection_reason;

        if (!hasReceive && !hasApprove && !hasReject) {
          return "-";
        }

        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
            {hasReceive && (
              <Tooltip title={row.payment_remarks}>
                <span style={{ fontSize: "0.7rem", lineHeight: 1.2 }}>
                  <strong>Receive:</strong> {row.payment_remarks}
                </span>
              </Tooltip>
            )}
            {hasApprove && (
              <Tooltip title={row.approval_remarks}>
                <span style={{ fontSize: "0.7rem", lineHeight: 1.2 }}>
                  <strong>Approve:</strong> {row.approval_remarks}
                </span>
              </Tooltip>
            )}
            {hasReject && (
              <Tooltip title={row.rejection_reason}>
                <span style={{ fontSize: "0.7rem", lineHeight: 1.2 }}>
                  <strong>Reject:</strong> {row.rejection_reason}
                </span>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      id: "company_bank",
      label: "Bank/Account",
      field: "company_bank_name",
      render: (row) =>
        row.company_bank_name && row.company_bank_account_number
          ? `${row.company_bank_name} - ${row.company_bank_account_number}`
          : "-",
    },
    {
      id: "approved_by",
      label: "Approved By / Date",
      field: "approved_at",
      render: (row) =>
        row.approved_at
          ? `${row.approved_by_name || ""} (${moment(row.approved_at).format("DD-MM-YYYY")})`
          : "-",
    },
    {
      id: "rejected_by",
      label: "Rejected By / Date",
      field: "rejected_at",
      render: (row) =>
        row.rejected_at
          ? `${row.rejected_by_name || ""} (${moment(row.rejected_at).format("DD-MM-YYYY")})`
          : "-",
    },
    {
      id: "rejection_reason",
      label: "Rejection Reason",
      field: "rejection_reason",
      render: (row) => row.rejection_reason || "-",
    },
    {
      id: "actions",
      label: "Actions",
      field: "actions",
      isActionColumn: true,
      render: (row, reload, perms) => {
        const canUpdate = perms?.can_update;
        const canRead = perms?.can_read;
        const isPending = row.status === "pending_approval" || !row.status;
        const isApproved = row.status === "approved";
        const hasPaymentProof = !!row.receipt_cheque_file;
        return (
          <Box display="flex" gap={0.5} flexWrap="nowrap">
            {canUpdate && isPending && (
              <>
                <Tooltip title="Approve" arrow placement="top">
                  <UiButton
                    variant="success"
                    size="icon-sm"
                    className="shrink-0"
                    onClick={() =>
                      setApproveDialog({
                        open: true,
                        paymentId: row.id,
                        approvalRemarks: "",
                        paymentSnapshot: row,
                        reload,
                      })
                    }
                  >
                    <IconCheck className="size-4" />
                  </UiButton>
                </Tooltip>
                <Tooltip title="Reject" arrow placement="top">
                  <UiButton
                    variant="outline"
                    size="icon-sm"
                    className="text-destructive border-destructive/40 hover:bg-destructive/5 shrink-0"
                    onClick={() =>
                      setRejectDialog({
                        open: true,
                        paymentId: row.id,
                        reasonId: null,
                        reasonLabel: "",
                        remarks: "",
                        paymentSnapshot: row,
                        reload,
                      })
                    }
                  >
                    <IconX className="size-4" />
                  </UiButton>
                </Tooltip>
              </>
            )}
            {hasPaymentProof && (
              <Tooltip title="View Proof" arrow placement="top">
                <UiButton
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0"
                  disabled={loadingProof.has(row.id)}
                  onClick={() => handleViewPaymentProof(row.id)}
                >
                  {loadingProof.has(row.id) ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconEye className="size-4" />
                  )}
                </UiButton>
              </Tooltip>
            )}
            {isApproved && (canRead || canUpdate) && (
              <Tooltip title="Print Receipt" arrow placement="top">
                <UiButton
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0"
                  disabled={loadingReceipt.has(row.id)}
                  onClick={() => handlePrintReceipt(row.id)}
                >
                  {loadingReceipt.has(row.id) ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconPrinter className="size-4" />
                  )}
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
        moduleKey="payment_audit"
      />

      <Dialog
        open={approveDialog.open}
        onOpenChange={(open) => !open && !approveConfirmLoading && handleCloseApproveDialog()}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => approveConfirmLoading && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Confirm Approve Payment</DialogTitle>
          </DialogHeader>
          <B2bPaymentVerificationDetails payment={approveDialog.paymentSnapshot} />
          <div className="rounded-md border border-slate-200 bg-white p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-600">
                Receipt File:{" "}
                {approveDialog.paymentSnapshot?.receipt_cheque_file ? "Available" : "Not uploaded"}
              </div>
              {!!approveDialog.paymentSnapshot?.receipt_cheque_file && (
                <UiButton
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleViewPaymentProof(approveDialog.paymentId)}
                  disabled={!approveDialog.paymentId || loadingProof.has(approveDialog.paymentId)}
                >
                  {loadingProof.has(approveDialog.paymentId) ? (
                    <IconLoader2 className="size-3.5 mr-1 animate-spin" />
                  ) : (
                    <IconEye className="size-3.5 mr-1" />
                  )}
                  View Receipt
                </UiButton>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Are you sure you want to approve this payment?
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-2">Approval remarks (optional):</p>
          <Input
            fullWidth
            multiline
            rows={2}
            value={approveDialog.approvalRemarks}
            onChange={(e) =>
              setApproveDialog((prev) => ({ ...prev, approvalRemarks: e.target.value }))
            }
          />
          <DialogFooter className="pt-4">
            <UiButton
              variant="outline"
              size="sm"
              onClick={handleCloseApproveDialog}
              disabled={approveConfirmLoading}
            >
              Cancel
            </UiButton>
            <UiButton
              variant="default"
              size="sm"
              onClick={handleConfirmApprove}
              disabled={approveConfirmLoading}
            >
              {approveConfirmLoading ? (
                <>
                  <IconLoader2 className="size-4 mr-1.5 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <IconCheck className="size-4 mr-1.5" />
                  Confirm Approve
                </>
              )}
            </UiButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && handleCloseRejectDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
          </DialogHeader>
          <B2bPaymentVerificationDetails payment={rejectDialog.paymentSnapshot} />
          <div className="rounded-md border border-slate-200 bg-white p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-600">
                Receipt File:{" "}
                {rejectDialog.paymentSnapshot?.receipt_cheque_file ? "Available" : "Not uploaded"}
              </div>
              {!!rejectDialog.paymentSnapshot?.receipt_cheque_file && (
                <UiButton
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleViewPaymentProof(rejectDialog.paymentId)}
                  disabled={!rejectDialog.paymentId || loadingProof.has(rejectDialog.paymentId)}
                >
                  {loadingProof.has(rejectDialog.paymentId) ? (
                    <IconLoader2 className="size-3.5 mr-1 animate-spin" />
                  ) : (
                    <IconEye className="size-3.5 mr-1" />
                  )}
                  View Receipt
                </UiButton>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-2">Please select a reason for rejection.</p>
          <AutocompleteField
            name="payment_rejection_reason"
            label="Rejection Reason"
            asyncLoadOptions={(q) =>
              getReferenceOptionsSearch("reason.model", {
                q,
                limit: 20,
                reason_type: "payment_rejection",
                is_active: "true",
              })
            }
            referenceModel="reason.model"
            getOptionLabel={(o) => o?.reason ?? o?.label ?? ""}
            value={
              rejectDialog.reasonId
                ? { id: rejectDialog.reasonId, reason: rejectDialog.reasonLabel }
                : null
            }
            onChange={(e, v) =>
              setRejectDialog((prev) => ({
                ...prev,
                reasonId: v?.id ?? null,
                reasonLabel: v?.reason ?? v?.label ?? "",
              }))
            }
            placeholder="Search reason…"
          />
          <p className="text-sm text-muted-foreground mt-3 mb-2">Additional remarks (optional):</p>
          <Input
            fullWidth
            multiline
            rows={2}
            value={rejectDialog.remarks}
            onChange={(e) => setRejectDialog((prev) => ({ ...prev, remarks: e.target.value }))}
          />
          <DialogFooter className="pt-4">
            <UiButton variant="outline" size="sm" onClick={handleCloseRejectDialog}>
              Cancel
            </UiButton>
            <UiButton
              variant="destructive"
              size="sm"
              onClick={handleConfirmReject}
              disabled={!String(rejectDialog.reasonLabel || "").trim()}
            >
              <IconX className="size-4 mr-1.5" />
              Reject
            </UiButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
