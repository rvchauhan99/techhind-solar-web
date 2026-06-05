"use client";

import { useCallback, useState } from "react";
import moment from "moment";
import { IconPencil, IconTrash, IconPrinter } from "@tabler/icons-react";
import PaymentProofViewButton from "@/components/common/PaymentProofViewButton";
import PaginatedTable from "@/components/common/PaginatedTable";
import b2bOrderPaymentsService from "@/services/b2bOrderPaymentsService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toastError, toastSuccess } from "@/utils/toast";
import B2bEditPaymentDialog from "./B2bEditPaymentDialog";

const statusVariant = (s) => {
  if (s === "approved") return "default";
  if (s === "rejected") return "destructive";
  return "secondary";
};

export default function B2bPreviousPaymentsTable({
  orderId,
  refreshKey = 0,
  canUpdate = false,
  canDelete = false,
  maxPaymentAmount = 0,
  onPaymentsChanged,
}) {
  const [editPayment, setEditPayment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetcher = useCallback(
    async (params) => {
      const { page, limit, q, search } = params;
      return b2bOrderPaymentsService.getPayments({
        b2b_sales_order_id: orderId,
        page,
        limit,
        search: q || search || undefined,
      });
    },
    [orderId, refreshKey]
  );

  const handlePrintReceipt = async (id) => {
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
      toastError(err?.response?.data?.message || err?.message || "Failed to download receipt");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      setDeleting(true);
      await b2bOrderPaymentsService.deletePayment(deleteTarget.id);
      toastSuccess("Payment deleted");
      setDeleteTarget(null);
      onPaymentsChanged?.();
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to delete payment");
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      field: "date_of_payment",
      label: "Date",
      render: (row) => (row.date_of_payment ? moment(row.date_of_payment).format("DD-MM-YYYY") : "-"),
    },
    {
      field: "payment_amount",
      label: "Amount",
      render: (row) => {
        const n = Number(row.payment_amount || 0);
        const isRev = Number.isFinite(n) && n < 0;
        return (
          <span className={isRev ? "text-amber-600 font-medium" : ""}>
            ₹{n.toLocaleString("en-IN")}
            {isRev ? " (REV)" : ""}
          </span>
        );
      },
    },
    { field: "payment_mode_name", label: "Mode" },
    {
      field: "company_bank",
      label: "Bank",
      render: (row) =>
        row.company_bank_name && row.company_bank_account_number
          ? `${row.company_bank_name} - ${row.company_bank_account_number}`
          : "-",
    },
    {
      field: "transaction_cheque_number",
      label: "Txn/Cheque #",
      render: (row) => row.transaction_cheque_number || "-",
    },
    { field: "receipt_number", label: "Receipt #" },
    {
      field: "attachment",
      label: "Attachment",
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
      field: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={statusVariant(row.status)} className="text-xs capitalize">
          {row.status?.replace("_", " ") || "-"}
        </Badge>
      ),
    },
    {
      field: "payment_remarks",
      label: "Remarks",
      render: (row) => {
        const parts = [];
        if (row.payment_remarks) parts.push(`Receive: ${row.payment_remarks}`);
        if (row.status === "approved" && row.approval_remarks) {
          parts.push(`Approve: ${row.approval_remarks}`);
        }
        if (row.status === "rejected" && row.rejection_reason) {
          parts.push(`Reject: ${row.rejection_reason}`);
        }
        return parts.length ? (
          <span className="text-xs leading-tight">{parts.join(" · ")}</span>
        ) : (
          "-"
        );
      },
    },
    {
      field: "actions",
      label: "Actions",
      isActionColumn: true,
      render: (row) => {
        const isPending = row.status === "pending_approval";
        const isApproved = row.status === "approved";
        return (
          <div className="flex items-center justify-end gap-0.5">
            {isApproved && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                title="Print receipt"
                onClick={() => handlePrintReceipt(row.id)}
              >
                <IconPrinter className="size-3.5" />
              </Button>
            )}
            {canUpdate && isPending && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                title="Edit"
                onClick={() => setEditPayment(row)}
              >
                <IconPencil className="size-3.5" />
              </Button>
            )}
            {canDelete && isPending && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 text-destructive hover:text-destructive"
                title="Delete"
                onClick={() => setDeleteTarget(row)}
              >
                <IconTrash className="size-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-1">
      <PaginatedTable
        key={`b2b-payments-${orderId}-${refreshKey}`}
        columns={columns}
        fetcher={fetcher}
        initialPage={1}
        initialLimit={10}
        showSearch={true}
        height="calc(100vh - 280px)"
        getRowKey={(row) => row.id}
      />

      <B2bEditPaymentDialog
        open={!!editPayment}
        payment={editPayment}
        maxPaymentAmount={
          maxPaymentAmount + Math.max(0, Number(editPayment?.payment_amount || 0))
        }
        onClose={() => setEditPayment(null)}
        onSaved={() => {
          setEditPayment(null);
          onPaymentsChanged?.();
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the pending payment record. Approved payments cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
