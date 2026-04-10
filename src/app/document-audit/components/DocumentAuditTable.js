"use client";

import { useState } from "react";
import { Box, Chip, Tooltip } from "@mui/material";
import moment from "moment";
import Link from "next/link";
import { IconCheck, IconX } from "@tabler/icons-react";
import PaginatedTable from "@/components/common/PaginatedTable";
import documentAuditService from "@/services/documentAuditService";
import orderDocumentsService from "@/services/orderDocumentsService";
import { getReferenceOptionsSearch } from "@/services/mastersService";
import { toastError, toastSuccess } from "@/utils/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button as UiButton } from "@/components/ui/button";
import Input from "@/components/common/Input";
import AutocompleteField from "@/components/common/AutocompleteField";

const calculatedTableHeight = () => `calc(100vh - 220px)`;

export default function DocumentAuditTable({ filterParams = {} }) {
  const [approveDialog, setApproveDialog] = useState({
    open: false,
    docId: null,
    remarks: "",
    reload: null,
  });
  const [approveLoading, setApproveLoading] = useState(false);

  const [rejectDialog, setRejectDialog] = useState({
    open: false,
    docId: null,
    reasonId: null,
    reasonLabel: "",
    remarks: "",
    reload: null,
  });
  const [rejectLoading, setRejectLoading] = useState(false);

  const closeApprove = () => {
    if (approveLoading) return;
    setApproveDialog({ open: false, docId: null, remarks: "", reload: null });
  };

  const closeReject = () => {
    if (rejectLoading) return;
    setRejectDialog({
      open: false,
      docId: null,
      reasonId: null,
      reasonLabel: "",
      remarks: "",
      reload: null,
    });
  };

  const confirmApprove = async () => {
    setApproveLoading(true);
    try {
      await documentAuditService.approveDocument(
        approveDialog.docId,
        approveDialog.remarks || null
      );
      toastSuccess("Document approved");
      const reloadFn = approveDialog.reload;
      closeApprove();
      if (reloadFn) await reloadFn();
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to approve document");
    } finally {
      setApproveLoading(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectDialog.reasonId) return;
    setRejectLoading(true);
    try {
      await documentAuditService.rejectDocument(
        rejectDialog.docId,
        rejectDialog.reasonId,
        rejectDialog.remarks || null
      );
      toastSuccess("Document rejected");
      const reloadFn = rejectDialog.reload;
      closeReject();
      if (reloadFn) await reloadFn();
    } catch (err) {
      toastError(err?.response?.data?.message || "Failed to reject document");
    } finally {
      setRejectLoading(false);
    }
  };

  const fetchDocuments = async (params) => {
    const response = await documentAuditService.getDocuments({
      ...filterParams,
      ...params,
    });

    const result = response?.result || [];
    return {
      data: result,
      meta: {
        total:
          response?.pagination?.total ??
          response?.result?.pagination?.total ??
          result.length,
        page: response?.pagination?.page ?? params.page ?? 1,
      },
    };
  };

  const columns = [
    {
      id: "created_at",
      label: "Uploaded On",
      field: "created_at",
      sortable: true,
      stickyLeft: true,
      stickyWidth: 110,
      render: (row) => moment(row.created_at).format("DD-MM-YYYY"),
    },
    {
      id: "order_number",
      label: "Order #",
      field: "order.order_number",
      stickyLeft: true,
      stickyWidth: 100,
      render: (row) =>
        row?.order?.id ? (
          <Link href={`/order/view?id=${row.order.id}`}>{row.order.order_number || row.order.id}</Link>
        ) : (
          row?.order?.order_number || "-"
        ),
    },
    {
      id: "customer_name",
      label: "Customer",
      field: "customer_name",
      stickyLeft: true,
      stickyWidth: 150,
      stickyShadow: true,
      render: (row) => row?.customer_name || "-",
    },
    {
      id: "doc_type",
      label: "Document Type",
      field: "doc_type",
      render: (row) => row?.docTypeMaster?.type || row?.doc_type || "-",
    },
    {
      id: "validation_status",
      label: "Status",
      field: "validation_status",
      render: (row) => {
        const status = String(row?.validation_status || "pending").toLowerCase();
        const label =
          status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending";
        const color = status === "approved" ? "success" : status === "rejected" ? "error" : "warning";
        return <Chip label={label} color={color} size="small" />;
      },
    },
    {
      id: "uploaded_by_name",
      label: "Uploaded By",
      field: "uploaded_by_name",
      render: (row) => row?.uploaded_by_name || "System",
    },
    {
      id: "validation_remarks",
      label: "Remarks",
      field: "validation_remarks",
      render: (row) => row?.validation_remarks || "-",
    },
    {
      id: "rejection_reason",
      label: "Rejection Reason",
      field: "rejection_reason",
      render: (row) => row?.rejection_reason || "-",
    },
    {
      id: "actions",
      label: "Actions",
      field: "actions",
      isActionColumn: true,
      render: (row, reload, perms) => {
        const canUpdate = perms?.can_update;
        const canRead = perms?.can_read;
        const status = String(row?.validation_status || "pending").toLowerCase();
        return (
          <Box display="flex" gap={0.5} flexWrap="nowrap">
            {(canRead || canUpdate) && (
              <Tooltip title="View Document" arrow placement="top">
                <UiButton
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const url = await orderDocumentsService.getDocumentUrl(row.id);
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                    } catch (e) {
                      toastError("Failed to open document");
                    }
                  }}
                >
                  View
                </UiButton>
              </Tooltip>
            )}
            {canUpdate && status !== "approved" && (
              <Tooltip title="Approve" arrow placement="top">
                <UiButton
                  variant="success"
                  size="icon-sm"
                  onClick={() =>
                    setApproveDialog({
                      open: true,
                      docId: row.id,
                      remarks: "",
                      reload,
                    })
                  }
                >
                  <IconCheck className="size-4" />
                </UiButton>
              </Tooltip>
            )}
            {canUpdate && status !== "rejected" && (
              <Tooltip title="Reject" arrow placement="top">
                <UiButton
                  variant="outline"
                  size="icon-sm"
                  className="text-destructive border-destructive/40 hover:bg-destructive/5"
                  onClick={() =>
                    setRejectDialog({
                      open: true,
                      docId: row.id,
                      reasonId: null,
                      reasonLabel: "",
                      remarks: "",
                      reload,
                    })
                  }
                >
                  <IconX className="size-4" />
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
        fetcher={fetchDocuments}
        initialPage={1}
        initialLimit={25}
        showSearch={false}
        height={calculatedTableHeight()}
        getRowKey={(row) => row.id}
        filterParams={filterParams}
        moduleKey="document_audit"
      />

      <Dialog open={approveDialog.open} onOpenChange={(o) => !o && closeApprove()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Document</DialogTitle>
          </DialogHeader>
          <Input
            fullWidth
            multiline
            rows={2}
            label="Remarks (optional)"
            value={approveDialog.remarks}
            onChange={(e) =>
              setApproveDialog((prev) => ({ ...prev, remarks: e.target.value }))
            }
          />
          <DialogFooter className="pt-4">
            <UiButton variant="outline" size="sm" onClick={closeApprove} disabled={approveLoading}>
              Cancel
            </UiButton>
            <UiButton variant="default" size="sm" onClick={confirmApprove} disabled={approveLoading}>
              Confirm
            </UiButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialog.open} onOpenChange={(o) => !o && closeReject()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
          </DialogHeader>
          <AutocompleteField
            name="document_rejection_reason"
            label="Rejection Reason"
            asyncLoadOptions={(q) =>
              getReferenceOptionsSearch("reason.model", {
                q,
                limit: 20,
                reason_type: "document_rejection",
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
            placeholder="Search reason..."
          />
          <Input
            fullWidth
            multiline
            rows={2}
            label="Remarks (optional)"
            value={rejectDialog.remarks}
            onChange={(e) =>
              setRejectDialog((prev) => ({ ...prev, remarks: e.target.value }))
            }
          />
          <DialogFooter className="pt-4">
            <UiButton variant="outline" size="sm" onClick={closeReject} disabled={rejectLoading}>
              Cancel
            </UiButton>
            <UiButton
              variant="destructive"
              size="sm"
              onClick={confirmReject}
              disabled={rejectLoading || !rejectDialog.reasonId}
            >
              Reject
            </UiButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
