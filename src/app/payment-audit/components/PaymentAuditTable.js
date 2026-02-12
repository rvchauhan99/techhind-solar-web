"use client";

import { useState } from "react";
import { Box, Chip, Typography } from "@mui/material";
import moment from "moment";
import Link from "next/link";
import {
  IconCheck,
  IconX,
  IconPrinter,
} from "@tabler/icons-react";
import PaginatedTable from "@/components/common/PaginatedTable";
import orderPaymentsService from "@/services/orderPaymentsService";
import Input from "@/components/common/Input";
import { toastSuccess, toastError } from "@/utils/toast";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Button as UiButton } from "@/components/ui/button";

const calculatedTableHeight = () => `calc(100vh - 220px)`;

export default function PaymentAuditTable({ filterParams = {} }) {
  const [rejectDialog, setRejectDialog] = useState({
    open: false,
    paymentId: null,
    reason: "",
    reload: null,
  });

  const handleCloseRejectDialog = () => {
    setRejectDialog({ open: false, paymentId: null, reason: "", reload: null });
  };

  const handleConfirmReject = async (paymentId, reason, reload) => {
    try {
      await orderPaymentsService.rejectPayment(paymentId, reason || null);
      toastSuccess("Payment rejected");
      handleCloseRejectDialog();
      if (reload) await reload();
    } catch (err) {
      console.error("Failed to reject payment:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to reject payment";
      toastError(msg);
    }
  };

  const handleApprove = async (id, reload) => {
    try {
      await orderPaymentsService.approvePayment(id);
      toastSuccess("Payment approved");
      if (reload) await reload();
    } catch (err) {
      console.error("Failed to approve payment:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to approve payment";
      toastError(msg);
    }
  };

  const handlePrintReceipt = async (id) => {
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
      console.error("Failed to download payment receipt:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to download payment receipt";
      toastError(msg);
    }
  };

  const fetchPayments = async (params) => {
    const statusParam =
      filterParams?.status && Array.isArray(filterParams.status)
        ? filterParams.status.join(",")
        : filterParams?.status;
    const response = await orderPaymentsService.getPayments({
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
      render: (row) => moment(row.date_of_payment).format("DD-MM-YYYY"),
    },
    {
      id: "order_number",
      label: "Order #",
      field: "order_number",
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
      id: "order_project_cost",
      label: "Project Cost",
      field: "order_project_cost",
      render: (row) =>
        row.order_project_cost != null
          ? `₹${Number(row.order_project_cost).toLocaleString()}`
          : "-",
    },
    {
      id: "payment_amount",
      label: "Payment Amount",
      field: "payment_amount",
      render: (row) => `₹${Number(row.payment_amount).toLocaleString()}`,
    },
    {
      id: "status",
      label: "Status",
      field: "status",
      render: (row) => {
        const label =
          row.status === "approved"
            ? "Approved"
            : row.status === "rejected"
              ? "Rejected"
              : "Pending";
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
      id: "transaction_cheque_number",
      label: "Transaction/Cheque No.",
      field: "transaction_cheque_number",
      render: (row) => row.transaction_cheque_number || "-",
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
        return (
          <Box display="flex" gap={1} flexWrap="wrap">
            {canUpdate && isPending && (
              <>
                <UiButton
                  variant="success"
                  size="sm"
                  startIcon={<IconCheck className="size-4" />}
                  onClick={() => handleApprove(row.id, reload)}
                >
                  Approve
                </UiButton>
                <UiButton
                  variant="outline"
                  size="sm"
                  startIcon={<IconX className="size-4" />}
                  className="text-destructive border-destructive/40 hover:bg-destructive/5"
                  onClick={() =>
                    setRejectDialog({
                      open: true,
                      paymentId: row.id,
                      reason: "",
                      reload,
                    })
                  }
                >
                  Reject
                </UiButton>
              </>
            )}
            {isApproved && (canRead || canUpdate) && (
              <UiButton
                variant="outline"
                size="sm"
                startIcon={<IconPrinter className="size-4" />}
                onClick={() => handlePrintReceipt(row.id)}
              >
                Print Receipt
              </UiButton>
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
        showSearch={true}
        height={calculatedTableHeight()}
        getRowKey={(row) => row.id}
        filterParams={filterParams}
        moduleKey="payment_audit"
      />
      <Dialog open={rejectDialog.open} onClose={handleCloseRejectDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Payment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Please enter a reason for rejection (optional).
          </Typography>
          <Input
            fullWidth
            multiline
            rows={3}
            value={rejectDialog.reason}
            onChange={(e) =>
              setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))
            }
          />
        </DialogContent>
        <DialogActions>
          <UiButton variant="ghost" size="sm" onClick={handleCloseRejectDialog}>
            Cancel
          </UiButton>
          <UiButton
            variant="destructive"
            size="sm"
            startIcon={<IconX className="size-4" />}
            onClick={() =>
              handleConfirmReject(
                rejectDialog.paymentId,
                rejectDialog.reason,
                rejectDialog.reload
              )
            }
          >
            Reject Payment
          </UiButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
